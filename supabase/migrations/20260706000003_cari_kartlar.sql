-- =====================================================================
-- M3 — cari_kartlar (Cari Kart / taraf tablosu)
-- =====================================================================
-- Referans: SDD-V2 §5, V2-VERI-MODELI §2.2, ADR-010/014/016, M3-M4-CARI-MUAVIN-TASARIM
--
-- Additive + GÖRÜNMEZ: hiçbir mevcut kod cari_kartlar okumaz (grep ile
-- doğrulandı) → sıfır regresyon, tek başına deploy edilebilir, lansman hattını
-- (Hat A) etkilemez.
--
-- Kapsam (kullanıcı talebi):
--   - cari_kartlar tablosu + cari tipleri (cari_tip enum)
--   - vergi no (vkn) / tc kimlik no (tckn) / unvan / iletişim alanları
--   - aktiflik (soft delete)
--   - RLS (hibrit sahiplik), CHECK + UNIQUE kuralları
--   - created_at/updated_at + set_updated_at trigger
--   - doğrulama DO bloğu
--
-- KAPSAM DIŞI (bilinçli): seed (M4'te muavinlerle birlikte gelecek),
--   muavin_hesaplar (dokunulmuyor), isletmeler FK'sı (M10).
--
-- İdempotent (manuel çalıştırma): if not exists + drop/create policy+trigger.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Enum — cari_tip (ilk kullanım; KARARLAR C3/C5)
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'cari_tip') then
    create type cari_tip as enum (
      'musteri', 'tedarikci', 'personel', 'kamu', 'banka', 'diger'
    );
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. Tablo
-- ---------------------------------------------------------------------
create table if not exists public.cari_kartlar (
  id                 uuid primary key default gen_random_uuid(),
  tip                cari_tip not null,

  -- Kimlik / unvan
  unvan              text not null,
  kisa_ad            text,
  vkn                text,   -- Vergi Kimlik No (tüzel — 10 hane)
  tckn               text,   -- TC Kimlik No (gerçek kişi — 11 hane)
  vergi_dairesi      text,

  -- İletişim
  telefon            text,
  eposta             text,
  adres              text,
  il                 text,
  iban               text,

  -- Esnek / tip'e özel (personel→sgk_no, banka→şube) — gösterim verisi, JOIN yok
  meta               jsonb not null default '{}'::jsonb,

  -- Evren deseni (ADR-010) — isletme_id FK YOK: isletmeler tablosu M10'da.
  -- null = global havuz. FK constraint M10'da eklenecek.
  isletme_id         text,
  -- null = platform içeriği; dolu = öğrencinin açtığı kart (v2.1). RLS bağımlı.
  olusturan_user_id  uuid references public.kullanicilar(id) on delete set null,

  aktif              boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- CHECK kuralları
  constraint cari_unvan_dolu   check (char_length(btrim(unvan)) > 0),
  constraint cari_vkn_format   check (vkn  is null or vkn  ~ '^[0-9]{10}$'),
  constraint cari_tckn_format  check (tckn is null or tckn ~ '^[0-9]{11}$'),
  constraint cari_meta_obje    check (jsonb_typeof(meta) = 'object')
);

comment on table public.cari_kartlar is
  'Cari kartlar (müşteri/tedarikçi/personel/kamu/banka). Muavin cari_id ile bağlanır (M4). isletme_id null = global havuz.';

-- ---------------------------------------------------------------------
-- 3. Index'ler
-- ---------------------------------------------------------------------
create index if not exists cari_kartlar_isletme_tip_idx
  on public.cari_kartlar (isletme_id, tip);

create index if not exists cari_kartlar_olusturan_idx
  on public.cari_kartlar (olusturan_user_id)
  where olusturan_user_id is not null;

-- UNIQUE: global havuzda aynı VKN/TCKN ile mükerrer cari engellensin.
-- Yalnız global havuz (isletme_id ve olusturan_user_id null) kapsanır →
-- evren-scoped tekillik (nulls not distinct / PG15) gerekmez, M3 additive kalır.
create unique index if not exists cari_kartlar_global_vkn_uniq
  on public.cari_kartlar (vkn)
  where isletme_id is null and olusturan_user_id is null and vkn is not null;

create unique index if not exists cari_kartlar_global_tckn_uniq
  on public.cari_kartlar (tckn)
  where isletme_id is null and olusturan_user_id is null and tckn is not null;

-- ---------------------------------------------------------------------
-- 4. updated_at trigger (mevcut set_updated_at fonksiyonu)
-- ---------------------------------------------------------------------
drop trigger if exists cari_kartlar_updated_at on public.cari_kartlar;
create trigger cari_kartlar_updated_at before update on public.cari_kartlar
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. RLS — hibrit sahiplik (KARARLAR §E, M3-M4-TASARIM)
-- ---------------------------------------------------------------------
alter table public.cari_kartlar enable row level security;

-- Okuma: platform içeriği (owner null) herkese; öğrencinin kendi kartı kendine; admin hepsini
drop policy if exists "cari_read" on public.cari_kartlar;
create policy "cari_read" on public.cari_kartlar for select
  using (
    olusturan_user_id is null
    or olusturan_user_id = auth.uid()
    or public.is_admin()
  );

-- Admin tam CRUD
drop policy if exists "cari_admin_all" on public.cari_kartlar;
create policy "cari_admin_all" on public.cari_kartlar for all
  using (public.is_admin()) with check (public.is_admin());

-- Öğrenci yalnız kendi evrenine yazar; global havuza (isletme_id null) yazamaz
drop policy if exists "cari_own_insert" on public.cari_kartlar;
create policy "cari_own_insert" on public.cari_kartlar for insert
  with check (olusturan_user_id = auth.uid() and isletme_id is not null);

-- =====================================================================
-- 6. DOĞRULAMA (yapısal — seed yok, satır sayısı kontrol edilmez)
-- =====================================================================
do $$
declare
  v_enum     int;
  v_rls      boolean;
  v_trigger  boolean;
begin
  select count(*) into v_enum
    from pg_enum e join pg_type t on t.oid = e.enumtypid
    where t.typname = 'cari_tip';

  select relrowsecurity into v_rls
    from pg_class where oid = 'public.cari_kartlar'::regclass;

  v_trigger := exists (
    select 1 from pg_trigger
    where tgname = 'cari_kartlar_updated_at'
      and tgrelid = 'public.cari_kartlar'::regclass
  );

  raise notice 'M3 raporu — tablo: %, cari_tip değer: % (bekl. 6), RLS aktif: %, updated_at trigger: %',
    (to_regclass('public.cari_kartlar') is not null), v_enum, v_rls, v_trigger;

  -- Zorunlu yapı kontrolleri
  if to_regclass('public.cari_kartlar') is null then
    raise exception 'M3 hata: cari_kartlar tablosu oluşmadı';
  end if;
  if v_enum <> 6 then
    raise exception 'M3 hata: cari_tip enum % değer içeriyor (6 bekleniyor)', v_enum;
  end if;
  if v_rls is not true then
    raise exception 'M3 hata: cari_kartlar RLS etkin değil';
  end if;
  if not v_trigger then
    raise exception 'M3 hata: cari_kartlar_updated_at trigger yok';
  end if;
  -- RLS'in bağımlı olduğu kolon mevcut mu?
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'cari_kartlar'
      and column_name = 'olusturan_user_id'
  ) then
    raise exception 'M3 hata: olusturan_user_id kolonu yok (RLS bağımlı)';
  end if;
  -- CHECK kuralları yerinde mi (kritik olanlar)?
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.cari_kartlar'::regclass
      and conname in ('cari_vkn_format','cari_tckn_format','cari_meta_obje','cari_unvan_dolu')
    having count(*) = 4
  ) then
    raise exception 'M3 hata: beklenen CHECK kısıtları eksik';
  end if;

  raise notice 'M3 doğrulama başarılı ✓';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
