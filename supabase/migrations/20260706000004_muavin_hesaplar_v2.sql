-- =====================================================================
-- M4a — muavin_hesaplar v2 (şema + çekirdek cari/muavin seed)
-- =====================================================================
-- Referans: M4-ETKI-ANALIZI.md, V2-VERI-MODELI §2.3, ADR-004/005/016, KARARLAR A1/A2
--
-- ⚠️ KOORDİNELİ ADIM: Bu SQL TEK BAŞINA canlıya uygulanmaz. M4b (frontend
--    uyarlaması: muavin.ts, YeniMuavinModal, AdminMuavinHesaplarSayfasi,
--    HesapKoduInput + database.types.ts regen) ile BİRLİKTE deploy edilir.
--    Şemayı frontend'siz uygulamak muavin admin sayfasını ve muavin
--    oluşturmayı kırar (eski `tip` kolonu / kod-PK'ya bağlılar).
--
-- Değişimler (eski → v2):
--   - PK: kod → uuid (id)
--   - tip kolonu KALDIRILDI (TDHP grubu ana_kod'dan türetilir — ADR-004)
--   - +cari_id (S0 #4), +varsayilan (A1), +isletme_id (evren, FK M10), +olusturan_user_id
--   - Ana hesaba kayıt yasağı: kod format CHECK (3 haneli ana kod muavin olamaz)
--   - Cari zorunluluğu: cari_gerektirir trigger'ı
--
-- Bağımlılık: M1 (hesap_plani.cari_gerektirir), M3 (cari_kartlar). M3 seed'siz
--   uygulandığı için çekirdek cari kartlar BURADA seed'lenir (muavinlerden önce).
--
-- İdempotent: eski şema (tip kolonlu) tespit edilip düşürülür; v2 zaten varsa
--   DOKUNULMAZ (create if not exists) → yeniden çalıştırmada v2 verisi korunur.
--   Seed'ler anti-join / on-conflict ile idempotent.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Çekirdek cari seed (M3'ten ertelenen — muavinlerden ÖNCE)
-- ---------------------------------------------------------------------
-- Global havuz carileri (isletme_id=null). Anti-join ile idempotent (unvan bazlı).
insert into public.cari_kartlar (tip, unvan, vergi_dairesi, il)
select v.tip::cari_tip, v.unvan, v.vd, v.il
from (values
  ('kamu',      'Büyük Mükellefler Vergi Dairesi', null,       'İstanbul'),
  ('kamu',      'Sosyal Güvenlik Kurumu',          null,       'Ankara'),
  ('banka',     'Türkiye İş Bankası',              null,        null),
  ('banka',     'Ziraat Bankası',                  null,        null),
  ('musteri',   'ABC Ticaret A.Ş.',                'Kadıköy',  'İstanbul'),
  ('tedarikci', 'Delta Tedarik Ltd. Şti.',         'Şişli',    'İstanbul')
) as v(tip, unvan, vd, il)
where not exists (
  select 1 from public.cari_kartlar c
  where c.unvan = v.unvan and c.isletme_id is null
);

-- ---------------------------------------------------------------------
-- 1. Eski şemayı düşür (yalnız tip kolonluysa) → v2'ye geçiş
-- ---------------------------------------------------------------------
-- Tablo şu an boş; drop güvenli. `tip` kolonu kontrolüyle: v2 zaten kuruluysa
-- (tip yok) DÜŞÜRÜLMEZ → re-run'da veri kaybı olmaz.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='muavin_hesaplar' and column_name='tip'
  ) then
    drop table public.muavin_hesaplar;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 2. muavin_hesaplar v2 tablo
-- ---------------------------------------------------------------------
create table if not exists public.muavin_hesaplar (
  id                 uuid primary key default gen_random_uuid(),
  kod                text not null,
  ana_kod            text not null references public.hesap_plani(kod) on delete restrict,
  ad                 text not null,
  cari_id            uuid references public.cari_kartlar(id) on delete restrict,
  varsayilan         boolean not null default false,
  -- Evren (ADR-010) — isletme_id FK YOK: isletmeler M10'da. null = global havuz.
  isletme_id         text,
  olusturan_user_id  uuid references public.kullanicilar(id) on delete set null,
  sira               int not null default 0,
  aciklama           text,
  aktif              boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- ANA HESABA KAYIT YASAĞI (ADR-005 Katman A): 3 haneli ana kod muavin olamaz.
  constraint muavin_kod_format check (kod ~ '^[0-9]{3}(\.[0-9]+)+$'),
  -- kod, ana_kod ile başlamalı (120 → 120.001)
  constraint muavin_ana_kod_uyumu check (kod like ana_kod || '.%'),
  -- Evren-içi kod tekilliği (PG15+ nulls not distinct — PG17.6 doğrulandı)
  constraint muavin_evren_kod_uniq
    unique nulls not distinct (isletme_id, olusturan_user_id, kod)
);

comment on table public.muavin_hesaplar is
  'Muavin (alt/yardimci) hesaplar. Kayit bu duzeyde yapilir; ana hesaba kayit yasak (kod format CHECK). cari_gerektirir hesaplarda cari_id zorunlu (trigger). tip kaldirildi -> ana_kod ilk 2 hane.';

-- ---------------------------------------------------------------------
-- 3. Index'ler
-- ---------------------------------------------------------------------
create index if not exists muavin_ana_kod_idx on public.muavin_hesaplar (ana_kod);
create index if not exists muavin_cari_idx    on public.muavin_hesaplar (cari_id) where cari_id is not null;
create index if not exists muavin_aktif_idx   on public.muavin_hesaplar (isletme_id, aktif) where aktif;

-- Varsayılan tekilliği: global havuzda ana_kod başına bir varsayilan=true
create unique index if not exists muavin_global_varsayilan_uniq
  on public.muavin_hesaplar (ana_kod)
  where isletme_id is null and olusturan_user_id is null and varsayilan;

-- ---------------------------------------------------------------------
-- 4. Cari zorunluluğu trigger'ı (S0 #4)
-- ---------------------------------------------------------------------
create or replace function public.muavin_cari_zorunlu()
returns trigger language plpgsql as $fn$
declare
  v_gerek boolean;
begin
  select cari_gerektirir into v_gerek
    from public.hesap_plani where kod = new.ana_kod;
  if coalesce(v_gerek, false) and new.cari_id is null then
    raise exception 'Ana hesap % cari gerektirir; muavin (%) cari_id olmadan acilamaz.',
      new.ana_kod, new.kod;
  end if;
  return new;
end $fn$;

drop trigger if exists muavin_cari_zorunlu_trg on public.muavin_hesaplar;
create trigger muavin_cari_zorunlu_trg
  before insert or update on public.muavin_hesaplar
  for each row execute function public.muavin_cari_zorunlu();

-- updated_at trigger
drop trigger if exists muavin_hesaplar_updated_at on public.muavin_hesaplar;
create trigger muavin_hesaplar_updated_at
  before update on public.muavin_hesaplar
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 5. RLS — hibrit sahiplik (cari_kartlar ile aynı desen)
-- ---------------------------------------------------------------------
alter table public.muavin_hesaplar enable row level security;

drop policy if exists "muavin_read" on public.muavin_hesaplar;
create policy "muavin_read" on public.muavin_hesaplar for select
  using (
    olusturan_user_id is null
    or olusturan_user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "muavin_admin_all" on public.muavin_hesaplar;
create policy "muavin_admin_all" on public.muavin_hesaplar for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "muavin_own_insert" on public.muavin_hesaplar;
create policy "muavin_own_insert" on public.muavin_hesaplar for insert
  with check (olusturan_user_id = auth.uid() and isletme_id is not null);

-- ---------------------------------------------------------------------
-- 6. Muavin seed — global havuz
-- ---------------------------------------------------------------------
-- 6a. Cari-olmayan havuz muavinleri (muavin_secim_zorunlu=false → varsayilan=true, oto)
insert into public.muavin_hesaplar (kod, ana_kod, ad, varsayilan) values
  ('100.01','100','Merkez Kasa',                        true),
  ('101.01','101','Alınan Çekler (Portföy)',            true),
  ('103.01','103','Verilen Çekler',                     true),
  ('153.01','153','Ticari Mallar',                      true),
  ('190.01','190','Devreden KDV',                       true),
  ('191.01','191','İndirilecek KDV',                    true),
  ('391.01','391','Hesaplanan KDV',                     true),
  ('600.01','600','Yurtiçi Satışlar',                   true),
  ('610.01','610','Satıştan İadeler',                   true),
  ('611.01','611','Satış İskontoları',                  true),
  ('621.01','621','Satılan Ticari Mallar Maliyeti',     true),
  ('632.01','632','Genel Yönetim Giderleri',            true),
  ('760.01','760','Pazarlama Satış ve Dağıtım Gideri',  true),
  ('770.01','770','Genel Yönetim Gideri',               true),
  ('780.01','780','Finansman Giderleri',                true)
on conflict on constraint muavin_evren_kod_uniq do update set
  ad = excluded.ad, ana_kod = excluded.ana_kod, varsayilan = excluded.varsayilan;

-- 6b. Cari-bağlı muavinler (cari_gerektirir=true → cari_id zorunlu, varsayilan=false)
insert into public.muavin_hesaplar (kod, ana_kod, ad, cari_id, varsayilan) values
  ('102.01','102','Türkiye İş Bankası',
     (select id from public.cari_kartlar where unvan='Türkiye İş Bankası' and isletme_id is null), false),
  ('102.02','102','Ziraat Bankası',
     (select id from public.cari_kartlar where unvan='Ziraat Bankası' and isletme_id is null), false),
  ('360.01','360','Ödenecek KDV',
     (select id from public.cari_kartlar where unvan='Büyük Mükellefler Vergi Dairesi' and isletme_id is null), false),
  ('360.02','360','Ödenecek Gelir Vergisi Stopajı',
     (select id from public.cari_kartlar where unvan='Büyük Mükellefler Vergi Dairesi' and isletme_id is null), false),
  ('360.03','360','Sorumlu Sıfatıyla Ödenecek KDV',
     (select id from public.cari_kartlar where unvan='Büyük Mükellefler Vergi Dairesi' and isletme_id is null), false),
  ('361.01','361','Ödenecek SGK Primleri',
     (select id from public.cari_kartlar where unvan='Sosyal Güvenlik Kurumu' and isletme_id is null), false),
  ('120.001','120','ABC Ticaret A.Ş.',
     (select id from public.cari_kartlar where unvan='ABC Ticaret A.Ş.' and isletme_id is null), false),
  ('320.001','320','Delta Tedarik Ltd. Şti.',
     (select id from public.cari_kartlar where unvan='Delta Tedarik Ltd. Şti.' and isletme_id is null), false)
on conflict on constraint muavin_evren_kod_uniq do update set
  ad = excluded.ad, ana_kod = excluded.ana_kod,
  cari_id = excluded.cari_id, varsayilan = excluded.varsayilan;

-- ---------------------------------------------------------------------
-- 7. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare
  v_cari             int;
  v_muavin           int;
  v_cari_eksik       int;
  v_varsayilan_eksik int;
begin
  select count(*) into v_cari   from public.cari_kartlar;
  select count(*) into v_muavin from public.muavin_hesaplar;

  -- cari_gerektirir hesabın muavininde cari_id boş olan (olmamalı)
  select count(*) into v_cari_eksik
    from public.muavin_hesaplar m
    join public.hesap_plani h on h.kod = m.ana_kod
    where h.cari_gerektirir and m.cari_id is null;

  -- muavin_secim_zorunlu=false ana hesapta muavin var ama varsayilan yok (olmamalı)
  select count(*) into v_varsayilan_eksik from (
    select m.ana_kod
    from public.muavin_hesaplar m
    join public.hesap_plani h on h.kod = m.ana_kod
    where not h.muavin_secim_zorunlu
      and m.isletme_id is null and m.olusturan_user_id is null
    group by m.ana_kod
    having bool_or(m.varsayilan) is not true
  ) x;

  raise notice 'M4a raporu — cari: %, muavin: %, cari_id eksik: %, varsayilan eksik: %',
    v_cari, v_muavin, v_cari_eksik, v_varsayilan_eksik;

  if to_regclass('public.muavin_hesaplar') is null then
    raise exception 'M4a hata: muavin_hesaplar tablosu yok';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='muavin_hesaplar' and column_name='tip'
  ) then
    raise exception 'M4a hata: tip kolonu hâlâ mevcut';
  end if;
  if v_cari_eksik > 0 then
    raise exception 'M4a hata: % muavinde cari_gerektirir ama cari_id boş', v_cari_eksik;
  end if;
  if v_varsayilan_eksik > 0 then
    raise exception 'M4a hata: % otomatik-seçim hesabında varsayılan muavin yok', v_varsayilan_eksik;
  end if;

  raise notice 'M4a doğrulama başarılı';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
