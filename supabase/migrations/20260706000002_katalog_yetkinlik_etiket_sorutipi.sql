-- =====================================================================
-- M2 — Katalog: yetkinlikler + etiketler + soru_tipleri + M2M'ler
-- =====================================================================
-- Referans: SDD-V2 §7-§9, V2-VERI-MODELI §2.1/§4, ADR-008/009/015, KARARLAR §E
--
-- Additive: 5 yeni tablo + seed. Hiçbir mevcut kod bu tabloları okumaz →
-- görünmez sprint, sıfır regresyon. Soru çözme / kontrol.ts / admin / jsonb'lar
-- aynen çalışır.
--
-- Tablolar:
--   yetkinlikler        — ölçüm ekseni (hiyerarşik skill grafı, ADR-015)
--   etiketler           — filtre/keşif ekseni (modül + zorluk kategorileri)
--   soru_tipleri        — Question Engine kataloğu (tip = veri, ADR-008)
--   soru_yetkinlikleri  — M2M: soru ↔ yetkinlik (ağırlıklı, XP dağıtımı ADR-009)
--   soru_etiketleri     — M2M: soru ↔ etiket
--
-- Mimari not: M2M'ler şimdilik `sorular`'a bağlı (olay tablosu M5'te gelecek).
-- M5'te yetkinlik/etiket bağının olay düzeyine taşınması değerlendirilecek.
--
-- İdempotent (manuel çalıştırma): create if not exists + on conflict do update
-- + drop policy if exists. Tekrar çalıştırılabilir.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. yetkinlikler (katalog — hiyerarşik)
-- ---------------------------------------------------------------------
create table if not exists public.yetkinlikler (
  id                text primary key,
  ad                text not null,
  aciklama          text,
  ust_yetkinlik_id  text references public.yetkinlikler(id) on delete set null,
  sira              int not null default 0,
  thiings_icon      text,
  aktif             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists yetkinlikler_ust_idx
  on public.yetkinlikler (ust_yetkinlik_id);

drop trigger if exists yetkinlikler_updated_at on public.yetkinlikler;
create trigger yetkinlikler_updated_at before update on public.yetkinlikler
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 2. etiketler (katalog — filtre/keşif)
-- ---------------------------------------------------------------------
create table if not exists public.etiketler (
  id         text primary key,
  ad         text not null,
  kategori   text check (kategori in ('modul','zorluk')),
  sira       int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists etiketler_kategori_idx
  on public.etiketler (kategori);

-- ---------------------------------------------------------------------
-- 3. soru_tipleri (Question Engine kataloğu)
-- ---------------------------------------------------------------------
create table if not exists public.soru_tipleri (
  id                  text primary key,
  ad                  text not null,
  aciklama            text,
  -- Olayın hangi bileşenlerini ister: '{cozum}', '{belge}', '{cozum,belge}'...
  gerekli_bilesenler  text[] not null default '{}',
  -- KARARLAR §A: içerik türetme yöntemi
  uretim_yontemi      text not null
                      check (uretim_yontemi in ('otomatik','yari_otomatik','manuel')),
  -- Renderer/validator plugin'i hazır olmadan tip açılamaz (ADR-008)
  aktif               boolean not null default false,
  sira                int not null default 0,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists soru_tipleri_aktif_idx
  on public.soru_tipleri (aktif) where aktif;

drop trigger if exists soru_tipleri_updated_at on public.soru_tipleri;
create trigger soru_tipleri_updated_at before update on public.soru_tipleri
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- 4. soru_yetkinlikleri (M2M — ağırlıklı, XP dağıtımı)
-- ---------------------------------------------------------------------
create table if not exists public.soru_yetkinlikleri (
  soru_id       text not null references public.sorular(id) on delete cascade,
  yetkinlik_id  text not null references public.yetkinlikler(id) on delete restrict,
  agirlik       numeric(3,2) not null default 1.0 check (agirlik > 0 and agirlik <= 1),
  created_at    timestamptz not null default now(),
  primary key (soru_id, yetkinlik_id)
);

-- Ters yön: "bu yetkinlikteki sorular" (zayıf alan / benzer senaryo sorgusu)
create index if not exists soru_yetkinlikleri_yetkinlik_idx
  on public.soru_yetkinlikleri (yetkinlik_id);

-- ---------------------------------------------------------------------
-- 5. soru_etiketleri (M2M — filtre)
-- ---------------------------------------------------------------------
create table if not exists public.soru_etiketleri (
  soru_id     text not null references public.sorular(id) on delete cascade,
  etiket_id   text not null references public.etiketler(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (soru_id, etiket_id)
);

create index if not exists soru_etiketleri_etiket_idx
  on public.soru_etiketleri (etiket_id);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.yetkinlikler        enable row level security;
alter table public.etiketler           enable row level security;
alter table public.soru_tipleri        enable row level security;
alter table public.soru_yetkinlikleri  enable row level security;
alter table public.soru_etiketleri     enable row level security;

-- Katalog + M2M: herkes okur (rozet/etiket gösterimi), yalnız admin yazar
drop policy if exists "yetkinlikler_public_read" on public.yetkinlikler;
create policy "yetkinlikler_public_read" on public.yetkinlikler for select using (true);
drop policy if exists "yetkinlikler_admin_all" on public.yetkinlikler;
create policy "yetkinlikler_admin_all" on public.yetkinlikler for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "etiketler_public_read" on public.etiketler;
create policy "etiketler_public_read" on public.etiketler for select using (true);
drop policy if exists "etiketler_admin_all" on public.etiketler;
create policy "etiketler_admin_all" on public.etiketler for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "soru_tipleri_public_read" on public.soru_tipleri;
create policy "soru_tipleri_public_read" on public.soru_tipleri for select using (true);
drop policy if exists "soru_tipleri_admin_all" on public.soru_tipleri;
create policy "soru_tipleri_admin_all" on public.soru_tipleri for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "soru_yetkinlikleri_public_read" on public.soru_yetkinlikleri;
create policy "soru_yetkinlikleri_public_read" on public.soru_yetkinlikleri for select using (true);
drop policy if exists "soru_yetkinlikleri_admin_all" on public.soru_yetkinlikleri;
create policy "soru_yetkinlikleri_admin_all" on public.soru_yetkinlikleri for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "soru_etiketleri_public_read" on public.soru_etiketleri;
create policy "soru_etiketleri_public_read" on public.soru_etiketleri for select using (true);
drop policy if exists "soru_etiketleri_admin_all" on public.soru_etiketleri;
create policy "soru_etiketleri_admin_all" on public.soru_etiketleri for all
  using (public.is_admin()) with check (public.is_admin());

-- =====================================================================
-- SEED
-- =====================================================================

-- --- Yetkinlikler (22 — hiyerarşik, parent'lar önce) ---------------
insert into public.yetkinlikler (id, ad, aciklama, ust_yetkinlik_id, sira) values
  ('muhasebe-temelleri', 'Muhasebe Temelleri', 'Temel muhasebe mantığı, borç-alacak, hesap planı', null, 1),
  ('belge-okuma',        'Belge Okuma',        'Fatura/dekont/makbuzdan olay teşhisi',            'muhasebe-temelleri', 2),
  ('cari-hesap',         'Cari Hesap',         'Müşteri/tedarikçi cari takibi',                    'muhasebe-temelleri', 3),
  ('muavin-hesap',       'Muavin Hesap',       'Ana hesap altında muavin/alt hesap kullanımı',     'cari-hesap', 4),
  ('yevmiye-kaydi',      'Yevmiye Kaydı',      'Yevmiye maddesi kurma, denge',                     'muhasebe-temelleri', 5),
  ('kdv',                'KDV',                'Katma değer vergisi mantığı',                      'muhasebe-temelleri', 6),
  ('kdv-tahakkuku',      'KDV Tahakkuku',      'Ay sonu 191/391 mahsuplaşma',                      'kdv', 7),
  ('tevkifat',           'Tevkifat',           'KDV tevkifatı, sorumlu sıfatıyla ödeme',           'kdv', 8),
  ('kdv-iade',           'KDV İadesi',         'İstisna/iade süreçleri',                           'kdv', 9),
  ('bordro',             'Bordro',             'Ücret bordrosu, brüt-net, kesintiler',             'muhasebe-temelleri', 10),
  ('sgk',                'SGK',                'SGK primleri, tahakkuk, bildirim',                 'bordro', 11),
  ('vergi-muhasebesi',   'Vergi Muhasebesi',   'Vergi hesapları, stopaj, tahakkuk',                'muhasebe-temelleri', 12),
  ('beyanname-analizi',  'Beyanname Analizi',  'KDV/muhtasar/SGK beyanname etkileri',              'vergi-muhasebesi', 13),
  ('uretim-muhasebesi',  'Üretim Muhasebesi',  '7/A maliyet, mamul akışı',                         'muhasebe-temelleri', 14),
  ('dis-ticaret',        'Dış Ticaret',        'İthalat/ihracat muhasebesi',                       'muhasebe-temelleri', 15),
  ('ithalat',            'İthalat',            'Gümrük, maliyet, KDV',                             'dis-ticaret', 16),
  ('ihracat',            'İhracat',            'KDV istisnası, kur farkı',                         'dis-ticaret', 17),
  ('amortisman',         'Amortisman',         'Duran varlık amortismanı',                         'muhasebe-temelleri', 18),
  ('donem-sonu',         'Dönem Sonu',         'Reeskont, karşılık, kapanış',                      'muhasebe-temelleri', 19),
  ('mizan-analizi',      'Mizan Analizi',      'Mizan okuma, ters bakiye tespiti',                 'donem-sonu', 20),
  ('hata-bulma',         'Hata Bulma',         'Yanlış kayıt teşhisi ve düzeltme',                 'muhasebe-temelleri', 21),
  ('tesvik-muhasebesi',  'Teşvik Muhasebesi',  'Teşvik/destek kayıtları',                          'muhasebe-temelleri', 22)
on conflict (id) do update set
  ad = excluded.ad,
  aciklama = excluded.aciklama,
  ust_yetkinlik_id = excluded.ust_yetkinlik_id,
  sira = excluded.sira;

-- --- Etiketler (22 — 18 modül + 4 zorluk) --------------------------
insert into public.etiketler (id, ad, kategori, sira) values
  ('genel-muhasebe', 'Genel Muhasebe', 'modul', 1),
  ('vergi',          'Vergi',          'modul', 2),
  ('kdv',            'KDV',            'modul', 3),
  ('tevkifat',       'Tevkifat',       'modul', 4),
  ('bordro',         'Bordro',         'modul', 5),
  ('sgk',            'SGK',            'modul', 6),
  ('uretim',         'Üretim',         'modul', 7),
  ('dis-ticaret',    'Dış Ticaret',    'modul', 8),
  ('ihracat',        'İhracat',        'modul', 9),
  ('ithalat',        'İthalat',        'modul', 10),
  ('amortisman',     'Amortisman',     'modul', 11),
  ('donem-sonu',     'Dönem Sonu',     'modul', 12),
  ('cari',           'Cari',           'modul', 13),
  ('muavin',         'Muavin',         'modul', 14),
  ('belge',          'Belge',          'modul', 15),
  ('mizan',          'Mizan',          'modul', 16),
  ('beyanname',      'Beyanname',      'modul', 17),
  ('tesvik',         'Teşvik',         'modul', 18),
  ('kolay',          'Kolay',          'zorluk', 19),
  ('orta',           'Orta',           'zorluk', 20),
  ('zor',            'Zor',            'zorluk', 21),
  ('uzman',          'Uzman',          'zorluk', 22)
on conflict (id) do update set
  ad = excluded.ad,
  kategori = excluded.kategori,
  sira = excluded.sira;

-- --- Soru tipleri (9 — yalnız yevmiye_kaydi aktif) -----------------
insert into public.soru_tipleri (id, ad, aciklama, gerekli_bilesenler, uretim_yontemi, aktif, sira) values
  ('yevmiye_kaydi',     'Yevmiye Kaydı',     'Senaryodan yevmiye maddesi kurma (borç/alacak).', array['cozum'],                  'otomatik',      true,  1),
  ('belge_analizi',     'Belge Analizi',     'Belge üzerinden alan/tutar sorusu.',              array['belge'],                  'yari_otomatik', false, 2),
  ('hata_bulma',        'Hata Bulma',        'Hatalı kayıtta yanlış satırı bulma.',             array['cozum','hata_kurallari'], 'yari_otomatik', false, 3),
  ('coktan_secmeli',    'Çoktan Seçmeli',    'Dört seçenekli kavram/uygulama sorusu.',          array['cozum'],                  'yari_otomatik', false, 4),
  ('bosluk_doldurma',   'Boşluk Doldurma',   'Kayıtta eksik hesap/tutar tamamlama.',            array['cozum'],                  'yari_otomatik', false, 5),
  ('erp_islemi',        'ERP İşlemi',        'Simülasyon içinde serbest kayıt (cari/muavin).',  array['belge','cozum'],          'manuel',        false, 6),
  ('mizan_analizi',     'Mizan Analizi',     'Mizandan bakiye/tutar çıkarımı.',                 array['cozum'],                  'yari_otomatik', false, 7),
  ('beyanname_analizi', 'Beyanname Analizi', 'Kayıtların beyanname satırına etkisi.',           array['cozum','beyanname_etkileri'], 'yari_otomatik', false, 8),
  ('mevzuat_yorumu',    'Mevzuat Yorumu',    'İlgili mevzuat maddesiyle çözüm gerekçelendirme.', array['mevzuat'],                'manuel',        false, 9)
on conflict (id) do update set
  ad = excluded.ad,
  aciklama = excluded.aciklama,
  gerekli_bilesenler = excluded.gerekli_bilesenler,
  uretim_yontemi = excluded.uretim_yontemi,
  aktif = excluded.aktif,
  sira = excluded.sira;

-- =====================================================================
-- DOĞRULAMA
-- =====================================================================
do $$
declare
  v_yetkinlik      int;
  v_sorutipi       int;
  v_etiket         int;
  v_gecersiz       int;
begin
  select count(*) into v_yetkinlik from public.yetkinlikler;
  select count(*) into v_sorutipi  from public.soru_tipleri;
  select count(*) into v_etiket    from public.etiketler;
  select count(*) into v_gecersiz  from public.soru_tipleri
    where uretim_yontemi not in ('otomatik','yari_otomatik','manuel');

  raise notice 'M2 raporu — yetkinlik: % (bekl. 22), soru_tipi: % (bekl. 9), etiket: % (bekl. 22), gecersiz uretim_yontemi: %, aktif soru_tipi: %',
    v_yetkinlik, v_sorutipi, v_etiket, v_gecersiz,
    (select count(*) from public.soru_tipleri where aktif);

  if v_yetkinlik <> 22 then
    raise exception 'M2 hata: yetkinlik sayısı % (22 bekleniyor)', v_yetkinlik;
  end if;
  if v_sorutipi <> 9 then
    raise exception 'M2 hata: soru tipi sayısı % (9 bekleniyor)', v_sorutipi;
  end if;
  if v_etiket <> 22 then
    raise exception 'M2 hata: etiket sayısı % (22 bekleniyor)', v_etiket;
  end if;
  if v_gecersiz > 0 then
    raise exception 'M2 hata: % satırda geçersiz uretim_yontemi', v_gecersiz;
  end if;
  if to_regclass('public.soru_yetkinlikleri') is null then
    raise exception 'M2 hata: soru_yetkinlikleri tablosu oluşmadı';
  end if;
  if to_regclass('public.soru_etiketleri') is null then
    raise exception 'M2 hata: soru_etiketleri tablosu oluşmadı';
  end if;

  raise notice 'M2 doğrulama başarılı ✓';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
