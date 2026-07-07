-- =====================================================================
-- M5 — muhasebe_olaylari iskeleti (aggregate root + olay M2M + sorular bağı)
-- =====================================================================
-- Referans: M5-MIMARI-ANALIZ.md, ADR-002/007/008/009/015/016, V2-VERI-MODELI §2.2/§4/§8
--
-- ⚠️ KOORDİNELİ DEĞİL — SALT ADDITIVE: Bu migration mevcut hiçbir kolonu
--    düşürmez, hiçbir tip değiştirmez. Frontend `sorular`'ı okumaya devam eder;
--    yeni kolonları (olay_id/tip/destek_seviyesi/config) görmezden gelir →
--    uniteler-loader.ts / kontrol.ts / admin / atolye_sorulari / ilerleme /
--    liderlik RPC'leri DOKUNULMADAN çalışır. "Görünmez sprint".
--
-- Kapsam (M5-MIMARI-ANALIZ Bölüm 5):
--   + muhasebe_olaylari          (aggregate root, text PK)
--   + olay_yetkinlikleri         (M2M, ağırlıklı — XP dağıtım kaynağı, ADR-009)
--   + olay_etiketleri            (M2M — filtre/keşif; BOŞ kurulur, doldurma M5 dışı)
--   + olay_muavinleri            (M2M — dropdown evreni; DOLDURMA M7'ye ertelendi)
--   + sorular.olay_id/tip/destek_seviyesi/config  (nullable/defaultlu, additive)
--   + destek_seviyesi enum
--   - soru_yetkinlikleri, soru_etiketleri  (0 satır, kod okumuyor → DROP; ADR-017)
--   ↻ backfill: mevcut her soru → 1:1 muhasebe_olayi (deterministik id)
--   (NOT: sorular.etiketler → olay_etiketleri backfill'i YAPILMAZ. sorular.etiketler
--    granüler folksonomi (hesap kodu/kavram), M2 etiketler ise küratörlü taksonomi —
--    örtüşme 1/75. olay_etiketleri boş kurulur; küratörlü etiket olay düzeyinde
--    içerik geçişinde uygulanır. sorular.etiketler M11'e kadar durur.)
--
-- KARARLAR (M5-MIMARI-ANALIZ):
--   K1 muhasebe_olaylari = aggregate root
--   K2 sorular.olay_id NULLABLE FK (restrict) — NOT NULL kısıtı KONMAZ (S7'de)
--   K3 belgeler M6'ya, olay_belgeleri M5'te YOK (FK hedefi yok)
--   K4 yetkinlik/etiket OLAY düzeyine (soru düzeyi drop) → ADR-017
--
-- Ertelenen (bilinçli, bağımlılık):
--   olay_belgeleri  → M6 (belgeler tablosu yok)
--   cozumler v2 / cozum_satirlari → M7 (kod→muavin eşlemesi)
--   cozum_mevzuat   → M8 (mevzuat_maddeleri yok)
--   olay_yetkinlikleri / olay_muavinleri DOLDURMA → içerik geçişi / M7 (tablo boş kalır)
--
-- İdempotent (manuel çalıştırma): create if not exists + add column if not exists
--   + on conflict do nothing + drop if exists. Tekrar çalıştırılabilir.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Enum — destek_seviyesi (scaffold ekseni, ADR-009)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'destek_seviyesi') then
    create type public.destek_seviyesi as enum ('rehberli','standart','serbest');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. muhasebe_olaylari — aggregate root (K1)
-- ---------------------------------------------------------------------
create table if not exists public.muhasebe_olaylari (
  id            text primary key,                       -- 'olay-...' (admin-okunur)
  baslik        text not null,
  senaryo       text not null,                          -- gerçek hayat anlatısı (ADR-014)
  islem_tarihi  date,                                   -- null; kronoloji/simülasyon (ADR-010)
  zorluk        public.zorluk not null,                 -- mevcut enum
  ipucu         text,
  durum         public.soru_durum not null default 'taslak',  -- mevcut enum
  kaynak        text,                                   -- 'manuel'/'ai'/'katkici'/'sablon'
  ekleyen_id    uuid references public.kullanicilar(id) on delete set null,
  -- Evren (ADR-010): isletme_id FK YOK (isletmeler M10). null = global havuz.
  isletme_id    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.muhasebe_olaylari is
  'Aggregate root (ADR-002). Platformun atomu: gerçeklesen ekonomik olay. sorular/cozumler/simulasyon_adimlari buraya baglanir. Belge M6, cozum M7, mevzuat M8.';

create index if not exists muhasebe_olaylari_durum_idx
  on public.muhasebe_olaylari (durum) where durum = 'onayli';
create index if not exists muhasebe_olaylari_isletme_idx
  on public.muhasebe_olaylari (isletme_id) where isletme_id is not null;

drop trigger if exists muhasebe_olaylari_updated_at on public.muhasebe_olaylari;
create trigger muhasebe_olaylari_updated_at before update on public.muhasebe_olaylari
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. Olay M2M'leri (FK hedefi hazır olanlar — K3/K4)
-- ---------------------------------------------------------------------
-- 2a. olay_yetkinlikleri — ağırlıklı; XP dağıtımının kaynağı (ADR-009/015)
create table if not exists public.olay_yetkinlikleri (
  olay_id       text not null references public.muhasebe_olaylari(id) on delete cascade,
  yetkinlik_id  text not null references public.yetkinlikler(id) on delete restrict,
  agirlik       numeric(3,2) not null default 1.0 check (agirlik > 0 and agirlik <= 1),
  created_at    timestamptz not null default now(),
  primary key (olay_id, yetkinlik_id)
);
create index if not exists olay_yetkinlikleri_yetkinlik_idx
  on public.olay_yetkinlikleri (yetkinlik_id);

-- 2b. olay_etiketleri — filtre/keşif
create table if not exists public.olay_etiketleri (
  olay_id     text not null references public.muhasebe_olaylari(id) on delete cascade,
  etiket_id   text not null references public.etiketler(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (olay_id, etiket_id)
);
create index if not exists olay_etiketleri_etiket_idx
  on public.olay_etiketleri (etiket_id);

-- 2c. olay_muavinleri — sorunun dropdown evreni (eski sorular.muavinler jsonb hedefi)
--     Tablo M5'te kurulur; DOLDURMA M7'ye ertelenir (kod→muavin eşlemesi).
create table if not exists public.olay_muavinleri (
  olay_id     text not null references public.muhasebe_olaylari(id) on delete cascade,
  muavin_id   uuid not null references public.muavin_hesaplar(id) on delete restrict,
  created_at  timestamptz not null default now(),
  primary key (olay_id, muavin_id)
);
create index if not exists olay_muavinleri_muavin_idx
  on public.olay_muavinleri (muavin_id);

-- ---------------------------------------------------------------------
-- 3. RLS
-- ---------------------------------------------------------------------
-- 3a. muhasebe_olaylari — İçerik şablonu (onaylı herkese; taslak sahibine + admin)
alter table public.muhasebe_olaylari enable row level security;

drop policy if exists "olaylar_read" on public.muhasebe_olaylari;
create policy "olaylar_read" on public.muhasebe_olaylari for select
  using (durum = 'onayli' or public.is_admin() or ekleyen_id = auth.uid());

drop policy if exists "olaylar_admin_all" on public.muhasebe_olaylari;
create policy "olaylar_admin_all" on public.muhasebe_olaylari for all
  using (public.is_admin()) with check (public.is_admin());

-- 3b. Olay M2M'leri — İ (dolaylı): olayın onay durumunu izler; admin yazar
alter table public.olay_yetkinlikleri enable row level security;
alter table public.olay_etiketleri    enable row level security;
alter table public.olay_muavinleri    enable row level security;

drop policy if exists "olay_yetkinlikleri_read" on public.olay_yetkinlikleri;
create policy "olay_yetkinlikleri_read" on public.olay_yetkinlikleri for select
  using (exists (
    select 1 from public.muhasebe_olaylari o
    where o.id = olay_yetkinlikleri.olay_id
      and (o.durum = 'onayli' or public.is_admin() or o.ekleyen_id = auth.uid())
  ));
drop policy if exists "olay_yetkinlikleri_admin_all" on public.olay_yetkinlikleri;
create policy "olay_yetkinlikleri_admin_all" on public.olay_yetkinlikleri for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "olay_etiketleri_read" on public.olay_etiketleri;
create policy "olay_etiketleri_read" on public.olay_etiketleri for select
  using (exists (
    select 1 from public.muhasebe_olaylari o
    where o.id = olay_etiketleri.olay_id
      and (o.durum = 'onayli' or public.is_admin() or o.ekleyen_id = auth.uid())
  ));
drop policy if exists "olay_etiketleri_admin_all" on public.olay_etiketleri;
create policy "olay_etiketleri_admin_all" on public.olay_etiketleri for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "olay_muavinleri_read" on public.olay_muavinleri;
create policy "olay_muavinleri_read" on public.olay_muavinleri for select
  using (exists (
    select 1 from public.muhasebe_olaylari o
    where o.id = olay_muavinleri.olay_id
      and (o.durum = 'onayli' or public.is_admin() or o.ekleyen_id = auth.uid())
  ));
drop policy if exists "olay_muavinleri_admin_all" on public.olay_muavinleri;
create policy "olay_muavinleri_admin_all" on public.olay_muavinleri for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. sorular — instance'a evrim (+4 kolon, additive) (K2)
-- ---------------------------------------------------------------------
-- olay_id: NULLABLE FK restrict — kullanılan olay silinemez; NOT NULL S7'de.
alter table public.sorular
  add column if not exists olay_id text references public.muhasebe_olaylari(id) on delete restrict;
-- tip: soru_tipleri kataloğu (ADR-008). Mevcut 70 soru = yevmiye_kaydi.
alter table public.sorular
  add column if not exists tip text not null default 'yevmiye_kaydi'
    references public.soru_tipleri(id) on delete restrict;
-- destek_seviyesi: scaffold ekseni. MVP hepsi standart.
alter table public.sorular
  add column if not exists destek_seviyesi public.destek_seviyesi not null default 'standart';
-- config: tip'e özel üretim parametreleri (jsonb).
alter table public.sorular
  add column if not exists config jsonb not null default '{}'::jsonb;

create index if not exists sorular_olay_idx on public.sorular (olay_id);
create index if not exists sorular_tip_idx  on public.sorular (tip);

-- ---------------------------------------------------------------------
-- 5. Backfill — her soru → 1:1 muhasebe_olayi (deterministik id)
-- ---------------------------------------------------------------------
-- id = 'olay-' || sorular.id (sorular.id text, PK → olay id tekil, idempotent).
-- durum/zorluk/senaryo/baslik/ipucu/kaynak/ekleyen_id kopyalanır; islem_tarihi null.
insert into public.muhasebe_olaylari
  (id, baslik, senaryo, islem_tarihi, zorluk, ipucu, durum, kaynak, ekleyen_id)
select
  'olay-' || s.id,
  s.baslik,
  s.senaryo,
  null,
  s.zorluk,
  s.ipucu,
  s.durum,
  coalesce(s.kaynak, 'manuel'),
  s.ekleyen_id
from public.sorular s
on conflict (id) do nothing;

-- sorular.olay_id bağla — yalnız boş olanlar (idempotent + elle yeniden
-- bağlanmış soruyu EZMEZ: re-run manuel/uygulama bağını korur)
update public.sorular s
  set olay_id = 'olay-' || s.id
  where s.olay_id is null;

-- ---------------------------------------------------------------------
-- 6. (KALDIRILDI) sorular.etiketler → olay_etiketleri backfill
-- ---------------------------------------------------------------------
-- Dry-run bulgusu: sorular.etiketler granüler folksonomi (hesap kodu '500'/'102',
-- kavram 'banka'/'sermaye-ödemesi'…), M2 etiketler ise küratörlü 22'lik taksonomi.
-- Örtüşme yalnız 'amortisman' (1/75). Otomatik eşleme yanıltıcı → yapılmaz.
-- olay_etiketleri BİLİNÇLİ BOŞ kalır (olay_yetkinlikleri/olay_muavinleri gibi);
-- küratörlü etiket olay düzeyinde içerik geçişinde uygulanır. Karar: ADR-017 tartışması.

-- ---------------------------------------------------------------------
-- 7. Eski boş M2M tablolarını düşür (K4 — ADR-017)
-- ---------------------------------------------------------------------
-- 0 satır, hiçbir kod okumuyor, bağımlı FK yok (M5 öncesi doğrulandı).
-- M2'nin geçici olarak sorular'a bağladığı M2M'ler; olay düzeyine taşındı.
drop table if exists public.soru_yetkinlikleri;
drop table if exists public.soru_etiketleri;

-- ---------------------------------------------------------------------
-- 8. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare
  v_soru               int;
  v_olay               int;
  v_soru_olaysiz       int;
  v_yetim_olay         int;
  v_tip_gecersiz       int;
begin
  select count(*) into v_soru from public.sorular;
  select count(*) into v_olay from public.muhasebe_olaylari;

  -- olay_id boş kalan soru (1:1 backfill sonrası olmamalı)
  select count(*) into v_soru_olaysiz from public.sorular where olay_id is null;

  -- SORUDAN TÜREYEN ('olay-%') ama hiçbir soruya bağlı olmayan olay (1:1'de
  -- olmamalı). Prefix filtresi kritik: ileride belge/simülasyon/monografi
  -- olayları ('olay-%' dışı id ile) bu sayıma girmemeli — yanlış "yetim" alarmı önlenir.
  select count(*) into v_yetim_olay
    from public.muhasebe_olaylari o
    where o.id like 'olay-%'
      and not exists (select 1 from public.sorular s where s.olay_id = o.id);

  -- tip FK dışı (FK garanti eder; yine de kontrol)
  select count(*) into v_tip_gecersiz
    from public.sorular s
    where not exists (select 1 from public.soru_tipleri t where t.id = s.tip);

  raise notice 'M5 raporu — soru: %, olay: %, olaysiz soru: %, yetim olay: %, gecersiz tip: %, olay_etiketleri: %',
    v_soru, v_olay, v_soru_olaysiz, v_yetim_olay, v_tip_gecersiz,
    (select count(*) from public.olay_etiketleri);

  -- --- Kırıcı kontroller ---
  if to_regclass('public.muhasebe_olaylari') is null then
    raise exception 'M5 hata: muhasebe_olaylari tablosu yok';
  end if;
  if to_regclass('public.olay_yetkinlikleri') is null
     or to_regclass('public.olay_etiketleri') is null
     or to_regclass('public.olay_muavinleri') is null then
    raise exception 'M5 hata: olay M2M tablolarından biri oluşmadı';
  end if;
  if to_regclass('public.soru_yetkinlikleri') is not null
     or to_regclass('public.soru_etiketleri') is not null then
    raise exception 'M5 hata: eski soru_* M2M tabloları hâlâ mevcut (drop başarısız)';
  end if;
  if not exists (select 1 from pg_type where typname = 'destek_seviyesi') then
    raise exception 'M5 hata: destek_seviyesi enum yok';
  end if;
  -- NOT: v_olay <> v_soru eşitlik kontrolü KALDIRILDI. muhasebe_olaylari
  -- ileride sorudan türemeyen olayları (belge/simülasyon/monografi) da
  -- tutacağından toplam eşitliği geçersiz varsayım olur. 1:1 bütünlüğü artık
  -- iki yönlü ölçülüyor: (a) olaysız soru = 0 (aşağıda), (b) 'olay-%' yetim = 0.
  if v_soru_olaysiz > 0 then
    raise exception 'M5 hata: % soruda olay_id boş', v_soru_olaysiz;
  end if;
  if v_yetim_olay > 0 then
    raise exception 'M5 hata: % yetim olay (soruya bağlı değil)', v_yetim_olay;
  end if;
  if v_tip_gecersiz > 0 then
    raise exception 'M5 hata: % soruda geçersiz tip', v_tip_gecersiz;
  end if;

  raise notice 'M5 doğrulama başarılı ✓ (olay_etiketleri bilinçli boş — küratörlü etiket olay düzeyinde sonra uygulanır; sorular.etiketler M11’e kadar durur)';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
