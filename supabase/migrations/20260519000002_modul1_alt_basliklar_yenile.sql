-- Modül 1 (mal-alis-satis-m1) alt başlıkları yeniden yapılandırma
--
-- Eski 8 alt başlık silinir (içerikler + junction atamaları gider).
--   - sorular.alt_baslik_id SET NULL ile temizlenir — sorular kalır.
--   - atolye_sorulari CASCADE — junction kayıtları silinir.
-- 9 yeni alt başlık 1.1'den 1.9'a sırasıyla eklenir. Yeni 1.1 (Genel Bakış)
-- önüne eklenip diğer 8 başlık bir sıra kayarak adlandırma sadeleştirildi.

begin;

delete from public.modul_alt_basliklari
 where modul_id = 'mal-alis-satis-m1';

insert into public.modul_alt_basliklari (id, modul_id, sira, baslik, karma, aktif) values
  ('mal-alis-satis-1-1', 'mal-alis-satis-m1', 1, 'İşletme ve Şirket Türleri — Genel Bakış',            false, true),
  ('mal-alis-satis-1-2', 'mal-alis-satis-m1', 2, 'Şahıs İşletmesi Kuruluşu — Nakit Sermaye',           false, true),
  ('mal-alis-satis-1-3', 'mal-alis-satis-m1', 3, 'Şahıs İşletmesi Kuruluşu — Ayni Sermaye',            false, true),
  ('mal-alis-satis-1-4', 'mal-alis-satis-m1', 4, 'Limited Şirket Kuruluşu — Sermaye Taahhüdü',         false, true),
  ('mal-alis-satis-1-5', 'mal-alis-satis-m1', 5, 'Limited Şirket — Sermayenin Ödenmesi',               false, true),
  ('mal-alis-satis-1-6', 'mal-alis-satis-m1', 6, 'Anonim Şirket Kuruluşu — Taahhüt ve 1/4 Ödeme',      false, true),
  ('mal-alis-satis-1-7', 'mal-alis-satis-m1', 7, 'Kuruluş ve Örgütlenme Giderleri',                    false, true),
  ('mal-alis-satis-1-8', 'mal-alis-satis-m1', 8, 'Açılış Bilançosu ve Açılış Kaydı',                   false, true),
  ('mal-alis-satis-1-9', 'mal-alis-satis-m1', 9, 'Dönem Başı Envanter Kayıtları',                      false, true);

commit;
