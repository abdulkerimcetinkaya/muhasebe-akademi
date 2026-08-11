-- Temeller · Kart 1 · Ders 1 gerçek içerik.
-- Mevcut item kimliği ve kullanıcı ilerlemesi korunur.

begin;

create or replace function pg_temp.bn_text(p_id text,p_text text) returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','paragraph','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles','{}'::jsonb)),'children','[]'::jsonb)
$$;
create or replace function pg_temp.bn_h(p_id text,p_text text,p_level int default 2) returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','heading','props',jsonb_build_object('level',p_level),'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles','{}'::jsonb)),'children','[]'::jsonb)
$$;
create or replace function pg_temp.bn_quote(p_id text,p_text text) returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','quote','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text',p_text,'styles','{}'::jsonb)),'children','[]'::jsonb)
$$;
create or replace function pg_temp.bn_kontrol(p_id text,p_soru text,p_siklar jsonb,p_aciklama text,p_yanlis text,p_ipucu text,p_sunum text default 'satirici',p_coklu boolean default false) returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','kontrol','props',jsonb_build_object('soru',p_soru,'siklar',p_siklar::text,'aciklama',p_aciklama,'yanlisAciklama',p_yanlis,'ipucu',p_ipucu,'sunum',p_sunum,'cokluSecim',p_coklu),'children','[]'::jsonb)
$$;

do $$
declare v_item uuid; v_content jsonb;
begin
  select i.id into v_item
  from public.kesfet_itemler i
  join public.kesfet_bolumler b on b.id=i.bolum_id
  join public.kesfet_kartlar k on k.id=b.kart_id
  where k.slug='muhasebe-baslangic' and k.tip='kesfet'
    and b.tur='normal' and i.ad='Muhasebe Neden Gereklidir?' and i.yayin_durumu='yayinlandi'
  limit 1;
  if v_item is null then raise exception 'Muhasebe Neden Gereklidir? dersi bulunamadı'; end if;

  v_content := jsonb_build_array(
    pg_temp.bn_h('d1-01','1. Ay sonu geldi'),
    pg_temp.bn_text('d1-01-p1','Kuzey Ofis, işletmelere kırtasiye ve ofis malzemeleri satan küçük bir ticaret işletmesi. Ay boyunca satış yaptı, yeni mallar aldı; bazı müşteriler ödedi, bazıları henüz ödemedi.'),
    jsonb_build_object('id','d1-vk-1','type','verikartlari','props',jsonb_build_object('baslik','Kuzey Ofis · Ay sonu','asamali',false,'kartlar','[{"baslik":"Banka hesabı","satirlar":[{"etiket":"Banka bakiyesi","deger":"245.000 TL","vurgu":true}]}]'),'children','[]'::jsonb),
    pg_temp.bn_quote('d1-01-q','“Bankada 245.000 TL varsa işler iyi gidiyor olmalı.” Ama gerçekten bunu söyleyebilir miyiz?'),
    pg_temp.bn_kontrol('d1-k-1','245.000 TL banka bakiyesi, işletmenin durumunu değerlendirmek için tek başına yeterli midir?','[{"metin":"Evet, bankadaki para yeterlidir.","dogru":false},{"metin":"Hayır, başka bilgilere de ihtiyacımız vardır.","dogru":true},{"metin":"Banka bakiyesinin işletmeyle ilgisi yoktur.","dogru":false}]','245.000 TL önemli bir bilgidir; fakat yalnızca şu anda bankada ne kadar para olduğunu gösterir.','Bankadaki para önemli bir bilgi. Ancak müşterilerden tahsil edilecek veya yapılacak ödemeleri henüz bilmiyoruz.','Bu rakam işletmenin tahsilatlarını ve borçlarını da gösteriyor mu?'),
    pg_temp.bn_text('d1-01-p2','Henüz müşterilerin işletmeye borcu olup olmadığını, tedarikçi ödemelerini, eldeki malları ve bankadaki paranın ne kadarının yakında kullanılacağını bilmiyoruz. Elimizde bir rakam var; işletmenin tamamını gösteren bilgi yok.'),

    pg_temp.bn_h('d1-02','2. Biraz daha bilgi ekleyelim'),
    jsonb_build_object('id','d1-vk-2','type','verikartlari','props',jsonb_build_object('baslik','Bilgi adım adım açılıyor','asamali',true,'kartlar','[{"baslik":"Kuzey Ofis","satirlar":[{"etiket":"Bankadaki para","deger":"245.000 TL","vurgu":true}]},{"baslik":"Yeni bilgi","satirlar":[{"etiket":"Müşterilerden tahsil edilecek","deger":"130.000 TL","vurgu":true}]}]'),'children','[]'::jsonb),
    pg_temp.bn_kontrol('d1-k-2','Banka hesabı değişmedi. İşletme hakkında bildiğimiz şey arttı mı?','[{"metin":"Evet","dogru":true},{"metin":"Hayır","dogru":false}]','Evet. Artık müşterilerden ileride tahsil edilmesi beklenen 130.000 TL’yi de biliyoruz.','Banka değişmedi ama işletmenin bir tahsil hakkını öğrendik.','Para hareket etmese de yeni bir mali bilgi oluşmuş olabilir mi?'),
    pg_temp.bn_quote('d1-02-q','İşletmeyle ilgili önemli bir mali olay gerçekleştiğinde para her zaman aynı anda hareket etmek zorunda değildir.'),
    pg_temp.bn_text('d1-02-p','Müşteriye ürün satılmış, ödeme daha sonra yapılacak olabilir. Yalnız banka hesabını izleseydik bu bilginin tamamını göremezdik.'),

    pg_temp.bn_h('d1-03','3. Bir bilgi daha var'),
    jsonb_build_object('id','d1-vk-3','type','verikartlari','props',jsonb_build_object('baslik','Kuzey Ofis · Genişleyen görünüm','asamali',true,'kartlar','[{"baslik":"Mevcut para","satirlar":[{"etiket":"Banka","deger":"245.000 TL","vurgu":true}]},{"baslik":"Tahsilatlar","satirlar":[{"etiket":"Müşterilerden alınacak","deger":"130.000 TL"}]},{"baslik":"Ödemeler","satirlar":[{"etiket":"Tedarikçilere ödenecek","deger":"190.000 TL"}]}]'),'children','[]'::jsonb),
    pg_temp.bn_text('d1-03-p','Bankadaki paranın tamamı rahatça kullanılabilir değildir. İşletmenin ilerleyen günlerde yerine getirmesi gereken ödemeleri de vardır. Mali durumu anlamak için mevcut paraya, tahsilatlara, ödemelere ve diğer mali olaylara birlikte bakmalıyız.'),

    pg_temp.bn_h('d1-04','4. Aynı banka bakiyesi, aynı işletme durumu mu?'),
    jsonb_build_object('id','d1-vk-4','type','verikartlari','props',jsonb_build_object('baslik','İki işletmeyi karşılaştır','asamali',false,'kartlar','[{"baslik":"Kuzey Ofis","satirlar":[{"etiket":"Banka","deger":"245.000 TL","vurgu":true},{"etiket":"Tahsil edilecek","deger":"130.000 TL"},{"etiket":"Ödenecek","deger":"190.000 TL"}]},{"baslik":"Atlas Ofis","satirlar":[{"etiket":"Banka","deger":"245.000 TL","vurgu":true},{"etiket":"Tahsil edilecek","deger":"310.000 TL"},{"etiket":"Ödenecek","deger":"70.000 TL"}]}]'),'children','[]'::jsonb),
    pg_temp.bn_kontrol('d1-k-3','İki işletmenin mali durumu aynıdır diyebilir miyiz?','[{"metin":"Evet","dogru":false},{"metin":"Hayır","dogru":true}]','Hayır. Banka bakiyeleri aynı olsa da tahsil edilecek ve ödenecek tutarlar farklıdır.','Aynı banka tutarı, diğer mali ilişkilerin de aynı olduğu anlamına gelmez.','İki kartta banka dışındaki satırları karşılaştır.'),
    pg_temp.bn_quote('d1-04-q','Aynı banka bakiyesi, aynı mali durum anlamına gelmez.'),

    pg_temp.bn_h('d1-05','5. Sorun aslında para değil, bilgi'),
    pg_temp.bn_text('d1-05-p1','İşletme küçücükken sahibi birçok şeyi aklında tutabilir. İşletme büyüdükçe satış, alış, tahsilat, ödeme, kredi, kira ve ekipman işlemlerinin sayısı artar. Bazılarında para hemen hareket eder, bazılarında daha sonra.'),
    pg_temp.bn_text('d1-05-p2','İşletmenin gerçek durumunu hafızadan, tek bir banka hesabından veya dağınık notlardan sağlıklı biçimde takip etmek giderek zorlaşır.'),
    pg_temp.bn_quote('d1-05-q','Asıl ihtiyaç, işletmede mali açıdan önemli olayları düzenli biçimde izleyebilmek ve gerektiğinde anlamlı bilgiye dönüştürebilmektir.'),

    pg_temp.bn_h('d1-06','6. Banka hareketi bize her şeyi anlatır mı?'),
    jsonb_build_object('id','d1-vk-5','type','verikartlari','props',jsonb_build_object('baslik','Üç para girişi','asamali',false,'kartlar','[{"baslik":"İşlem 1","satirlar":[{"etiket":"Banka hareketi","deger":"+60.000 TL","vurgu":true},{"etiket":"Neden","deger":"Bugünkü satış"}]},{"baslik":"İşlem 2","satirlar":[{"etiket":"Banka hareketi","deger":"+100.000 TL","vurgu":true},{"etiket":"Neden","deger":"Geçmiş alacak"}]},{"baslik":"İşlem 3","satirlar":[{"etiket":"Banka hareketi","deger":"+250.000 TL","vurgu":true},{"etiket":"Neden","deger":"Banka kredisi"}]}]'),'children','[]'::jsonb),
    pg_temp.bn_text('d1-06-p','Üçünde de para arttı; fakat yeni satış, eski alacağın tahsili ve geri ödenecek kredi aynı işletme olayı değildir. Muhasebe yalnız “para arttı mı?” değil, “bu değişiklik neden gerçekleşti?” sorusuyla da ilgilenir.'),

    pg_temp.bn_h('d1-07','7. Karşı örnek: Para hiç hareket etmedi'),
    pg_temp.bn_text('d1-07-p','Kuzey Ofis müşterisine 80.000 TL’lik ürün sattı. Müşteri ödemeyi 30 gün sonra yapacak; bugün banka hesabına para gelmedi.'),
    pg_temp.bn_kontrol('d1-k-4','İşletme açısından önemli bir olay gerçekleşti mi?','[{"metin":"Hayır. Para hareket etmediği için hiçbir şey olmadı.","dogru":false},{"metin":"Evet. Satış gerçekleşti ve tahsil edilecek bir tutar oluştu.","dogru":true}]','Evet. Para henüz gelmese de satış ve müşteriden tahsil edilecek bir tutar oluştu.','Para hareketi ile işletme olayı aynı anda gerçekleşmek zorunda değildir.','Ürün müşteriye teslim edildi mi?'),
    pg_temp.bn_quote('d1-07-q','Para hareket etti diye her şeyi anlamış olmayız; para hareket etmedi diye hiçbir şey olmadığını da söyleyemeyiz.'),

    pg_temp.bn_h('d1-08','8. Peki muhasebe bize neden gerekli?'),
    pg_temp.bn_text('d1-08-p','Bir işletmenin durumunu anlamak için yalnız parayı değil, paranın neden hareket ettiğini ve para hareketi olmadan gerçekleşebilen diğer mali olayları da düzenli izlememiz gerekir.'),
    pg_temp.bn_quote('d1-08-q','Muhasebeye, mali açıdan önemli olayları düzenli izlemek ve işletmenin durumunu anlamaya yardımcı olacak bilgiler üretmek için ihtiyaç duyarız.'),

    pg_temp.bn_h('d1-09','9. Neden yalnız hafızamız yetmez?'),
    pg_temp.bn_text('d1-09-p','“Bu müşteriden para alacağım” veya “bir tedarikçiye ödeme yapacaktık” demek yetmez. Ne kadar, ne zaman, hangi işlem nedeniyle, ödendi mi, tahsil edildi mi ve hangi döneme ait sorularının cevapları izlenebilmelidir.'),
    pg_temp.bn_quote('d1-09-q','İşletme kararları “sanırım” veya “hatırladığım kadarıyla” üzerine kurulamaz.'),

    pg_temp.bn_h('d1-10','10. Birlikte deneyelim'),
    pg_temp.bn_text('d1-10-p','Armoni Teknik’in bankasında 400.000 TL bulunuyor. İşletmenin mali durumunu anlamaya çalışırken anlamlı olan bilgileri seç.'),
    pg_temp.bn_kontrol('d1-k-5','Birden fazla seçenek seçebilirsin.','[{"metin":"Müşterilerden tahsil edilecek 160.000 TL bulunması","dogru":true},{"metin":"Ofisin duvarlarının gri olması","dogru":false},{"metin":"Tedarikçilere 220.000 TL ödeme yapılacak olması","dogru":true},{"metin":"İşletmenin geçen hafta yeni ürünler satın alması","dogru":true},{"metin":"İşletme sahibinin en sevdiği futbol takımı","dogru":false}]','Tahsilatlar, ödemeler ve ürün alımları işletmenin mali görünümüyle ilgilidir.','Seçtiğin bilgilerin işletmenin parası, hakları, yükümlülükleri veya işlemleriyle ilişkisini yeniden düşün.','Her olay aynı derecede muhasebeyi ilgilendirmez.', 'satirici', true),
    pg_temp.bn_text('d1-10-p2','Henüz bu olayların nasıl kaydedileceğini öğrenmiyoruz. Şimdilik yalnız hangi bilgilerin işletmenin mali durumuyla ilgili olduğunu ayırt ediyoruz.'),

    pg_temp.bn_h('d1-11','11. Sıra sende'),
    pg_temp.bn_text('d1-11-p','Nova Teknik Servis için elindeki tek bilgi banka bakiyesinin 360.000 TL olmasıdır.'),
    pg_temp.bn_kontrol('d1-k-6','Yalnız bu bilgiyle işletmenin mali durumunun iyi olduğunu söyleyebilir miyiz?','[{"metin":"Evet. Yüksek banka bakiyesi yeterlidir.","dogru":false},{"metin":"Hayır. Diğer mali bilgileri görmeden kesin sonuca ulaşamayız.","dogru":true}]','Doğru. Tahsil edilecekler, ödeme yükümlülükleri ve henüz parası gelmemiş satışlar bilinmeden kesin değerlendirme yapılamaz.','Banka bakiyesini mali durumla eşleştirmek anlaşılır; ancak Kuzey ve Atlas Ofis’in aynı banka bakiyesine rağmen farklı ilişkileri vardı.','Bankadaki 360.000 TL dışında henüz bilmediğin hangi mali bilgiler olabilir?'),

    pg_temp.bn_h('d1-12','12. Biraz daha derin: Para ile bilgi aynı şey değildir'),
    pg_temp.bn_text('d1-12-p','Banka bakiyesini, yeni başlayan biri için görünür ve anlaşılır olduğu için kullandık. Banka muhasebenin merkezi değildir. Bir işletmenin ekonomik durumunu tek bir gösterge üzerinden anlamaya çalışmak eksik sonuç verebilir.'),
    pg_temp.bn_quote('d1-12-q','Muhasebenin değeri yalnız rakamları tutmakta değil, ilişkili mali bilgileri düzenleyerek işletme hakkında anlamlı bir görünüm oluşturmaktadır.'),

    pg_temp.bn_h('d1-13','13. Gerçek hayatta bunun karşılığı ne?'),
    pg_temp.bn_text('d1-13-p','Muhasebe çalışanı hangi müşteriden ne kadar tahsil edileceğini, hangi tedarikçiye ne kadar ödeneceğini, banka hareketinin hangi işlemden kaynaklandığını ve bugün hangi mali işlemlerin gerçekleştiğini izler. Bilgilerin birbirinden kopuk değil, düzenli biçimde takip edilmesi gerekir.'),

    pg_temp.bn_h('d1-14','14. İşlem Laboratuvarı'),
    pg_temp.bn_text('d1-14-p','Bu alan klasik bir test değildir. Değerleri ve olay nedenlerini değiştirerek aynı kavramı gözlemle.'),
    jsonb_build_object('id','d1-lab','type','islemlaboratuvari','props',jsonb_build_object('baslik','Aynı para, farklı işletme','config','{"isletme":"Ada Ticaret","banka":200000,"min":0,"max":400000,"adim":10000,"tahsil":20000,"odeme":40000,"hareket":100000,"nedenler":[{"baslik":"Bugün yapılan satışın bedeli tahsil edildi","aciklama":"Yeni satış ve tahsilat aynı olayda gerçekleşti."},{"baslik":"Müşteri önceki borcunu ödedi","aciklama":"Yeni satış yok; daha önce oluşmuş alacak tahsil edildi."},{"baslik":"Banka kredisi kullanıldı","aciklama":"Para arttı fakat geri ödeme yükümlülüğü de doğdu."}]}'),'children','[]'::jsonb),
    pg_temp.bn_kontrol('d1-k-7','Tek başına 200.000 TL banka bakiyesine bakarak işletmenin durumunu değerlendirebilir misin?','[{"metin":"Evet","dogru":false},{"metin":"Hayır","dogru":true}]','Hayır. Sürgüler değiştikçe banka aynı kaldı, fakat işletme hakkındaki bilgi değişti.','Tahsil edilecek ve ödenecek tutarları değiştirerek tekrar gözlemle.','Banka sabitken diğer iki değer ne yaptı?'),

    pg_temp.bn_h('d1-15','15. Aynı para, farklı neden'),
    pg_temp.bn_text('d1-15-p','Laboratuvarın ikinci bölümünde bankaya gelen +100.000 TL sabit kalırken olayın nedenini değiştir. Aynı tutar yeni satış, eski alacağın tahsili veya banka kredisi olabilir.'),
    pg_temp.bn_quote('d1-15-q','Aynı para hareketi farklı nedenlerden kaynaklanabilir. Yalnız tutarı değil, işlemin neden gerçekleştiğini de bilmeliyiz.'),

    pg_temp.bn_h('d1-16','16. Mali Sözlük'),
    jsonb_build_object('id','d1-term-1','type','paragraph','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text','Alacak','styles',jsonb_build_object('term','İşletmenin başka bir kişi veya işletmeden tahsil etme hakkı bulunan tutar.')),jsonb_build_object('type','text','text',' — İşletmenin başka bir kişi veya işletmeden tahsil etme hakkı bulunan tutar.','styles','{}'::jsonb)),'children','[]'::jsonb),
    jsonb_build_object('id','d1-term-2','type','paragraph','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text','Borç','styles',jsonb_build_object('term','İşletmenin başka kişi veya işletmelere karşı yerine getirmesi gereken ödeme yükümlülüğü.')),jsonb_build_object('type','text','text',' — İşletmenin başka kişi veya işletmelere karşı yerine getirmesi gereken ödeme yükümlülüğü.','styles','{}'::jsonb)),'children','[]'::jsonb),
    jsonb_build_object('id','d1-term-3','type','paragraph','props','{}'::jsonb,'content',jsonb_build_array(jsonb_build_object('type','text','text','Mali durum','styles',jsonb_build_object('term','Bir işletmenin ekonomik açıdan içinde bulunduğu durumu değerlendirmemize yardımcı olan genel görünüm.')),jsonb_build_object('type','text','text',' — İşletmenin ekonomik açıdan içinde bulunduğu durumu değerlendirmemize yardımcı olan genel görünüm.','styles','{}'::jsonb)),'children','[]'::jsonb),

    pg_temp.bn_h('d1-17','17. Bu dersten aklında kalması gereken zihinsel model'),
    pg_temp.bn_text('d1-17-p','Bankadaki para önemlidir → işletmenin tamamını göstermez → tahsilatlar, ödemeler ve başka mali olaylar vardır → bu bilgilerin düzenli izlenmesi gerekir → muhasebeye duyulan ihtiyaç burada ortaya çıkar.'),

    pg_temp.bn_h('d1-18','18. Ders sonu kontrolü'),
    pg_temp.bn_text('d1-18-p','Üç kısa soruyla öğrendiğini dene. Sonuçtan sonra istersen tekrar çözebilirsin.'),
    pg_temp.bn_kontrol('d1-test-1','Bir şirketin banka hesabında 500.000 TL var. Bu bilgi mali durumunun iyi olduğunu söylemek için yeterli midir?','[{"metin":"Evet","dogru":false},{"metin":"Hayır","dogru":true}]','Banka önemli ama tek başına yeterli değildir.','Tahsilatlar ve ödeme yükümlülükleri bilinmiyor.','Tek bir gösterge bütün işletmeyi açıklar mı?','test'),
    pg_temp.bn_kontrol('d1-test-2','Bir müşteri aldığı ürünlerin bedelini gelecek ay ödeyecek. Bugün önemli bir mali olay gerçekleşmiş olabilir mi?','[{"metin":"Evet","dogru":true},{"metin":"Hayır","dogru":false}]','Satış ve tahsil edilecek tutar para gelmeden önce oluşabilir.','Para hareketi olayın tek ölçütü değildir.','Ürün teslim edildi mi?','test'),
    pg_temp.bn_kontrol('d1-test-3','İşletmenin banka hesabına 100.000 TL girdi. Bu bilgi tek başına paranın neden geldiğini gösterir mi?','[{"metin":"Evet","dogru":false},{"metin":"Hayır","dogru":true}]','Aynı giriş satış, eski alacak tahsilatı veya kredi olabilir.','Tutar aynı olsa da olayın nedeni değişebilir.','Laboratuvardaki üç nedeni hatırla.','test'),

    pg_temp.bn_h('d1-19','19. Son kontrol: Bunu açıklayabilir misin?'),
    pg_temp.bn_quote('d1-19-q','Bir işletmenin bankasında çok para olması neden tek başına işletmenin durumunu anlamamıza yetmez?'),
    pg_temp.bn_text('d1-19-p','İşletmenin mevcut parasının yanında tahsil edeceği ve ödeyeceği tutarlar ile gerçekleşen diğer mali olaylar da önemlidir. Aynı para hareketinin farklı nedenleri olabilir. Bu nedenle mali bilgilerin düzenli takip edilmesi gerekir. Kelimeleri değil, mantığı açıklayabilmen yeterlidir.'),

    pg_temp.bn_h('d1-20','20. Sonraki derse geçiş'),
    pg_temp.bn_text('d1-20-p','Artık yalnız banka hesabına bakmanın yeterli olmadığını ve çok sayıdaki mali olayın düzenli bilgiye dönüştürülmesi gerektiğini biliyoruz.'),
    pg_temp.bn_quote('d1-20-q','Muhasebe bu işi nasıl yapıyor?'),
    pg_temp.bn_text('d1-20-next','Sonraki ders: Muhasebe Nedir? →')
  );

  update public.kesfet_itemler
  set icerik=v_content,icerik_guncellendi=now(),yayin_durumu='yayinlandi'
  where id=v_item;
end $$;

insert into public.sozluk_terimleri(slug,baslik,kisa_aciklama,uzun_icerik,ornek,ilgili_terimler,ilgili_isletme_ids,ilgili_hesap_kodlari,yayinda)
values('mali-durum','Mali Durum','Bir işletmenin ekonomik açıdan içinde bulunduğu durumu değerlendirmemize yardımcı olan genel görünüm.',
  'Mali durum; işletmenin sahip olduğu varlıklar, yerine getirmesi gereken yükümlülükler ve sahiplerinin işletmedeki hakkı birlikte değerlendirilerek anlaşılır. Tek bir banka veya kasa bakiyesi işletmenin mali durumunu tek başına açıklamaz. Kavram, ilerleyen derslerde varlıklar, borçlar ve özkaynak ilişkisiyle ayrıntılandırılır.',
  'Aynı banka bakiyesine sahip iki işletmenin tahsil edilecek ve ödenecek tutarları farklıysa mali durumları da aynı olmayabilir.',
  array['alacak','borc','aktif','pasif'],array[]::int[],array[]::text[],true)
on conflict(slug) do nothing;

notify pgrst,'reload schema';
commit;
