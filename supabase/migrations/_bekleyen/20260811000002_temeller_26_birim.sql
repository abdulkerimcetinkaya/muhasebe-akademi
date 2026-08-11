-- Temeller V5 (ADR-004): 39 yayınlı dersi 26 öğrenme birimine indirir.
-- Desen 20260809000005 ile aynıdır: birleşen ders silinmez, arşive alınır;
-- öğrenci ilerlemesi kanonik birime taşınır; slug'lar değişmez.
-- Fark: üç ders (Yevmiye Kaydı Nedir?, Basit Muhasebe Kaydı, Birden Fazla
-- Hesaplı Kayıt) Kart 3'ten Kart 2'ye taşındığı için ders araması tek kart
-- yerine üç Temeller kartının tamamında yapılır.

begin;

-- ── Kart vitrin adları (slug sabit — rotalar kırılmaz) ─────────────────────
update public.kesfet_kartlar set
  ad='İşletmeyi Muhasebe Gibi Görmek',
  aciklama='Ekonomik olayların muhasebe açısından nasıl düşünüldüğünü öğren.'
where slug='muhasebe-baslangic' and tip='kesfet';

update public.kesfet_kartlar set
  ad='Olaydan Muhasebe Kaydına',
  aciklama='Hesap, borç/alacak ve yevmiye mantığını kur; ilk kaydını kendin yap.'
where slug='hesap-kayit-mantigi' and tip='kesfet';

update public.kesfet_kartlar set
  aciklama='Kayıtların büyük defter, mizan ve finansal tablolara dönüşümünü gör.'
where slug='kayittan-finansal-tabloya' and tip='kesfet';

-- ── 13 birleşme: kaynak ders → kanonik hedef ──────────────────────────────
-- hedef_eski_ad / hedef_yeni_ad: hedef ders migration sonunda yeni adını alır.
create temporary table t26_birlesmeler(
  kaynak_ad text, hedef_eski_ad text, hedef_yeni_ad text
) on commit drop;

insert into t26_birlesmeler values
-- Kart 1
('Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi','Muhasebe Nedir?','Muhasebe Ne Yapar?'),
('Muhasebe Bilgisini Kim, Neden Kullanır?','Muhasebe Nedir?','Muhasebe Ne Yapar?'),
('Para Hareketi Her Zaman Gelir veya Gider midir?','Mali Nitelikteki Olay','Mali Nitelikteki Olay'),
-- Kart 2
('Hesaplarda Artış ve Azalış Nasıl İzlenir?','Hesabın İki Tarafı: Borç ve Alacak','Hesabın İki Tarafı: Borç ve Alacak'),
('Kaynak Hesapları','Varlık Hesapları','Varlık, Borç ve Özkaynak Hesaplarının Çalışması'),
('Çift Taraflı Kayıt','Bir İşlem Neden En Az İki Hesabı Etkiler?','İşlem Analizi'),
('Borç = Alacak Kontrolü','Bir İşlem Neden En Az İki Hesabı Etkiler?','İşlem Analizi'),
('Tekdüzen Hesap Planı Neden Var?','Hesabı Ezberlemek Yerine Bulmak','Hesap Planında Hesabı Bulmak'),
('Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap','Hesabı Ezberlemek Yerine Bulmak','Hesap Planında Hesabı Bulmak'),
('Alt Hesap ve Muhasebe Detayı','Hesabı Ezberlemek Yerine Bulmak','Hesap Planında Hesabı Bulmak'),
-- Kart 3
('Hesap Bakiyesi','Büyük Defter: Kayıtları Hesaplara Göre Toplamak','Büyük Defter ve Hesap Bakiyesi'),
('Mizan Neyi Kontrol Eder, Neyi Edemez?','Mizan: Hesapları Tek Yerde Görmek','Mizan'),
('Gelir Tablosu','Bilanço / Finansal Durum Tablosu','Bilanço ve Gelir Tablosu');

-- ── 26 kanonik birim: nihai kart / bölüm / ad / sıra ──────────────────────
-- eski_ad = dersin bugünkü adı (yeniden çalıştırmada yeni_ad ile de bulunur).
create temporary table t26_hedefler(
  kart_slug text, bolum_ad text, eski_ad text, yeni_ad text, sira int
) on commit drop;

insert into t26_hedefler values
-- Kart 1 · İşletmeyi Muhasebe Gibi Görmek · 10 birim
('muhasebe-baslangic','Muhasebeye neden ihtiyaç var?','Muhasebe Neden Gereklidir?','Muhasebe Neden Gereklidir?',0),
('muhasebe-baslangic','Muhasebeye neden ihtiyaç var?','Muhasebe Nedir?','Muhasebe Ne Yapar?',1),
('muhasebe-baslangic','Muhasebenin konusu','İşletme ile Sahibinin İşlemlerini Ayırmak','İşletme ile Sahibinin Ayrılması',0),
('muhasebe-baslangic','Muhasebenin konusu','Mali Nitelikteki Olay','Mali Nitelikteki Olay',1),
('muhasebe-baslangic','Muhasebenin konusu','Belge: Ekonomik Olayın Kayıt Dayanağı','Belge ve Ekonomik Olay',2),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','İşletmenin Varlıkları','Varlıklar',0),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','Varlıklar Nereden Gelir? Borçlar ve Özkaynak','Borçlar ve Özkaynak',1),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','Temel Muhasebe Denklemi: Varlıklar = Borçlar + Özkaynak','Temel Muhasebe Denklemi',2),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','İşlemlerin Muhasebe Denklemine Etkisi','İşlemler Denklemi Nasıl Değiştirir?',3),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','Gelir, Gider ve Özkaynak İlişkisi','Gelir, Gider ve Özkaynak',4),
-- Kart 2 · Olaydan Muhasebe Kaydına · 10 birim
('hesap-kayit-mantigi','Hesap mantığı','Hesap Nedir ve Neden Hesaplara İhtiyaç Duyarız?','Neden Hesaplara İhtiyaç Var?',0),
('hesap-kayit-mantigi','Hesap mantığı','Hesabın İki Tarafı: Borç ve Alacak','Hesabın İki Tarafı: Borç ve Alacak',1),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Varlık Hesapları','Varlık, Borç ve Özkaynak Hesaplarının Çalışması',0),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Gelir ve Gider Hesapları','Gelir ve Gider Hesaplarının Çalışması',1),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Hesabın Doğal Yönü: Normal Bakiye','Hesabın Bakiyesi',2),
('hesap-kayit-mantigi','Olayı kayda dönüştürmek','Bir İşlem Neden En Az İki Hesabı Etkiler?','İşlem Analizi',0),
('hesap-kayit-mantigi','Olayı kayda dönüştürmek','Yevmiye Kaydı Nedir?','İlk Yevmiye Kaydın',1),
('hesap-kayit-mantigi','Olayı kayda dönüştürmek','Basit Muhasebe Kaydı','Basit Yevmiye Kayıtları',2),
('hesap-kayit-mantigi','Olayı kayda dönüştürmek','Birden Fazla Hesaplı Kayıt','Birden Fazla Hesaplı Kayıt',3),
('hesap-kayit-mantigi','Olayı kayda dönüştürmek','Hesabı Ezberlemek Yerine Bulmak','Hesap Planında Hesabı Bulmak',4),
-- Kart 3 · Kayıttan Finansal Tabloya · 6 birim
('kayittan-finansal-tabloya','Kaydın yolculuğu','Bir Yevmiye Kaydının Anatomisi','Yevmiye Kaydının Yapısı',0),
('kayittan-finansal-tabloya','Kaydın yolculuğu','Büyük Defter: Kayıtları Hesaplara Göre Toplamak','Büyük Defter ve Hesap Bakiyesi',1),
('kayittan-finansal-tabloya','Kontrol','Mizan: Hesapları Tek Yerde Görmek','Mizan',0),
('kayittan-finansal-tabloya','Sonuç','Bilanço / Finansal Durum Tablosu','Bilanço ve Gelir Tablosu',0),
('kayittan-finansal-tabloya','Sonuç','Kâr ile Nakit Neden Aynı Şey Değildir?','Kâr ile Nakit Aynı Şey Değildir',1),
('kayittan-finansal-tabloya','Sonuç','Kayıttan Finansal Tabloya: Muhasebe Döngüsü','Muhasebe Döngüsü — Baştan Sona',2);

-- ── Temeller ders arama yardımcıları (üç kartın tamamında) ────────────────
create or replace function pg_temp.temeller_bolum_idleri() returns setof uuid
language sql stable as $$
  select b.id from public.kesfet_bolumler b
  join public.kesfet_kartlar k on k.id=b.kart_id
  where k.tip='kesfet'
    and k.slug in ('muhasebe-baslangic','hesap-kayit-mantigi','kayittan-finansal-tabloya')
$$;

-- ── 1) Birleşmeler: ilerlemeyi kanonik derse taşı, kaynağı arşivle ────────
do $$
declare r record; v_kaynak uuid; v_hedef uuid;
begin
  for r in select * from t26_birlesmeler loop
    select i.id into v_kaynak from public.kesfet_itemler i
      where i.bolum_id in (select pg_temp.temeller_bolum_idleri())
        and i.ad=r.kaynak_ad and i.yayin_durumu='yayinlandi' limit 1;
    select i.id into v_hedef from public.kesfet_itemler i
      where i.bolum_id in (select pg_temp.temeller_bolum_idleri())
        and i.ad in (r.hedef_eski_ad, r.hedef_yeni_ad)
      order by (i.yayin_durumu='yayinlandi') desc limit 1;

    if v_kaynak is not null and v_hedef is not null and v_kaynak<>v_hedef then
      insert into public.kesfet_ilerleme(kullanici_id,item_id,tamamlandi_at)
      select kullanici_id,v_hedef,tamamlandi_at
        from public.kesfet_ilerleme where item_id=v_kaynak
      on conflict(kullanici_id,item_id) do update
        set tamamlandi_at=least(public.kesfet_ilerleme.tamamlandi_at,excluded.tamamlandi_at);
      update public.kesfet_itemler set yayin_durumu='arsiv' where id=v_kaynak;
    end if;
  end loop;
end $$;

-- ── 2) Bölümleri nihai yapıya getir ───────────────────────────────────────
create temporary table t26_bolumler(
  kart_slug text, eski_ad text, yeni_ad text, sira int
) on commit drop;

insert into t26_bolumler values
('muhasebe-baslangic','Muhasebe neden var?','Muhasebeye neden ihtiyaç var?',0),
('muhasebe-baslangic','İşletmede neyi muhasebeleştiriyoruz?','Muhasebenin konusu',1),
('muhasebe-baslangic','İşletmenin ekonomik yapısı','İşletmenin ekonomik yapısı',2),
('hesap-kayit-mantigi','Hesap','Hesap mantığı',0),
('hesap-kayit-mantigi','Hesapların çalışma mantığı','Hesapların çalışma mantığı',1),
('hesap-kayit-mantigi','Çift taraflı kayıt','Olayı kayda dönüştürmek',2),
('kayittan-finansal-tabloya','Muhasebe Kaydı','Kaydın yolculuğu',0),
('kayittan-finansal-tabloya','Sınıflandırma ve Kontrol','Kontrol',1),
('kayittan-finansal-tabloya','Raporlama','Sonuç',2);

update public.kesfet_bolumler b
set ad=h.yeni_ad, sira=h.sira
from t26_bolumler h, public.kesfet_kartlar k
where k.id=b.kart_id and k.slug=h.kart_slug and k.tip='kesfet'
  and b.tur='normal' and b.ad in (h.eski_ad, h.yeni_ad);

-- ── 3) Kanonik birimleri taşı, sırala, yeniden adlandır ───────────────────
-- İçerikte yalnız eski ders adı mekanik olarak yenisiyle değiştirilir;
-- editoryal içerik üretilmez. Birim 1'in gerçek içeriği ellenmez (adı aynı);
-- birim 2'nin gerçek içeriğinde yalnız "Muhasebe Nedir?" başlık metni
-- "Muhasebe Ne Yapar?" olur — gövde korunur.
do $$
declare r record; v_kart uuid; v_bolum uuid; v_item uuid; v_icerik jsonb;
begin
  for r in select * from t26_hedefler order by kart_slug,bolum_ad,sira loop
    select id into v_kart from public.kesfet_kartlar where slug=r.kart_slug and tip='kesfet';
    select id into v_bolum from public.kesfet_bolumler
      where kart_id=v_kart and ad=r.bolum_ad and tur='normal' limit 1;
    if v_bolum is null then
      raise exception 'V5 hedef bölümü bulunamadı: % / %', r.kart_slug, r.bolum_ad;
    end if;

    select i.id, i.icerik into v_item, v_icerik from public.kesfet_itemler i
      where i.bolum_id in (select pg_temp.temeller_bolum_idleri())
        and i.ad in (r.eski_ad, r.yeni_ad)
      order by (i.yayin_durumu='yayinlandi') desc limit 1;
    if v_item is null then
      raise exception 'V5 hedef birimi bulunamadı: % / %', r.kart_slug, r.eski_ad;
    end if;

    update public.kesfet_itemler set
      bolum_id=v_bolum, ad=r.yeni_ad, sira=r.sira, yayin_durumu='yayinlandi',
      icerik=case when r.eski_ad<>r.yeni_ad and v_icerik is not null
        then replace(v_icerik::text, r.eski_ad, r.yeni_ad)::jsonb else v_icerik end,
      icerik_guncellendi=case when r.eski_ad<>r.yeni_ad then now() else icerik_guncellendi end
    where id=v_item;
  end loop;
end $$;

-- ── 4) Boşalacak bölümdeki arşiv dersleri hedef bölümüne taşı ─────────────
-- "Hesap Planı" bölümü kaldırılıyor; içindeki eski arşiv kayıtları
-- ("Hesap Grubu", "Ana Hesap") kanonik hedefin bölümüne alınır ki denetim
-- izi kaybolmasın ve bölüm silinebilsin.
update public.kesfet_itemler i
set bolum_id=(
  select i2.bolum_id from public.kesfet_itemler i2
  where i2.ad='Hesap Planında Hesabı Bulmak'
    and i2.bolum_id in (select pg_temp.temeller_bolum_idleri())
  limit 1)
where i.yayin_durumu='arsiv'
  and i.ad in ('Hesap Grubu','Ana Hesap','Tekdüzen Hesap Planı Neden Var?',
               'Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap','Alt Hesap ve Muhasebe Detayı')
  and i.bolum_id in (
    select b.id from public.kesfet_bolumler b
    join public.kesfet_kartlar k on k.id=b.kart_id
    where k.slug='hesap-kayit-mantigi' and b.ad='Hesap Planı');

-- ── 5) Tamamen boşalan Temeller bölümlerini kaldır ────────────────────────
delete from public.kesfet_bolumler b
where b.id in (select pg_temp.temeller_bolum_idleri())
  and b.tur='normal'
  and not exists (select 1 from public.kesfet_itemler i where i.bolum_id=b.id);

notify pgrst, 'reload schema';
commit;
