-- İşletmeler (Faz 2) — başlangıç "Ticaret İşletmesi" dev seed'i.
-- Canlı DB'ye uygulandı (execute_sql). Muhasebe olarak denk (aktif=pasif, kâr 20.000).
-- NOT: Bu bir iskelet/başlangıç içeriktir; Faz 2.5'te hazır ünite sıralaması
-- temel alınarak zenginleştirilecek. Yeniden çalıştırılabilir (idempotent: slug siler).

do $$
declare
  v_kart uuid;
  v_acilis uuid; v_donem uuid; v_sonu uuid; v_tablo uuid;
begin
  delete from public.kesfet_kartlar where slug = 'ticaret-isletmesi';

  insert into public.kesfet_kartlar (slug, ad, aciklama, ikon, kategori, tip, durum, sira)
  values (
    'ticaret-isletmesi', 'Ticaret İşletmesi',
    'Bir ticaret işletmesini kuruluştan dönem sonuna kadar çalıştır: mal al, sat, KDV''yi yönet, mali tabloları çıkar.',
    'Briefcase', 'Ticaret', 'isletme', 'acik', 0
  ) returning id into v_kart;

  insert into public.kesfet_bolumler (kart_id, ad, sira) values (v_kart,'Açılış',0) returning id into v_acilis;
  insert into public.kesfet_bolumler (kart_id, ad, sira) values (v_kart,'Dönem İçi',1) returning id into v_donem;
  insert into public.kesfet_bolumler (kart_id, ad, sira) values (v_kart,'Dönem Sonu',2) returning id into v_sonu;
  insert into public.kesfet_bolumler (kart_id, ad, sira) values (v_kart,'Mali Tablolar',3) returning id into v_tablo;

  insert into public.kesfet_itemler (bolum_id, ad, tip, sira, icerik) values
  (v_acilis, 'Kuruluş — sermaye konması', 'alistirma', 0, jsonb_build_array(
      jsonb_build_object('id','p1','type','paragraph','props',jsonb_build_object('textColor','default','backgroundColor','default','textAlignment','left'),
        'content', jsonb_build_array(jsonb_build_object('type','text','text','İşletme 100.000 TL nakit sermaye ile kuruldu. Açılış kaydını yap.','styles','{}'::jsonb)), 'children','[]'::jsonb),
      jsonb_build_object('id','k1','type','kayit','children','[]'::jsonb,'props',jsonb_build_object(
        'tarih','01.01.2026','senaryo','İşletme 100.000 TL nakit sermaye ile kuruldu.','aciklama','Nakit varlık arttı (Kasa borç), özkaynak doğdu (Sermaye alacak).','ipucu','Varlık artışı borç, kaynak artışı alacak.',
        'satirlar','[{"kod":"100","ad":"KASA","tutar":"100000","tip":"borc"},{"kod":"500","ad":"SERMAYE","tutar":"100000","tip":"alacak"}]')))),
  (v_donem, 'Peşin mal alışı', 'alistirma', 0, jsonb_build_array(
      jsonb_build_object('id','p2','type','paragraph','props',jsonb_build_object('textColor','default','backgroundColor','default','textAlignment','left'),
        'content', jsonb_build_array(jsonb_build_object('type','text','text','50.000 TL + %20 KDV tutarında ticari mal peşin (kasadan) alındı.','styles','{}'::jsonb)), 'children','[]'::jsonb),
      jsonb_build_object('id','k2','type','kayit','children','[]'::jsonb,'props',jsonb_build_object(
        'tarih','05.02.2026','senaryo','50.000 TL + %20 KDV''li ticari mal peşin alındı.','aciklama','Mal ve indirilecek KDV borç, kasadan çıkış alacak.','ipucu','153 ve 191 borç; 100 alacak (60.000).',
        'satirlar','[{"kod":"153","ad":"TİCARİ MALLAR","tutar":"50000","tip":"borc"},{"kod":"191","ad":"İNDİRİLECEK KDV","tutar":"10000","tip":"borc"},{"kod":"100","ad":"KASA","tutar":"60000","tip":"alacak"}]')))),
  (v_donem, 'Peşin satış', 'alistirma', 1, jsonb_build_array(
      jsonb_build_object('id','p3','type','paragraph','props',jsonb_build_object('textColor','default','backgroundColor','default','textAlignment','left'),
        'content', jsonb_build_array(jsonb_build_object('type','text','text','Mallar 70.000 TL + %20 KDV karşılığında peşin satıldı.','styles','{}'::jsonb)), 'children','[]'::jsonb),
      jsonb_build_object('id','k3','type','kayit','children','[]'::jsonb,'props',jsonb_build_object(
        'tarih','10.03.2026','senaryo','Mallar 70.000 TL + %20 KDV peşin satıldı.','aciklama','Kasaya giriş borç; satış geliri ve hesaplanan KDV alacak.','ipucu','100 borç (84.000); 600 ve 391 alacak.',
        'satirlar','[{"kod":"100","ad":"KASA","tutar":"84000","tip":"borc"},{"kod":"600","ad":"YURT İÇİ SATIŞLAR","tutar":"70000","tip":"alacak"},{"kod":"391","ad":"HESAPLANAN KDV","tutar":"14000","tip":"alacak"}]')))),
  (v_donem, 'Satılan malın maliyeti', 'alistirma', 2, jsonb_build_array(
      jsonb_build_object('id','p4','type','paragraph','props',jsonb_build_object('textColor','default','backgroundColor','default','textAlignment','left'),
        'content', jsonb_build_array(jsonb_build_object('type','text','text','Satılan malların maliyeti 50.000 TL''dir. Maliyet kaydını yap.','styles','{}'::jsonb)), 'children','[]'::jsonb),
      jsonb_build_object('id','k4','type','kayit','children','[]'::jsonb,'props',jsonb_build_object(
        'tarih','10.03.2026','senaryo','Satılan malın maliyeti 50.000 TL.','aciklama','Maliyet gideri borç, stok çıkışı alacak.','ipucu','621 borç; 153 alacak.',
        'satirlar','[{"kod":"621","ad":"SATILAN TİCARİ MALLAR MALİYETİ","tutar":"50000","tip":"borc"},{"kod":"153","ad":"TİCARİ MALLAR","tutar":"50000","tip":"alacak"}]')))),
  (v_sonu, 'Dönem sonu KDV mahsubu', 'alistirma', 0, jsonb_build_array(
      jsonb_build_object('id','p5','type','paragraph','props',jsonb_build_object('textColor','default','backgroundColor','default','textAlignment','left'),
        'content', jsonb_build_array(jsonb_build_object('type','text','text','Hesaplanan KDV ile indirilecek KDV mahsuplaşır; kalan ödenecek KDV''ye aktarılır.','styles','{}'::jsonb)), 'children','[]'::jsonb),
      jsonb_build_object('id','k5','type','kayit','children','[]'::jsonb,'props',jsonb_build_object(
        'tarih','31.03.2026','senaryo','Hesaplanan KDV (14.000) ile İndirilecek KDV (10.000) mahsuplaşır.','aciklama','391 borç; 191 alacak, kalan 4.000 ödenecek KDV.','ipucu','391 borç 14.000; 191 alacak 10.000; 360 alacak 4.000.',
        'satirlar','[{"kod":"391","ad":"HESAPLANAN KDV","tutar":"14000","tip":"borc"},{"kod":"191","ad":"İNDİRİLECEK KDV","tutar":"10000","tip":"alacak"},{"kod":"360","ad":"ÖDENECEK VERGİ VE FONLAR","tutar":"4000","tip":"alacak"}]')))),
  (v_tablo, 'Dönem sonu mali tabloları', 'ders', 0, jsonb_build_array(
      jsonb_build_object('id','p6','type','paragraph','props',jsonb_build_object('textColor','default','backgroundColor','default','textAlignment','left'),
        'content', jsonb_build_array(jsonb_build_object('type','text','text','Tüm işlemleri kaydettin. Aşağıda kayıtlarından üretilen mizan, gelir tablosu ve bilanço yer alıyor.','styles','{}'::jsonb)), 'children','[]'::jsonb)));
end $$;
