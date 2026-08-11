# CUR-004 — Müfredat

**Durum:** v1.0 · 11 Ağustos 2026
**Karar dayanağı:** [ADR-003 — Kanonik Temeller müfredatı](../adr/ADR-003-kanonik-temeller-mufredati.md)
**Kaynak belgeler:** `docs/sources/Muhasebe2.docx` (Temeller) · `docs/sources/Muhasebe.docx` (Yetkinlikler, Uzmanlıklar)

---

# Amaç

Bu doküman, Muhasebe Akademi müfredatının **okunur kanonik dökümüdür**. Ders adı,
bölümü ve sırası için makine tarafında tek kaynak
`supabase/migrations/20260809000005_temeller_39_ders.sql` içindeki
`temeller_ders_hedefleri` tablosudur; bu doküman onunla aynı olmak zorundadır.

Müfredatın amacı konu ezberletmek değil, şu zinciri kurdurmaktır:

> İşletmede ne oldu? → Neden muhasebeleştiriyoruz? → Hangi değer değişti? →
> Kayıt neden böyle oluştu?

---

# Müfredat Yapısı

## Hiyerarşi

```
Ana Alan  →  Eğitim Kartı  →  Bölüm  →  Ders
(3)          (25)             (…)       (…)
```

Veritabanı karşılığı: `kesfet_kartlar.kategori` → `kesfet_kartlar` →
`kesfet_bolumler` → `kesfet_itemler`.

Notion karşılığı (`Müfredat` DB, `İçerik Türü`): Program → Ünite → Modül → Konu.
Terimler eşleşmiyor; eşleme tablosu aşağıdadır.

| Katman | Word terimi | Repo | Notion |
|---|---|---|---|
| 0 | Program | — | Program (MA) |
| 1 | Ana Alan | `kategori` | Ünite (TEM/YET/UZM) |
| 2 | Eğitim Kartı | `kesfet_kartlar` | Modül (T1–T3, Y1–Y12, U1–U10) |
| 3 | Bölüm | `kesfet_bolumler` | Konu (T1-B1 …) |
| 4 | Ders | `kesfet_itemler` | `Ders İçerikleri` DB kaydı |

## Ana alanlar

| Kod | Ana alan | Kart | Ne öğretir |
|---|---|---|---|
| TEM | Temeller | 3 | Muhasebenin dilini anlamak |
| YET | Yetkinlikler | 12 | Muhasebe işini yapmak |
| UZM | Uzmanlıklar | 10 | Belirli problem/sektör/mevzuat kümesini birlikte yönetmek |

---

# Modül Listesi

## Temeller — 3 kart · 10 bölüm · 39 ders

### T1 — Muhasebenin Mantığı (13 ders)

**Bölüm 1 — Muhasebe neden var?**
1. Muhasebe Neden Gereklidir?
2. Muhasebe Nedir?
3. Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi
4. Muhasebe Bilgisini Kim, Neden Kullanır?

**Bölüm 2 — İşletmede neyi muhasebeleştiriyoruz?**
5. İşletme ile Sahibinin İşlemlerini Ayırmak
6. Mali Nitelikteki Olay
7. Para Hareketi Her Zaman Gelir veya Gider midir?
8. Belge: Ekonomik Olayın Kayıt Dayanağı

**Bölüm 3 — İşletmenin ekonomik yapısı**
9. İşletmenin Varlıkları
10. Varlıklar Nereden Gelir? Borçlar ve Özkaynak
11. Temel Muhasebe Denklemi: Varlıklar = Borçlar + Özkaynak
12. İşlemlerin Muhasebe Denklemine Etkisi
13. Gelir, Gider ve Özkaynak İlişkisi

### T2 — Hesap ve Kayıt Mantığı (14 ders)

**Bölüm 1 — Hesap**
14. Hesap Nedir ve Neden Hesaplara İhtiyaç Duyarız?
15. Hesabın İki Tarafı: Borç ve Alacak
16. Hesaplarda Artış ve Azalış Nasıl İzlenir?

**Bölüm 2 — Hesapların çalışma mantığı**
17. Varlık Hesapları
18. Kaynak Hesapları
19. Gelir ve Gider Hesapları
20. Hesabın Doğal Yönü: Normal Bakiye

**Bölüm 3 — Çift taraflı kayıt**
21. Bir İşlem Neden En Az İki Hesabı Etkiler?
22. Çift Taraflı Kayıt
23. Borç = Alacak Kontrolü

**Bölüm 4 — Hesap Planı**
24. Tekdüzen Hesap Planı Neden Var?
25. Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap
26. Alt Hesap ve Muhasebe Detayı
27. Hesabı Ezberlemek Yerine Bulmak

### T3 — Kayıttan Finansal Tabloya (12 ders)

**Bölüm 1 — Muhasebe Kaydı**
28. Yevmiye Kaydı Nedir?
29. Bir Yevmiye Kaydının Anatomisi
30. Basit Muhasebe Kaydı
31. Birden Fazla Hesaplı Kayıt

**Bölüm 2 — Sınıflandırma ve Kontrol**
32. Büyük Defter: Kayıtları Hesaplara Göre Toplamak
33. Hesap Bakiyesi
34. Mizan: Hesapları Tek Yerde Görmek
35. Mizan Neyi Kontrol Eder, Neyi Edemez?

**Bölüm 3 — Raporlama**
36. Bilanço / Finansal Durum Tablosu
37. Gelir Tablosu
38. Kâr ile Nakit Neden Aynı Şey Değildir?
39. Kayıttan Finansal Tabloya: Muhasebe Döngüsü

## Yetkinlikler — 12 kart

| Kod | Kart | Repo karşılığı | Durum |
|---|---|---|---|
| Y1 | Belge Okuma ve İşlem Analizi | — | Repoda yok |
| Y2 | Kasa, Banka ve Ödeme Sistemleri | — | Repoda yok |
| Y3 | Alış, Satış ve Cari Hesaplar | `gunluk-muhasebe-islemleri` | Y2+Y3+Y4+Y6 birleşik |
| Y4 | Stok ve Ticari Mal | `gunluk-muhasebe-islemleri` | Birleşik |
| Y5 | KDV ve e-Belge | `vergi-belge-uygulamalari` | Yeniden adlandırılmış |
| Y6 | Duran Varlıklar ve Amortisman | `gunluk-muhasebe-islemleri` | Birleşik |
| Y7 | Bordro ve SGK Operasyonları | `bordro-sgk` | Eşleşiyor |
| Y8 | Dönem Sonu ve Muhasebe Kontrolleri | `donem-sonu-islemleri` | Eşleşiyor |
| Y9 | Beyanname Süreçleri | `beyanname-surecleri` | Eşleşiyor |
| Y10 | Finansal Tablolar ve Yönetim Raporlama | `yonetim-muhasebesi` | **Kategori çelişkisi** — repoda Uzmanlık |
| Y11 | Şirket ve Sermaye İşlemleri | `sirket-islemleri` / `sirket-ticaret-islemleri` | **Mükerrer slug** |
| Y12 | Muhasebe Sistemleri ve ERP Mantığı | — | Repoda yok |

## Uzmanlıklar — 10 kart

U1 Maliyet ve Üretim Muhasebesi · U2 Proje ve Sözleşme Muhasebesi ·
U3 Vergi Uygulamaları · U4 Finansal Raporlama ve TMS/TFRS ·
U5 İleri Bordro, SGK ve Teşvikler · U6 Ar-Ge, Tasarım ve Teknokent ·
U7 Savunma Sanayii Muhasebesi · U8 Dış Ticaret Muhasebesi ·
U9 İnşaat ve Taahhüt Muhasebesi · U10 e-Ticaret Muhasebesi

> **Açık soru:** Muhasebe.docx bu 22 Y/U kartının altındaki maddeleri bölüm ve
> ders olarak ayırmıyor. Bu ayrım yapılmadan Y/U içerik hacmi tahmin edilemez.

---

# Öğrenme Hedefleri

Ders bazlı öğrenme hedefleri Notion `Müfredat` DB'sindeki `Öğrenme Hedefi`
alanında tutulur; bu doküman onları tekrarlamaz (kopya yerine ilişki ilkesi).

Ana alan düzeyindeki hedefler:

- **Temeller:** Muhasebenin dilini, hesap ve kayıt mantığını ve muhasebe
  döngüsünü anlamak.
- **Yetkinlikler:** Gerçek belge ve işletme olaylarından hareketle muhasebe
  işlerini yapabilmek.
- **Uzmanlıklar:** Belirli sektör, problem ve mevzuat kümelerinde muhasebe
  çözümleri geliştirebilmek.

---

# Ön Koşullar ve Sıralama

Ana omurga (Muhasebe.docx §11):

```
Muhasebenin Mantığı → Hesap ve Kayıt Mantığı → Kayıttan Finansal Tabloya
        ↓
Belge Okuma → Kasa/Banka
        ↓ (paralel)
Alış/Satış/Cari → KDV → Stok
        ↓
Duran Varlık · Bordro
        ↓
Dönem Sonu ve Kontrol
        ↓
Beyanname Süreçleri · Finansal Raporlama
        ↓
Uzmanlıklar
```

Makine karşılığı `kesfet_kart_on_kosullari` tablosudur (`zorunlu` / `onerilen`
türleri, döngü engelleyici trigger ile). Temeller zorunlu başlangıçtır;
Yetkinlikler ve Uzmanlıklar açık ön koşullu ilerlemedir.

---

# Soru ve Zorluk Modeli

## S0–S5 bilişsel taksonomi

| Kod | Ad | Ne sorar |
|---|---|---|
| S0 | Fark Et | Bu mali nitelikte bir olay mı? |
| S1 | Oku | Faturadaki satıcı kim? KDV ne kadar? |
| S2 | Sınıflandır | Ticari mal mı, gider mi, duran varlık mı? |
| S3 | Muhasebeleştir | Hesabı seç, borç/alacak seç, kaydı oluştur |
| S4 | Kontrol Et | Bu kayıtta ne yanlış? Mizan neden tutmuyor? |
| S5 | Karar Ver | Hangi belgeyi kaydet, hangisini beklet, hangisi için ek belge iste? |

## Beş seviyeli uygulama zorluğu

1. **Yönlendirmeli** — tek olay, tek belge, hesaplar gösteriliyor
2. **Destekli** — tek olay, hesapları kullanıcı seçiyor
3. **Bağımsız** — belge veriliyor, kaydı kullanıcı oluşturuyor
4. **Karma** — birden fazla belge, bağlantılı işlemler
5. **Mesleki** — eksik bilgi olabilir; kullanıcı önce neyi bilmesi gerektiğine karar verir

> **Bilinen uyumsuzluk:** Notion `Soru Havuzu` şemasında S0–S5 alanı yok ve
> `Zorluk` üç seviyeli (Kolay/Orta/Zor). Şema bu modele hizalanmalıdır.

---

# Senaryo ve Muhasebe Olayı (KUR)

Ders anlatımı BlockNote JSON olarak `kesfet_itemler.icerik` alanında; ölçülen
olay, belge, soru ve çözüm ise V2 çekirdek tablolarında tutulur (ADR-002).
Bu doküman ders metni içermez.

Karakter evreni ve yazım kuralları için: Notion "Muhasebe Akademi İçerik
Şablonu" ve "Muhasebe Atölyesi — Çalışma Kuralları" sayfaları, ayrıca
[COPY-STYLE-GUIDE.md](../../COPY-STYLE-GUIDE.md).

---

# Bilinen Boşluklar

1. Birleşen 7 dersin gövdesi yarım (ADR-003, Sonuçlar bölümü).
2. Notion'daki 39 ders kaydının tamamı aynı şablon metnini taşıyor.
3. Yetkinlik/Uzmanlık kartlarında bölüm–ders ayrımı yapılmamış.
4. Zamana bağlı mevzuat değerleri (oran, tutar, eşik) henüz kaynak ve tarih
   metadata'sına bağlanmamış.
