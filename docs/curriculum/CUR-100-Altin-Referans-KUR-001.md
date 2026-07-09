# CUR-100 — Altın Referans İçerik: KUR-001

**Durum:** Referans v1.0
**İlgili içerik:** KUR-001 — Ticari Mal Alışı (Veresiye)

---

# 1. Belgenin Amacı

Bu belge, KUR-001 (Veresiye Ticari Mal Alış Faturası) içeriğini **altın referans** olarak tanımlar.

Amaç yalnızca KUR-001'i açıklamak değil; bundan sonra üretilecek tüm KUR içeriklerinin (KUR-002, KUR-003, …) örnek alacağı **kalite ve içerik seviyesini** göstermektir. Bir KUR içeriği üretilirken "yeterli mi?" sorusunun cevabı bu belgeyle kıyaslanarak verilir.

Belge, CUR-005 (İçerik Standardı) yapısına uyar ve CUR-001, CUR-002, CUR-006 ile DD-001…DD-005 kararlarıyla tutarlıdır. İçerikteki tüm veriler mevcut canlı KUR-001 seed'iyle birebir aynıdır; varsayım eklenmemiştir.

---

# 2. Olay Bilgisi

| Alan | Değer |
|---|---|
| KUR kodu | KUR-001 |
| Olay adı | Ticari Mal Alışı (Veresiye) |
| Olay id | `olay-mal-alis-veresiye-001` |
| Soru id | `soru-mal-alis-veresiye-001` |
| Modül / Ünite | Mal Alış-Satış (`mal-alis-satis`) |
| Referans işletme | Atlas Market Ticaret Ltd. Şti. (CUR-006) |
| Belge türü | Alış Faturası (`alis_faturasi`) |
| İşlem tarihi | 15.03.2026 |
| Zorluk | Orta |
| Destek seviyesi | Standart |
| Soru tipi | Yevmiye kaydı |
| Temel hesaplar | 153 Ticari Mallar · 191 İndirilecek KDV · 320 Satıcılar |
| Cari / muavin yapı | 153.01 (stok, carisiz) · 191.01 (vergi, carisiz) · 320.001 → **Delta Tedarik Ltd. Şti.** cari kartına bağlı (tip: tedarikçi) |
| Yetkinlik ağırlıkları | KDV 0.40 · Cari hesap 0.20 · Belge okuma 0.20 · Yevmiye kaydı 0.20 |
| Mevzuat bağı | KDVK md.29/1 · VUK md.229 |

---

# 3. Bu Olay Neden Öğretiliyor?

Kullanıcı bu olayda bir **alış faturasını analiz ederek** ticari mal, indirilecek KDV ve satıcı cari hesabı arasındaki ilişkiyi kavrar.

Öğretilen mesleki muhakeme:

- Alışta yüklenilen KDV'nin **indirilecek** KDV olduğunu (satıştaki hesaplanan KDV ile karıştırılmaması gerektiğini) ayırt etmek.
- Ödeme yapılmadığında borcun kasa/banka değil, **satıcı cari hesabında** doğduğunu görmek.
- Bir belgeyi (faturayı) okuyup doğru yevmiye kaydına dönüştürmek.

Bu olay, bir ticari işletmenin en sık tekrarlanan işlemlerinden birini temsil eder; bu nedenle Beta'nın ilk ve referans olayıdır.

---

# 4. İşletme Senaryosu

Atlas Market, tedarikçisi **Delta Tedarik Ltd. Şti.**'den 50.000 TL tutarında ticari mal satın alır. Faturada %20 KDV (10.000 TL) hesaplanmıştır. Ödeme 30 gün vadelidir ve henüz yapılmamıştır (veresiye). Karşılığında alış faturası düzenlenir.

Kullanıcıdan bu faturayı yevmiyeye kaydetmesi istenir.

---

# 5. Gerçek Belge Yaklaşımı

Kullanıcı, gerçek bir alış faturası formatında aşağıdaki alanları görür (DD-002 — gerçek belge):

| Alan | Bu olaydaki değer |
|---|---|
| Satıcı (düzenleyen) | Delta Tedarik Ltd. Şti. |
| Alıcı | Atlas Market Ticaret Ltd. Şti. |
| Belge tarihi | 15.03.2026 |
| Belge numarası | ALS2026-000147 |
| Mal/hizmet satırı | Ticari Mal — 100 Adet × 500 TL |
| Matrah | 50.000 TL |
| KDV oranı | %20 |
| KDV tutarı | 10.000 TL |
| Genel toplam | 60.000 TL |
| Ödeme şekli / vade | Veresiye — 30 gün vade |

---

# 6. Belge Analizi

"Belgeyi İncele" modunda kullanıcı, önemli alanları üç boyutta inceler:

**Matrah (50.000 TL)**
- *Muhasebe:* Malın KDV hariç bedelidir; 153 Ticari Mallar'a borç yazılacak tutar.
- *Mevzuat:* Faturada mal bedeli ayrıca gösterilir (VUK md.229 — fatura).
- *Mesleki dikkat:* Matrah ile genel toplam karıştırılmamalı; 153'e yalnızca 50.000 gelir.

**KDV tutarı (10.000 TL, %20)**
- *Muhasebe:* Yüklenilen KDV'dir → 191 İndirilecek KDV'ye borç.
- *Mevzuat:* İndirim hakkının dayanağı KDVK md.29/1'dir.
- *Mesleki dikkat:* Alışta 391 Hesaplanan KDV **kullanılmaz**; bu satışa ait bir hesaptır.

**Ödeme şekli / vade (veresiye, 30 gün)**
- *Muhasebe:* Ödeme yapılmadığından karşı hesap 320 Satıcılar'dır.
- *Mevzuat:* —
- *Mesleki dikkat:* Vade bilgisi, işlemin nakit değil borç doğuran bir işlem olduğunu belirler.

**Satıcı (Delta Tedarik)**
- *Muhasebe:* 320 Satıcılar altında ilgili cari (muavin 320.001) kullanılır.
- *Mevzuat:* Faturayı düzenleyen taraftır (VUK md.229).
- *Mesleki dikkat:* Borç, "genel satıcılar" değil, **belirli satıcının cari hesabında** takip edilir.

---

# 7. Mevzuat Bağlantısı

Olayla doğrudan ilişkili iki dayanak vardır (uygulama odaklı, akademik anlatımdan kaçınılarak):

- **KDVK md.29/1 — Vergi İndirimi:** Mükellef, faaliyetine ilişkin yüklendiği KDV'yi indirebilir. Bu, faturadaki 10.000 TL'nin **191 İndirilecek KDV** olarak kaydedilmesinin dayanağıdır.
- **VUK md.229 — Fatura:** Fatura, satılan mal karşılığında düzenlenen ticari vesikadır. Kaydın belge dayanağıdır; kayıt "faturaya göre" yapılır.

Mevzuat ayrı bir başlık olarak değil, olayın ve belgenin içinde öğretilir (DD-005).

---

# 8. Mentor Rehberliği

Mentor doğrudan doğru cevabı söylemez; kullanıcıyı belgeye ve doğru muhakemeye yönlendirir (DD-003). Örnek müdahaleler:

- Kullanıcı KDV'yi 391'e yazarsa:
  > "391 Hesaplanan KDV'yi bir satış işleminde görürüz. Burada malı sen satın alıyorsun — faturadaki KDV'yi kim yükleniyor? Bunu hangi hesap karşılar?"

- Kullanıcı karşı hesabı 100 Kasa yaparsa:
  > "Faturanın ödeme kısmına tekrar bak. Parayı bugün ödedin mi, yoksa 30 gün sonra mı ödeyeceksin? Ödeme yapılmadıysa borç nerede birikir?"

- Kullanıcı doğru yola girerse:
  > "İyi düşündün. Malın bedelini 153'e, yüklendiğin KDV'yi 191'e ayırdın. Şimdi ödemediğin için karşı tarafta doğan borcu hangi cariye yazacaksın?"

Mentor, bir mali müşavir gibi güven veren ve düşündüren bir dille konuşur; kullanıcıyı yargılamaz, yönlendirir.

---

# 9. Muhasebe Kaydı

Doğru yevmiye kaydı (varyant: *Aralıklı envanter*, Σborç = Σalacak = 60.000 TL):

| Hesap (ana) | Muavin | Açıklama | Borç | Alacak |
|---|---|---|---:|---:|
| 153 Ticari Mallar | **153.01** Ticari Mallar | Mal bedeli | 50.000 | |
| 191 İndirilecek KDV | **191.01** İndirilecek KDV | Yüklenilen KDV | 10.000 | |
| 320 Satıcılar | **320.001** Delta Tedarik Ltd. Şti. | Veresiye borç | | 60.000 |

**Muavin ve cari kullanımı zorunludur.** Ana hesaba (ör. 320) doğrudan kayıt yapılmaz; kayıt daima **muavin hesap** üzerinden işlenir. 320 Satıcılar cari gerektiren bir ana hesaptır; bu nedenle muavin **320.001**, Delta Tedarik cari kartına bağlıdır. 153.01 ve 191.01 muavinleri ise cari gerektirmez (sırasıyla stok ve vergi muavinidir).

---

# 10. Finansal Etki

Bu kaydın mali tablolara etkisi:

- **Stok artar:** 153 Ticari Mallar 50.000 TL borçlanır (aktif artışı).
- **İndirilecek KDV oluşur:** 191 hesabında 10.000 TL devlet KDV alacağı doğar; bu tutar KDV beyannamesinde indirilecek KDV olarak yer alır.
- **Satıcıya borç doğar:** 320 Satıcılar (Delta) 60.000 TL alacaklanır (pasif artışı).
- **Kasa/banka etkilenmez:** İşlem veresiye olduğundan nakit çıkışı yoktur; ödeme, ileride ayrı bir olayda kaydedilecektir.

---

# 11. Sık Yapılan Hatalar

| # | Hata | Nedeni | Gerçek hayattaki riski | Mentorun düzeltmesi |
|---|---|---|---|---|
| 1 | Malı **153 yerine 770** Genel Yönetim Gideri'ne yazmak | Alışı gider sanmak | Stok kayda girmez; maliyet ve KDV hatalı olur | "Bu bir tüketim gideri mi, yoksa satmak için aldığın ticari mal mı? Ne zaman gidere dönüşür?" |
| 2 | **191 İndirilecek KDV'yi unutmak** (60.000'i tek kalem yazmak) | KDV'yi matrahtan ayırmamak | İndirim hakkı kaybolur, KDV beyanı yanlış çıkar | "Faturada iki tutar var: mal bedeli ve KDV. Bunları aynı hesaba mı yazarsın?" |
| 3 | KDV'yi **391 Hesaplanan KDV**'ye yazmak | Alış-satış KDV'sini karıştırmak | Beyanname ters yönde etkilenir | "391'i satışta görürüz. Sen alıcısın — yüklendiğin KDV hangi hesap?" |
| 4 | Karşı hesabı **320 yerine 100/102** yapmak | Veresiyeyi peşin sanmak | Ödenmemiş borç kayıt dışı kalır, cari takip bozulur | "Ödemeyi bugün mü yaptın? Vade 30 gün — borç nerede durur?" |
| 5 | **Cari/muavin hesabı yanlış seçmek** (ana hesaba yazmak veya yanlış cari) | Muavin mantığını atlamak | Satıcı bazında borç izlenemez | "320 altında hangi satıcıya borçlusun? Kaydı hangi cariye bağlarsın?" |

---

# 12. Olay Varyasyonları

Bu olaydan türetilebilecek varyasyon adayları (üretilmeyecek, yalnızca liste):

- Peşin ticari mal alışı (karşı hesap 100/102)
- Farklı KDV oranlı alış (ör. %10, %1)
- İskontolu alış
- Alış iadesi
- Nakliye dahil alış
- Kısmi ödeme (bir kısmı peşin, kalanı veresiye)
- Vade farkı içeren alış
- Sürekli envanter yöntemiyle kayıt (aynı olayın alternatif varyantı)

---

# 13. Kazanılan Yetkinlikler

Olay tamamlandığında kullanıcı (XP değil, yetkinlik odaklı):

- Alış faturasını analiz edebilme
- Ticari mal ile gider ayrımını yapabilme
- İndirilecek KDV'yi tanıyıp yorumlayabilme
- Satıcı cari hesabını (muavin) doğru kullanabilme
- Veresiye alış kaydı oluşturabilme

Bu yetkinlikler olayın yetkinlik ağırlıklarıyla uyumludur (KDV 0.40, cari 0.20, belge okuma 0.20, yevmiye 0.20).

---

# 14. Sonraki Görev

Bu olaydan sonra önerilebilecek olaylar (öğrenme döngüsünü büyütür):

- Peşin mal alışı (nakit/banka ile ödeme)
- Satıcıya ödeme (320 borcunun kapatılması)
- İlk mal satışı ve satış faturası (600, 391 Hesaplanan KDV ile karşılaştırma)

Böylece kullanıcı "aldım → ödedim → sattım" zincirini bütünsel deneyimler.

---

# 15. Kalite Kontrol Listesi

KUR-001'in neden altın referans olduğunu gösteren kontrol listesi. Yeni her KUR içeriği bu listeye "Evet" verebilmelidir:

- [x] Gerçek bir işletme olayı var mı? (Atlas Market — Delta Tedarik alışı)
- [x] Gerçek belge var mı? (alış faturası, ALS2026-000147, gerçek alanlar)
- [x] Mevzuat olayın içinde mi? (KDVK 29/1, VUK 229 — olayla doğrudan)
- [x] Mentor düşündürüyor mu, cevap vermiyor mu? (yönlendiren örnek cümleler)
- [x] Muhasebe kaydı muavinli/carili mi? (153.01, 191.01, 320.001 → Delta cari)
- [x] Finansal etki açıklanıyor mu? (stok, KDV, satıcı borcu, nakit etkisizliği)
- [x] Sık hatalar açıklanıyor mu? (5 hata: neden + risk + mentor düzeltmesi)
- [x] Yetkinlik odaklı mı? (kazanımlar hesap ezberi değil, beceri)
- [x] Cevap anahtarı dengeli mi? (Σborç = Σalacak = 60.000)
- [x] Varyasyon ve sonraki görev tanımlı mı? (öğrenme döngüsü sürüyor)
