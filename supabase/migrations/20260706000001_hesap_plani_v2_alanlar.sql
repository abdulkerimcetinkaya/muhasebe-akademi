-- =====================================================================
-- M1 — hesap_plani v2 alanları (KARARLAR-M1-M2.md · D bölümü)
-- =====================================================================
-- Additive: hesap_plani'ye 3 yeni kolon + 272 hesap için kural-tabanlı seed.
-- Hiçbir mevcut kod bu kolonları okumaz → görünmez sprint, sıfır regresyon.
--
-- Kolonlar (V2-VERI-MODELI §2.1, KARARLAR A1/A2):
--   normal_bakiye         — mizan "ters bakiye" uyarısı + öğretim (borc/alacak/null)
--   muavin_secim_zorunlu  — UI kullanıcıyı muavin seçmeye zorlar mı? (ADR-004)
--   cari_gerektirir       — muavin cari kartsız açılamaz mı? (S0 #4, ADR-004)
--
-- İdempotent (manuel çalıştırma tercihi): add column if not exists + UPDATE.
-- Tekrar çalıştırıldığında değerler kurala göre aynı sonuca yakınsar.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Kolonlar
-- ---------------------------------------------------------------------
alter table public.hesap_plani
  add column if not exists normal_bakiye text
    check (normal_bakiye in ('borc','alacak'));

alter table public.hesap_plani
  add column if not exists muavin_secim_zorunlu boolean not null default false;

alter table public.hesap_plani
  add column if not exists cari_gerektirir boolean not null default false;

comment on column public.hesap_plani.normal_bakiye is
  'Hesabın normal bakiye tarafı. Kontra (-) hesaplarda sınıf varsayılanının tersi. null = kapanış/düzeltme.';
comment on column public.hesap_plani.muavin_secim_zorunlu is
  'true: UI kullanıcıyı muavini aktif seçmeye zorlar. false: varsayılan muavin otomatik dolar (ADR-004, muavin_hesaplar.varsayilan).';
comment on column public.hesap_plani.cari_gerektirir is
  'true: bu hesabın muavini cari kartla bağlı olmak zorunda (S0 #4). Muavin insert trigger''ı M4''te zorlar.';

-- ---------------------------------------------------------------------
-- 2. normal_bakiye — kural tabanlı
-- ---------------------------------------------------------------------
-- ÖNEMLİ: "(-)" kontra-flip YALNIZ bilanço hesaplarında (AKTİF/PASİF) geçerli.
-- Gelir tablosu hesaplarında "(-)" = "gelir tablosunda eksi kalem" demek,
-- "defter bakiyesi ters" DEĞİL → GELİR hep alacak, GİDER/MALİYET hep borç.
--   AKTİF   → borc; kontra "(-)" → alacak (103 Verilen Çekler, 257 Bir. Amort.)
--   PASİF   → alacak; kontra "(-)" → borc (501 Ödenmemiş Sermaye, 580 Geç. Yıl Zar.)
--   GELİR   → alacak (600 Yurt İçi Satışlar)
--   GİDER   → borc (610 Satıştan İadeler (-), 620 SMM, 632 Gen. Yön. Gid.)
--   MALİYET → borc (770; yansıtma 7X1 hesapları da borc — 7/A modülünde v2.2 gözden geçirilecek)
--   KAPANIŞ → null
update public.hesap_plani set normal_bakiye = case
  when tur = 'AKTİF'  then case when ad like '%(-)%' then 'alacak' else 'borc' end
  when tur = 'PASİF'  then case when ad like '%(-)%' then 'borc'   else 'alacak' end
  when tur in ('GİDER','MALİYET') then 'borc'
  when tur = 'GELİR'  then 'alacak'
  else null  -- KAPANIŞ
end;

-- ---------------------------------------------------------------------
-- 3. cari_gerektirir — dış tarafla yürüyen bakiye taşıyan hesaplar
-- ---------------------------------------------------------------------
-- Kapsam (KARARLAR A2): muavini işletme dışı belirli bir gerçek/tüzel kişiyle
--   (müşteri/tedarikçi/personel/kamu/banka/ortak) yürüyen bakiyeyi temsil eden
--   hesaplar. Cari kart zorunlu.
-- Kapsam DIŞI (bilinçli): kontra/karşılık "(-)" hesaplar; KDV havuzları
--   (190,191,192,193); iç hesaplar (100 kasa, 197,198); portföy/menkul kıymet
--   (101,103,110-118,301,304,305,306,309); inşaat hakediş (350,358).
-- MVP ticaret işletmesi çekirdeği aktif kullanır (102,120,121,320,321,335,360,361);
-- geri kalanı ileride kullanılınca hazır. Kimse okumadığı için M4 öncesi düzeltilebilir.
update public.hesap_plani set cari_gerektirir = true
where kod in (
  -- Sınıf 1 — Dönen Varlıklar (ticari/diğer alacaklar, avanslar)
  '102','120','121','126','127','128','131','132','133','135','136','138','159','195','196',
  -- Sınıf 2 — Duran Varlıklar (uzun vadeli alacaklar)
  '220','221','226','231','232','233','235','236',
  -- Sınıf 3 — KV Yabancı Kaynaklar (mali/ticari/diğer borçlar, kamu)
  '300','303','320','321','326','329','331','332','333','335','336','340','349','360','361','368','369',
  -- Sınıf 4 — UV Yabancı Kaynaklar
  '400','420','421','426','429','431','432','433','436','438'
);

-- ---------------------------------------------------------------------
-- 4. muavin_secim_zorunlu
-- ---------------------------------------------------------------------
-- MVP kararı (KARARLAR A1): cari_gerektirir olan hesaplarda kullanıcı doğru
--   cariyi seçmeli → secim_zorunlu = true. Cari-olmayan hesaplar MVP'de tek
--   havuz muavinli (191.01, 391.01, 600.01, 770.01 …) → otomatik seçim → false.
-- İki kolon ayrı tutulur; v2.1'de çoklu kasa / KDV oran kırılımı gelince
--   secim_zorunlu, cari_gerektirir'den ayrışacak (o zaman ayrı UPDATE).
update public.hesap_plani set muavin_secim_zorunlu = cari_gerektirir;

-- ---------------------------------------------------------------------
-- 5. Doğrulama raporu (manuel çalıştırma için — NOTICE olarak yazılır)
-- ---------------------------------------------------------------------
do $$
declare
  v_toplam      int;
  v_bakiye_bos  int;
  v_cari        int;
  v_secim       int;
begin
  select count(*) into v_toplam from public.hesap_plani;
  select count(*) into v_bakiye_bos from public.hesap_plani where normal_bakiye is null;
  select count(*) into v_cari from public.hesap_plani where cari_gerektirir;
  select count(*) into v_secim from public.hesap_plani where muavin_secim_zorunlu;

  raise notice 'M1 raporu — toplam hesap: %, normal_bakiye null (KAPANIŞ bekleniyor ~5): %, cari_gerektirir: %, muavin_secim_zorunlu: %',
    v_toplam, v_bakiye_bos, v_cari, v_secim;

  -- Beklenti kontrolü: KAPANIŞ dışı hiçbir hesap normal_bakiye'siz kalmamalı
  if exists (
    select 1 from public.hesap_plani
    where normal_bakiye is null and tur <> 'KAPANIŞ'
  ) then
    raise exception 'M1 hata: KAPANIŞ olmayan hesapta normal_bakiye null kaldı';
  end if;
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
