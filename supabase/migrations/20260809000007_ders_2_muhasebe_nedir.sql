-- Temeller · Kart 1 · Ders 2 gerçek içerik. Mevcut item kimliği korunur.
begin;
create or replace function pg_temp.bn_text(p_id text,p_text text) returns jsonb language sql immutable as $$ select jsonb_build_object('id',p_id,'type','paragraph','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles','{}'::jsonb)),'children','[]'::jsonb) $$;
create or replace function pg_temp.bn_h(p_id text,p_text text) returns jsonb language sql immutable as $$ select jsonb_build_object('id',p_id,'type','heading','props',jsonb_build_object('level',2),'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles','{}'::jsonb)),'children','[]'::jsonb) $$;
create or replace function pg_temp.bn_q(p_id text,p_text text) returns jsonb language sql immutable as $$ select jsonb_build_object('id',p_id,'type','quote','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles','{}'::jsonb)),'children','[]'::jsonb) $$;
create or replace function pg_temp.bn_k(p_id text,p_soru text,p_siklar jsonb,p_dogru text,p_yanlis text,p_ipucu text,p_sunum text default 'satirici') returns jsonb language sql immutable as $$ select jsonb_build_object('id',p_id,'type','kontrol','props',jsonb_build_object('soru',p_soru,'siklar',p_siklar::text,'aciklama',p_dogru,'yanlisAciklama',p_yanlis,'ipucu',p_ipucu,'sunum',p_sunum,'cokluSecim',false),'children','[]'::jsonb) $$;

do $$ declare v_item uuid; v_content jsonb;
begin
 select i.id into v_item from public.kesfet_itemler i join public.kesfet_bolumler b on b.id=i.bolum_id join public.kesfet_kartlar k on k.id=b.kart_id
 where k.slug='muhasebe-baslangic' and k.tip='kesfet' and b.tur='normal' and i.ad='Muhasebe Nedir?' and i.yayin_durumu='yayinlandi' limit 1;
 if v_item is null then raise exception 'Muhasebe Nedir? dersi bulunamadı'; end if;
 v_content:=jsonb_build_array(
  pg_temp.bn_h('d2-01','1. Geçen derste neyi fark ettik?'),
  pg_temp.bn_text('d2-01-p','Kuzey Ofis’in 245.000 TL banka bakiyesi tek başına yeterli değildi. Tahsil edilecekler, ödemeler, farklı nedenli para hareketleri ve para hareketi olmadan gerçekleşen olaylar da vardı.'),
  pg_temp.bn_q('d2-01-q','Bir işletmeyi anlayabilmek için mali açıdan önemli bilgilerin düzenli takip edilmesine ihtiyaç vardır. Peki bunu nasıl yapacağız?'),

  pg_temp.bn_h('d2-02','2. Bir işletmede bilgi nasıl görünür?'),
  jsonb_build_object('id','d2-vk-1','type','verikartlari','props',jsonb_build_object('baslik','Kuzey Ofis · Ağustos’un ilk haftası','asamali',true,'kartlar','[{"baslik":"2 Ağustos","satirlar":[{"etiket":"Satış","deger":"120.000 TL"},{"etiket":"Tahsilat","deger":"70.000 TL"},{"etiket":"Sonra alınacak","deger":"50.000 TL"}]},{"baslik":"3 Ağustos","satirlar":[{"etiket":"Mal alışı","deger":"85.000 TL"},{"etiket":"Ödeme","deger":"Gelecek hafta"}]},{"baslik":"5–6 Ağustos","satirlar":[{"etiket":"Eski alacak tahsilatı","deger":"40.000 TL"},{"etiket":"Tedarikçi ödemesi","deger":"30.000 TL"}]}]'),'children','[]'::jsonb),
  pg_temp.bn_text('d2-02-p','Olayları alt alta yazmak bilgi sağlar; fakat toplam tahsilat, toplam ödeme, satışlarla ödemelerin ayrımı ve işletme durumundaki değişim gibi soruları doğrudan cevaplamaz.'),

  pg_temp.bn_h('d2-03','3. Bilgiyi toplamak ile anlamlı hale getirmek aynı şey değildir'),
  pg_temp.bn_text('d2-03-p','Faturalar, banka hareketleri, dekontlar, notlar ve elektronik belgelerin bir klasörde bulunması tek başına yeterli değildir.'),
  pg_temp.bn_q('d2-03-q','İşletmenin ihtiyacı yalnız “Ne oldu?” değil, “Bütün bunlar birlikte ne anlatıyor?” sorusunun da cevabıdır.'),

  pg_temp.bn_h('d2-04','4. Muhasebe nedir?'),
  pg_temp.bn_q('d2-04-q','Muhasebe, işletmede mali açıdan önemli olaylara ilişkin bilgileri belirli bir düzen içinde işleyerek anlamlı finansal bilgiye dönüştüren bir sistemdir.'),
  pg_temp.bn_text('d2-04-p','Tanımı ezberlemek yerine şu modeli kur: işletmede olaylar gerçekleşir → muhasebe bunları düzenli bilgiye dönüştürür → bilgiler işletmenin durumunu anlamaya yardımcı olur.'),

  pg_temp.bn_h('d2-05','5. Bir örnek üzerinden görelim'),
  jsonb_build_object('id','d2-vk-2','type','verikartlari','props',jsonb_build_object('baslik','Aynı olayın üç bilgi parçası','asamali',true,'kartlar','[{"baslik":"Belge","satirlar":[{"etiket":"Müşteriye satış","deger":"120.000 TL"}]},{"baslik":"Banka hareketi","satirlar":[{"etiket":"Müşteriden gelen","deger":"70.000 TL"}]},{"baslik":"Kalan hak","satirlar":[{"etiket":"Daha sonra alınacak","deger":"50.000 TL"}]}]'),'children','[]'::jsonb),
  pg_temp.bn_text('d2-05-p','Üç parça aynı satış olayını anlatır: toplam 120.000 TL satışın 70.000 TL’si ödendi, 50.000 TL’si tahsil edilecek. Muhasebe dağınık rakamlar arasında ilişki kurarak olayın bütününü görünür kılar.'),
  pg_temp.bn_q('d2-05-q','Muhasebenin amacı rakam üretmek değil, işletmedeki dağınık bilgileri ilişkili ve anlaşılabilir hale getirmektir.'),

  pg_temp.bn_h('d2-06','6. Muhasebe yalnız kayıt tutmak mıdır?'),
  pg_temp.bn_text('d2-06-p','Kayıt tutmak önemlidir ama muhasebenin tamamı değildir. Binlerce tarih sıralı kayıt, “müşterilerden ne kadar alacağımız var?” veya “dönem sonucu ne oldu?” sorularına tek başına uygun cevap değildir.'),
  pg_temp.bn_q('d2-06-q','Bilginin düzenlenmesi, benzer özelliklerine göre bir araya getirilmesi, özetlenmesi ve anlaşılır sunulması gerekir. Bu işlevleri sonraki derste ayrı ayrı öğreneceğiz.'),

  pg_temp.bn_h('d2-07','7. Karşılaştıralım'),
  jsonb_build_object('id','d2-vk-3','type','verikartlari','props',jsonb_build_object('baslik','Kayıt listesi mi, bilgi sistemi mi?','asamali',false,'kartlar','[{"baslik":"İşletme A","satirlar":[{"etiket":"Yaklaşım","deger":"Olayları alt alta yazar"},{"etiket":"Sonuç","deger":"Binlerce satır"}]},{"baslik":"İşletme B","satirlar":[{"etiket":"Yaklaşım","deger":"Bilgiler arasında ilişki kurar"},{"etiket":"Sonuç","deger":"Tahsilat, ödeme ve durum bilgisi"}]}]'),'children','[]'::jsonb),
  pg_temp.bn_k('d2-k-1','Hangi işletme muhasebenin temel amacına daha yakın bir bilgi sistemi oluşturuyor?','[{"metin":"İşletme A","dogru":false},{"metin":"İşletme B","dogru":true}]','İşletme B; bilgileri işletmeyi anlamaya ve karar vermeye yardımcı olacak hale getiriyor.','Geçmişi saklamak önemlidir, ancak anlamlı bilgi üretmek için kayıtlar arasında ilişki kurulmalıdır.','Yönetici sorularına hangi yaklaşım doğrudan cevap verebilir?'),

  pg_temp.bn_h('d2-08','8. Dikkat: Excel muhasebe midir?'),
  pg_temp.bn_text('d2-08-p','Sorun kullanılan araç değildir. Muhasebe kâğıtta, Excel’de, muhasebe yazılımında veya ERP sisteminde yürütülebilir. Önemli olan bilginin hangi muhasebe mantığı ve düzeniyle işlendiğidir.'),
  pg_temp.bn_q('d2-08-q','Muhasebe programı kullanmak ile muhasebe yapmak aynı şey değildir. Önce mantığı, sonra araçları öğreneceğiz.'),

  pg_temp.bn_h('d2-09','9. Muhasebenin bilgi dönüşümü'),
  jsonb_build_object('id','d2-vk-4','type','verikartlari','props',jsonb_build_object('baslik','Girdi → işleme → çıktı','asamali',true,'kartlar','[{"baslik":"Girdiler","satirlar":[{"etiket":"Olaylar","deger":"Satış, alış, tahsilat, ödeme"}]},{"baslik":"Muhasebe","satirlar":[{"etiket":"İşlem","deger":"Bilgiyi belirli düzende işler"}]},{"baslik":"Çıktı","satirlar":[{"etiket":"Sonuç","deger":"Karara yardımcı finansal bilgi"}]}]'),'children','[]'::jsonb),

  pg_temp.bn_h('d2-10','10. Ama muhasebe her şeyi kaydeder mi?'),
  pg_temp.bn_text('d2-10-p','Çalışanın toplantıya girmesi, internetin yavaşlaması, müşterinin fiyat sorması, mal alınması ve müşterinin ödeme yapması işletmeyle ilgilidir; fakat hepsi aynı biçimde muhasebenin konusu değildir.'),
  pg_temp.bn_q('d2-10-q','Hangi olayların muhasebenin konusu olduğu “Mali Nitelikteki Olay” dersinde öğretilecek. Şimdilik muhasebenin her şeyi rastgele kaydetmediğini bil.'),

  pg_temp.bn_h('d2-11','11. Muhasebe bize ne kazandırıyor?'),
  pg_temp.bn_text('d2-11-p','Muhasebe; müşterilerden tahsil edilecekleri, yapılacak ödemeleri, ekonomik değerleri, dönem sonucunu ve mali durumdaki değişimi düzenli bir sistem içinde izlememizi sağlar. Temeller boyunca bu soruların cevaplarını üreten sistemi adım adım kuracağız.'),

  pg_temp.bn_h('d2-12','12. Muhasebeyi yanlış tanımlamayalım'),
  pg_temp.bn_text('d2-12-p','Muhasebe yalnız banka hesabı takibi, fatura kesme veya vergi hesaplama değildir. Bunlar muhasebenin bilgi sağladığı alanlar olabilir; muhasebenin bütünü değildir.'),
  pg_temp.bn_q('d2-12-q','Temel anlayış: mali açıdan önemli olaylara ilişkin bilgileri düzenli ve anlamlı finansal bilgiye dönüştüren sistem.'),

  pg_temp.bn_h('d2-13','13. Birlikte deneyelim'),
  pg_temp.bn_text('d2-13-p','Armoni Teknik; 75.000 TL hizmet, 40.000 TL tahsilat, 18.000 TL ödeme ve 150.000 TL krediyi telefon notlarına yazdı.'),
  pg_temp.bn_k('d2-k-2','Bu notların tutulması neden tek başına yeterli olmayabilir?','[{"metin":"Muhasebede telefon kullanılamaz.","dogru":false},{"metin":"Yazmak, ilişkileri kurup anlamlı bilgi üretildiği anlamına gelmez.","dogru":true},{"metin":"Bütün işlemler ezberlenmelidir.","dogru":false}]','Bilginin nerede tutulduğu değil, belirli bir sistem içinde işlenip anlamlı bilgiye dönüşmesi önemlidir.','Telefon veya kâğıt araçtır; asıl sorun bilgi parçaları arasındaki ilişkinin kurulmamış olmasıdır.','Araç ile muhasebe mantığını birbirinden ayır.'),

  pg_temp.bn_h('d2-14','14. Şimdi sen yap'),
  pg_temp.bn_text('d2-14-p','Delta Mobilya yöneticisinin önünde 420 satırlık işlem listesi var ve müşterilerden toplam ne kadar tahsil edileceğini soruyor.'),
  pg_temp.bn_k('d2-k-3','Muhasebe sisteminin temel rolü hangisidir?','[{"metin":"420 satırı olduğu gibi vermek.","dogru":false},{"metin":"İlgili bilgileri düzenleyip anlamlı finansal bilgiye dönüştürmek.","dogru":true},{"metin":"İşlem listesini silmek.","dogru":false}]','Yöneticinin sorusuna cevap vermek için kayıtların belirli bir amaç doğrultusunda işlenmesi gerekir.','Yöneticinin sorusu işlemlerin hangileri olduğu değil, toplam tahsil edilecek tutardır.','Sorulan ihtiyaca uygun çıktı hangisi?'),

  pg_temp.bn_h('d2-15','15. Biraz daha derin: Muhasebe bir bilgi sistemi gibi düşünülebilir'),
  pg_temp.bn_text('d2-15-p','Bir olay gerçekleşir, bilgi sisteme girer, muhasebe düzeni içinde işlenir ve kullanıcının ihtiyacına göre anlamlı çıktıya dönüşür. Kayıt, hesaplarda toplama, kontrol ve finansal tablolar bu zincirin sonraki derslerde açılacak parçalarıdır.'),

  pg_temp.bn_h('d2-16','16. Şimdilik bütün sistemi uzaktan görelim'),
  pg_temp.bn_text('d2-16-p','İŞLETME: satış, alış, tahsilat, ödeme ve diğer mali olaylar → MUHASEBE: bilgiyi düzenler ve işler → ANLAMLI FİNANSAL BİLGİ: işletmenin durumu, tahsil edilecekler, ödenecekler, faaliyet sonucu ve raporlar.'),
  pg_temp.bn_q('d2-16-q','Bu bir ayrıntı dersi değil, yolun nereye çıktığını gösteren haritadır.'),

  pg_temp.bn_h('d2-17','17. Gerçek hayatta muhasebe nasıl görünür?'),
  pg_temp.bn_text('d2-17-p','Faturalar, banka ve cari hareketler, ödemeler, tahsilatlar, personel ve stok işlemleri yalnız sisteme yazılmaz. Önce olay anlaşılır, doğru muhasebe düzeninde işlenir ve kullanılabilir bilgiye dönüşür. Meslek yalnız veri girişi değildir.'),

  pg_temp.bn_h('d2-18','18. Muhasebe Laboratuvarı'),
  pg_temp.bn_text('d2-18-p','Aynı ham olaylardan hangi bilgiye ihtiyaç duyduğunu seç. Sistem ilgili olayları ilişkilendirip vurgulayacak.'),
  jsonb_build_object('id','d2-lab','type','bilgidonusumu','props',jsonb_build_object('baslik','Dağınık Bilgiden Anlamlı Bilgiye','config','{"olaylar":[{"baslik":"Müşteriye satış yapıldı","tutar":100000,"tur":"satis"},{"baslik":"Müşteri ödeme yaptı","tutar":60000,"tur":"tahsilat"},{"baslik":"Tedarikçiden mal alındı","tutar":70000,"tur":"alis"},{"baslik":"Tedarikçiye ödeme yapıldı","tutar":20000,"tur":"odeme"}]}'),'children','[]'::jsonb),

  pg_temp.bn_h('d2-19','19. Laboratuvar — Düzeni boz'),
  pg_temp.bn_text('d2-19-p','Laboratuvarda “Muhasebe sistemini kapat” seçeneğini kullan. Açıklamalar ve ilişkiler kalkınca yalnız 100.000, 60.000, 70.000 ve 20.000 rakamları kalır; müşteriden tahsil edilecek tutarı çıkarmak zorlaşır.'),
  pg_temp.bn_q('d2-19-q','Rakam tek başına bilgi değildir; bağlam ve düzen gerekir.'),

  pg_temp.bn_h('d2-20','20. Mali Sözlük'),
  jsonb_build_object('id','d2-term-1','type','paragraph','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text','Muhasebe','styles',jsonb_build_object('term','Mali açıdan önemli olaylara ilişkin bilgileri düzenli biçimde işleyerek anlamlı finansal bilgiye dönüştüren sistem ve süreç.')),jsonb_build_object('type','text','text',' — İşletmedeki mali açıdan önemli olaylara ilişkin bilgileri anlamlı finansal bilgiye dönüştüren sistem ve süreç.','styles','{}'::jsonb)),'children','[]'::jsonb),
  jsonb_build_object('id','d2-term-2','type','paragraph','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text','Finansal Bilgi','styles',jsonb_build_object('term','Bir işletmenin ekonomik durumu, faaliyetleri veya mali olayları hakkında değerlendirme yapmaya yardımcı olan bilgi.')),jsonb_build_object('type','text','text',' — İşletmenin ekonomik durumu, faaliyetleri veya mali olayları hakkında değerlendirmeye yardımcı olan bilgi.','styles','{}'::jsonb)),'children','[]'::jsonb),

  pg_temp.bn_h('d2-21','21. Muhasebenin bütün ayrıntısını bugün öğrenmedik'),
  pg_temp.bn_text('d2-21-p','Muhasebenin içinde işlemlerin belirlenmesi, kayıt, hesaplar, sınıflandırma, kontrol ve raporlama vardır. Bugün sistemin ne olduğunu gördük; teknik parçaları ilerleyen derslerde tek tek öğreneceğiz.'),

  pg_temp.bn_h('d2-22','22. Bu dersten aklında kalması gereken zihinsel model'),
  pg_temp.bn_text('d2-22-p','İşletmede mali olaylar gerçekleşir → ham bilgi oluşur → muhasebe bilgileri belirli düzende işler → anlamlı finansal bilgi oluşur → bu bilgi karar vermeye yardımcı olur.'),

  pg_temp.bn_h('d2-23','23. Ders sonu kontrolü'),
  pg_temp.bn_text('d2-23-p','Üç kısa soruyla ana zihinsel modeli kontrol et.'),
  pg_temp.bn_k('d2-test-1','Bütün faturaları bir klasöre koymak tek başına muhasebe sisteminin amacını gerçekleştirir mi?','[{"metin":"Evet","dogru":false},{"metin":"Hayır","dogru":true}]','Belgelerin saklanmasının yanında bilgilerin işlenmesi ve anlamlı hale gelmesi gerekir.','Klasör bilgiyi saklar; ihtiyaç duyulan finansal bilgiyi kendiliğinden üretmez.','Saklamak ile işlemek aynı mı?','test'),
  pg_temp.bn_k('d2-test-2','Muhasebeyi en iyi hangi ifade açıklar?','[{"metin":"Banka hesabını takip etmek.","dogru":false},{"metin":"Vergiyi hesaplamak.","dogru":false},{"metin":"Mali olaylara ilişkin bilgileri anlamlı finansal bilgiye dönüştüren sistem.","dogru":true}]','Muhasebe belirli tek bir araç veya kullanım alanı değil, bilgi dönüştüren sistemdir.','Banka ve vergi muhasebenin temas ettiği alanlardır; bütünü değildir.','Girdi → işleme → çıktı modelini düşün.','test'),
  pg_temp.bn_k('d2-test-3','Programda binlerce işlem bulunması, yöneticinin doğru bilgiye sahip olduğu anlamına gelir mi?','[{"metin":"Evet","dogru":false},{"metin":"Hayır","dogru":true}]','Verinin bulunması ile doğru işlenip anlamlı bilgiye dönüşmesi aynı şey değildir.','Çok kayıt, kendiliğinden doğru ve kullanılabilir çıktı üretmez.','Kayıt sayısı mı, bilginin niteliği mi önemli?','test'),

  pg_temp.bn_h('d2-24','24. Kendi cümlenle açıkla'),
  pg_temp.bn_q('d2-24-q','Muhasebe nedir?'),
  pg_temp.bn_text('d2-24-p','İşletmede çok sayıda mali olay gerçekleşir. Muhasebe bu olaylara ilişkin dağınık bilgileri düzenli bir sistem içinde işleyerek işletmenin durumunu anlamaya ve karar vermeye yardımcı olacak finansal bilgiye dönüştürür. Kelimeleri değil, mantığı bil.'),

  pg_temp.bn_h('d2-25','25. Sonraki derse geçiş'),
  pg_temp.bn_text('d2-25-p','Ders 1’de muhasebeye neden ihtiyaç duyduğumuzu, Ders 2’de bu ihtiyacı karşılayan sistemin ne olduğunu öğrendik. Şimdi bu dönüşümün dört temel işlevini ayıracağız.'),
  pg_temp.bn_q('d2-25-q','Sonraki ders: Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi →')
 );
 update public.kesfet_itemler set icerik=v_content,icerik_guncellendi=now(),yayin_durumu='yayinlandi' where id=v_item;
end $$;

insert into public.sozluk_terimleri(slug,baslik,kisa_aciklama,uzun_icerik,ornek,ilgili_terimler,ilgili_isletme_ids,ilgili_hesap_kodlari,yayinda) values
('muhasebe','Muhasebe','İşletmedeki mali açıdan önemli olaylara ilişkin bilgileri düzenli biçimde işleyerek anlamlı finansal bilgiye dönüştüren sistem ve süreç.','Muhasebe yalnız kayıt tutmak değildir. İşletme olaylarına ilişkin ham bilgileri belirli bir düzen içinde işler, ilişkilendirir, kontrol eder ve kullanıcıların değerlendirme yapmasına yardımcı olan finansal bilgiye dönüştürür.','Bir satış belgesi, tahsilat ve kalan müşteri alacağı ilişkilendirilerek olayın bütünü görünür hale getirilir.',array['finansal-bilgi','mali-durum'],array[]::int[],array[]::text[],true),
('finansal-bilgi','Finansal Bilgi','Bir işletmenin ekonomik durumu, faaliyetleri veya mali olayları hakkında değerlendirme yapmaya yardımcı olan bilgi.','Finansal bilgi; işletmenin sahip oldukları, yükümlülükleri, faaliyet sonucu ve mali olaylarının etkileri hakkında değerlendirme yapılmasını sağlar. Ham veri, muhasebe sistemi içinde düzenlenip ilişkilendirildiğinde kullanılabilir finansal bilgiye dönüşür.','Müşterilerden toplam tahsil edilecek tutar, dağınık satış ve tahsilat kayıtlarından üretilen finansal bilgidir.',array['muhasebe','mali-durum'],array[]::int[],array[]::text[],true)
on conflict(slug) do nothing;
notify pgrst,'reload schema';
commit;
