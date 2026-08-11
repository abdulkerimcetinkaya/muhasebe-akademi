# CUR-004 — Müfredat

**Durum:** v4.0 · 11 Ağustos 2026
**Karar dayanağı:** [ADR-005 — V6: 31 kartlık mimari](../adr/ADR-005-v6-31-kart-mimarisi.md)
**Referanslar:** IFAC IES 2 (foundation/intermediate/advanced) · ACCA (Applied
Knowledge → Applied Skills → Strategic Professional) · OpenStax muhasebe döngüsü

> v1.0 (39 ders) ve v2.0 (26 birim) tarihseldir. Kanonik makine kaynağı
> `supabase/migrations/20260811000007_kesfet_31_kart.sql`.

---

# Ölçek felsefesi

> **Müfredatı büyüterek değil, senaryo uzayını büyüterek kapsamlı hale getir.**

500 ders başlığı hedef değil. Aynı muhasebe bilgisini giderek zorlaşan gerçek
hayat durumlarında tekrar tekrar uygulatmak hedef. Bir bölüm ("Vadeli Ticari
Mal Alışı") altında iskonto · eksik belge · kısmi ödeme · iade · fiyat farkı ·
döviz · tevkifat gibi onlarca varyasyon yaşayabilir.

Büyüme katmanı: **Bölüm → Ders → Senaryo → Soru → Varyasyon**

# Pedagojik omurga

```
Belge → Ekonomik olay → Finansal etki → Hesap → Borç/Alacak
      → Yevmiye → Büyük Defter → Mizan → Dönem sonu → Finansal tablo
```

# Katman rolleri

| Katman | Ne öğretir | IES karşılığı |
|---|---|---|
| **Temeller** | Muhasebenin dilini anlamak | Foundation |
| **Yetkinlikler** | Muhasebe işini yapmak | Intermediate |
| **Uzmanlıklar** | Belirsizlikte muhakeme | Advanced |
| *Sektör patikaları* | *Uzmanlıkların sektöre uygulanması* | *ileride* |

---

# TEMELLER — 7 kart

| # | Kart | slug |
|---|---|---|
| 1 | Muhasebeyi Anlamak | `muhasebeyi-anlamak` |
| 2 | İşletmenin Finansal Yapısı | `isletmenin-finansal-yapisi` |
| 3 | Hesapların Mantığı | `hesaplarin-mantigi` |
| 4 | Borç, Alacak ve Çift Taraflı Kayıt | `borc-alacak-cift-tarafli-kayit` |
| 5 | Belgeden Muhasebe Kaydına | `belgeden-muhasebe-kaydina` |
| 6 | Kayıttan Mizana | `kayittan-mizana` |
| 7 | Finansal Tablolar ve Muhasebe Döngüsü | `finansal-tablolar-ve-dongu` |

**Hedef:** kullanıcı herhangi basit bir işletme olayına baktığında
*ne oldu → ne değişti → hangi hesap → hangi yön → hangi kayıt → hangi tablo
etkisi* zincirini kurabilsin.

**Kapsam sınırı:** ticari mal alışı, satış, banka, cari, KDV, tahsilat, ödeme
Temeller'de **öğretim örneği** olarak kullanılır; konu olarak öğretilmez.
Bunların varyasyonları Yetkinlik kartlarına aittir.

**Gerçekleşen hacim: 21 bölüm · 47 ders · 7 kart finali** (kanonik kaynak
`20260811000008_temeller_bolum_ders.sql`).

### Eleme notu — 134 → 47

Chief Architect'in kapsamlı iskeleti 134 ders içeriyordu. Ürün sahibi onayıyla
tek ölçütle elendi:

> **Öğrenci bu birimi bitirince tek başına yapabildiği yeni bir şey var mı?**
> Yoksa o bir ders değil, ders içi ekran/etkileşimdir.

Hiçbir konu atılmadı; alt adımlar ilgili dersin içine taşındı. En belirgin
birleşmeler:

| Ders olarak listelenmişti | Şimdi |
|---|---|
| Kaydetme · Sınıflandırma · Özetleme · Raporlama (4) | *Muhasebe Ne Yapar?* içinde tek akış |
| Olayı Anla · Unsuru Bul · Artış mı? · Hesap Türü · Taraf Seç (5) | *Borç mu Alacak mı? — 5 Adımlı Karar* (adımlar ders içi ekran) |
| Hesapları/Yönü/Tutarları Yerleştir · Açıklama Yaz (4) | *İlk Yevmiye Kaydın* (formun alanları) |
| Hesap/Yön/Tutar/Denge/Belge doğru mu? (5) | *Kaydı Kontrol Etmek — 5 Soru* (kontrol listesi) |
| Hesap Sınıfı · Grup · Ana Hesap · Kod Mantığı (4, iki bölümde tekrar) | *Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap* |

Taşınan/düzeltilen kararlar:

- **Kâr ≠ Nakit** üç yerde tekrarlanıyordu → tek yuva: Kart 7.
- **İşletme ile Sahibini Ayırmak** alt ders değil, Kart 2'nin ilk dersi
  (Muhasebe2.docx'in ısrar ettiği kişilik kavramı).
- **Hesap sınıfı 1–9 → 1–7**: `hesap-plani.ts` yalnız sınıf 1–7 içeriyor
  (272 hesap); sınıf 8 serbest, 9 nazım — veride yok.
- **Basit / çok hesaplı kayıt** Kart 4'ten Kart 5'e (yevmiyeyle birlikte).
- **Hesap bakiyesi** iki yerdeydi → Kart 3 kavramı, Kart 6 hesaplamayı öğretir.

### Kart · bölüm · ders dökümü

**Kart 1 — Muhasebeyi Anlamak** (6 ders)
- *Muhasebe neden var?* — Muhasebe Neden Gereklidir? · Muhasebe Kimin Sorusunu Cevaplar?
- *Muhasebenin konusu* — Muhasebe Ne Yapar? · Mali Nitelikteki Olay
- *Belge* — Belge: Kaydın Dayanağı · Belgeden Olayı Çıkarmak
- ★ Final — Olay mı, Değil mi?

**Kart 2 — İşletmenin Finansal Yapısı** (7 ders)
- *İşletme ve Varlıkları* — İşletme ile Sahibini Ayırmak · Varlık Nedir? · Dönen ve Duran Varlık Ayrımı
- *Kaynaklar ve Denklem* — Varlıklar Nereden Gelir? Borç ve Özkaynak · Temel Muhasebe Denklemi · İşlemler Denklemi Nasıl Değiştirir?
- *Gelir ve Gider* — Gelir, Gider ve Özkaynak İlişkisi
- ★ Final — Denklemi Bozmadan Çöz

**Kart 3 — Hesapların Mantığı** (8 ders)
- *Hesap* — Neden Hesaplara İhtiyaç Var? · Hesap Nasıl Çalışır?
- *Hesap Türleri* — Bilanço Hesapları: Varlık, Borç, Özkaynak · Gelir Tablosu Hesapları: Gelir ve Gider
- *Hesap Planı* — Tekdüzen Hesap Planı Neden Var? · Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap · Alt Hesap (Muavin) Nedir? · Hesabı Ezberlemek Yerine Bulmak
- ★ Final — Doğru Hesabı Bul

**Kart 4 — Borç, Alacak ve Çift Taraflı Kayıt** (6 ders)
- *Hesabın İki Tarafı* — Hesabın İki Tarafı: Borç ve Alacak
- *Artış ve Azalış* — Varlık ve Kaynak Hesaplarında Artış ve Azalış · Gelir ve Gider Hesaplarında Artış · Normal Bakiye
- *Çift Taraflı Kayıt ve Karar* — Çift Taraflı Kayıt ve Borç = Alacak Dengesi · Borç mu Alacak mı? — 5 Adımlı Karar
- ★ Final — Borç mu, Alacak mı?

**Kart 5 — Belgeden Muhasebe Kaydına** (7 ders)
- *İşlemi Çözümlemek* — Belgeden İşlemi Çıkarmak · Ödeme Şekli ve Ek Unsurlar
- *Hesap Seçimi* — Olaydan Hesaba Gitmek · Alt Hesabı (Muavini) Seçmek
- *Yevmiye Kaydı ve Kontrol* — İlk Yevmiye Kaydın · Basit ve Çok Hesaplı Kayıtlar · Kaydı Kontrol Etmek — 5 Soru
- ★ Final — Belgeden Kayda: Uçtan Uca

**Kart 6 — Kayıttan Mizana** (6 ders)
- *Defterler* — Yevmiye Defteri · Büyük Defter ve Hesap Bakiyesi
- *Mizan* — Mizan: Hesapları Tek Yerde Görmek · Mizanı Okumak: Ters ve Olağandışı Bakiyeler
- *Hata ve Kontrol* — Sık Yapılan Kayıt Hataları · Mizan Neyi Bulur, Neyi Bulamaz?
- ★ Final — Mizanı Denetle

**Kart 7 — Finansal Tablolar ve Muhasebe Döngüsü** (7 ders)
- *Finansal Tablolar* — Finansal Tablolar Neden Hazırlanır? · Bilanço (Finansal Durum Tablosu) · Gelir Tablosu
- *İşlemlerin Tablo Etkisi* — Bir İşlemin Tablolara Etkisi · Kâr ile Nakit Aynı Şey Değildir
- *Muhasebe Döngüsü* — Muhasebe Döngüsü: Belgeden Finansal Tabloya · Dönem Kavramı ve Kapanış
- ★ Final — İlk 10 İşlem

---

# YETKİNLİKLER — 16 kart

| # | Kart | slug |
|---|---|---|
| 1 | Belge Okuma ve İşlem Analizi | `belge-okuma-islem-analizi` |
| 2 | Hesap Seçimi ve Muhasebe Kaydı | `hesap-secimi-muhasebe-kaydi` |
| 3 | Satın Alma ve Borç Yönetimi | `satin-alma-borc-yonetimi` |
| 4 | Satış ve Alacak Yönetimi | `satis-alacak-yonetimi` |
| 5 | Cari Hesap ve Mutabakat | `cari-hesap-mutabakat` |
| 6 | Nakit, Banka ve Ödeme İşlemleri | `nakit-banka-odeme` |
| 7 | Çek, Senet, Kart ve POS İşlemleri | `cek-senet-kart-pos` |
| 8 | KDV İşlemleri | `kdv-islemleri` |
| 9 | e-Belge ve Dijital Muhasebe | `e-belge-dijital-muhasebe` |
| 10 | Stok İşlemleri | `stok-islemleri` |
| 11 | Duran Varlık İşlemleri | `duran-varlik-islemleri` |
| 12 | Personel, Bordro ve SGK | `personel-bordro-sgk` |
| 13 | Finansman ve Yabancı Para İşlemleri | `finansman-yabanci-para` |
| 14 | Dönemsellik, Tahakkuk ve Değerleme | `donemsellik-tahakkuk-degerleme` |
| 15 | Dönem Sonu, Vergi ve Kapanış İşlemleri | `donem-sonu-vergi-kapanis` |
| 16 | Muhasebe Kontrolü, Mutabakat ve Raporlama | `muhasebe-kontrolu-raporlama` |

Tahmini hacim: 110–140 bölüm (kart başına 6–10).

---

# UZMANLIKLAR — 8 kart

| # | Kart | slug |
|---|---|---|
| 1 | Vergi | `vergi-uzmanligi` |
| 2 | Maliyet ve Üretim Muhasebesi | `maliyet-uretim-muhasebesi` |
| 3 | Finansal Raporlama ve TMS/TFRS | `finansal-raporlama-tfrs` |
| 4 | Bordro, SGK ve İşçilik | `bordro-sgk-iscilik` |
| 5 | Ar-Ge, Teknokent ve Teşvikler | `arge-teknokent-tesvikler` |
| 6 | Dış Ticaret Muhasebesi | `dis-ticaret-muhasebesi` |
| 7 | Proje Muhasebesi | `proje-muhasebesi` |
| 8 | Finansal Analiz ve Yönetim Raporlama | `finansal-analiz-yonetim-raporlama` |

Tahmini hacim: 70–100 bölüm.

---

# Ölçülen beceriler (kartlardan ayrı katman)

Kullanıcı bir soru çözerken aynı anda birden çok beceri skoru gelişir. Bu
katman `yetkinlikler` → `olay_yetkinlikleri` → `ilerleme_kaydet` →
`kullanici_yetkinlikleri` zinciriyle **zaten çalışıyor** (22 tanımlı beceri).

Mevcut: Amortisman · Belge Okuma · Beyanname Analizi · Bordro · Cari Hesap ·
Dış Ticaret · Dönem Sonu · Hata Bulma · İhracat · İthalat · KDV · KDV İadesi ·
KDV Tahakkuku · Mizan Analizi · Muavin Hesap · Muhasebe Temelleri · SGK ·
Teşvik Muhasebesi · Tevkifat · Üretim Muhasebesi · Vergi Muhasebesi ·
Yevmiye Kaydı

**Eksik (eklenecek):** Hesap Seçimi · Borç/Alacak Yönü · Finansal Tablo Etkisi ·
Mevzuat Bağlantısı · Olay Analizi

> İsim çakışması: menüdeki kategori "Yetkinlikler" (16 kart) ile buradaki
> "yetkinlik" (ölçülen beceri) farklı şeyler. Karar: ölçüm tarafı arayüzde
> **"Beceri"** olarak adlandırılacak (ADR-005 §5).

---

# Mevcut durum

| | Durum |
|---|---|
| 31 kart | ✅ canlıda, hepsi `yakinda` |
| Temeller bölüm/ders | ✅ 21 bölüm · 47 ders · 7 final (`taslak`) |
| Yetkinlik/Uzmanlık bölüm-ders | ❌ yok — ayrı kırılım turu gerekiyor |
| Ders içeriği | ❌ yok |
| Ön koşul ağı | ❌ boş (bilinçli — boş kart kapıyı yanlış açar) |
| Sektör patikaları | ❌ ileride |
| Beceri listesi genişletmesi | ❌ bekliyor |

**Sıradaki iş:** Kart 1'in ilk dersinin içeriği (*Muhasebe Neden Gereklidir?*).

> Yetkinlik ve Uzmanlık için verilen listeler **bölüm kırılımı değil, konu
> envanteridir** — "Faiz", "Fire", "İzin", "5746" gibi tek kavramlar bölüm
> olamaz; "Kiralamalar", "Konsolidasyon" ise tek satırda yarıyıllık kapsam
> saklar. Bu iki katman veritabanına girmeden önce ayrı bir kırılım turu
> gerekiyor (bkz. `docs/research/research_mufredat_olcek_analizi_2026-08-11.md`).
