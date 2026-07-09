-- KUR-001 envanter yöntemi etiketini Atlas Market politikasıyla tutarlı hale getir.
-- Atlas Market (CUR-006) Sürekli Envanter Yöntemi kullanır; KUR-001'in çözüm
-- başlığındaki 'Aralıklı envanter' etiketi bu kararla çelişiyordu.
--
-- ⚠️ Yalnızca etiket (varyant_adi) düzeltilir. Muhasebe kayıt satırları
--    (153.01/191.01/320.001), tutarlar, muavin/cari ve mevzuat bağları
--    DEĞİŞMEZ. Alışta 153'e borç her iki yöntemde de aynı olduğundan kayıt
--    zaten doğrudur; düzeltme yalnızca metinseldir.
--
-- Idempotent: 'is distinct from' guard'ı sayesinde tekrar çalıştırıldığında
--    0 satır etkilenir. Şema değişikliği yoktur.

update public.cozum_basliklari
set varyant_adi = 'Sürekli envanter — standart veresiye ticari mal alış kaydı'
where olay_id = 'olay-mal-alis-veresiye-001'
  and varyant = 1
  and varyant_adi is distinct from 'Sürekli envanter — standart veresiye ticari mal alış kaydı';

-- ---------------------------------------------------------------------------
-- GERİ DÖNÜŞ (rollback) — gerekirse elle çalıştır:
--
--   update public.cozum_basliklari
--   set varyant_adi = 'Aralıklı envanter'
--   where olay_id = 'olay-mal-alis-veresiye-001' and varyant = 1;
-- ---------------------------------------------------------------------------
