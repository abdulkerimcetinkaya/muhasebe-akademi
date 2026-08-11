-- Temeller V4: pedagojik denetim sonucunda 45 yayınlanmış dersi 39 derse indirir.
-- Birleşen dersler silinmez; öğrenci görünümünden çıkarılıp arşivlenir.

begin;

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

create temporary table temeller_bolum_hedefleri(
  kart_slug text, eski_ad text, yeni_ad text, sira int
) on commit drop;

insert into temeller_bolum_hedefleri values
('muhasebe-baslangic','Muhasebe neden var?','Muhasebe neden var?',0),
('muhasebe-baslangic','İşletmede neyi muhasebeleştiriyoruz?','İşletmede neyi muhasebeleştiriyoruz?',1),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','İşletmenin ekonomik yapısı',2),
('hesap-kayit-mantigi','Hesap','Hesap',0),
('hesap-kayit-mantigi','Borç ve Alacak','Hesapların çalışma mantığı',1),
('hesap-kayit-mantigi','Çift taraflı kayıt','Çift taraflı kayıt',2),
('hesap-kayit-mantigi','Hesap planı','Hesap Planı',3),
('kayittan-finansal-tabloya','Muhasebe kaydı','Muhasebe Kaydı',0),
('kayittan-finansal-tabloya','Sınıflandırma','Sınıflandırma ve Kontrol',1),
('kayittan-finansal-tabloya','Raporlama','Raporlama',2);

create temporary table temeller_birlesmeler(
  kart_slug text, kaynak_ad text, hedef_eski_ad text, hedef_yeni_ad text
) on commit drop;

insert into temeller_birlesmeler values
('muhasebe-baslangic','Belge ile Olay Arasındaki İlişki','Belge Nedir?','Belge: Ekonomik Olayın Kayıt Dayanağı'),
('muhasebe-baslangic','Varlıklar = Kaynaklar','Temel Muhasebe Denklemi','Temel Muhasebe Denklemi: Varlıklar = Borçlar + Özkaynak'),
('hesap-kayit-mantigi','Neden Her Şeyi Tek Listede Tutmuyoruz?','Hesap Nedir?','Hesap Nedir ve Neden Hesaplara İhtiyaç Duyarız?'),
('hesap-kayit-mantigi','Borç ve Alacak Ne Demektir?','Hesaplar Neden İki Taraflıdır?','Hesabın İki Tarafı: Borç ve Alacak'),
('hesap-kayit-mantigi','Hesap Grubu','Hesap Sınıfı','Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap'),
('hesap-kayit-mantigi','Ana Hesap','Hesap Sınıfı','Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap'),
('kayittan-finansal-tabloya','Mizan Neyi Kontrol Edemez?','Mizan Ne Kontrol Eder?','Mizan Neyi Kontrol Eder, Neyi Edemez?');

-- Birleşen derslerin tamamlanma bilgisini kanonik derse de taşı, ardından
-- kaynak dersi öğrenci görünümünden çıkar. Kaynak kayıtlar anonim cache ve
-- denetim izi için arşivde kalır.
do $$
declare r record; v_kart uuid; v_kaynak uuid; v_hedef uuid;
begin
  for r in select * from temeller_birlesmeler loop
    select id into v_kart from public.kesfet_kartlar where slug=r.kart_slug and tip='kesfet';
    select i.id into v_kaynak
      from public.kesfet_itemler i join public.kesfet_bolumler b on b.id=i.bolum_id
      where b.kart_id=v_kart and i.ad=r.kaynak_ad limit 1;
    select i.id into v_hedef
      from public.kesfet_itemler i join public.kesfet_bolumler b on b.id=i.bolum_id
      where b.kart_id=v_kart and i.ad in(r.hedef_eski_ad,r.hedef_yeni_ad)
      order by (i.yayin_durumu='yayinlandi') desc limit 1;
    if v_kaynak is not null and v_hedef is not null and v_kaynak<>v_hedef then
      insert into public.kesfet_ilerleme(kullanici_id,item_id,tamamlandi_at)
      select kullanici_id,v_hedef,tamamlandi_at from public.kesfet_ilerleme where item_id=v_kaynak
      on conflict(kullanici_id,item_id) do update
        set tamamlandi_at=least(public.kesfet_ilerleme.tamamlandi_at,excluded.tamamlandi_at);
      update public.kesfet_itemler set yayin_durumu='arsiv' where id=v_kaynak;
    end if;
  end loop;
end $$;

-- Bölüm adlarını ve sıralarını nihai yapıya getir.
update public.kesfet_bolumler b
set ad=h.yeni_ad,sira=h.sira,tur='normal'
from temeller_bolum_hedefleri h, public.kesfet_kartlar k
where k.id=b.kart_id and k.slug=h.kart_slug and k.tip='kesfet'
  and b.tur='normal' and b.ad in(h.eski_ad,h.yeni_ad);

create temporary table temeller_ders_hedefleri(
  kart_slug text, bolum_ad text, eski_ad text, yeni_ad text, sira int
) on commit drop;

insert into temeller_ders_hedefleri values
-- Kart 1 · 13 ders
('muhasebe-baslangic','Muhasebe neden var?','Muhasebe Neden Gereklidir?','Muhasebe Neden Gereklidir?',0),
('muhasebe-baslangic','Muhasebe neden var?','Muhasebe Nedir?','Muhasebe Nedir?',1),
('muhasebe-baslangic','Muhasebe neden var?','Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi','Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi',2),
('muhasebe-baslangic','Muhasebe neden var?','Muhasebe Bilgisini Kim Kullanır?','Muhasebe Bilgisini Kim, Neden Kullanır?',3),
('muhasebe-baslangic','İşletmede neyi muhasebeleştiriyoruz?','İşletme ile Sahibinin İşlemlerini Ayırmak','İşletme ile Sahibinin İşlemlerini Ayırmak',0),
('muhasebe-baslangic','İşletmede neyi muhasebeleştiriyoruz?','Mali Nitelikteki Olay','Mali Nitelikteki Olay',1),
('muhasebe-baslangic','İşletmede neyi muhasebeleştiriyoruz?','Para Hareketi Her Zaman Gelir veya Gider midir?','Para Hareketi Her Zaman Gelir veya Gider midir?',2),
('muhasebe-baslangic','İşletmede neyi muhasebeleştiriyoruz?','Belge Nedir?','Belge: Ekonomik Olayın Kayıt Dayanağı',3),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','İşletmenin Varlıkları','İşletmenin Varlıkları',0),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','Varlıkların Kaynakları','Varlıklar Nereden Gelir? Borçlar ve Özkaynak',1),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','Temel Muhasebe Denklemi','Temel Muhasebe Denklemi: Varlıklar = Borçlar + Özkaynak',2),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','İşlemlerin Denkleme Etkisi','İşlemlerin Muhasebe Denklemine Etkisi',3),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','Gelir, Gider ve Özkaynak İlişkisi','Gelir, Gider ve Özkaynak İlişkisi',4),
-- Kart 2 · 14 ders
('hesap-kayit-mantigi','Hesap','Hesap Nedir?','Hesap Nedir ve Neden Hesaplara İhtiyaç Duyarız?',0),
('hesap-kayit-mantigi','Hesap','Hesaplar Neden İki Taraflıdır?','Hesabın İki Tarafı: Borç ve Alacak',1),
('hesap-kayit-mantigi','Hesap','Hesabın Artması ve Azalması','Hesaplarda Artış ve Azalış Nasıl İzlenir?',2),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Varlık Hesapları','Varlık Hesapları',0),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Kaynak Hesapları','Kaynak Hesapları',1),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Gelir ve Gider Hesapları','Gelir ve Gider Hesapları',2),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Normal Bakiye Mantığı','Hesabın Doğal Yönü: Normal Bakiye',3),
('hesap-kayit-mantigi','Çift taraflı kayıt','Bir İşlem Neden En Az İki Hesabı Etkiler?','Bir İşlem Neden En Az İki Hesabı Etkiler?',0),
('hesap-kayit-mantigi','Çift taraflı kayıt','Çift Taraflı Kayıt','Çift Taraflı Kayıt',1),
('hesap-kayit-mantigi','Çift taraflı kayıt','Borç = Alacak Kontrolü','Borç = Alacak Kontrolü',2),
('hesap-kayit-mantigi','Hesap Planı','Tekdüzen Hesap Planı Neden Var?','Tekdüzen Hesap Planı Neden Var?',0),
('hesap-kayit-mantigi','Hesap Planı','Hesap Sınıfı','Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap',1),
('hesap-kayit-mantigi','Hesap Planı','Alt Hesap','Alt Hesap ve Muhasebe Detayı',2),
('hesap-kayit-mantigi','Hesap Planı','Hesabı Ezberlemek Yerine Bulmak','Hesabı Ezberlemek Yerine Bulmak',3),
-- Kart 3 · 12 ders
('kayittan-finansal-tabloya','Muhasebe Kaydı','Yevmiye Kaydı','Yevmiye Kaydı Nedir?',0),
('kayittan-finansal-tabloya','Muhasebe Kaydı','Kayıt Tarihi ve Açıklama','Bir Yevmiye Kaydının Anatomisi',1),
('kayittan-finansal-tabloya','Muhasebe Kaydı','Basit Muhasebe Kaydı','Basit Muhasebe Kaydı',2),
('kayittan-finansal-tabloya','Muhasebe Kaydı','Birden Fazla Hesaplı Kayıt','Birden Fazla Hesaplı Kayıt',3),
('kayittan-finansal-tabloya','Sınıflandırma ve Kontrol','Büyük Defter','Büyük Defter: Kayıtları Hesaplara Göre Toplamak',0),
('kayittan-finansal-tabloya','Sınıflandırma ve Kontrol','Hesap Bakiyesi','Hesap Bakiyesi',1),
('kayittan-finansal-tabloya','Sınıflandırma ve Kontrol','Mizan','Mizan: Hesapları Tek Yerde Görmek',2),
('kayittan-finansal-tabloya','Sınıflandırma ve Kontrol','Mizan Ne Kontrol Eder?','Mizan Neyi Kontrol Eder, Neyi Edemez?',3),
('kayittan-finansal-tabloya','Raporlama','Bilanço','Bilanço / Finansal Durum Tablosu',0),
('kayittan-finansal-tabloya','Raporlama','Gelir Tablosu','Gelir Tablosu',1),
('kayittan-finansal-tabloya','Raporlama','Kâr ile Nakit Aynı Şey Değildir','Kâr ile Nakit Neden Aynı Şey Değildir?',2),
('kayittan-finansal-tabloya','Raporlama','Muhasebe Kaydının Finansal Tabloya Yolculuğu','Kayıttan Finansal Tabloya: Muhasebe Döngüsü',3);

-- Yeni tek ders mevcut şablon sözleşmesiyle eklenir.
insert into public.kesfet_itemler(id,bolum_id,ad,tip,sira,icerik,icerik_guncellendi,yayin_durumu)
select pg_temp.sabit_uuid('ders:muhasebe-baslangic:isletme-sahibi-ayrimi'),b.id,
  'İşletme ile Sahibinin İşlemlerini Ayırmak','ders',0,
  pg_temp.ders_icerigi('muhasebe-baslangic-1-0','İşletme ile Sahibinin İşlemlerini Ayırmak',b.ad),now(),'yayinlandi'
from public.kesfet_bolumler b join public.kesfet_kartlar k on k.id=b.kart_id
where k.slug='muhasebe-baslangic' and k.tip='kesfet'
  and b.ad='İşletmede neyi muhasebeleştiriyoruz?' and b.tur='normal'
on conflict(id) do update set bolum_id=excluded.bolum_id,ad=excluded.ad,tip='ders',sira=0,
  yayin_durumu='yayinlandi';

-- Kalan kanonik dersleri taşı, sırala ve yeniden adlandır. İçerikte yalnız eski
-- ders adı mekanik olarak yenisiyle değiştirilir; editoryal içerik üretilmez.
do $$
declare r record; v_kart uuid; v_bolum uuid; v_item uuid; v_icerik jsonb;
begin
  for r in select * from temeller_ders_hedefleri order by kart_slug,bolum_ad,sira loop
    select id into v_kart from public.kesfet_kartlar where slug=r.kart_slug and tip='kesfet';
    select id into v_bolum from public.kesfet_bolumler
      where kart_id=v_kart and ad=r.bolum_ad and tur='normal' limit 1;
    select id,icerik into v_item,v_icerik from public.kesfet_itemler
      where ad in(r.eski_ad,r.yeni_ad)
        and bolum_id in(select id from public.kesfet_bolumler where kart_id=v_kart)
      order by (yayin_durumu='yayinlandi') desc limit 1;
    if v_item is null then
      raise exception 'Temeller hedef dersi bulunamadı: % / %',r.kart_slug,r.eski_ad;
    end if;
    update public.kesfet_itemler set bolum_id=v_bolum,ad=r.yeni_ad,sira=r.sira,
      yayin_durumu='yayinlandi',
      icerik=case when r.eski_ad<>r.yeni_ad and v_icerik is not null
        then replace(v_icerik::text,r.eski_ad,r.yeni_ad)::jsonb
        else v_icerik end,
      icerik_guncellendi=case when r.eski_ad<>r.yeni_ad then now() else icerik_guncellendi end
    where id=v_item;
  end loop;
end $$;

notify pgrst,'reload schema';
commit;
