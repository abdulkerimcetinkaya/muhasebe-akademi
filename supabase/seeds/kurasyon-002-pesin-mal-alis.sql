-- =====================================================================
-- KÜRASYON-002 — Peşin Ticari Mal Alışı (içerik seed)
-- =====================================================================
-- Referans: CUR-100 (altın referans), KUR-001 yapısı.
--
-- ⚠️ MIGRATION DEĞİL — İÇERİK SEED: Şema değiştirmez; yalnız veri ekler.
--    KUR-001 ile aynı desen. Migration geçmişine GİRMEZ (execute_sql ile
--    uygulanır, apply_migration ile değil).
--
-- İdempotent: on conflict / not exists guard'ları + doğal anahtar lookup'ı
--    (uuid literal gömülmez). Tekrar çalıştırılabilir.
--
-- KUR-001'DEN FARK: Ödeme PEŞİN (banka) yapılır → satıcı borcu (320) DOĞMAZ.
--    Karşı hesap 102 Bankalar'dır. Atlas Market sürekli envanter kullanır.
--
-- NOT (repo standardı): Banka muavini repo'da 102.01 "Türkiye İş Bankası"
--    (cari-bağlı) olarak tanımlıdır; genel "102.001 Bankalar" muavini yoktur.
--    Mevcut standardı bozmamak için 102.01 kullanılır (task talimatı gereği).
--
-- Senaryo: Atlas Market, Delta Tedarik Ltd. Şti.'den 40.000 TL ticari mal aldı,
--    %20 KDV (8.000), toplam 48.000 banka hesabından peşin ödendi.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. mevzuat (KUR-001 ile aynı dayanaklar — idempotent, zaten seed'li olabilir)
-- ---------------------------------------------------------------------
insert into public.mevzuat_maddeleri (kaynak_id, madde_no) values
  ('kdvk', '29/1'),
  ('vuk',  '229')
on conflict on constraint mevzuat_madde_kimlik_uniq do nothing;

insert into public.mevzuat_madde_versiyonlari (madde_id, versiyon, baslik, metin, effective_date, source_url)
select m.id, 1, 'Vergi İndirimi',
  'Mükellefler, yaptıkları vergiye tabi işlemler üzerinden hesaplanan katma değer vergisinden, faaliyetlerine ilişkin olarak yüklendikleri katma değer vergisini indirebilirler.',
  date '1985-01-01', 'https://www.mevzuat.gov.tr/'
from public.mevzuat_maddeleri m where m.kaynak_id='kdvk' and m.madde_no='29/1'
on conflict on constraint mevzuat_versiyon_uniq do nothing;

insert into public.mevzuat_madde_versiyonlari (madde_id, versiyon, baslik, metin, effective_date, source_url)
select m.id, 1, 'Fatura',
  'Fatura, satılan emtia veya yapılan iş karşılığında müşterinin borçlandığı meblağı göstermek üzere emtiayı satan veya işi yapan tüccar tarafından müşteriye verilen ticari vesikadır.',
  date '1961-01-10', 'https://www.mevzuat.gov.tr/'
from public.mevzuat_maddeleri m where m.kaynak_id='vuk' and m.madde_no='229'
on conflict on constraint mevzuat_versiyon_uniq do nothing;

-- ---------------------------------------------------------------------
-- 2. muhasebe_olayi
-- ---------------------------------------------------------------------
insert into public.muhasebe_olaylari (id, baslik, senaryo, islem_tarihi, zorluk, ipucu, durum, kaynak)
values (
  'olay-pesin-mal-alis-001',
  'Ticari Mal Alışı (Peşin)',
  'Atlas Market, Delta Tedarik Ltd. Şti.''den 40.000 TL tutarında ticari mal satın aldı. Faturada %20 KDV (8.000 TL) hesaplandı. Toplam 48.000 TL, işletmenin banka hesabından peşin ödendi. Karşılığında alış faturası düzenlenmiştir.',
  date '2026-03-20',
  'kolay',
  'Peşin ödemede satıcı borcu doğmaz; ödeme banka hesabından yapıldığı için karşı hesap 102 Bankalar''dır.',
  'onayli',
  'manuel'
)
on conflict (id) do update set
  baslik = excluded.baslik, senaryo = excluded.senaryo, islem_tarihi = excluded.islem_tarihi,
  zorluk = excluded.zorluk, ipucu = excluded.ipucu, durum = excluded.durum;

-- ---------------------------------------------------------------------
-- 3. olay_yetkinlikleri (toplam ağırlık = 1.00)
-- ---------------------------------------------------------------------
insert into public.olay_yetkinlikleri (olay_id, yetkinlik_id, agirlik) values
  ('olay-pesin-mal-alis-001', 'kdv',                0.30),
  ('olay-pesin-mal-alis-001', 'yevmiye-kaydi',      0.30),
  ('olay-pesin-mal-alis-001', 'belge-okuma',        0.20),
  ('olay-pesin-mal-alis-001', 'muhasebe-temelleri', 0.20)
on conflict (olay_id, yetkinlik_id) do update set agirlik = excluded.agirlik;

-- ---------------------------------------------------------------------
-- 4. olay_etiketleri
-- ---------------------------------------------------------------------
insert into public.olay_etiketleri (olay_id, etiket_id) values
  ('olay-pesin-mal-alis-001', 'belge'),
  ('olay-pesin-mal-alis-001', 'kdv'),
  ('olay-pesin-mal-alis-001', 'muavin'),
  ('olay-pesin-mal-alis-001', 'genel-muhasebe')
on conflict (olay_id, etiket_id) do nothing;

-- ---------------------------------------------------------------------
-- 5. belge (alis_faturasi) + olay_belgeleri
--    cari_id = Delta Tedarik (faturayı düzenleyen satıcı). belge_no ile idempotent.
--    meta.odeme = pesin/banka (ödeme peşin yapıldı).
-- ---------------------------------------------------------------------
insert into public.belgeler (belge_tipi, belge_no, tarih, cari_id, yon, matrah, kdv_orani, kdv_tutari, toplam, satirlar, meta)
select
  'alis_faturasi', 'ALS2026-000148', date '2026-03-20', c.id, 'gelen',
  40000.00, 20.00, 8000.00, 48000.00,
  '[{"aciklama":"Ticari Mal","miktar":80,"birim":"Adet","birim_fiyat":500,"iskonto":0}]'::jsonb,
  '{"odeme":"pesin","odeme_araci":"banka"}'::jsonb
from public.cari_kartlar c
where c.unvan = 'Delta Tedarik Ltd. Şti.' and c.isletme_id is null
  and not exists (select 1 from public.belgeler b where b.belge_no = 'ALS2026-000148');

insert into public.olay_belgeleri (olay_id, belge_id, sira, rol)
select 'olay-pesin-mal-alis-001', b.id, 1, 'ana'
from public.belgeler b where b.belge_no = 'ALS2026-000148'
on conflict (olay_id, belge_id) do nothing;

-- ---------------------------------------------------------------------
-- 6. cozum_basligi (varyant 1 — sürekli envanter)
-- ---------------------------------------------------------------------
insert into public.cozum_basliklari (olay_id, varyant, varyant_adi, aciklama, beyanname_etkileri, hata_kurallari)
values (
  'olay-pesin-mal-alis-001', 1, 'Sürekli envanter — peşin ticari mal alış kaydı',
  'Ticari mal alışında mal bedeli 153 Ticari Mallar''a borç yazılır. Yüklenilen KDV *indirilecek* KDV''dir (191, borç) ve mal maliyetine eklenmez; ayrı gösterilir. Ödeme banka hesabından peşin yapıldığından satıcı borcu (320) doğmaz; karşı hesap 102 Bankalar''dır (alacak).',
  '[{"beyanname":"KDV1","satir":"İndirilecek KDV","etki":8000}]'::jsonb,
  '[{"yanlis_kod":"320","dogru":"102","mesaj":"Peşin alışta 320 Satıcılar kullanılmaz; ödeme banka hesabından yapıldığı için 102 Bankalar alacaklanır."},{"yanlis_kod":"100","dogru":"102","mesaj":"Ödeme banka hesabından yapıldı; karşı hesap 100 Kasa değil 102 Bankalar''dır."},{"yanlis_kod":"391","mesaj":"Alışta 391 Hesaplanan KDV kullanılmaz; yüklenilen KDV 191 İndirilecek KDV''dir."}]'::jsonb
)
on conflict on constraint cozum_baslik_olay_varyant_uniq do update set
  varyant_adi = excluded.varyant_adi, aciklama = excluded.aciklama,
  beyanname_etkileri = excluded.beyanname_etkileri, hata_kurallari = excluded.hata_kurallari;

-- ---------------------------------------------------------------------
-- 7. cozum_satirlari (dengeli: Σborç = Σalacak = 48.000)
--    Banka muavini repo standardı: 102.01 (İş Bankası, cari-bağlı).
-- ---------------------------------------------------------------------
insert into public.cozum_satirlari (baslik_id, sira, muavin_id, borc, alacak)
select b.id, v.sira, m.id, v.borc, v.alacak
from public.cozum_basliklari b
cross join (values
  (1, '153.01', 40000.00,     0.00),
  (2, '191.01',  8000.00,     0.00),
  (3, '102.01',     0.00, 48000.00)
) as v(sira, kod, borc, alacak)
join public.muavin_hesaplar m
  on m.kod = v.kod and m.isletme_id is null and m.olusturan_user_id is null
where b.olay_id = 'olay-pesin-mal-alis-001' and b.varyant = 1
on conflict on constraint cozum_satir_sira_uniq do nothing;

-- ---------------------------------------------------------------------
-- 8. cozum_mevzuat
-- ---------------------------------------------------------------------
insert into public.cozum_mevzuat (baslik_id, madde_id, aciklama)
select b.id, m.id, v.aciklama
from public.cozum_basliklari b
cross join (values
  ('kdvk','29/1','191 İndirilecek KDV''nin dayanağı — indirim hakkı.'),
  ('vuk', '229', 'Kaydın dayanağı fatura belgesidir.')
) as v(kaynak, madde_no, aciklama)
join public.mevzuat_maddeleri m on m.kaynak_id = v.kaynak and m.madde_no = v.madde_no
where b.olay_id = 'olay-pesin-mal-alis-001' and b.varyant = 1
on conflict (baslik_id, madde_id) do nothing;

-- ---------------------------------------------------------------------
-- 9. Soru instance (tip=yevmiye_kaydi)
-- ---------------------------------------------------------------------
insert into public.sorular (id, unite_id, baslik, zorluk, senaryo, ipucu, aciklama, durum, kaynak, olay_id, tip, destek_seviyesi)
values (
  'soru-pesin-mal-alis-001',
  'mal-alis-satis',
  'Ticari Mal Alışı (Peşin)',
  'kolay',
  'Atlas Market, Delta Tedarik Ltd. Şti.''den 40.000 TL tutarında ticari mal satın aldı. Faturada %20 KDV (8.000 TL) hesaplandı. Toplam 48.000 TL banka hesabından peşin ödendi. Alış faturasını yevmiyeye kaydediniz.',
  'Peşin ödemede satıcı borcu doğmaz; karşı hesap 102 Bankalar''dır.',
  -- Çözüm ekranı "Resmi Çözüm" açıklaması (whitespace-pre-line render).
  'OLAY
Atlas Market, Delta Tedarik Ltd. Şti.''den 40.000 TL tutarında ticari mal aldı; faturada %20 KDV (8.000 TL). Toplam 48.000 TL işletmenin BANKA hesabından PEŞİN ödendi. Belge: ALS2026-000148 numaralı alış faturası.

ANA MANTIK
Bu da bir ALIŞ işlemidir; malın (153) ve KDV''nin (191) mantığı KUR-001 ile AYNIDIR. Tek fark ödeme şeklidir: burada ödeme anında ve banka üzerinden yapılır, dolayısıyla satıcıya borç DOĞMAZ.

DOĞRU KAYIT
- 153 Ticari Mallar → Borç 40.000
- 191 İndirilecek KDV → Borç 8.000
- 102 Bankalar (Türkiye İş Bankası) → Alacak 48.000

SATIR SATIR
- 153 Ticari Mallar (borç): Mal stoğa girer (varlık artışı) → borç. Sürekli envanterde alış doğrudan 153''e alınır. (KUR-001 ile aynı.)
- 191 İndirilecek KDV (borç): Yüklenilen KDV indirilecek KDV''dir; maliyete eklenmez, ayrı izlenir (KDVK md.29/1). (KUR-001 ile aynı.)
- 102 Bankalar (alacak): Ödeme banka hesabından yapıldığı için banka mevcudu azalır. Banka bir varlıktır; azaldığı için ALACAK çalışır. Ödenen 48.000 (mal + KDV) buradan çıkar.

NEDEN DİĞER HESAPLAR YANLIŞ
- 320 Satıcılar: Peşin ödemede satıcıya borç KALMAZ; ödeme anında yapıldı. 320 yalnızca ödeme ertelendiğinde (veresiye) kullanılır — o KUR-001''in konusuydu.
- 100 Kasa: Ödeme nakit kasadan değil BANKA hesabından yapıldı. Olayda "banka" dendiği için karşı hesap 102 Bankalar''dır; 100 Kasa değil.
- 391 Hesaplanan KDV: Satış KDV''sidir; alışta kullanılmaz. Alışta yüklenilen KDV 191 İndirilecek KDV''dir.
- Borç/alacak yönü: Banka çıkışını yanlışlıkla borç yazma; para AZALDIĞI için 102 alacak çalışır.

ÖĞRENME ÖZETİ
Peşin (banka) alışta 153 ve 191 borç mantığı aynı kalır; satıcı borcu (320) yerine ödeme yapılan banka (102) alacak çalışır. Fark tamamen ödeme şeklinden gelir: kasa değil banka, veresiye değil peşin.',
  'onayli',
  'manuel',
  'olay-pesin-mal-alis-001',
  'yevmiye_kaydi',
  'standart'
)
on conflict (id) do update set
  olay_id = excluded.olay_id, tip = excluded.tip, destek_seviyesi = excluded.destek_seviyesi,
  durum = excluded.durum, senaryo = excluded.senaryo, aciklama = excluded.aciklama;

-- ---------------------------------------------------------------------
-- 10. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare
  v_agirlik numeric; v_borc numeric; v_alacak numeric;
  v_satir int; v_mevzuat int; v_soru_olay text;
begin
  select coalesce(sum(agirlik),0) into v_agirlik
    from public.olay_yetkinlikleri where olay_id='olay-pesin-mal-alis-001';
  select coalesce(sum(cs.borc),0), coalesce(sum(cs.alacak),0), count(*) into v_borc, v_alacak, v_satir
    from public.cozum_satirlari cs join public.cozum_basliklari b on b.id=cs.baslik_id
    where b.olay_id='olay-pesin-mal-alis-001' and b.varyant=1;
  select count(*) into v_mevzuat
    from public.cozum_mevzuat cm join public.cozum_basliklari b on b.id=cm.baslik_id
    where b.olay_id='olay-pesin-mal-alis-001';
  select olay_id into v_soru_olay from public.sorular where id='soru-pesin-mal-alis-001';

  raise notice 'KUR-002 raporu — yetkinlik toplamı: %, Σborç: %, Σalacak: %, satır: %, mevzuat: %, soru→olay: %',
    v_agirlik, v_borc, v_alacak, v_satir, v_mevzuat, v_soru_olay;

  if v_agirlik <> 1.00 then raise exception 'KUR-002 hata: yetkinlik toplamı % (1.00 bekleniyor)', v_agirlik; end if;
  if v_borc <> v_alacak or v_borc <> 48000.00 then raise exception 'KUR-002 hata: dengesiz (Σborç % / Σalacak %)', v_borc, v_alacak; end if;
  if v_satir <> 3 then raise exception 'KUR-002 hata: cozum_satirlari % (3 bekleniyor)', v_satir; end if;
  if v_mevzuat <> 2 then raise exception 'KUR-002 hata: cozum_mevzuat % (2 bekleniyor)', v_mevzuat; end if;
  if v_soru_olay is distinct from 'olay-pesin-mal-alis-001' then raise exception 'KUR-002 hata: soru olaya bağlanmadı'; end if;

  raise notice 'KUR-002 doğrulama başarılı ✓ (peşin alış; 320 kullanılmadı, 102 Bankalar alacak)';
end $$;

commit;

notify pgrst, 'reload schema';
