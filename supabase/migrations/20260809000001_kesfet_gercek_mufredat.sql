-- Keşfet gerçek müfredat genişletmesi
-- Additive + idempotent: mevcut dolu item'lara ve ilerleme kayıtlarına dokunmaz.

begin;

create or replace function pg_temp.ders_icerigi(
  p_kod text, p_baslik text, p_acilis text, p_anlatim text,
  p_ornek text, p_soru text, p_siklar jsonb, p_aciklama text
) returns jsonb language sql as $$
  select jsonb_build_array(
    jsonb_build_object('id', p_kod || '-h1', 'type', 'heading', 'props', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type','text','text',p_baslik,'styles',jsonb_build_object())), 'children', jsonb_build_array()),
    jsonb_build_object('id', p_kod || '-p1', 'type', 'paragraph', 'props', jsonb_build_object(), 'content', jsonb_build_array(jsonb_build_object('type','text','text',p_acilis,'styles',jsonb_build_object())), 'children', jsonb_build_array()),
    jsonb_build_object('id', p_kod || '-h2', 'type', 'heading', 'props', jsonb_build_object('level', 2), 'content', jsonb_build_array(jsonb_build_object('type','text','text','İşlemi çöz','styles',jsonb_build_object())), 'children', jsonb_build_array()),
    jsonb_build_object('id', p_kod || '-p2', 'type', 'paragraph', 'props', jsonb_build_object(), 'content', jsonb_build_array(jsonb_build_object('type','text','text',p_anlatim,'styles',jsonb_build_object())), 'children', jsonb_build_array()),
    jsonb_build_object('id', p_kod || '-q1', 'type', 'quote', 'props', jsonb_build_object(), 'content', jsonb_build_array(jsonb_build_object('type','text','text',p_ornek,'styles',jsonb_build_object())), 'children', jsonb_build_array()),
    jsonb_build_object('id', p_kod || '-kn', 'type', 'kontrol', 'props', jsonb_build_object('soru',p_soru,'siklar',p_siklar::text,'aciklama',p_aciklama,'ipucu','Önce belgede ne olduğunu, sonra işletmede neyin değiştiğini söyle.'), 'children', jsonb_build_array())
  );
$$;

create or replace function pg_temp.kart(p_slug text, p_ad text, p_aciklama text, p_ikon text, p_kategori text, p_durum text, p_sira int)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from public.kesfet_kartlar where slug = p_slug;
  if v_id is null then
    insert into public.kesfet_kartlar(slug,ad,aciklama,ikon,kategori,tip,durum,sira)
    values(p_slug,p_ad,p_aciklama,p_ikon,p_kategori,'kesfet',p_durum,p_sira) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function pg_temp.bolum(p_kart uuid, p_ad text, p_sira int)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from public.kesfet_bolumler where kart_id=p_kart and ad=p_ad limit 1;
  if v_id is null then
    insert into public.kesfet_bolumler(kart_id,ad,sira) values(p_kart,p_ad,p_sira) returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function pg_temp.item(p_bolum uuid, p_ad text, p_tip text, p_sira int, p_icerik jsonb)
returns uuid language plpgsql as $$
declare v_id uuid; v_icerik jsonb;
begin
  select id, icerik into v_id, v_icerik from public.kesfet_itemler where bolum_id=p_bolum and ad=p_ad limit 1;
  if v_id is null then
    insert into public.kesfet_itemler(bolum_id,ad,tip,sira,icerik,icerik_guncellendi)
    values(p_bolum,p_ad,p_tip,p_sira,p_icerik,now()) returning id into v_id;
  elsif v_icerik is null or jsonb_array_length(coalesce(v_icerik,'[]'::jsonb))=0 then
    update public.kesfet_itemler set icerik=p_icerik, icerik_guncellendi=now() where id=v_id;
  end if;
  return v_id;
end $$;

do $$
declare k uuid; b uuid; i jsonb;
begin
  -- Temeller: yalnız eksik ders. Mevcut kart/bölüm ve dolu içerikler korunur.
  select id into k from public.kesfet_kartlar where slug='muhasebe-baslangic';
  if k is not null then
    select id into b from public.kesfet_bolumler where kart_id=k and ad='Kayıt Mantığı' limit 1;
    if b is null then b := pg_temp.bolum(k,'Kayıt Mantığı',3); end if;
    i := pg_temp.ders_icerigi('belgeden-kayit','Alış faturasını kayda çevir',
      'Mavi Kalem Kırtasiye, 12 Ağustos günü 24.000 TL mal ve 4.800 TL KDV içeren bir alış faturası aldı. Ödeme yapılmadı. Fatura tek başına hesap adlarını söylemez; önce ekonomik etkiyi çıkarmak gerekir.',
      'Mal işletmeye girdiği için stok artar. İndirilebilecek KDV ayrı izlenir. Ödeme yapılmadığı için kasadan veya bankadan para çıkmaz; satıcıya borç doğar. Analiz tamamlanınca 153 Ticari Mallar ve 191 İndirilecek KDV borç, 320 Satıcılar alacak tarafına yazılır.',
      'Belge → stok +24.000 TL, indirilecek KDV +4.800 TL, satıcı borcu +28.800 TL → dengeli yevmiye kaydı.',
      'Fatura vadeli olduğuna göre hangi hesap bu işlemde kullanılmaz?',
      '[{"metin":"100 Kasa","dogru":true},{"metin":"153 Ticari Mallar","dogru":false},{"metin":"320 Satıcılar","dogru":false}]'::jsonb,
      'Ödeme yapılmadığı için Kasa hesabında hareket yoktur. Borç 320 Satıcılar hesabında izlenir.')
      || jsonb_build_array(jsonb_build_object('id','belgeden-kayit-uyg','type','kayit','props',jsonb_build_object(
        'senaryo','Mavi Kalem Kırtasiye 24.000 TL mal ve 4.800 TL KDV içeren faturayı vadeli aldı.',
        'tarih','12.08.2026','satirlar','[{"kod":"153","ad":"Ticari Mallar","tutar":"24000","tip":"borc"},{"kod":"191","ad":"İndirilecek KDV","tutar":"4800","tip":"borc"},{"kod":"320","ad":"Satıcılar","tutar":"28800","tip":"alacak"}]',
        'aciklama','Borç toplamı 28.800 TL, alacak toplamı 28.800 TL’dir. Fatura vadeli olduğu için karşı hesap Satıcılardır.',
        'ipucu','Önce mal bedeli ve KDV’yi ayır; sonra faturanın ödenip ödenmediğine bak.'), 'children',jsonb_build_array()));
    perform pg_temp.item(b,'Belgelerden Muhasebe Kaydı','ders',99,i);
  end if;

  -- Yetkinlik 1: Günlük Muhasebe İşlemleri
  k := pg_temp.kart('gunluk-muhasebe-islemleri','Günlük Muhasebe İşlemleri',
    'Fatura, dekont ve tahsilat belgelerini okuyup alış, satış, tahsilat ve ödeme kayıtlarını oluştur. Ön koşul: Temeller.','Receipt','Yetkinlikler','acik',10);
  b := pg_temp.bolum(k,'Alış ve Satış',0);
  perform pg_temp.item(b,'Peşin Mal Alışı','ders',0,pg_temp.ders_icerigi('gmi-1','Peşin mal alışında iki belgeyi birlikte oku',
    'Kuzey Ofis, 18.000 TL mal ve 3.600 TL KDV için fatura aldı. Tutar aynı gün banka hesabından ödendi.',
    'Fatura malı ve KDV’yi; banka dekontu ödemenin gerçekleştiğini kanıtlar. Stok ile indirilecek KDV artar, banka azalır. Satıcı borcu oluşmaz çünkü ödeme aynı gün tamamlanmıştır.',
    '153 Ticari Mallar 18.000 TL borç, 191 İndirilecek KDV 3.600 TL borç, 102 Bankalar 21.600 TL alacak.',
    'Bu işlemde 320 Satıcılar neden kullanılmaz?','[{"metin":"Ödeme aynı gün yapıldığı için","dogru":true},{"metin":"Mal alınmadığı için","dogru":false},{"metin":"KDV olmadığı için","dogru":false}]'::jsonb,
    'Vadeli bir borç doğmadı. Dekont, toplam tutarın bankadan çıktığını gösterir.'));
  i := pg_temp.ders_icerigi('gmi-2','Vadeli satıştan tahsilata',
    'Kuzey Ofis, müşterisine KDV dahil 36.000 TL tutarında vadeli satış yaptı. Müşteri beş gün sonra banka üzerinden ödeme yaptı.',
    'Satış günü müşteri borcu ve satış geliri doğar. Tahsilat günü yeni bir gelir oluşmaz; yalnız alacak bankadaki paraya dönüşür. İki tarih iki ayrı ekonomik olaydır.',
    'Satış kaydı ile tahsilat kaydını birleştirmek, gelirin ve müşteri bakiyesinin tarihini bozar.',
    'Tahsilat gününde hangi hesap azalır?','[{"metin":"120 Alıcılar","dogru":true},{"metin":"600 Yurtiçi Satışlar","dogru":false},{"metin":"391 Hesaplanan KDV","dogru":false}]'::jsonb,
    'Müşteri ödeme yaptığında alacak kapanır. Satış geliri satış tarihinde kaydedilmişti.')
    || jsonb_build_array(jsonb_build_object('id','gmi-2-kayit','type','kayit','props',jsonb_build_object(
      'senaryo','Müşteri, daha önce kaydedilen 36.000 TL borcunu banka üzerinden ödedi.','tarih','17.08.2026',
      'satirlar','[{"kod":"102","ad":"Bankalar","tutar":"36000","tip":"borc"},{"kod":"120","ad":"Alıcılar","tutar":"36000","tip":"alacak"}]',
      'aciklama','Banka artar, müşteri alacağı azalır. Bu kayıt yeni satış geliri yaratmaz.','ipucu','Tahsilat, bir varlığı başka bir varlığa dönüştürür.'),'children',jsonb_build_array()));
  perform pg_temp.item(b,'Vadeli Satış ve Tahsilat','ders',1,i);
  b := pg_temp.bolum(k,'Kasa ve Banka',1);
  perform pg_temp.item(b,'Kasa ile Bankayı Ayırmak','ders',0,pg_temp.ders_icerigi('gmi-3','Ödeme aracını belgeden belirle',
    'Bir müşterinin 9.500 TL borcu POS üzerinden tahsil edildi. İşletme sahibi işlemi kasa tahsilatı olarak not aldı.',
    'Hesabı işletme sahibinin sözü değil, işlemin izi belirler. POS tahsilatı banka hesabına ulaşacağı için 102 Bankalar kullanılır. Fiziksel nakit kasaya girmediyse 100 Kasa artmaz.',
    'POS slipi ve banka hareketi ödeme yöntemini; satış faturası ise işlemin kaynağını gösterir.',
    'POS tahsilatında hangi varlık artar?','[{"metin":"102 Bankalar","dogru":true},{"metin":"100 Kasa","dogru":false},{"metin":"120 Alıcılar","dogru":false}]'::jsonb,
    'Tahsilat müşterinin borcunu azaltır ve bankadaki parayı artırır.'));
  b := pg_temp.bolum(k,'Gün Sonu Kontrolü',2);
  perform pg_temp.item(b,'Belge, Kayıt ve Bakiye Kontrolü','alistirma',0,pg_temp.ders_icerigi('gmi-4','Gün sonu üç noktayı karşılaştır',
    'Gün sonunda kasa sayımı 12.400 TL, Kasa hesabı bakiyesi 13.000 TL gösteriyor. Aradaki 600 TL fark açıklanmadan gün kapatılamaz.',
    'Kontrol sırası nettir: belge toplamlarını kayıtlara, kayıtları hesap bakiyelerine, kasa ve banka bakiyelerini dış kanıtlara bağla. Borç ve alacak toplamının eşit olması her hesabın doğru seçildiğini kanıtlamaz.',
    '600 TL’lik fark için önce gün içindeki nakit ödeme belgeleri ve kayda alınmamış masraflar aranır.',
    'Yevmiye kaydı dengeliyse kasa farkı olamaz mı?','[{"metin":"Olabilir; yanlış hesap seçimi kayıt dengesini bozmayabilir","dogru":true},{"metin":"Olamaz; denge her şeyi kanıtlar","dogru":false}]'::jsonb,
    'Dengeli bir kayıt yine de yanlış hesap veya yanlış belge içerebilir.'));

  -- Yetkinlik 2: Vergi ve Belge Uygulamaları
  k := pg_temp.kart('vergi-belge-uygulamalari','Vergi ve Belge Uygulamaları',
    'Belgedeki matrah, KDV ve ödeme bilgisini ayır; indirilecek ve hesaplanan KDV kayıtlarını gerçek işlemler üzerinde kur. Ön koşul: Temeller.','FileCheck','Yetkinlikler','acik',11);
  b := pg_temp.bolum(k,'Belgeyi Okumak',0);
  perform pg_temp.item(b,'Faturada Matrah ve KDV','ders',0,pg_temp.ders_icerigi('vbu-1','Genel toplamı tek tutar sanma',
    'Bir hizmet faturasında matrah 20.000 TL, KDV 4.000 TL ve genel toplam 24.000 TL’dir.',
    'Matrah mal veya hizmet bedelidir. KDV ayrı bir vergi kalemidir. Alışta şartlar sağlanıyorsa 191 İndirilecek KDV, satışta 391 Hesaplanan KDV kullanılır. Genel toplam ödeme veya borç tutarını verir.',
    '24.000 TL’nin tamamını gider yazmak KDV’yi giderin içine gömer ve vergi hesabını bozar.',
    'Bu alış faturasında gider hesabına hangi tutar yazılır?','[{"metin":"20.000 TL","dogru":true},{"metin":"24.000 TL","dogru":false},{"metin":"4.000 TL","dogru":false}]'::jsonb,
    'Gider veya maliyet matrah üzerinden izlenir; indirilebilen KDV ayrı hesaptadır.'));
  perform pg_temp.item(b,'Fatura, İrsaliye ve Dekontun Rolü','ders',1,pg_temp.ders_icerigi('vbu-2','Her belge farklı bir soruyu cevaplar',
    'Mal depoya geldi, irsaliye imzalandı, fatura ertesi gün düzenlendi ve ödeme bir hafta sonra yapıldı.',
    'İrsaliye mal hareketini, fatura bedel ve vergi bilgisini, dekont ödemeyi kanıtlar. Belgeleri tek olaymış gibi okumak teslim, borç ve ödeme tarihlerini birbirine karıştırır.',
    'Muhasebeci aynı işlem dosyasında üç belgeyi ilişkilendirir fakat her belgenin kanıtladığı olayı ayrı tutar.',
    'Ödemenin gerçekleştiğini hangi belge doğrular?','[{"metin":"Banka dekontu","dogru":true},{"metin":"İrsaliye","dogru":false},{"metin":"Fiyat teklifi","dogru":false}]'::jsonb,
    'Dekont para hareketini gösterir. İrsaliye teslimi, fatura borcun ve verginin tutarını açıklar.'));
  b := pg_temp.bolum(k,'KDV Kayıtları',1);
  i := pg_temp.ders_icerigi('vbu-3','Alış KDV’sini ayrı izle',
    'İşletme, ofiste kullanılmak üzere 10.000 TL tutarında malzeme aldı. Faturada 2.000 TL KDV var ve ödeme bankadan yapıldı.',
    'Malzeme bedeli ilgili gider veya stok hesabına, indirilebilen KDV 191 hesabına gider. Bankadan çıkan tutar ikisinin toplamıdır. İndirim hakkı için belgenin işletmeyle ilgisi ve mevzuattaki şartlar ayrıca kontrol edilir.',
    'Belge → matrah 10.000 TL + KDV 2.000 TL → banka çıkışı 12.000 TL.',
    '191 İndirilecek KDV hangi tarafta yer alır?','[{"metin":"Borç","dogru":true},{"metin":"Alacak","dogru":false}]'::jsonb,
    'İndirilecek KDV işletmenin devletten mahsup edeceği bir değer olarak borç tarafında artar.')
    || jsonb_build_array(jsonb_build_object('id','vbu-3-kayit','type','kayit','props',jsonb_build_object(
      'senaryo','10.000 TL malzeme ve 2.000 TL KDV banka hesabından ödendi.','tarih','20.08.2026',
      'satirlar','[{"kod":"770","ad":"Genel Yönetim Giderleri","tutar":"10000","tip":"borc"},{"kod":"191","ad":"İndirilecek KDV","tutar":"2000","tip":"borc"},{"kod":"102","ad":"Bankalar","tutar":"12000","tip":"alacak"}]',
      'aciklama','Matrah gider hesabında, KDV 191 hesabında, toplam ödeme Bankalar hesabında izlenir.','ipucu','Genel toplamı matrah ve KDV olarak iki parçaya ayır.'),'children',jsonb_build_array()));
  perform pg_temp.item(b,'İndirilecek KDV Kaydı','ders',0,i);
  b := pg_temp.bolum(k,'Belge Kontrol Vakası',2);
  perform pg_temp.item(b,'Eksik Belgede Kayıt Kararı','alistirma',0,pg_temp.ders_icerigi('vbu-4','Belge eksikse kayıt kararını ertele',
    'Banka hesabından 7.200 TL ödeme çıktı. Açıklamada yalnız “danışmanlık” yazıyor; fatura işletmeye ulaşmadı.',
    'Dekont ödemenin yapıldığını kanıtlar fakat hizmetin matrah ve KDV ayrımını tek başına doğrulamaz. Ödeme kaydı geçici olarak açıklanabilir; gider ve KDV kaydı için uygun belge istenir. Kesin hesap seçimi kanıttan önce yapılmaz.',
    'Muhasebeci dekontu saklar, hizmet sağlayıcıdan faturayı ister ve kayıt dosyasını eksik belge olarak işaretler.',
    'Yalnız dekonta bakarak 191 İndirilecek KDV kaydedilir mi?','[{"metin":"Hayır; KDV indirimi için uygun belge kontrol edilmelidir","dogru":true},{"metin":"Evet; banka çıkışı yeterlidir","dogru":false}]'::jsonb,
    'Dekont ödeme kanıtıdır. KDV’nin tutarı ve indirim şartı faturadan kontrol edilir.'));

  -- İçerik üretimi sonraki aşamaya bırakılan Yetkinlik kartları.
  perform pg_temp.kart('beyanname-surecleri','Beyanname Süreçleri','Dönem verilerini kontrol listeleriyle beyanname hazırlığına taşı. Ön koşul: Vergi ve Belge Uygulamaları.','CalendarCheck','Yetkinlikler','yakinda',12);
  perform pg_temp.kart('bordro-sgk','Bordro ve SGK','Brütten nete bordro bileşenlerini, tahakkuku ve ödeme kayıtlarını uygula. Ön koşul: Temeller.','Users','Yetkinlikler','yakinda',13);
  perform pg_temp.kart('donem-sonu-islemleri','Dönem Sonu İşlemleri','Envanter, amortisman, değerleme ve kapanış kontrollerini yürüt. Ön koşul: Günlük Muhasebe İşlemleri.','Calendar','Yetkinlikler','yakinda',14);
  perform pg_temp.kart('sirket-islemleri','Şirket İşlemleri','Kuruluş, sermaye, ortaklar ve kâr dağıtımı kayıtlarını belge üzerinden çöz. Ön koşul: Temeller.','Briefcase','Yetkinlikler','yakinda',15);

  -- Uzmanlık kartları: içerik hazır olmadığı için item/bölüm oluşturulmaz.
  perform pg_temp.kart('maliyet-uretim','Maliyet ve Üretim','İlk madde, işçilik ve genel üretim giderlerini mamul maliyetine taşı. Ön koşul: Dönem Sonu İşlemleri.','Factory','Uzmanlıklar','yakinda',20);
  perform pg_temp.kart('proje-muhasebesi','Proje Muhasebesi','Proje bütçesi, gerçekleşen maliyet ve hakedişleri birlikte izle. Ön koşul: Günlük Muhasebe İşlemleri.','Milestone','Uzmanlıklar','yakinda',21);
  perform pg_temp.kart('vergi-uygulamalari','Vergi Uygulamaları','Karmaşık vergi olaylarını belge, kayıt ve beyan bağlantısıyla çöz. Ön koşul: Vergi ve Belge Uygulamaları.','Percent','Uzmanlıklar','yakinda',22);
  perform pg_temp.kart('finansal-raporlama','Finansal Raporlama','Düzeltilmiş kayıtlardan karar vermeye yarayan finansal raporlar üret. Ön koşul: Dönem Sonu İşlemleri.','LineChart','Uzmanlıklar','yakinda',23);
  perform pg_temp.kart('arge-teknokent','Ar-Ge ve Teknokent','Proje harcamalarını, personel teşviklerini ve istisnaları dosya bazında izle. Ön koşul: Vergi ve Bordro.','Rocket','Uzmanlıklar','yakinda',24);
  perform pg_temp.kart('savunma-sanayii-muhasebesi','Savunma Sanayii Muhasebesi','Sözleşme, proje maliyeti, hakediş ve teşvik kayıtlarını aynı vaka içinde yönet. Ön koşul: Proje, Vergi ve Bordro.','ShieldCheck','Uzmanlıklar','yakinda',25);
  perform pg_temp.kart('dis-ticaret','Dış Ticaret','İthalat ve ihracat belgelerini kur, vergi ve kur farkı kayıtlarına bağla. Ön koşul: Vergi ve Belge Uygulamaları.','Globe','Uzmanlıklar','yakinda',26);
end $$;

commit;

-- Geri dönüş (gerektiğinde ayrı çalıştır):
-- delete from public.kesfet_kartlar where slug in
-- ('gunluk-muhasebe-islemleri','vergi-belge-uygulamalari','beyanname-surecleri',
--  'bordro-sgk','donem-sonu-islemleri','sirket-islemleri','maliyet-uretim',
--  'proje-muhasebesi','vergi-uygulamalari','finansal-raporlama','arge-teknokent',
--  'savunma-sanayii-muhasebesi','dis-ticaret');
-- delete from public.kesfet_itemler where ad='Belgelerden Muhasebe Kaydı'
--   and bolum_id in (select id from public.kesfet_bolumler where kart_id=
--     (select id from public.kesfet_kartlar where slug='muhasebe-baslangic'));
