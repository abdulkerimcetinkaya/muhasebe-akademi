-- =====================================================================
-- M6a — belgeler iskeleti (belge_tipleri + belgeler + olay_belgeleri)
-- =====================================================================
-- Referans: M6-MIMARI-ANALIZ.md, ADR-003/007/008/016/018, V2-VERI-MODELI §2.2/§4/§5
--
-- ⚠️ SALT YAPI — BACKFILL YOK (ADR-018 ek karar): Bu migration yalnız normalize
--    yapıyı kurar. Mevcut `sorular.belgeler` jsonb'una DOKUNMAZ, veri taşımaz.
--    28 sorudaki jsonb → belgeler normalize geçişi AYRI migration'da (M6b),
--    kontrollü + raporlu yapılır (cari_id eşlemesi best-effort değil, raporlu).
--    Neden ayrı: M5 etiket-backfill dersi — kör/otomatik taşıma yanıltıcı.
--
-- ⚠️ SALT ADDITIVE: Mevcut hiçbir kolon/tip değişmez. Frontend `sorular.belgeler`
--    jsonb'unu ve `Belge` union'ını okumaya devam eder → sıfır regresyon.
--
-- Kapsam (M6-MIMARI-ANALIZ Bölüm 5 · M6a):
--   + belge_yon enum          (gelen/giden/ic — ADR-003 'ic' açık kararının kapanışı)
--   + belge_tipleri           (KATALOG tablo — enum DEĞİL, ADR-018)
--   + belgeler                (paylaşılan referans varlık; cari_kartlar/muavin deseni)
--   + olay_belgeleri          (M2M — M5'te ertelendi, FK hedefi `belgeler` artık var)
--   + belge_tipleri seed      (~13 tip)
--
-- Ertelenen:
--   sorular.belgeler jsonb → belgeler backfill   → M6b (kontrollü/raporlu)
--   belge ↔ mevzuat (VUK belge düzeni)            → M8
--   belgeler.storage_path (OCR asset)             → OCR modülü
--   beyanname motoru                              → v2.2 (beyanname burada bir TİP)
--
-- İdempotent: create if not exists + add ... if not exists + on conflict do update
--   + drop policy if exists. Tekrar çalıştırılabilir.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Enum — belge_yon (işletme perspektifi)
-- ---------------------------------------------------------------------
-- gelen = işletmeye gelen (alış/gider), giden = işletmeden çıkan (satış),
-- ic = iç fiş (bordro/tahakkuk/açılış/kapanış/amortisman — dış karşı taraf yok/kamu).
-- NOT: dekontun jsonb'daki yon:BORÇ/ALACAK'ı BANKA perspektifidir; bu enum DEĞİL,
--      belgeler.meta'ya gider (M6-MIMARI-ANALIZ §3 uyarısı).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'belge_yon') then
    create type public.belge_yon as enum ('gelen','giden','ic');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. belge_tipleri (KATALOG — soru_tipleri deseni, ADR-018)
-- ---------------------------------------------------------------------
create table if not exists public.belge_tipleri (
  id              text primary key,
  ad              text not null,
  kategori        text check (kategori in ('ticari','mali','resmi','bordro')),
  varsayilan_yon  public.belge_yon,                 -- tipin tipik yönü
  gerekli_alanlar text[] not null default '{}',     -- render + doğrulama ipucu
  thiings_icon    text,
  -- Renderer (belge görsel şablonu) hazır olmadan tip açılmaz (soru_tipleri deseni)
  aktif           boolean not null default false,
  sira            int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists belge_tipleri_aktif_idx
  on public.belge_tipleri (aktif) where aktif;

drop trigger if exists belge_tipleri_updated_at on public.belge_tipleri;
create trigger belge_tipleri_updated_at before update on public.belge_tipleri
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. belgeler (paylaşılan referans varlık — ADR-003/016)
-- ---------------------------------------------------------------------
create table if not exists public.belgeler (
  id                 uuid primary key default gen_random_uuid(),
  belge_tipi         text not null references public.belge_tipleri(id) on delete restrict,
  belge_no           text not null,
  tarih              date not null,
  -- Karşı taraf (satışta alıcı, alışta satıcı). İç fişte null/kamu.
  cari_id            uuid references public.cari_kartlar(id) on delete restrict,
  -- Evren (ADR-010): isletme_id FK YOK (isletmeler M10). null = global havuz.
  isletme_id         text,
  olusturan_user_id  uuid references public.kullanicilar(id) on delete set null,
  yon                public.belge_yon not null,
  matrah             numeric(14,2),
  kdv_orani          numeric(5,2),
  kdv_tutari         numeric(14,2),
  tevkifat_orani     text,                            -- '9/10' (pay/payda gösterimi)
  tevkifat_tutari    numeric(14,2),
  toplam             numeric(14,2) not null,
  para_birimi        text not null default 'TRY',     -- ihracat/döviz forward-compat
  -- belge KALEMLERİ (ürün/hizmet satırları: ad, miktar, birim, birim_fiyat, iskonto).
  -- ⚠️ GÖSTERİM verisidir, JOIN yapılmaz. Muhasebe FİŞİ satırı DEĞİLDİR — yevmiye
  --    borç/alacak satırları cozum_satirlari'dır (M7). İkisi karıştırılmamalı (ADR-016 §6.1).
  satirlar           jsonb not null default '[]',
  meta               jsonb not null default '{}',     -- tip-özel: ettn/valör/vade/borç-alacak/bordro detayı
  aktif              boolean not null default true,   -- soft delete
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

comment on table public.belgeler is
  'Belge = paylasilan referans varlik (ADR-003/016). cari/muavin ile ayni sinif; olaya olay_belgeleri M2M ile baglanir. Kalemler/tip-ozel alanlar jsonb (gosterim). Karsi taraf = cari_id; isletmenin kendisi = isletme_id baglami.';

create index if not exists belgeler_tipi_idx   on public.belgeler (belge_tipi);
create index if not exists belgeler_cari_idx   on public.belgeler (cari_id) where cari_id is not null;
create index if not exists belgeler_tarih_idx  on public.belgeler (belge_tipi, tarih);
create index if not exists belgeler_isletme_idx on public.belgeler (isletme_id, aktif) where aktif;

drop trigger if exists belgeler_updated_at on public.belgeler;
create trigger belgeler_updated_at before update on public.belgeler
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. olay_belgeleri (M2M — M5'ten devreden; FK hedefi artık var)
-- ---------------------------------------------------------------------
create table if not exists public.olay_belgeleri (
  olay_id     text not null references public.muhasebe_olaylari(id) on delete cascade,
  belge_id    uuid not null references public.belgeler(id) on delete restrict,
  sira        int not null default 0,
  -- belgenin olaydaki rolü (null = belirtilmemiş). Şimdilik CHECK; değer kümesi
  -- büyürse ileride olay_belge_rolleri kataloğuna terfi edebilir.
  rol         text check (rol in ('ana','ek','tahakkuk')),
  created_at  timestamptz not null default now(),
  primary key (olay_id, belge_id)
);
-- Ters yön: "bu belge hangi olaylarda" (yeniden kullanım sayacı)
create index if not exists olay_belgeleri_belge_idx on public.olay_belgeleri (belge_id);

-- ---------------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------------
-- 4a. belge_tipleri — KATALOG (herkes okur, admin yazar)
alter table public.belge_tipleri enable row level security;
drop policy if exists "belge_tipleri_public_read" on public.belge_tipleri;
create policy "belge_tipleri_public_read" on public.belge_tipleri for select using (true);
drop policy if exists "belge_tipleri_admin_all" on public.belge_tipleri;
create policy "belge_tipleri_admin_all" on public.belge_tipleri for all
  using (public.is_admin()) with check (public.is_admin());

-- 4b. belgeler — K + sahiplik (cari_kartlar/muavin_hesaplar deseni)
alter table public.belgeler enable row level security;
drop policy if exists "belgeler_read" on public.belgeler;
create policy "belgeler_read" on public.belgeler for select
  using (olusturan_user_id is null or olusturan_user_id = auth.uid() or public.is_admin());
drop policy if exists "belgeler_admin_all" on public.belgeler;
create policy "belgeler_admin_all" on public.belgeler for all
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "belgeler_own_insert" on public.belgeler;
create policy "belgeler_own_insert" on public.belgeler for insert
  with check (olusturan_user_id = auth.uid() and isletme_id is not null);

-- 4c. olay_belgeleri — İ (dolaylı): olayın onay durumunu izler; admin yazar
alter table public.olay_belgeleri enable row level security;
drop policy if exists "olay_belgeleri_read" on public.olay_belgeleri;
create policy "olay_belgeleri_read" on public.olay_belgeleri for select
  using (exists (
    select 1 from public.muhasebe_olaylari o
    where o.id = olay_belgeleri.olay_id
      and (o.durum = 'onayli' or public.is_admin() or o.ekleyen_id = auth.uid())
  ));
drop policy if exists "olay_belgeleri_admin_all" on public.olay_belgeleri;
create policy "olay_belgeleri_admin_all" on public.olay_belgeleri for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 5. SEED — belge_tipleri (~13)
-- ---------------------------------------------------------------------
-- aktif=true: mevcut Belge union render şablonu OLAN tipler (fatura/perakende/
--   dekont/çek/senet). aktif=false: renderer henüz yok (irsaliye/SMM/bordro/
--   gider pusulası/tahakkuk/beyanname/amortisman) — soru_tipleri deseni.
insert into public.belge_tipleri (id, ad, kategori, varsayilan_yon, gerekli_alanlar, aktif, sira) values
  ('satis_faturasi',    'Satış Faturası',           'ticari', 'giden', array['matrah','kdv_orani','toplam'],       true,  1),
  ('alis_faturasi',     'Alış Faturası',            'ticari', 'gelen', array['matrah','kdv_orani','toplam'],       true,  2),
  ('irsaliye',          'Sevk İrsaliyesi',          'ticari', 'giden', array['belge_no','tarih'],                   false, 3),
  ('perakende_fisi',    'Perakende Satış Fişi',     'ticari', 'giden', array['toplam','kdv_orani'],                 true,  4),
  ('banka_dekontu',     'Banka Dekontu',            'mali',   'gelen', array['tarih','toplam'],                     true,  5),
  ('smm_makbuzu',       'Serbest Meslek Makbuzu',   'ticari', 'gelen', array['matrah','kdv_orani','tevkifat_orani'],false, 6),
  ('cek',               'Çek',                      'mali',   'gelen', array['belge_no','tarih','toplam'],          true,  7),
  ('senet',             'Senet (Bono/Poliçe)',      'mali',   'gelen', array['belge_no','tarih','toplam'],          true,  8),
  ('gider_pusulasi',    'Gider Pusulası',           'ticari', 'gelen', array['matrah','toplam'],                    false, 9),
  ('bordro',            'Ücret Bordrosu',           'bordro', 'ic',    array['toplam'],                             false, 10),
  ('tahakkuk_fisi',     'Tahakkuk Fişi',            'resmi',  'ic',    array['toplam'],                             false, 11),
  ('beyanname',         'Beyanname',                'resmi',  'ic',    array['tarih'],                              false, 12),
  ('amortisman_listesi','Amortisman Listesi',       'resmi',  'ic',    array['tarih'],                              false, 13)
on conflict (id) do update set
  ad = excluded.ad,
  kategori = excluded.kategori,
  varsayilan_yon = excluded.varsayilan_yon,
  gerekli_alanlar = excluded.gerekli_alanlar,
  aktif = excluded.aktif,
  sira = excluded.sira;

-- ---------------------------------------------------------------------
-- 6. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare
  v_tip       int;
  v_belge     int;
  v_olay_bel  int;
begin
  select count(*) into v_tip      from public.belge_tipleri;
  select count(*) into v_belge    from public.belgeler;
  select count(*) into v_olay_bel from public.olay_belgeleri;

  raise notice 'M6a raporu — belge_tipi: % (bekl. 13), aktif tip: %, belgeler: % (bekl. 0 — M6a backfill yok), olay_belgeleri: % (bekl. 0)',
    v_tip, (select count(*) from public.belge_tipleri where aktif), v_belge, v_olay_bel;

  if to_regclass('public.belge_tipleri') is null
     or to_regclass('public.belgeler') is null
     or to_regclass('public.olay_belgeleri') is null then
    raise exception 'M6a hata: tablolardan biri oluşmadı';
  end if;
  if not exists (select 1 from pg_type where typname = 'belge_yon') then
    raise exception 'M6a hata: belge_yon enum yok';
  end if;
  if v_tip <> 13 then
    raise exception 'M6a hata: belge_tipleri sayısı % (13 bekleniyor)', v_tip;
  end if;
  -- M6a salt yapı: veri taşınmamalı (backfill M6b'de)
  if v_belge > 0 or v_olay_bel > 0 then
    raise exception 'M6a hata: belgeler/olay_belgeleri boş değil (backfill M6b kapsamı)';
  end if;

  raise notice 'M6a doğrulama başarılı ✓ (yapı kuruldu; normalize geçiş M6b bekliyor)';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
