-- Muavin hesap "tip" alanı artık TDHP grup kodlarını taşır (örn: '10', '12', '32').
-- Eski semantik tipler (musteri/tedarikci/banka/personel/kasa/stok/diger) yerine
-- standart TDHP grupları kullanılıyor. Tablo şu an boş (20260518000008 ile
-- temizlenmişti), o yüzden veri taşıması yapılmıyor.

begin;

alter table public.muavin_hesaplar
  drop constraint if exists muavin_hesaplar_tip_check;

alter table public.muavin_hesaplar
  add constraint muavin_hesaplar_tip_check
  check (tip in (
    -- 1 Dönen Varlıklar
    '10','11','12','13','15','17','18','19',
    -- 2 Duran Varlıklar
    '22','23','24','25','26','27','28','29',
    -- 3 Kısa Vadeli Yabancı Kaynaklar
    '30','32','33','34','35','36','37','38','39',
    -- 4 Uzun Vadeli Yabancı Kaynaklar
    '40','42','43','44','47','48','49',
    -- 5 Özkaynaklar
    '50','52','54','57','58','59',
    -- 6 Gelir Tablosu Hesapları
    '60','61','62','63','64','65','66','67','68','69',
    -- 7 Maliyet Hesapları
    '70','71','72','73','74','75','76','77','78'
  ));

commit;
