# Araştırma Raporu — V6 Müfredat Kırılımının Ölçek ve Granülerlik Analizi

**Tarih:** 11 Ağustos 2026 · **Derinlik:** standard · **Tür:** karar öncesi değerlendirme
**Konu:** Chief Architect'in 31 kart → bölüm → ders kırılımının uygulanabilirliği
**Not:** Bu bir araştırma raporudur. Hiçbir yapı kurulmadı, veritabanına dokunulmadı.
**Konum notu:** `/sc:research` varsayılanı `claudedocs/` ancak repo'da yerleşik
klasör `docs/research/` — repo geleneği izlendi.

---

## Yönetici Özeti

**Hüküm: Yapı doğru, ölçek uygulanamaz. Temeller kırılımı ~3 kat sadeleştirilmeden
üretime girilmemeli.**

Önerilen kırılım sayıldığında **31 kart · 278 bölüm** çıkıyor; Temeller için verilen
ders yoğunluğu (bölüm başına 4.6 ders) tüm yapıya uygulanırsa **~1.285 ders** eder.
Sektörün en yaygın üretim kıyaslamasıyla bu, etkileşimli içerik için **6+ kişi-yılı**
iş demektir. Projenin bugüne kadar ürettiği elle yazılmış ders sayısı **2**.

Yapının kendisi sağlam: sıralama OpenStax'ın muhasebe döngüsü akışıyla uyumlu,
dört katmanlı hiyerarşi veritabanı şemasıyla birebir örtüşüyor, kart adları
ADR-005'te onaylanmış hâliyle sabit. Sorun kapsam değil **granülerlik**: tek bir
kavramın alt adımları ayrı ders yapılmış.

Güven düzeyi: sayımlar **yüksek** (birebir sayıldı), üretim süresi tahmini
**orta** (sektör kıyaslaması, projeye özel ölçüm değil), granülerlik eleştirisi
**yüksek** (yapının kendi içinden örneklerle).

---

## 1. Sayım — önerilen yapının gerçek boyutu

Metin birebir sayıldı:

| Katman | Kart | Bölüm | Ders |
|---|---:|---:|---:|
| Temeller | 7 | 29 | **134** |
| Yetkinlikler | 16 | 146 | belirtilmemiş |
| Uzmanlıklar | 8 | 103 | belirtilmemiş |
| **Toplam** | **31** | **278** | — |

Temeller kart bazında: 19 · 19 · 19 · 20 · 19 · 18 · 20 ders.

**Bölüm başına ortalama ders (Temeller): 4,62.** Bu oran Yetkinlik ve Uzmanlık
bölümlerine de uygulanırsa:

> 134 + (146 + 103) × 4,62 ≈ **1.285 ders**

Metnin kendi tahmini "220–260 bölüm" idi; gerçek sayım **278**. Ders tarafı için
tahmin verilmemiş.

### Önceki turlarla karşılaştırma (Temeller)

| Tur | Kaynak | Temeller ders |
|---|---|---:|
| V1 | Muhasebe.docx | 45 |
| V2 | Muhasebe2.docx | 39 |
| V3 | Önceki ChatGPT turu | 26 |
| **V6** | **bu öneri** | **134** |

Son üç turun yönü küçültmeydi; bu tur **5 katına** çıkarıyor. Metin bunu bir
büyütme olarak sunmuyor — "kapsamlı iskelet" diyor — ama sayı olarak durum bu.

---

## 2. Üretim maliyeti — asıl kısıt

Platformdaki ders süresi göstergesi ~3 dakika. 1.285 ders ≈ **64 saat bitmiş
etkileşimli içerik**.

Chapman Alliance'ın ~250 kuruluş ve ~4.000 eğitim profesyoneliyle yaptığı ve
sektörde en çok atıf alan kıyaslamasına göre bir saat bitmiş e-öğrenme içeriği:

| Seviye | İçerik türü | Geliştirme oranı |
|---|---|---:|
| Seviye 1 | statik metin/görsel, basit test | ~49 : 1 |
| Seviye 2 | etkileşim, senaryo, uygulama | ~197 : 1 |
| Seviye 3 | simülasyon, ileri etkileşim | ~490 : 1 |

Muhasebe Akademi dersleri `kontrol` (test), `kayit`/`yevmiye` (uygulamalı fiş),
senaryo ve belge blokları içeriyor → **en az Seviye 2**, tartışmalı olarak Seviye 3.

| Senaryo | Hesap | Sonuç |
|---|---|---|
| İyimser (Seviye 1) | 64 × 49 | ~3.150 saat ≈ **1,6 kişi-yılı** |
| Gerçekçi (Seviye 2) | 64 × 197 | ~12.650 saat ≈ **6,3 kişi-yılı** |

Projeye özel gerçeklik kontrolü: bugüne kadar elle yazılmış ders sayısı **2**
(`20260809000006`, `20260809000007`). Haftada 8 ders gibi çok iyimser bir hızla
bile 1.285 ders **~3 yıl** sürer.

> Bu hesap tek başına "yapmayın" demiyor; **"bu hacim bir ürün lansmanı planı
> değil, çok yıllık bir yayınevi programıdır"** diyor.

---

## 3. Granülerlik — asıl düzeltilmesi gereken şey

Sorun konuların yanlış olması değil, **tek bir öğrenme biriminin parçalara
bölünmüş olması**. Yapının içinden örnekler:

| Nerede | Ders olarak listelenmiş | Gerçekte ne |
|---|---|---|
| K1 · B2 | Kaydetme · Sınıflandırma · Özetleme · Raporlama (4 ders) | Tek akış diyagramı |
| K1 · B3 | Para ile Ölçülebilme · İşletme ile İlgili Olma (2 ders) | Tek tanımın iki ölçütü |
| K4 · B4 | Olayı Anla · Unsuru Bul · Artış mı? · Hesap Türü · Taraf Seç (5 ders) | **Tek algoritma** |
| K5 · B3 | Hesapları/Yönü/Tutarları Yerleştir · Açıklama Yaz (4 ders) | Tek formun 4 alanı |
| K5 · B4 | Hesap/Yön/Tutar/Denge/Belge doğru mu? (5 ders) | 5 maddelik kontrol listesi |

**K4 · B4 doğrudan bir iç çelişki:** aynı danışmanın önceki turu bunu
*"İşlem Analizi (6 adım algoritması)"* başlığıyla **tek ders** olarak
tanımlamıştı. Bu turda beş derse bölünmüş.

### Araştırma ne diyor

Mayer'in **segmenting** ilkesi parçalamayı destekliyor — ancak bu ilke
*öğrencinin kendi hızında ilerleyebileceği anlamlı bölümler* içindir, her adımın
ayrı bir ünite olması değil. Kaynaklar aşırı parçalamanın (*oversegmentation*)
kendi başına yeni bir sorun ürettiğini açıkça not ediyor.

Muhasebeye özel bulgu daha da doğrudan: giriş düzeyi finansal muhasebe dersinin
yeniden tasarlandığı çalışmada **içeriği azaltmak tek başına öğrenmeyi
iyileştirmedi**; iyileşme, azaltmanın *aktif öğrenme ve üstbiliş etkinlikleriyle
birleştiğinde* geldi. Yani "daha az ders" yeterli değil — **açılan yerin
uygulamayla doldurulması** gerekiyor. Bu, danışmanın kendi "senaryo uzayını
büyüt" tezini destekliyor ama önerdiği ders sayısıyla çelişiyor.

### Ölçek kıyaslaması

OpenStax *Principles of Accounting, Vol 1* **16 bölümde** tüm giriş finansal
muhasebe müfredatını kapsıyor — alacaklar, stoklar, duran varlıklar, borçlar,
sermaye şirketleri, nakit akış tablosu dahil.

Önerilen **Temeller**, OpenStax'ın kabaca ilk 5 bölümüne karşılık gelen kapsamı
(muhasebenin rolü → finansal tablolar → işlem analizi → düzeltme → döngüyü
tamamlama) **134 derse** yayıyor.

---

## 4. Tekrarlar

Aynı kavram birden fazla yerde ders olmuş:

| Kavram | Nerede tekrarlanıyor |
|---|---|
| Varlık kavramı | K2·B1 (5 ders) · K3·B2 "Varlık Hesapları" · K7·B2 "Varlıklar" |
| Kâr ≠ Nakit | K2·B4·D6 · K7·B4·D3 · K7·B4·D4 (üç kez) |
| Hesap bakiyesi | K3·B1·D4 · K6·B2·D4 |
| İşlemin denkliğe/tabloya etkisi | K2·B3·D4 · K7·B4·D1 |
| Hesap sınıfı/grup/ana/alt | K3·**B3** (4 ders) · K3·**B4** (kod mantığı, 1–9 sınıflar) — **aynı kartın içinde iki kez** |

Bunların bir kısmı bilinçli spiral tekrar olabilir; ancak spiral tekrar *aynı
kavramı artan zorlukta yeniden uygulatmak* demektir, *aynı anlatımı yeniden
yazmak* değil. Ayrım içerik üretiminden önce netleşmeli.

---

## 5. Platform verisiyle uyuşmayan tek somut nokta

**K3 · B4 · Ders 3: "1–9 Hesap Sınıfları"**

Platformun hesap planı verisi (`src/data/hesap-plani.ts`, 272 hesap) yalnızca
**sınıf 1–7** içeriyor. Sınıf 8 (serbest) ve 9 (nazım hesaplar) veride yok.

Bu ders bugünkü hâliyle yazılırsa öğrenciye platformun kendi hesap planında
karşılığı olmayan bir şey öğretilir. İki seçenek: dersi "1–7" olarak daraltmak,
ya da hesap planına nazım hesapları eklemek (ayrı iş).

---

## 6. Yetkinlik ve Uzmanlık listelerinin farklı bir sorunu var

Bu iki katmanda listelenenler **bölüm değil, konu başlığı**. Birçoğu tek kavram
ve altına birden fazla ders sığmaz:

> "Faiz" · "Fire" · "İzin" · "Kıdem" · "İhbar" · "5746" · "4691" · "Depolar" ·
> "Anapara" · "Virman" · "Mahsup"

Tersi de var — tek satırın altında yarıyıllık kapsam gizli:

> Uzmanlık K3: "Kiralamalar" · "Finansal Araçlar" · "Konsolidasyona Giriş"
> Uzmanlık K2: "Standart Maliyet ve Sapmalar"

Yani bu iki katman için verilen liste **bölüm kırılımı olarak kullanılamaz**;
konu envanteridir ve bölüm/ders ayrımı ayrıca yapılmalıdır.

---

## 7. Öneriler (karar ürün sahibinin)

**Ö1 — Temeller'i ders değil, öğrenme birimi olarak yeniden say.**
Ölçüt: *"Öğrenci bu birimi bitirdiğinde tek başına yapabildiği yeni bir şey var
mı?"* Yoksa o bir ders değil, bir ekran/adımdır. Bu ölçütle 134 dersin
**~45–55'e** ineceği tahmin ediliyor (V2'nin 39'u ile V6'nın 134'ü arasında,
kapsamı kaybetmeden).

**Ö2 — Çok adımlı yordamları tek derste tut.**
K4·B4 (borç/alacak karar sistemi), K5·B3 (yevmiye alanları), K5·B4 (kontrol
listesi) birer ders olmalı; adımlar ders içi ekran/etkileşim olmalı. Platformun
`kontrol` ve `kayit` blokları tam bunun için var.

**Ö3 — Yetkinlik/Uzmanlık için ayrı bir kırılım turu yap.**
Mevcut liste konu envanteri olarak değerli; bölüm/ders ayrımı yapılmadan
veritabanına girmemeli.

**Ö4 — Önce tek kart bitir, sonra ölçeklendir.**
Kart 1'i uçtan uca (bölüm + ders + içerik + soru) tamamlayıp gerçek üretim
hızını ölç. 1.285 dersin planı, ölçülmüş bir hızla yapılmalı; tahminle değil.

**Ö5 — "1–9 Hesap Sınıfları" dersini veriye göre düzelt** (§5).

**Ö6 — Tekrarları spiral mi kopya mı diye işaretle** (§4). Spiralse aynı kavramı
farklı zorlukta *uygulatan* birimler olarak tanımla; kopyaysa tekile indir.

---

## 8. Bu raporun sınırları

- Ders sayısı projeksiyonu (1.285) Temeller'in yoğunluğunun diğer katmanlara
  taşınması varsayımına dayanır; danışman farklı bir yoğunluk öngörüyor olabilir.
- Chapman oranları sektör ortalamasıdır; AI destekli üretim bu oranları
  düşürebilir — ancak muhasebe içeriğinin **uzman doğrulaması** gerektirdiği
  (yanlış yevmiye kaydı öğretmenin maliyeti) unutulmamalı.
- IFAC IES 2 ve ACCA seviye çerçevesi bu turda yeniden doğrulanmadı; önceki
  turda kabul edilmiş varsayım olarak alındı.
- Granülerlik eleştirisi yapının kendi metnine dayanır; öğrenci verisiyle
  sınanmamıştır (henüz kullanıcı yok).

---

## Kaynaklar

- [Chapman Alliance — How long does it take to develop training? (2010 kıyaslaması)](https://www.cedma-europe.org/newsletter%20articles/misc/How%20long%20does%20it%20take%20to%20develop%20training%20by%20Brian%20Chapman%20(Sep%2010).pdf)
- [Cognota — How Long Does It Take Instructional Designers to Create One Hour of Learning?](https://cognota.com/blog/how-long-does-it-take-instructional-designers-to-create-one-hour-of-learning/)
- [Mayer — Segmenting Principle (Multimedia Learning, Cambridge)](https://www.cambridge.org/core/books/abs/multimedia-learning/segmenting-principle/37240877DDA0362355ADB39936027982)
- [Cognitive Theory of Multimedia Learning — Segmenting Principle](https://sites.google.com/site/cognitivetheorymmlearning/segmenting-principle)
- [Improving introductory financial accounting learning and retention through course redesign (Journal of Accounting Education)](https://www.sciencedirect.com/science/article/abs/pii/S0748575122000501)
- [OpenStax — Principles of Accounting, Volume 1: Financial Accounting](https://openstax.org/details/books/principles-financial-accounting)

**Proje içi kanıt:** `src/data/hesap-plani.ts` (272 hesap, sınıf 1–7) ·
`supabase/migrations/20260809000006-7` (elle yazılmış 2 ders) ·
`docs/adr/ADR-005-v6-31-kart-mimarisi.md` (onaylı 31 kart) ·
`docs/curriculum/CUR-004-Mufredat.md` v3.0
