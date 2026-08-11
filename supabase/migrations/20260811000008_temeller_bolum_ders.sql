-- Temeller bölüm + ders kırılımı (ADR-005 · 11 Ağu 2026)
-- 7 kart · 21 bölüm · 47 ders · 7 kart finali.
--
-- Kaynak: Chief Architect'in 134 derslik kapsamlı iskeleti, ürün sahibi onayıyla
-- "öğrenci bunu bitirince tek başına yapabildiği yeni bir şey var mı?" ölçütüne
-- göre elendi (134 → 47). Elenen başlıklar kaybolmadı; ders içi ekran/etkileşim
-- olarak ilgili dersin içinde yaşayacak. Eleme tablosu: CUR-004 v4.0.
--
-- İçerik YOK — tüm dersler boş `icerik` ve `yayin_durumu='taslak'` ile kurulur.
-- Kartlar 'yakinda' kalır; içerik yazıldıkça ders yayınlanır, kart açılır.
--
-- Yalnız Temeller (7 kart). Yetkinlik/Uzmanlık kartlarının kırılımı ayrı tur.

begin;

create or replace function pg_temp.sabit_uuid(p_key text) returns uuid language sql immutable as $$
  select (substr(md5(p_key),1,8)||'-'||substr(md5(p_key),9,4)||'-4'||substr(md5(p_key),14,3)||'-a'||substr(md5(p_key),18,3)||'-'||substr(md5(p_key),21,12))::uuid
$$;

-- ── Bölümler ────────────────────────────────────────────────────────────────
create temporary table t_bolum(kart_slug text, ad text, sira int, tur text) on commit drop;

insert into t_bolum values
('muhasebeyi-anlamak','Muhasebe neden var?',0,'normal'),
('muhasebeyi-anlamak','Muhasebenin konusu',1,'normal'),
('muhasebeyi-anlamak','Belge',2,'normal'),
('muhasebeyi-anlamak','Muhasebeyi Anlamak Finali',99,'kart_finali'),

('isletmenin-finansal-yapisi','İşletme ve Varlıkları',0,'normal'),
('isletmenin-finansal-yapisi','Kaynaklar ve Denklem',1,'normal'),
('isletmenin-finansal-yapisi','Gelir ve Gider',2,'normal'),
('isletmenin-finansal-yapisi','İşletmenin Finansal Yapısı Finali',99,'kart_finali'),

('hesaplarin-mantigi','Hesap',0,'normal'),
('hesaplarin-mantigi','Hesap Türleri',1,'normal'),
('hesaplarin-mantigi','Hesap Planı',2,'normal'),
('hesaplarin-mantigi','Hesapların Mantığı Finali',99,'kart_finali'),

('borc-alacak-cift-tarafli-kayit','Hesabın İki Tarafı',0,'normal'),
('borc-alacak-cift-tarafli-kayit','Artış ve Azalış',1,'normal'),
('borc-alacak-cift-tarafli-kayit','Çift Taraflı Kayıt ve Karar',2,'normal'),
('borc-alacak-cift-tarafli-kayit','Borç, Alacak ve Çift Taraflı Kayıt Finali',99,'kart_finali'),

('belgeden-muhasebe-kaydina','İşlemi Çözümlemek',0,'normal'),
('belgeden-muhasebe-kaydina','Hesap Seçimi',1,'normal'),
('belgeden-muhasebe-kaydina','Yevmiye Kaydı ve Kontrol',2,'normal'),
('belgeden-muhasebe-kaydina','Belgeden Muhasebe Kaydına Finali',99,'kart_finali'),

('kayittan-mizana','Defterler',0,'normal'),
('kayittan-mizana','Mizan',1,'normal'),
('kayittan-mizana','Hata ve Kontrol',2,'normal'),
('kayittan-mizana','Kayıttan Mizana Finali',99,'kart_finali'),

('finansal-tablolar-ve-dongu','Finansal Tablolar',0,'normal'),
('finansal-tablolar-ve-dongu','İşlemlerin Tablo Etkisi',1,'normal'),
('finansal-tablolar-ve-dongu','Muhasebe Döngüsü',2,'normal'),
('finansal-tablolar-ve-dongu','Finansal Tablolar ve Döngü Finali',99,'kart_finali');

-- ── Dersler ─────────────────────────────────────────────────────────────────
create temporary table t_ders(kart_slug text, bolum_sira int, ad text, sira int, tip text) on commit drop;

insert into t_ders values
-- Kart 1 — Muhasebeyi Anlamak (6 ders)
('muhasebeyi-anlamak',0,'Muhasebe Neden Gereklidir?',0,'ders'),
('muhasebeyi-anlamak',0,'Muhasebe Kimin Sorusunu Cevaplar?',1,'ders'),
('muhasebeyi-anlamak',1,'Muhasebe Ne Yapar?',0,'ders'),
('muhasebeyi-anlamak',1,'Mali Nitelikteki Olay',1,'ders'),
('muhasebeyi-anlamak',2,'Belge: Kaydın Dayanağı',0,'ders'),
('muhasebeyi-anlamak',2,'Belgeden Olayı Çıkarmak',1,'ders'),
('muhasebeyi-anlamak',99,'Olay mı, Değil mi?',0,'alistirma'),

-- Kart 2 — İşletmenin Finansal Yapısı (7 ders)
('isletmenin-finansal-yapisi',0,'İşletme ile Sahibini Ayırmak',0,'ders'),
('isletmenin-finansal-yapisi',0,'Varlık Nedir?',1,'ders'),
('isletmenin-finansal-yapisi',0,'Dönen ve Duran Varlık Ayrımı',2,'ders'),
('isletmenin-finansal-yapisi',1,'Varlıklar Nereden Gelir? Borç ve Özkaynak',0,'ders'),
('isletmenin-finansal-yapisi',1,'Temel Muhasebe Denklemi',1,'ders'),
('isletmenin-finansal-yapisi',1,'İşlemler Denklemi Nasıl Değiştirir?',2,'ders'),
('isletmenin-finansal-yapisi',2,'Gelir, Gider ve Özkaynak İlişkisi',0,'ders'),
('isletmenin-finansal-yapisi',99,'Denklemi Bozmadan Çöz',0,'alistirma'),

-- Kart 3 — Hesapların Mantığı (8 ders)
('hesaplarin-mantigi',0,'Neden Hesaplara İhtiyaç Var?',0,'ders'),
('hesaplarin-mantigi',0,'Hesap Nasıl Çalışır?',1,'ders'),
('hesaplarin-mantigi',1,'Bilanço Hesapları: Varlık, Borç, Özkaynak',0,'ders'),
('hesaplarin-mantigi',1,'Gelir Tablosu Hesapları: Gelir ve Gider',1,'ders'),
('hesaplarin-mantigi',2,'Tekdüzen Hesap Planı Neden Var?',0,'ders'),
('hesaplarin-mantigi',2,'Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap',1,'ders'),
('hesaplarin-mantigi',2,'Alt Hesap (Muavin) Nedir?',2,'ders'),
('hesaplarin-mantigi',2,'Hesabı Ezberlemek Yerine Bulmak',3,'ders'),
('hesaplarin-mantigi',99,'Doğru Hesabı Bul',0,'alistirma'),

-- Kart 4 — Borç, Alacak ve Çift Taraflı Kayıt (6 ders)
('borc-alacak-cift-tarafli-kayit',0,'Hesabın İki Tarafı: Borç ve Alacak',0,'ders'),
('borc-alacak-cift-tarafli-kayit',1,'Varlık ve Kaynak Hesaplarında Artış ve Azalış',0,'ders'),
('borc-alacak-cift-tarafli-kayit',1,'Gelir ve Gider Hesaplarında Artış',1,'ders'),
('borc-alacak-cift-tarafli-kayit',1,'Normal Bakiye',2,'ders'),
('borc-alacak-cift-tarafli-kayit',2,'Çift Taraflı Kayıt ve Borç = Alacak Dengesi',0,'ders'),
('borc-alacak-cift-tarafli-kayit',2,'Borç mu Alacak mı? — 5 Adımlı Karar',1,'ders'),
('borc-alacak-cift-tarafli-kayit',99,'Borç mu, Alacak mı?',0,'alistirma'),

-- Kart 5 — Belgeden Muhasebe Kaydına (7 ders)
('belgeden-muhasebe-kaydina',0,'Belgeden İşlemi Çıkarmak',0,'ders'),
('belgeden-muhasebe-kaydina',0,'Ödeme Şekli ve Ek Unsurlar',1,'ders'),
('belgeden-muhasebe-kaydina',1,'Olaydan Hesaba Gitmek',0,'ders'),
('belgeden-muhasebe-kaydina',1,'Alt Hesabı (Muavini) Seçmek',1,'ders'),
('belgeden-muhasebe-kaydina',2,'İlk Yevmiye Kaydın',0,'ders'),
('belgeden-muhasebe-kaydina',2,'Basit ve Çok Hesaplı Kayıtlar',1,'ders'),
('belgeden-muhasebe-kaydina',2,'Kaydı Kontrol Etmek — 5 Soru',2,'ders'),
('belgeden-muhasebe-kaydina',99,'Belgeden Kayda: Uçtan Uca',0,'alistirma'),

-- Kart 6 — Kayıttan Mizana (6 ders)
('kayittan-mizana',0,'Yevmiye Defteri',0,'ders'),
('kayittan-mizana',0,'Büyük Defter ve Hesap Bakiyesi',1,'ders'),
('kayittan-mizana',1,'Mizan: Hesapları Tek Yerde Görmek',0,'ders'),
('kayittan-mizana',1,'Mizanı Okumak: Ters ve Olağandışı Bakiyeler',1,'ders'),
('kayittan-mizana',2,'Sık Yapılan Kayıt Hataları',0,'ders'),
('kayittan-mizana',2,'Mizan Neyi Bulur, Neyi Bulamaz?',1,'ders'),
('kayittan-mizana',99,'Mizanı Denetle',0,'alistirma'),

-- Kart 7 — Finansal Tablolar ve Muhasebe Döngüsü (7 ders)
('finansal-tablolar-ve-dongu',0,'Finansal Tablolar Neden Hazırlanır?',0,'ders'),
('finansal-tablolar-ve-dongu',0,'Bilanço (Finansal Durum Tablosu)',1,'ders'),
('finansal-tablolar-ve-dongu',0,'Gelir Tablosu',2,'ders'),
('finansal-tablolar-ve-dongu',1,'Bir İşlemin Tablolara Etkisi',0,'ders'),
('finansal-tablolar-ve-dongu',1,'Kâr ile Nakit Aynı Şey Değildir',1,'ders'),
('finansal-tablolar-ve-dongu',2,'Muhasebe Döngüsü: Belgeden Finansal Tabloya',0,'ders'),
('finansal-tablolar-ve-dongu',2,'Dönem Kavramı ve Kapanış',1,'ders'),
('finansal-tablolar-ve-dongu',99,'İlk 10 İşlem',0,'alistirma');

-- ── Kurulum ─────────────────────────────────────────────────────────────────
do $$
declare r record; v_kart uuid; v_bolum uuid;
begin
  -- Bölümler
  for r in select * from t_bolum order by kart_slug, sira loop
    select id into v_kart from public.kesfet_kartlar
      where slug = r.kart_slug and tip = 'kesfet';
    if v_kart is null then
      raise exception 'Kart bulunamadı: %', r.kart_slug;
    end if;

    insert into public.kesfet_bolumler(id, kart_id, ad, sira, tur)
    values (pg_temp.sabit_uuid('bolum:'||r.kart_slug||':'||r.sira), v_kart, r.ad, r.sira, r.tur)
    on conflict (id) do update set
      kart_id = excluded.kart_id, ad = excluded.ad,
      sira = excluded.sira, tur = excluded.tur;
  end loop;

  -- Dersler
  for r in select * from t_ders order by kart_slug, bolum_sira, sira loop
    select b.id into v_bolum
      from public.kesfet_bolumler b
      join public.kesfet_kartlar k on k.id = b.kart_id
     where k.slug = r.kart_slug and k.tip = 'kesfet' and b.sira = r.bolum_sira;
    if v_bolum is null then
      raise exception 'Bölüm bulunamadı: % / sira %', r.kart_slug, r.bolum_sira;
    end if;

    insert into public.kesfet_itemler(id, bolum_id, ad, tip, sira, icerik, yayin_durumu)
    values (pg_temp.sabit_uuid('item:'||r.kart_slug||':'||r.ad), v_bolum, r.ad, r.tip, r.sira,
            '[]'::jsonb, 'taslak')
    on conflict (id) do update set
      bolum_id = excluded.bolum_id, ad = excluded.ad, tip = excluded.tip,
      sira = excluded.sira;
      -- icerik ve yayin_durumu bilerek korunur: içerik yazıldıktan sonra
      -- migration yeniden çalışırsa üzerine yazmasın.
  end loop;
end $$;

notify pgrst, 'reload schema';
commit;
