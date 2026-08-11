# CUR-004 — Müfredat

**Durum:** v2.0 · 11 Ağustos 2026
**Karar dayanağı:** [ADR-004 — V3: Beceri merkezli müfredat](../adr/ADR-004-v3-beceri-merkezli-mufredat.md)
**Kaynak belgeler:** `docs/sources/Muhasebe2.docx` (Temeller tabanı) · `docs/sources/Muhasebe.docx` (Yetkinlikler, Uzmanlıklar tabanı) · Chief Architect V3 revizyonu (11 Ağu 2026)

> v1.0 (39 ders) ADR-003 ile birlikte tarihseldir; 39 → 26 eşleştirmesi
> `supabase/migrations/20260811000002_temeller_26_birim.sql` içindedir.

---

# Amaç

Bu doküman müfredatın **okunur kanonik dökümüdür**. Makine tarafında tek kaynak
ilgili migration'lardaki hedef tablolarıdır; bu doküman onlarla aynı olmak
zorundadır.

Ürünün öğretim omurgası:

> Belge / olay → ne oldu? → hangi ekonomik değer değişti? → hesabı bul →
> yönü belirle → yevmiyeyi yap → sonucu kontrol et.

Yevmiye kaydı bu zincirin **çıktısıdır**, başlangıç noktası değil.

Katman rolleri: **Temeller** anlamayı öğretir · **Yetkinlikler** iş yapmayı
öğretir · **Uzmanlıklar** muhasebe muhakemesi öğretir · **İşletmeler** dönem
simülasyonuyla pratik yaptırır (ayrı track, ADR-001/ADR-004 rol ayrımı:
kavram dersi yalnız Keşfet'te yazılır).

---

# TEMELLER — 3 kart · 26 öğrenme birimi

Kapsam sınırı: KDV ayrıntısı, bordro, beyanname, dönem sonu uygulamaları,
TMS/TFRS ve ileri mevzuat Temeller'e girmez.

## Kart 1 — İşletmeyi Muhasebe Gibi Görmek (10 birim)

**Bölüm 1 — Muhasebeye neden ihtiyaç var?**
1. Muhasebe Neden Gereklidir?
2. Muhasebe Ne Yapar? *(kaydetme→sınıflandırma→özet→bilgi akışı tek görselde; paydaşlar soru örnekleriyle)*

**Bölüm 2 — Muhasebenin konusu**
3. İşletme ile Sahibinin Ayrılması
4. Mali Nitelikteki Olay *(kayıt doğurmayan olaylar dahil)*
5. Belge ve Ekonomik Olay *("bu bilgi nereden geliyor?")*

**Bölüm 3 — İşletmenin ekonomik yapısı**
6. Varlıklar
7. Borçlar ve Özkaynak
8. Temel Muhasebe Denklemi
9. İşlemler Denklemi Nasıl Değiştirir?
10. Gelir, Gider ve Özkaynak

*Kart sonunda kullanıcı hiç hesap kodu kullanmadan 15–20 işletme olayı analiz etmiş olmalı.*
★ Kart finali: 10 Olayda Muhasebe Mantığı (mevcut, korunur)

## Kart 2 — Olaydan Muhasebe Kaydına (10 birim)

**Bölüm 1 — Hesap mantığı**
11. Neden Hesaplara İhtiyaç Var?
12. Hesabın İki Tarafı: Borç ve Alacak *(borç=eksi/alacak=artı algısı burada kırılır)*

**Bölüm 2 — Hesapların çalışma mantığı**
13. Varlık, Borç ve Özkaynak Hesaplarının Çalışması *(tek karşılaştırma tablosu)*
14. Gelir ve Gider Hesaplarının Çalışması
15. Hesabın Bakiyesi *("normal bakiye" terimi Mali Sözlük katmanında)*

**Bölüm 3 — Olayı kayda dönüştürmek**
16. İşlem Analizi — platformun ana algoritması:
    *ne oldu? → hangi değerler değişti? → hangi hesaplar? → arttı mı azaldı mı? → borç mu alacak mı? → dengeli mi?*
17. İlk Yevmiye Kaydın *(sermaye örneği: KDV yok, cari yok, belge karmaşası yok)*
18. Basit Yevmiye Kayıtları *(sermaye, virman, gider, hizmet geliri, kredi, borç ödeme, tahsilat — KDV'siz)*
19. Birden Fazla Hesaplı Kayıt
20. Hesap Planında Hesabı Bulmak *(TDHP'yi harita gibi okumak; ezber yok)*

⚠ Kart finali yok — içerik fazında eklenecek (ADR-004).

## Kart 3 — Kayıttan Finansal Tabloya (6 birim)

**Bölüm 1 — Kaydın yolculuğu**
21. Yevmiye Kaydının Yapısı
22. Büyük Defter ve Hesap Bakiyesi

**Bölüm 2 — Kontrol**
23. Mizan *(nedir + neyi kontrol eder + neyi edemez — tek güçlü ders)*

**Bölüm 3 — Sonuç**
24. Bilanço ve Gelir Tablosu *(biri durum, biri dönem sonucu)*
25. Kâr ile Nakit Aynı Şey Değildir
26. Muhasebe Döngüsü — Baştan Sona

★ Kart finali: Bir İşletmenin İlk 10 İşlemi (mevcut, korunur)

---

# YETKİNLİKLER — 9 iş akışı kartı

Yetkinlik = konu bilmek değil, iş akışı yönetmek. Her kart belgeyle başlar,
kayıtla bitmez — kontrol/mutabakatla biter.

| # | Kart | Slug | İş akışı |
|---|---|---|---|
| Y1 | Belgeden Muhasebe İşlemine | `belgeden-muhasebe-islemine` | belge kontrolü → işlem türü → taraflar → tutarlar → hesap → kayıt |
| Y2 | Satın Alma, Satıcı ve Ödeme | `gunluk-muhasebe-islemleri` | belge → mal/hizmet → satıcı → KDV → kayıt → borç → ödeme → cari kapanışı → mutabakat |
| Y3 | Satış, Müşteri ve Tahsilat | `satis-musteri-tahsilat` | satış → belge → gelir → KDV → alacak → tahsilat → iade/iskonto → mutabakat |
| Y4 | Kasa, Banka, Kart ve Finansman | `kasa-banka-kart-finansman` | kasa · banka · EFT · POS · komisyon · kredi · faiz · virman · banka mutabakatı |
| Y5 | Stok ve Duran Varlık İşlemleri | `stok-duran-varlik` | stok giriş/çıkış/sayım · duran varlık edinim/amortisman/satış |
| Y6 | KDV ve e-Belge Operasyonları | `vergi-belge-uygulamalari` | hesaplanan/indirilecek · e-Fatura/e-Arşiv/e-İrsaliye · muhasebe-beyan bağlantısı |
| Y7 | Bordro ve SGK | `bordro-sgk` | brüt/net → kesintiler → tahakkuk → ödeme → SGK/vergi borçları → MPHB |
| Y8 | Mutabakat ve Dönem Sonu Kontrolleri | `donem-sonu-islemleri` | cari/banka/kasa/stok kontrolleri · tahakkuklar · mizan analizi · hata düzeltme |
| Y9 | Beyanname, Kapanış ve Raporlama | `beyanname-surecleri` | KDV → MPHB → geçici/kurumlar girişi → tahakkuk → ödeme → kapanış |

Şirket/sermaye işlemleri ayrı Yetkinlik kartı değildir (İşletmeler M1/M13 +
Uzmanlık katmanı). `sirket-ticaret-islemleri` kartı gizlendi.

---

# UZMANLIKLAR — 7 çekirdek + sektör rotaları

Uzmanlık sorusu: *"Bu dosyada işlemi yapabilmek için yeterli bilgi var mı?"*
(belge iste → mevzuat kontrol et → yaklaşım seç → kaydet → vergi/tablo etkisini değerlendir)

**Çekirdek (fonksiyonel):**
U1 Vergi Uygulamaları (`ileri-vergi`) · U2 Finansal Raporlama ve TMS/TFRS
(`finansal-raporlama`) · U3 Maliyet ve Üretim (`maliyet-muhasebesi`) ·
U4 Proje ve Sözleşme (`proje-muhasebesi`) · U5 İleri Bordro, SGK ve Teşvikler
(`bordro-is-hukuku`) · U6 Dış Ticaret (`dis-ticaret-doviz`) ·
U7 Ar-Ge, Teknokent ve Teşvikler (`arge-teknokent`)

**Sektör rotaları (capstone — yeni ders seti değil, ön koşul ağıyla birleşim):**
Savunma Sanayii (`savunma-sanayii`) · İnşaat & Taahhüt (`insaat-muhasebesi`) ·
e-Ticaret (`e-ticaret`)

---

# Ön Koşullar ve Sıralama

```
Temeller (K1 → K2 → K3, zorunlu başlangıç)
   ↓
Y1 Belgeden İşleme
   ↓                ↓
Y2 Satın Alma    Y3 Satış        Y4 Kasa-Banka (←Temeller)
   ↓                ↓                ↓
Y5 Stok-DV       Y6 KDV/e-Belge   Y7 Bordro (←Temeller)
        ↓             ↓              ↓
        Y8 Mutabakat ve Dönem Sonu
                 ↓
        Y9 Beyanname-Kapanış-Raporlama
                 ↓
        Uzmanlıklar (U1–U7) → Sektör rotaları
```

Makine karşılığı: `kesfet_kart_on_kosullari` (zorunlu/önerilen, döngü engelleyici trigger).

---

# Öğretim modeli (içerik fazının sözleşmesi)

- **Yeni kayıt türü öğretimi:** çözümlü örnek → tamamlama → hesap seçimi →
  yön belirleme → sıfırdan kayıt → yakın transfer → uzak transfer → interleaved.
- **Pratik düzeni:** blocked başlar (5–8 varyasyon) → karıştırılır → aralıklı geri getirilir.
- **Anlatım/pratik hedefi:** Temeller ~%35/65 · Yetkinlik ~%20/80 · Uzmanlık ~%10/90.
- **Temas hedefi:** Temeller boyunca ~75–100 kayıt teması.
- **Mevzuat yoğunluğu:** Temeller %0–5 → Yetkinlik işlem içi "Neden böyle?" paneli →
  Uzmanlık problemin parçası (sürümleme zorunlu).
- **Mali Sözlük:** dersi bölmez — popover/bottom-sheet, "detaya git" bağlantısı.
- Mastery (M0–M9) ve belge zorluğu (B0–B5): ADR-004 "Gelecek fazlar".

---

# Finaller

- **Temeller Finali — İlk Ay:** sade işletmenin 15–20 olayı; olay → hesap →
  yön → kayıt → mizan → basit tablo etkisi.
- **Yetkinlik Finali — Muhasebe Masası:** ~1 haftalık gerçekçi işlem paketi.
- **Uzmanlık Finali — Dosya:** tek doğru cevabı olmayan vaka; incele → bilgi
  iste → karar ver → muhasebeleştir → gerekçelendir.

---

# Bilinen Boşluklar

1. 26 birimin 24'ünün gövdesi şablon (yalnız birim 1–2 yazılı).
2. Kart 2 finali yok.
3. Arşivdeki 20 eski ders (7 + 13) içerik yazarken kaynak metindir.
4. Soru havuzu boş; hiçbir birime onaylı soru bağlı değil.
5. Zamana bağlı mevzuat değerleri kaynak+tarih metadata'sına bağlanmadı.
