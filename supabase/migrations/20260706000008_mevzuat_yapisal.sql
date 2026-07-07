-- =====================================================================
-- M8 — Yapısal mevzuat katmanı (kaynaklar + maddeler[kimlik/versiyon] + köprüler)
-- =====================================================================
-- Referans: M8-MIMARI-ANALIZ.md, ADR-011/012/016/020/021, V2-VERI-MODELI §2.1/§2.5/§4
--
-- ⚠️ SALT YAPI + KAYNAK KATALOG SEED: Madde METİNLERİ bu migration'da SEED EDİLMEZ.
--    Şema + çekirdek kaynaklar (VUK/KDVK/GVK/KVK/TTK/5510/KDV-GUT) kurulur; madde
--    kimlik/versiyon içeriği KÜRASYONLA girilir (AI taslak + insan onay, ADR-012).
--    Kör toplu import yok (M6b/M7b dersi; yanlış madde metni = yanlış öğretim).
--
-- ⚠️ ADDITIVE + GREENFIELD: Legacy `cozumler` backfill'ine BAĞIMLI DEĞİL (M7b kararı).
--    cozum_mevzuat `cozum_basliklari`'na (M7a) bağlanır. HİÇBİR chunk tablosuna
--    DOKUNULMAZ: aktif RAG `rag_chunks` (3327, OpenAI — ai-asistan `rag_ara` RPC ile
--    kullanır); `mevzuat_chunklar` (275) eski/ayrı yapı. RAG↔madde köprüsü, madde
--    metinleri kürasyonla girildikten SONRA, doğru hedefle (rag_chunks) + kaynak
--    uzlaştırma kararıyla birlikte AYRI migration'da kurulur (boş maddeye köprü işlevsiz).
--
-- ADR-021: madde KİMLİK (mevzuat_maddeleri) / VERSİYON (mevzuat_madde_versiyonlari)
--    ayrı. cozum_mevzuat KİMLİĞE bağlanır; metin tarihe göre çözümlenir.
--
-- Kapsam (M8):
--   + mevzuat_tip enum
--   + mevzuat_kaynaklar          (KATALOG + 7 kaynak seed)
--   + mevzuat_maddeleri          (KİMLİK — kaynak+madde_no)
--   + mevzuat_madde_versiyonlari (VERSİYON — tarihli metin)
--   + cozum_mevzuat              (M2M: cozum_basliklari ↔ madde kimliği)
--   (chunk köprüsü YOK — rag_chunks'a, madde kürasyonu sonrası ayrı migration)
--
-- İdempotent: create if not exists + add ... if not exists + on conflict + drop policy if exists.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Enum — mevzuat_tip
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname='mevzuat_tip') then
    create type public.mevzuat_tip as enum ('kanun','yonetmelik','teblig','sirkuler','genelge','ozelge');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. mevzuat_kaynaklar (KATALOG)
-- ---------------------------------------------------------------------
create table if not exists public.mevzuat_kaynaklar (
  id             text primary key,
  tip            public.mevzuat_tip not null,
  ad             text not null,
  numara         text,
  -- Opsiyonel hiyerarşi hook (tebliğ→kanun). MVP'de DOLDURULMAZ (ADR-021/§6.4).
  ust_kaynak_id  text references public.mevzuat_kaynaklar(id) on delete set null,
  source_url     text,
  aktif          boolean not null default true,
  sira           int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists mevzuat_kaynaklar_tip_idx on public.mevzuat_kaynaklar (tip);
create index if not exists mevzuat_kaynaklar_ust_idx on public.mevzuat_kaynaklar (ust_kaynak_id) where ust_kaynak_id is not null;
drop trigger if exists mevzuat_kaynaklar_updated_at on public.mevzuat_kaynaklar;
create trigger mevzuat_kaynaklar_updated_at before update on public.mevzuat_kaynaklar
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. mevzuat_maddeleri (KİMLİK — stabil, madde başına tek satır)
-- ---------------------------------------------------------------------
create table if not exists public.mevzuat_maddeleri (
  id          uuid primary key default gen_random_uuid(),
  kaynak_id   text not null references public.mevzuat_kaynaklar(id) on delete restrict,
  madde_no    text not null,                              -- '9', '29/1', 'I/C-2.1.3.2.7'
  created_at  timestamptz not null default now(),
  constraint mevzuat_madde_kimlik_uniq unique (kaynak_id, madde_no)
);
create index if not exists mevzuat_maddeleri_kaynak_idx on public.mevzuat_maddeleri (kaynak_id);

-- ---------------------------------------------------------------------
-- 3. mevzuat_madde_versiyonlari (VERSİYON — tarihli metin, append-only)
-- ---------------------------------------------------------------------
create table if not exists public.mevzuat_madde_versiyonlari (
  id              uuid primary key default gen_random_uuid(),
  madde_id        uuid not null references public.mevzuat_maddeleri(id) on delete cascade,
  versiyon        int not null default 1,
  baslik          text not null,
  metin           text not null,
  effective_date  date not null,
  expire_date     date,                                   -- null = yürürlükte
  source_url      text,
  aktif           boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint mevzuat_versiyon_uniq unique (madde_id, versiyon),
  constraint mevzuat_versiyon_tarih_ck check (expire_date is null or expire_date > effective_date)
);
create index if not exists mevzuat_versiyon_madde_idx on public.mevzuat_madde_versiyonlari (madde_id);
-- "T tarihinde geçerli madde" sorgusu için tarih index'i
create index if not exists mevzuat_versiyon_tarih_idx on public.mevzuat_madde_versiyonlari (madde_id, effective_date, expire_date);
drop trigger if exists mevzuat_versiyon_updated_at on public.mevzuat_madde_versiyonlari;
create trigger mevzuat_versiyon_updated_at before update on public.mevzuat_madde_versiyonlari
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. cozum_mevzuat (M2M — cozum_basliklari ↔ madde KİMLİĞİ, ADR-020/021)
-- ---------------------------------------------------------------------
create table if not exists public.cozum_mevzuat (
  baslik_id   uuid not null references public.cozum_basliklari(id) on delete cascade,
  madde_id    uuid not null references public.mevzuat_maddeleri(id) on delete restrict,
  aciklama    text,                                       -- "KDVK md.9/1 vergi sorumlusu"
  created_at  timestamptz not null default now(),
  primary key (baslik_id, madde_id)
);
-- Etki analizi ters yönü: "bu madde hangi çözümleri etkiler"
create index if not exists cozum_mevzuat_madde_idx on public.cozum_mevzuat (madde_id);

-- ---------------------------------------------------------------------
-- 5. (KALDIRILDI) RAG↔madde chunk köprüsü
-- ---------------------------------------------------------------------
-- Aktif RAG = `rag_chunks` (3327, OpenAI; ai-asistan `rag_ara` RPC). `mevzuat_chunklar`
-- (275) eski/ayrı yapı — köprüyü ona eklemek mimari borç olurdu. Ayrıca M8'de
-- mevzuat_maddeleri BOŞ (kürasyon sonrası dolar); boş maddeye köprü işlevsiz.
-- Köprü, madde kürasyonundan SONRA `rag_chunks` hedefiyle + rag_kaynaklar↔mevzuat_kaynaklar
-- uzlaştırma kararıyla AYRI migration'da kurulur. M8 hiçbir chunk tablosuna dokunmaz.

-- ---------------------------------------------------------------------
-- 6. RLS
-- ---------------------------------------------------------------------
-- 6a. Katalog (kaynaklar/maddeleri/versiyonlari) — herkes okur, admin yazar
alter table public.mevzuat_kaynaklar          enable row level security;
alter table public.mevzuat_maddeleri          enable row level security;
alter table public.mevzuat_madde_versiyonlari enable row level security;

drop policy if exists "mevzuat_kaynaklar_read" on public.mevzuat_kaynaklar;
create policy "mevzuat_kaynaklar_read" on public.mevzuat_kaynaklar for select using (true);
drop policy if exists "mevzuat_kaynaklar_admin_all" on public.mevzuat_kaynaklar;
create policy "mevzuat_kaynaklar_admin_all" on public.mevzuat_kaynaklar for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "mevzuat_maddeleri_read" on public.mevzuat_maddeleri;
create policy "mevzuat_maddeleri_read" on public.mevzuat_maddeleri for select using (true);
drop policy if exists "mevzuat_maddeleri_admin_all" on public.mevzuat_maddeleri;
create policy "mevzuat_maddeleri_admin_all" on public.mevzuat_maddeleri for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "mevzuat_versiyon_read" on public.mevzuat_madde_versiyonlari;
create policy "mevzuat_versiyon_read" on public.mevzuat_madde_versiyonlari for select using (true);
drop policy if exists "mevzuat_versiyon_admin_all" on public.mevzuat_madde_versiyonlari;
create policy "mevzuat_versiyon_admin_all" on public.mevzuat_madde_versiyonlari for all
  using (public.is_admin()) with check (public.is_admin());

-- 6b. cozum_mevzuat — dolaylı-onay (cozum_basliklari→olay); içerik-admin yazar
alter table public.cozum_mevzuat enable row level security;
drop policy if exists "cozum_mevzuat_read" on public.cozum_mevzuat;
create policy "cozum_mevzuat_read" on public.cozum_mevzuat for select
  using (exists (
    select 1 from public.cozum_basliklari b
    join public.muhasebe_olaylari o on o.id = b.olay_id
    where b.id = cozum_mevzuat.baslik_id
      and (o.durum = 'onayli' or public.is_admin('icerik') or o.ekleyen_id = auth.uid())
  ));
drop policy if exists "cozum_mevzuat_icerik_all" on public.cozum_mevzuat;
create policy "cozum_mevzuat_icerik_all" on public.cozum_mevzuat for all
  using (public.is_admin('icerik')) with check (public.is_admin('icerik'));

-- ---------------------------------------------------------------------
-- 7. SEED — mevzuat_kaynaklar (7 çekirdek; ust_kaynak_id NULL — hiyerarşi dolmaz)
-- ---------------------------------------------------------------------
insert into public.mevzuat_kaynaklar (id, tip, ad, numara, sira) values
  ('vuk',     'kanun',  'Vergi Usul Kanunu',                                   '213',  1),
  ('kdvk',    'kanun',  'Katma Değer Vergisi Kanunu',                          '3065', 2),
  ('gvk',     'kanun',  'Gelir Vergisi Kanunu',                                '193',  3),
  ('kvk',     'kanun',  'Kurumlar Vergisi Kanunu',                             '5520', 4),
  ('ttk',     'kanun',  'Türk Ticaret Kanunu',                                 '6102', 5),
  ('sgk-5510','kanun',  'Sosyal Sigortalar ve Genel Sağlık Sigortası Kanunu',  '5510', 6),
  ('kdv-gut', 'teblig', 'KDV Genel Uygulama Tebliği',                          null,   7)
on conflict (id) do update set
  tip = excluded.tip, ad = excluded.ad, numara = excluded.numara, sira = excluded.sira;

-- ---------------------------------------------------------------------
-- 8. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare
  v_kaynak int; v_madde int; v_versiyon int; v_cm int;
begin
  select count(*) into v_kaynak   from public.mevzuat_kaynaklar;
  select count(*) into v_madde    from public.mevzuat_maddeleri;
  select count(*) into v_versiyon from public.mevzuat_madde_versiyonlari;
  select count(*) into v_cm       from public.cozum_mevzuat;

  raise notice 'M8 raporu — kaynak: % (bekl. 7), madde: % (bekl. 0), versiyon: % (bekl. 0), cozum_mevzuat: % (bekl. 0)',
    v_kaynak, v_madde, v_versiyon, v_cm;

  if to_regclass('public.mevzuat_kaynaklar') is null
     or to_regclass('public.mevzuat_maddeleri') is null
     or to_regclass('public.mevzuat_madde_versiyonlari') is null
     or to_regclass('public.cozum_mevzuat') is null then
    raise exception 'M8 hata: tablolardan biri oluşmadı';
  end if;
  if not exists (select 1 from pg_type where typname='mevzuat_tip') then
    raise exception 'M8 hata: mevzuat_tip enum yok';
  end if;
  if v_kaynak <> 7 then
    raise exception 'M8 hata: kaynak sayısı % (7 bekleniyor)', v_kaynak;
  end if;
  -- Madde metni bu migration'da seed EDİLMEMELİ (kürasyon)
  if v_madde > 0 or v_versiyon > 0 or v_cm > 0 then
    raise exception 'M8 hata: madde/versiyon/cozum_mevzuat boş değil (kürasyon kapsamı)';
  end if;

  raise notice 'M8 doğrulama başarılı ✓ (yapı + 7 kaynak; madde metni kürasyonla; köprü best-effort)';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
