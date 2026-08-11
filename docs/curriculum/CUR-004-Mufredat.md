# CUR-004 — Müfredat

**Durum:** v3.0 · 11 Ağustos 2026
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

Tahmini hacim: 40–50 bölüm.

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
| Bölüm / ders | ❌ yok — kart kart eklenecek |
| Ders içeriği | ❌ yok |
| Ön koşul ağı | ❌ boş (bilinçli — boş kart kapıyı yanlış açar) |
| Sektör patikaları | ❌ ileride |
| Beceri listesi genişletmesi | ❌ bekliyor |

**Sıradaki iş:** Temeller kart 1'in bölüm + ders kırılımı.
