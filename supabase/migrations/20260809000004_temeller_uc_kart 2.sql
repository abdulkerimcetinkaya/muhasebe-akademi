-- Temeller V3: tek kartı üç eğitim kartına ayırır.
-- Mevcut 19 item kimliği/ilerlemesi korunur; yeni dersler additive eklenir.

begin;

alter table public.kesfet_bolumler
  add column if not exists tur text not null default 'normal';
alter table public.kesfet_bolumler drop constraint if exists kesfet_bolumler_tur_check;
alter table public.kesfet_bolumler add constraint kesfet_bolumler_tur_check
  check (tur in ('normal','kart_finali'));

update public.soru_tipleri set aktif=true where id='coktan_secmeli';

create or replace function pg_temp.sabit_uuid(p_key text) returns uuid language sql immutable as $$
  select (substr(md5(p_key),1,8)||'-'||substr(md5(p_key),9,4)||'-4'||substr(md5(p_key),14,3)||'-a'||substr(md5(p_key),18,3)||'-'||substr(md5(p_key),21,12))::uuid
$$;

create or replace function pg_temp.paragraf(p_id text,p_metin text) returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','paragraph','props','{}'::jsonb,
    'content',jsonb_build_array(jsonb_build_object('type','text','text',p_metin,'styles','{}'::jsonb)),'children','[]'::jsonb)
$$;

create or replace function pg_temp.baslik(p_id text,p_metin text) returns jsonb language sql immutable as $$
  select jsonb_build_object('id',p_id,'type','heading','props',jsonb_build_object('level',2),
    'content',jsonb_build_array(jsonb_build_object('type','text','text',p_metin,'styles','{}'::jsonb)),'children','[]'::jsonb)
$$;

create or replace function pg_temp.ders_icerigi(p_kod text,p_ad text,p_bolum text) returns jsonb language sql immutable as $$
  select jsonb_build_array(
    pg_temp.baslik(p_kod||'-amac','Bu derste ne çözeceksin?'),
    pg_temp.paragraf(p_kod||'-p1',p_ad||' konusunu bir tanım olarak ezberlemek yerine, işletmedeki etkisini ve muhasebe sistemindeki karşılığını kuracaksın.'),
    pg_temp.baslik(p_kod||'-senaryo','İşletme gerçeği'),
    jsonb_build_object('id',p_kod||'-q','type','quote','props','{}'::jsonb,
      'content',jsonb_build_array(jsonb_build_object('type','text','text','Mavi Kırtasiye’de gün içinde yeni bir işlem oluştu. Önce “gerçekte ne oldu?” sorusunu cevapla; sonra '||p_ad||' açısından hangi bilginin izlenmesi gerektiğini belirle.','styles','{}'::jsonb)),'children','[]'::jsonb),
    pg_temp.baslik(p_kod||'-mantik','Muhasebe temsili'),
    pg_temp.paragraf(p_kod||'-p2','Bu adım '||p_bolum||' bölümündeki önceki kavramları kullanır. Olayı unsur, artış/azalış, hesap yönü, kontrol ve finansal tablo etkisi sırasıyla düşün. Sonuçtan önce gerekçeyi kur.'),
    jsonb_build_object('id',p_kod||'-k','type','kontrol','props',jsonb_build_object(
      'soru',p_ad||' için ilk verilmesi gereken karar hangisidir?',
      'siklar','[{"metin":"İşletmede gerçekte neyin değiştiğini belirlemek","dogru":true},{"metin":"Bir hesap kodunu rastgele seçmek","dogru":false}]',
      'aciklama','Doğru hesap ve kayıt, ekonomik olay analizinin sonucudur.','ipucu','Önce işletme gerçeğini söyle.'),'children','[]'::jsonb),
    pg_temp.baslik(p_kod||'-gecis','Sıradaki bağlantı'),
    pg_temp.paragraf(p_kod||'-p3','Bu kararı farklı bir olayda yeniden kurabildiğinde sonraki derse geç. Yeni ders aynı düşünme zincirine bir katman daha ekleyecek.')
  )
$$;

create temporary table temeller_ders_tanimlari(
  kart_slug text, kart_sira int, bolum_ad text, bolum_sira int,
  ders_ad text, ders_sira int, eski_ad text
) on commit drop;

insert into temeller_ders_tanimlari values
-- T1 · 14 ders
('muhasebe-baslangic',0,'Muhasebe neden var?',0,'Muhasebe Neden Gereklidir?',0,'Muhasebe Neden Gereklidir?'),
('muhasebe-baslangic',0,'Muhasebe neden var?',0,'Muhasebe Nedir?',1,'Muhasebe Nedir?'),
('muhasebe-baslangic',0,'Muhasebe neden var?',0,'Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi',2,null),
('muhasebe-baslangic',0,'Muhasebe neden var?',0,'Muhasebe Bilgisini Kim Kullanır?',3,null),
('muhasebe-baslangic',0,'İşletmede neyi muhasebeleştiriyoruz?',1,'Mali Nitelikteki Olay',0,'Mali Nitelikteki Olay'),
('muhasebe-baslangic',0,'İşletmede neyi muhasebeleştiriyoruz?',1,'Para Hareketi Her Zaman Gelir veya Gider midir?',1,null),
('muhasebe-baslangic',0,'İşletmede neyi muhasebeleştiriyoruz?',1,'Belge Nedir?',2,'Belge'),
('muhasebe-baslangic',0,'İşletmede neyi muhasebeleştiriyoruz?',1,'Belge ile Olay Arasındaki İlişki',3,null),
('muhasebe-baslangic',0,'İşletmenin ekonomik yapısı',2,'İşletmenin Varlıkları',0,'İşletmenin Varlıkları'),
('muhasebe-baslangic',0,'İşletmenin ekonomik yapısı',2,'Varlıkların Kaynakları',1,'Varlıkların Kaynakları'),
('muhasebe-baslangic',0,'İşletmenin ekonomik yapısı',2,'Varlıklar = Kaynaklar',2,'Varlıklar = Kaynaklar'),
('muhasebe-baslangic',0,'İşletmenin ekonomik yapısı',2,'Temel Muhasebe Denklemi',3,'Temel Muhasebe Denklemi'),
('muhasebe-baslangic',0,'İşletmenin ekonomik yapısı',2,'İşlemlerin Denkleme Etkisi',4,'İşlemlerin Muhasebe Denklemine Etkisi'),
('muhasebe-baslangic',0,'İşletmenin ekonomik yapısı',2,'Gelir, Gider ve Özkaynak İlişkisi',5,'Gelir, Gider ve Özkaynak'),
-- T2 · 18 ders
('hesap-kayit-mantigi',1,'Hesap',0,'Hesap Nedir?',0,'Hesap Nedir?'),
('hesap-kayit-mantigi',1,'Hesap',0,'Neden Her Şeyi Tek Listede Tutmuyoruz?',1,null),
('hesap-kayit-mantigi',1,'Hesap',0,'Hesaplar Neden İki Taraflıdır?',2,'Hesaplar Neden İki Taraflıdır?'),
('hesap-kayit-mantigi',1,'Hesap',0,'Hesabın Artması ve Azalması',3,null),
('hesap-kayit-mantigi',1,'Borç ve Alacak',1,'Borç ve Alacak Ne Demektir?',0,'Borç ve Alacak'),
('hesap-kayit-mantigi',1,'Borç ve Alacak',1,'Varlık Hesapları',1,null),
('hesap-kayit-mantigi',1,'Borç ve Alacak',1,'Kaynak Hesapları',2,null),
('hesap-kayit-mantigi',1,'Borç ve Alacak',1,'Gelir ve Gider Hesapları',3,null),
('hesap-kayit-mantigi',1,'Borç ve Alacak',1,'Normal Bakiye Mantığı',4,null),
('hesap-kayit-mantigi',1,'Çift taraflı kayıt',2,'Bir İşlem Neden En Az İki Hesabı Etkiler?',0,null),
('hesap-kayit-mantigi',1,'Çift taraflı kayıt',2,'Çift Taraflı Kayıt',1,'Çift Taraflı Kayıt'),
('hesap-kayit-mantigi',1,'Çift taraflı kayıt',2,'Borç = Alacak Kontrolü',2,null),
('hesap-kayit-mantigi',1,'Hesap planı',3,'Tekdüzen Hesap Planı Neden Var?',0,'Tekdüzen Hesap Planı'),
('hesap-kayit-mantigi',1,'Hesap planı',3,'Hesap Sınıfı',1,null),
('hesap-kayit-mantigi',1,'Hesap planı',3,'Hesap Grubu',2,null),
('hesap-kayit-mantigi',1,'Hesap planı',3,'Ana Hesap',3,null),
('hesap-kayit-mantigi',1,'Hesap planı',3,'Alt Hesap',4,null),
('hesap-kayit-mantigi',1,'Hesap planı',3,'Hesabı Ezberlemek Yerine Bulmak',5,null),
-- T3 · 13 ders
('kayittan-finansal-tabloya',2,'Muhasebe kaydı',0,'Yevmiye Kaydı',0,'Yevmiye Kaydı'),
('kayittan-finansal-tabloya',2,'Muhasebe kaydı',0,'Kayıt Tarihi ve Açıklama',1,null),
('kayittan-finansal-tabloya',2,'Muhasebe kaydı',0,'Basit Muhasebe Kaydı',2,'Belgelerden Muhasebe Kaydı'),
('kayittan-finansal-tabloya',2,'Muhasebe kaydı',0,'Birden Fazla Hesaplı Kayıt',3,null),
('kayittan-finansal-tabloya',2,'Sınıflandırma',1,'Büyük Defter',0,'Büyük Defter ve Mizan'),
('kayittan-finansal-tabloya',2,'Sınıflandırma',1,'Hesap Bakiyesi',1,null),
('kayittan-finansal-tabloya',2,'Sınıflandırma',1,'Mizan',2,null),
('kayittan-finansal-tabloya',2,'Sınıflandırma',1,'Mizan Ne Kontrol Eder?',3,null),
('kayittan-finansal-tabloya',2,'Sınıflandırma',1,'Mizan Neyi Kontrol Edemez?',4,null),
('kayittan-finansal-tabloya',2,'Raporlama',2,'Bilanço',0,'Bilanço ve Gelir Tablosu'),
('kayittan-finansal-tabloya',2,'Raporlama',2,'Gelir Tablosu',1,null),
('kayittan-finansal-tabloya',2,'Raporlama',2,'Kâr ile Nakit Aynı Şey Değildir',2,null),
('kayittan-finansal-tabloya',2,'Raporlama',2,'Muhasebe Kaydının Finansal Tabloya Yolculuğu',3,null);

do $$
declare
  t1 uuid; t2 uuid; t3 uuid; r record; b uuid; i uuid; eski uuid;
begin
  select id into t1 from public.kesfet_kartlar where slug='muhasebe-baslangic' and tip='kesfet';
  if t1 is null then raise exception 'muhasebe-baslangic kartı bulunamadı'; end if;
  update public.kesfet_kartlar set ad='Muhasebenin Mantığı',
    aciklama='İşletmedeki ekonomik olayları, belgeleri ve muhasebe denklemini kullanarak muhasebe açısından düşünmeyi öğren.',
    ikon='Lightbulb',kategori='Temeller',durum='acik',sira=0 where id=t1;

  t2:=pg_temp.sabit_uuid('kart:hesap-kayit-mantigi');
  insert into public.kesfet_kartlar(id,slug,ad,aciklama,ikon,kategori,tip,durum,sira)
  values(t2,'hesap-kayit-mantigi','Hesap ve Kayıt Mantığı','Hesap, borç/alacak ve çift taraflı kayıt sistemini işletme olaylarından hareketle kur.','SplitSquareVertical','Temeller','kesfet','acik',1)
  on conflict(slug) do update set ad=excluded.ad,aciklama=excluded.aciklama,ikon=excluded.ikon,kategori=excluded.kategori,durum='acik',sira=1
  returning id into t2;

  t3:=pg_temp.sabit_uuid('kart:kayittan-finansal-tabloya');
  insert into public.kesfet_kartlar(id,slug,ad,aciklama,ikon,kategori,tip,durum,sira)
  values(t3,'kayittan-finansal-tabloya','Kayıttan Finansal Tabloya','Yevmiye, büyük defter, mizan ve finansal tablolar arasındaki veri akışını uçtan uca izle.','ChartNoAxesCombined','Temeller','kesfet','acik',2)
  on conflict(slug) do update set ad=excluded.ad,aciklama=excluded.aciklama,ikon=excluded.ikon,kategori=excluded.kategori,durum='acik',sira=2
  returning id into t3;

  for r in select distinct kart_slug,kart_sira,bolum_ad,bolum_sira from temeller_ders_tanimlari order by kart_sira,bolum_sira loop
    select kb.id into b from public.kesfet_bolumler kb
      where kb.kart_id=case r.kart_slug when 'muhasebe-baslangic' then t1 when 'hesap-kayit-mantigi' then t2 else t3 end
        and kb.ad=r.bolum_ad limit 1;
    if b is null then
      b:=pg_temp.sabit_uuid('bolum:'||r.kart_slug||':'||r.bolum_sira);
      insert into public.kesfet_bolumler(id,kart_id,ad,sira,tur)
      values(b,case r.kart_slug when 'muhasebe-baslangic' then t1 when 'hesap-kayit-mantigi' then t2 else t3 end,r.bolum_ad,r.bolum_sira,'normal')
      on conflict(id) do update set kart_id=excluded.kart_id,ad=excluded.ad,sira=excluded.sira,tur='normal';
    end if;
  end loop;

  for r in select * from temeller_ders_tanimlari order by kart_sira,bolum_sira,ders_sira loop
    select id into b from public.kesfet_bolumler where kart_id=case r.kart_slug when 'muhasebe-baslangic' then t1 when 'hesap-kayit-mantigi' then t2 else t3 end and ad=r.bolum_ad;
    eski:=null;
    if r.eski_ad is not null then
      select ki.id into eski from public.kesfet_itemler ki join public.kesfet_bolumler kb on kb.id=ki.bolum_id
      where kb.kart_id in (t1,t2,t3) and ki.ad=r.eski_ad order by ki.created_at limit 1;
    end if;
    if eski is null then
      select ki.id into eski from public.kesfet_itemler ki where ki.bolum_id=b and ki.ad=r.ders_ad limit 1;
    end if;
    i:=coalesce(eski,pg_temp.sabit_uuid('ders:'||r.kart_slug||':'||r.bolum_sira||':'||r.ders_sira));
    insert into public.kesfet_itemler(id,bolum_id,ad,tip,sira,icerik,icerik_guncellendi,yayin_durumu)
    values(i,b,r.ders_ad,'ders',r.ders_sira,pg_temp.ders_icerigi(r.kart_slug||'-'||r.bolum_sira||'-'||r.ders_sira,r.ders_ad,r.bolum_ad),now(),'yayinlandi')
    on conflict(id) do update set bolum_id=excluded.bolum_id,ad=excluded.ad,tip='ders',sira=excluded.sira,icerik=excluded.icerik,icerik_guncellendi=now(),yayin_durumu='yayinlandi';
  end loop;

  -- Yalnız artık boş kalan eski Temeller bölümlerini kaldır.
  delete from public.kesfet_bolumler kb where kb.kart_id in(t1,t2,t3)
    and not exists(select 1 from public.kesfet_itemler ki where ki.bolum_id=kb.id)
    and not exists(select 1 from temeller_ders_tanimlari d where d.bolum_ad=kb.ad and case d.kart_slug when 'muhasebe-baslangic' then t1 when 'hesap-kayit-mantigi' then t2 else t3 end=kb.kart_id);

  -- Kart finalleri, normal bölüm sayısına dahil olmayan özel bölüm/item olarak tutulur.
  b:=pg_temp.sabit_uuid('bolum:muhasebe-baslangic:final');
  insert into public.kesfet_bolumler(id,kart_id,ad,sira,tur) values(b,t1,'Muhasebenin Mantığı Finali',99,'kart_finali')
  on conflict(id) do update set kart_id=t1,ad=excluded.ad,sira=99,tur='kart_finali';
  i:=pg_temp.sabit_uuid('ders:muhasebe-baslangic:final');
  insert into public.kesfet_itemler(id,bolum_id,ad,tip,sira,icerik,icerik_guncellendi,yayin_durumu)
  values(i,b,'10 Olayda Muhasebe Mantığı','alistirma',0,
    jsonb_build_array(pg_temp.baslik('t1f-h','10 olay, tek düşünme zinciri'),pg_temp.paragraf('t1f-p','Teklif, sermaye, kredi, alış, satış, tahsilat, ödeme, demirbaş, gider ve dönem sonucu olaylarını mali nitelik, denklem ve tablo etkisi bakımından ayır. Ölçümlü görev bütün olaylarda gerekçeli karar vermeni ister.')),now(),'yayinlandi')
  on conflict(id) do update set bolum_id=b,ad=excluded.ad,tip='alistirma',sira=0,icerik=excluded.icerik,yayin_durumu='yayinlandi';

  b:=pg_temp.sabit_uuid('bolum:kayittan-finansal-tabloya:final');
  insert into public.kesfet_bolumler(id,kart_id,ad,sira,tur) values(b,t3,'Kayıttan Finansal Tabloya Finali',99,'kart_finali')
  on conflict(id) do update set kart_id=t3,ad=excluded.ad,sira=99,tur='kart_finali';
  i:=pg_temp.sabit_uuid('ders:kayittan-finansal-tabloya:final');
  insert into public.kesfet_itemler(id,bolum_id,ad,tip,sira,icerik,icerik_guncellendi,yayin_durumu)
  values(i,b,'Bir İşletmenin İlk 10 İşlemi','alistirma',0,
    jsonb_build_array(pg_temp.baslik('t3f-h','İlk ayın muhasebe dosyası'),pg_temp.paragraf('t3f-p','Sermaye, kredi, peşin ve vadeli alış, satış, tahsilat, ödeme, demirbaş, kira ve ay sonu kontrolünden oluşan 10 işlemi olay → hesap → kayıt → büyük defter → mizan → finansal tablo zincirinde çöz. Ölçümlü görevde bu zincirin belge ve yevmiye adımını kur.')),now(),'yayinlandi')
  on conflict(id) do update set bolum_id=b,ad=excluded.ad,tip='alistirma',sira=0,icerik=excluded.icerik,yayin_durumu='yayinlandi';

  -- Kartlar açık kalır; sıra yalnız öneridir.
  delete from public.kesfet_kart_on_kosullari where kart_id in(t2,t3);
  insert into public.kesfet_kart_on_kosullari(kart_id,on_kosul_kart_id,tur)
  values(t2,t1,'onerilen'),(t3,t2,'onerilen') on conflict do nothing;

  -- Temelleri ön koşul alan mevcut Yetkinlikler artık son Temeller kartını tamamlamayı bekler.
  update public.kesfet_kart_on_kosullari x set on_kosul_kart_id=t3
  where x.on_kosul_kart_id=t1 and x.tur='zorunlu'
    and exists(select 1 from public.kesfet_kartlar k where k.id=x.kart_id and k.kategori='Yetkinlikler')
    and not exists(select 1 from public.kesfet_kart_on_kosullari y where y.kart_id=x.kart_id and y.on_kosul_kart_id=t3 and y.tur=x.tur);
  delete from public.kesfet_kart_on_kosullari x where x.on_kosul_kart_id=t1 and x.tur='zorunlu'
    and exists(select 1 from public.kesfet_kartlar k where k.id=x.kart_id and k.kategori='Yetkinlikler');
end $$;

-- T1 finali: 10 olaylık ölçümlü çoktan seçmeli Question Engine kaydı.
insert into public.muhasebe_olaylari(id,baslik,senaryo,zorluk,ipucu,durum,kaynak)
values('olay-kesfet-t1-final','10 Olayda Muhasebe Mantığı','On farklı işletme olayını mali nitelik, denklem ve tablo etkisi yönünden sınıflandır.','orta','Önce işletmede gerçekte neyin değiştiğini söyle.','onayli','manuel')
on conflict(id) do update set baslik=excluded.baslik,senaryo=excluded.senaryo,zorluk=excluded.zorluk,ipucu=excluded.ipucu,durum='onayli',kaynak='manuel';

insert into public.sorular(id,isletme_id,baslik,zorluk,senaryo,ipucu,aciklama,durum,kaynak,yayinlanma_tarihi,olay_id,tip,destek_seviyesi,config)
values('kesfet-t1-final-001','mal-alis-satis','10 Olayda Muhasebe Mantığı','orta','Her olay için muhasebenin ilk kararını ver. On sorunun tamamı doğru olduğunda kart finali tamamlanır.','Olayın varlık, borç, özkaynak, gelir veya gider etkisini ara.','Muhasebe kaydından önce işletme gerçeği ve ekonomik etki çözülür.','onayli','manuel',now(),'olay-kesfet-t1-final','coktan_secmeli','standart',
$json${"surum":1,"maddeler":[
{"id":"m1","soru":"İşletme yalnızca fiyat teklifi aldı. Bu olay hemen muhasebe kaydı gerektirir mi?","secenekler":[{"id":"a","metin":"Hayır; ölçülebilir bir finansal değişim henüz yok"},{"id":"b","metin":"Evet; her yazılı belge kaydedilir"}],"dogruSecenekId":"a","aciklama":"Teklif tek başına varlık, borç, gelir veya gider yaratmaz."},
{"id":"m2","soru":"Ortak bankaya sermaye yatırdı. İlk ekonomik etki nedir?","secenekler":[{"id":"a","metin":"Banka ve özkaynak artar"},{"id":"b","metin":"Gelir ve kasa artar"}],"dogruSecenekId":"a","aciklama":"Sermaye gelir değil, ortakların işletmedeki hakkıdır."},
{"id":"m3","soru":"Banka kredisi hesaba geçti. Para girişi neden gelir değildir?","secenekler":[{"id":"a","metin":"Geri ödeme yükümlülüğü doğurduğu için"},{"id":"b","metin":"Banka hareketleri kaydedilmediği için"}],"dogruSecenekId":"a","aciklama":"Varlıkla birlikte yabancı kaynak artar."},
{"id":"m4","soru":"Vadeli mal alışında ödeme yapılmadı. Hangi unsur doğar?","secenekler":[{"id":"a","metin":"Satıcı borcu"},{"id":"b","metin":"Kasa çıkışı"}],"dogruSecenekId":"a","aciklama":"Teslim ve fatura borcu doğurur; ödeme ayrı olaydır."},
{"id":"m5","soru":"Bankadan kasaya para çekildi. Toplam varlık ne olur?","secenekler":[{"id":"a","metin":"Değişmez"},{"id":"b","metin":"Artar"}],"dogruSecenekId":"a","aciklama":"Bir varlık artarken diğeri aynı tutarda azalır."},
{"id":"m6","soru":"Vadeli satış yapıldı. Tahsilat henüz yokken ne doğar?","secenekler":[{"id":"a","metin":"Müşteri alacağı ve gelir"},{"id":"b","metin":"Kasa ve sermaye"}],"dogruSecenekId":"a","aciklama":"Satış ve tahsilat farklı ekonomik olaylardır."},
{"id":"m7","soru":"Müşteri eski borcunu ödedi. Bu ödeme yeni gelir midir?","secenekler":[{"id":"a","metin":"Hayır; alacak bankaya dönüşür"},{"id":"b","metin":"Evet; her para girişi gelirdir"}],"dogruSecenekId":"a","aciklama":"Gelir satış tarihinde oluşmuştur."},
{"id":"m8","soru":"İşletmede kullanılacak bilgisayar alındı. İlk sınıflandırma nedir?","secenekler":[{"id":"a","metin":"Ekonomik yarar sağlayan varlık"},{"id":"b","metin":"Her durumda dönem gideri"}],"dogruSecenekId":"a","aciklama":"Kullanım amacı ve yarar süresi hesap seçiminden önce değerlendirilir."},
{"id":"m9","soru":"Elektrik hizmeti tüketildi fakat ödeme gelecek ay. Gider oluşmuş mudur?","secenekler":[{"id":"a","metin":"Evet; hizmet bu dönemde tüketildi"},{"id":"b","metin":"Hayır; yalnız ödeme tarihinde oluşur"}],"dogruSecenekId":"a","aciklama":"Gider ile nakit çıkışı aynı tarih olmak zorunda değildir."},
{"id":"m10","soru":"Bir işlemin finansal tablo etkisini bulmadan önce ne çözülmelidir?","secenekler":[{"id":"a","metin":"Değişen ekonomik unsurlar"},{"id":"b","metin":"Rastgele hesap numarası"}],"dogruSecenekId":"a","aciklama":"Tablo etkisi ekonomik olay analizinin devamıdır."}
]}$json$::jsonb)
on conflict(id) do update set baslik=excluded.baslik,zorluk=excluded.zorluk,senaryo=excluded.senaryo,ipucu=excluded.ipucu,aciklama=excluded.aciklama,durum='onayli',kaynak='manuel',olay_id=excluded.olay_id,tip=excluded.tip,destek_seviyesi=excluded.destek_seviyesi,config=excluded.config;

insert into public.olay_yetkinlikleri(olay_id,yetkinlik_id,agirlik)
values('olay-kesfet-t1-final','muhasebe-temelleri',1) on conflict(olay_id,yetkinlik_id) do update set agirlik=excluded.agirlik;

insert into public.kesfet_item_sorulari(item_id,soru_id,sira,zorunlu,minimum_basari,destek_seviyesi)
values(pg_temp.sabit_uuid('ders:muhasebe-baslangic:final'),'kesfet-t1-final-001',0,true,100,'standart')
on conflict(item_id,soru_id) do update set sira=0,zorunlu=true,minimum_basari=100,destek_seviyesi='standart';

-- T3 finali mevcut onaylı KUR-001 ile ölçülür.
insert into public.kesfet_item_sorulari(item_id,soru_id,sira,zorunlu,minimum_basari,destek_seviyesi)
select pg_temp.sabit_uuid('ders:kayittan-finansal-tabloya:final'),s.id,0,true,100,'standart'
from public.sorular s where s.id='soru-mal-alis-veresiye-001' and s.durum='onayli'
on conflict(item_id,soru_id) do update set sira=0,zorunlu=true,minimum_basari=100,destek_seviyesi='standart';

notify pgrst,'reload schema';
commit;
