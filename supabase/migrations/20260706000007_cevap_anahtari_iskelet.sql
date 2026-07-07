-- =====================================================================
-- M7a — cevap anahtarı normalize yapısı (cozum_basliklari + cozum_satirlari)
-- =====================================================================
-- Referans: M7-MIMARI-ANALIZ.md, ADR-002/004/005/008/009/019(+020 önerisi), V2-VERI-MODELI §2.2/§2.3/§12
--
-- ⚠️ AYRI BAŞLIK TABLOSU (mixed-grain'den kaçınma kararı): Cevap anahtarının
--    başlığı, legacy `cozumler`'e SIKIŞTIRILMAZ (V2-VERI-MODELI §2.2 repurpose
--    planından sapma). Yeni `cozum_basliklari` tablosu kurulur; `cozumler` tablosuna
--    HİÇ DOKUNULMAZ (kolon eklenmez, NOT NULL gevşetilmez, semantik değişmez).
--    Gerekçe: aynı tabloda satır+başlık grain'i NOT NULL gevşetmesi ve semantik
--    kirlilik doğuruyordu. Ayrı tablo temiz hiyerarşi verir. → ADR-020.
--
-- ⚠️ SALT YAPI — BACKFILL / TERFİ YOK: 256 legacy satır taşınmaz, soru-yerel
--    muavinler terfi edilmez, olay_muavinleri doldurulmaz (ölçüldü: kodlar global
--    tutarsız + 8 cari-blok). Yeni içerik yapıyı İLERİYE DÖNÜK doldurur. M7b = karar/rapor.
--
-- ⚠️ kontrol.ts KORUNUR: legacy `cozumler` (soru_id/sira/kod/borc/alacak) aynen kalır;
--    dual-read, M11'de drop. Bu migration onu okumaz/yazmaz/değiştirmez.
--
-- ADR-019: cozum_basliklari/cozum_satirlari = CEVAP ANAHTARI (olay aggregate'i).
--    Kullanıcı cevabı burada tutulmaz (soru→ilerleme, simülasyon→yevmiye M10).
-- ADR-004/005: cozum_satirlari.muavin_id NOT NULL FK → ana hesaba kayıt YAPISAL imkânsız.
--
-- Kapsam (M7a):
--   + cozum_basliklari    (başlık: olay_id + varyant + mantık/beyanname/hata)
--   + cozum_satirlari     (satır: muavin_id NOT NULL + borç/alacak + check)
--   + bütünlük trigger'ı  (deferred: Σborç=Σalacak + min-2-satır)
--   + RLS                 (dolaylı-onay, olay üzerinden; içerik-admin yazar)
--   (cozumler'e dokunulmaz)
--
-- İdempotent: create if not exists + drop policy/trigger if exists.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. cozum_basliklari (yeni — çözüm/varyant başlığı, ADR-019)
-- ---------------------------------------------------------------------
create table if not exists public.cozum_basliklari (
  id                 uuid primary key default gen_random_uuid(),
  olay_id            text not null references public.muhasebe_olaylari(id) on delete cascade,
  varyant            int not null default 1,
  varyant_adi        text,                                   -- 'Aralıklı envanter'
  aciklama           text,                                   -- muhasebe mantığı (öğrenme zinciri)
  beyanname_etkileri jsonb not null default '[]'::jsonb,     -- MVP jsonb (motor v2.2)
  hata_kurallari     jsonb not null default '[]'::jsonb,     -- katman-2 geri bildirim
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint cozum_baslik_olay_varyant_uniq unique (olay_id, varyant)
);

create index if not exists cozum_basliklari_olay_idx on public.cozum_basliklari (olay_id);

drop trigger if exists cozum_basliklari_updated_at on public.cozum_basliklari;
create trigger cozum_basliklari_updated_at before update on public.cozum_basliklari
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. cozum_satirlari (yeni — cevap anahtarı satırları)
-- ---------------------------------------------------------------------
create table if not exists public.cozum_satirlari (
  id         uuid primary key default gen_random_uuid(),
  baslik_id  uuid not null references public.cozum_basliklari(id) on delete cascade,
  sira       int not null,
  -- ADR-004/005: NOT NULL FK → muavin_hesaplar. Ana hesap bu tabloda yok
  -- (kod format CHECK), dolayısıyla ana hesaba kayıt YAPISAL imkânsız.
  muavin_id  uuid not null references public.muavin_hesaplar(id) on delete restrict,
  borc       numeric(14,2) not null default 0 check (borc >= 0),
  alacak     numeric(14,2) not null default 0 check (alacak >= 0),
  aciklama   text,
  created_at timestamptz not null default now(),
  constraint cozum_satir_tek_taraf check (borc = 0 or alacak = 0),
  constraint cozum_satir_sira_uniq unique (baslik_id, sira)
);

create index if not exists cozum_satirlari_baslik_idx on public.cozum_satirlari (baslik_id);
create index if not exists cozum_satirlari_muavin_idx on public.cozum_satirlari (muavin_id);

-- ---------------------------------------------------------------------
-- 3. Bütünlük trigger'ı (ADR-005 açık kararı) — DEFERRED (commit anı)
-- ---------------------------------------------------------------------
-- Cevap anahtarı dengesiz/tek-satırlı olamaz (yoksa öğrenci haksız "yanlış"a düşer).
-- Satırlar tek tek insert edildiğinden deferred constraint trigger: commit anında
-- başlık başına Σborç=Σalacak VE ≥2 satır.
create or replace function public.cozum_satir_butunluk()
returns trigger language plpgsql as $fn$
declare
  v_baslik_id uuid;
  v_borc numeric; v_alacak numeric; v_adet int;
begin
  v_baslik_id := coalesce(new.baslik_id, old.baslik_id);
  if not exists (select 1 from public.cozum_basliklari where id = v_baslik_id) then
    return null;  -- başlık cascade ile silindi → kontrol gereksiz
  end if;
  select coalesce(sum(borc),0), coalesce(sum(alacak),0), count(*)
    into v_borc, v_alacak, v_adet
    from public.cozum_satirlari where baslik_id = v_baslik_id;
  if v_adet < 2 then
    raise exception 'Cevap anahtarı bütünlük: çözüm % en az 2 satır olmalı (mevcut %)', v_baslik_id, v_adet;
  end if;
  if v_borc <> v_alacak then
    raise exception 'Cevap anahtarı denge: çözüm % Σborç(%) <> Σalacak(%)', v_baslik_id, v_borc, v_alacak;
  end if;
  return null;
end $fn$;

drop trigger if exists cozum_satir_butunluk_trg on public.cozum_satirlari;
create constraint trigger cozum_satir_butunluk_trg
  after insert or update or delete on public.cozum_satirlari
  deferrable initially deferred
  for each row execute function public.cozum_satir_butunluk();

-- ---------------------------------------------------------------------
-- 4. RLS — dolaylı-onay (olay); içerik-admin yazar (cozumler ile aynı rol)
-- ---------------------------------------------------------------------
alter table public.cozum_basliklari enable row level security;
drop policy if exists "cozum_basliklari_read" on public.cozum_basliklari;
create policy "cozum_basliklari_read" on public.cozum_basliklari for select
  using (exists (
    select 1 from public.muhasebe_olaylari o
    where o.id = cozum_basliklari.olay_id
      and (o.durum = 'onayli' or public.is_admin('icerik') or o.ekleyen_id = auth.uid())
  ));
drop policy if exists "cozum_basliklari_icerik_all" on public.cozum_basliklari;
create policy "cozum_basliklari_icerik_all" on public.cozum_basliklari for all
  using (public.is_admin('icerik')) with check (public.is_admin('icerik'));

alter table public.cozum_satirlari enable row level security;
drop policy if exists "cozum_satirlari_read" on public.cozum_satirlari;
create policy "cozum_satirlari_read" on public.cozum_satirlari for select
  using (
    exists (
      select 1 from public.cozum_basliklari b
      join public.muhasebe_olaylari o on o.id = b.olay_id
      where b.id = cozum_satirlari.baslik_id
        and (o.durum = 'onayli' or public.is_admin('icerik') or o.ekleyen_id = auth.uid())
    )
  );
drop policy if exists "cozum_satirlari_icerik_all" on public.cozum_satirlari;
create policy "cozum_satirlari_icerik_all" on public.cozum_satirlari for all
  using (public.is_admin('icerik')) with check (public.is_admin('icerik'));

-- ---------------------------------------------------------------------
-- 5. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare
  v_baslik int;
  v_satir  int;
begin
  select count(*) into v_baslik from public.cozum_basliklari;
  select count(*) into v_satir  from public.cozum_satirlari;

  raise notice 'M7a raporu — cozum_basliklari: % (bekl. 0), cozum_satirlari: % (bekl. 0), cozumler.soru_id null durumu: %',
    v_baslik, v_satir,
    (select is_nullable from information_schema.columns where table_schema='public' and table_name='cozumler' and column_name='soru_id');

  if to_regclass('public.cozum_basliklari') is null or to_regclass('public.cozum_satirlari') is null then
    raise exception 'M7a hata: tablolardan biri oluşmadı';
  end if;
  if not exists (select 1 from pg_trigger where tgname='cozum_satir_butunluk_trg') then
    raise exception 'M7a hata: bütünlük trigger''ı yok';
  end if;
  -- LEGACY DOKUNULMAZLIK: cozumler.soru_id hâlâ NOT NULL olmalı (dokunmadık)
  if (select is_nullable from information_schema.columns where table_schema='public' and table_name='cozumler' and column_name='soru_id') <> 'NO' then
    raise exception 'M7a hata: cozumler.soru_id değişmiş — legacy tabloya dokunulmamalıydı';
  end if;
  -- SALT YAPI: veri taşınmamalı
  if v_baslik > 0 or v_satir > 0 then
    raise exception 'M7a hata: cevap anahtarı boş değil (backfill M7b/ileri kapsamı)';
  end if;

  raise notice 'M7a doğrulama başarılı ✓ (yapı kuruldu; cozumler dokunulmadı; terfi/backfill yok)';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
