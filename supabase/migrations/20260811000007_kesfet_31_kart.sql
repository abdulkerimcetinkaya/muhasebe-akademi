-- Keşfet V6 — 31 kartlık yeni mimari (ADR-005 · 11 Ağu 2026)
-- 7 Temeller + 16 Yetkinlikler + 8 Uzmanlıklar. Bölüm ve ders YOK —
-- kırılım ürün sahibinden kart kart gelecek, ayrı migration'larla eklenecek.
--
-- Tüm kartlar 'yakinda': içerik üretilmeden hiçbiri kullanıcıya açılmaz.
-- Ön koşul ağı da bilinçli boş — kartların içi dolmadan ön koşul anlamsız
-- (boş kart "tamamlandı" sayılır ve kapıyı yanlış açar).
--
-- İkonlar src/components/Icon.tsx allowlist'inden seçildi; listede olmayan
-- ad hiç render edilmiyor (Icon.tsx:210 `if (!Cmp) return null`).

begin;

create or replace function pg_temp.sabit_uuid(p_key text) returns uuid language sql immutable as $$
  select (substr(md5(p_key),1,8)||'-'||substr(md5(p_key),9,4)||'-4'||substr(md5(p_key),14,3)||'-a'||substr(md5(p_key),18,3)||'-'||substr(md5(p_key),21,12))::uuid
$$;

create temporary table v6_kartlar(
  slug text, ad text, aciklama text, ikon text, kategori text,
  sira int, uzmanlik_turu text
) on commit drop;

insert into v6_kartlar values
-- ── TEMELLER (7) ────────────────────────────────────────────────────────────
('muhasebeyi-anlamak','Muhasebeyi Anlamak',
 'Muhasebenin hangi soruyu cevapladığını ve işletmede neyin kayda değer olduğunu kavra.','Lightbulb','Temeller',0,null),
('isletmenin-finansal-yapisi','İşletmenin Finansal Yapısı',
 'Varlık, borç ve özkaynak ilişkisini muhasebe denklemi üzerinden kur.','Scale','Temeller',1,null),
('hesaplarin-mantigi','Hesapların Mantığı',
 'Neden hesaplara ihtiyaç duyulduğunu ve hesapların nasıl çalıştığını öğren.','LayoutGrid','Temeller',2,null),
('borc-alacak-cift-tarafli-kayit','Borç, Alacak ve Çift Taraflı Kayıt',
 'Borç ve alacak yönünü, bir olayın neden iki hesabı birden etkilediğini çöz.','Calculator','Temeller',3,null),
('belgeden-muhasebe-kaydina','Belgeden Muhasebe Kaydına',
 'Belgeyi oku, olayı çıkar, hesabı seç ve ilk yevmiye kaydını kur.','FileText','Temeller',4,null),
('kayittan-mizana','Kayıttan Mizana',
 'Yevmiye kayıtlarının büyük deftere ve mizana nasıl dönüştüğünü izle.','ListChecks','Temeller',5,null),
('finansal-tablolar-ve-dongu','Finansal Tablolar ve Muhasebe Döngüsü',
 'Bilanço ve gelir tablosunu üret; muhasebe döngüsünü baştan sona bağla.','RefreshCw','Temeller',6,null),

-- ── YETKİNLİKLER (16) ───────────────────────────────────────────────────────
('belge-okuma-islem-analizi','Belge Okuma ve İşlem Analizi',
 'Gerçek belgelerden ekonomik olayı, tarafları ve tutarları çıkar.','Search','Yetkinlikler',10,null),
('hesap-secimi-muhasebe-kaydi','Hesap Seçimi ve Muhasebe Kaydı',
 'Doğru hesabı bul, yönü belirle, kaydı kur ve kontrol et.','FileSignature','Yetkinlikler',11,null),
('satin-alma-borc-yonetimi','Satın Alma ve Borç Yönetimi',
 'Peşin, vadeli, iadeli ve iskontolu alışları satıcı borcuna kadar yönet.','Package','Yetkinlikler',12,null),
('satis-alacak-yonetimi','Satış ve Alacak Yönetimi',
 'Satış sürecini gelir, alacak ve tahsilat zinciriyle birlikte kaydet.','Store','Yetkinlikler',13,null),
('cari-hesap-mutabakat','Cari Hesap ve Mutabakat',
 'Cari hareketleri izle, bakiyeyi yorumla ve mutabakat farkını çöz.','Users','Yetkinlikler',14,null),
('nakit-banka-odeme','Nakit, Banka ve Ödeme İşlemleri',
 'Kasa, banka, havale ve ödeme sistemlerini muhasebeleştir.','Landmark','Yetkinlikler',15,null),
('cek-senet-kart-pos','Çek, Senet, Kart ve POS İşlemleri',
 'Çek ve senedin yolculuğunu, kart ve POS tahsilatlarını kaydet.','CreditCard','Yetkinlikler',16,null),
('kdv-islemleri','KDV İşlemleri',
 'İndirilecek ve hesaplanan KDV''yi işlemden beyana kadar izle.','Percent','Yetkinlikler',17,null),
('e-belge-dijital-muhasebe','e-Belge ve Dijital Muhasebe',
 'e-Fatura, e-Arşiv ve e-İrsaliye süreçlerini muhasebeyle birleştir.','FileCode','Yetkinlikler',18,null),
('stok-islemleri','Stok İşlemleri',
 'Stok giriş-çıkışını, sayım farkını ve satılan malın maliyetini yönet.','Archive','Yetkinlikler',19,null),
('duran-varlik-islemleri','Duran Varlık İşlemleri',
 'Duran varlık ediniminden amortismana ve satışa kadar süreci kur.','Home','Yetkinlikler',20,null),
('personel-bordro-sgk','Personel, Bordro ve SGK',
 'Brütten nete bordroyu, tahakkuku ve SGK yükümlülüklerini uygula.','UserPlus','Yetkinlikler',21,null),
('finansman-yabanci-para','Finansman ve Yabancı Para İşlemleri',
 'Kredi, faiz, döviz ve kur farkı işlemlerini muhasebeleştir.','Banknote','Yetkinlikler',22,null),
('donemsellik-tahakkuk-degerleme','Dönemsellik, Tahakkuk ve Değerleme',
 'Geliri ve gideri doğru döneme yaz; değerleme kayıtlarını kur.','Hourglass','Yetkinlikler',23,null),
('donem-sonu-vergi-kapanis','Dönem Sonu, Vergi ve Kapanış İşlemleri',
 'Envanter, karşılık, vergi ve kapanış kayıtlarıyla dönemi kapat.','CalendarCheck','Yetkinlikler',24,null),
('muhasebe-kontrolu-raporlama','Muhasebe Kontrolü, Mutabakat ve Raporlama',
 'Mizanı denetle, hatayı bul, düzelt ve yönetime rapor üret.','FileCheck','Yetkinlikler',25,null),

-- ── UZMANLIKLAR (8) ─────────────────────────────────────────────────────────
('vergi-uzmanligi','Vergi',
 'Vergi olaylarını belge, kayıt ve beyan bağlantısıyla birlikte çöz.','Receipt','Uzmanlıklar',30,'fonksiyonel'),
('maliyet-uretim-muhasebesi','Maliyet ve Üretim Muhasebesi',
 'İlk madde, işçilik ve genel üretim giderlerini mamul maliyetine taşı.','Factory','Uzmanlıklar',31,'fonksiyonel'),
('finansal-raporlama-tfrs','Finansal Raporlama ve TMS/TFRS',
 'Raporlama çerçevelerini ayır; düzeltilmiş kayıttan finansal rapor üret.','LineChart','Uzmanlıklar',32,'fonksiyonel'),
('bordro-sgk-iscilik','Bordro, SGK ve İşçilik',
 'İleri ücret, kıdem, teşvik ve işçilik maliyeti hesaplarını yönet.','Briefcase','Uzmanlıklar',33,'fonksiyonel'),
('arge-teknokent-tesvikler','Ar-Ge, Teknokent ve Teşvikler',
 'Proje ve personel maliyetlerini teşvik ve istisna bağlamında izle.','Rocket','Uzmanlıklar',34,'fonksiyonel'),
('dis-ticaret-muhasebesi','Dış Ticaret Muhasebesi',
 'İthalat, ihracat, gümrük, döviz ve kur farkı dosyasını yönet.','Globe','Uzmanlıklar',35,'fonksiyonel'),
('proje-muhasebesi','Proje Muhasebesi',
 'Proje bütçesi, hakediş ve maliyet takibini kârlılıkla birlikte kur.','Milestone','Uzmanlıklar',36,'fonksiyonel'),
('finansal-analiz-yonetim-raporlama','Finansal Analiz ve Yönetim Raporlama',
 'Oran analizi, nakit akışı ve bütçe-gerçekleşen raporlarını üret.','BarChart3','Uzmanlıklar',37,'fonksiyonel');

insert into public.kesfet_kartlar
  (id, slug, ad, aciklama, ikon, kategori, tip, durum, sira, uzmanlik_turu)
select pg_temp.sabit_uuid('kart:'||v.slug), v.slug, v.ad, v.aciklama, v.ikon,
       v.kategori, 'kesfet', 'yakinda', v.sira, v.uzmanlik_turu
from v6_kartlar v
on conflict (id) do update set
  slug=excluded.slug, ad=excluded.ad, aciklama=excluded.aciklama,
  ikon=excluded.ikon, kategori=excluded.kategori, durum=excluded.durum,
  sira=excluded.sira, uzmanlik_turu=excluded.uzmanlik_turu;

notify pgrst, 'reload schema';
commit;
