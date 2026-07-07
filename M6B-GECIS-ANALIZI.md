# M6b — Belge Verisi Geçiş Analizi (`sorular.belgeler` jsonb → `belgeler`)

**Sürüm:** 1.0 · **Tarih:** 7 Temmuz 2026
**Bağlı dokümanlar:** [M6-MIMARI-ANALIZ.md](M6-MIMARI-ANALIZ.md) · [ADR-V2.md](ADR-V2.md) (ADR-018 ek karar) · [M5-MIMARI-ANALIZ.md](M5-MIMARI-ANALIZ.md) (etiket-backfill dersi)
**Kapsam:** M6a'da kurulan normalize yapıya (`belgeler` + `olay_belgeleri`) mevcut `sorular.belgeler` jsonb'unun **kontrollü/raporlu** geçişinin analizi. **SQL / migration / kod içermez.**
**Statü:** Onaya sunuldu. Kritik bir "geçir mi / erteleme mi" kararı içeriyor.

---

## 0. M6b nedir + veri gerçeği

M6a yapıyı kurdu (backfill'siz). M6b, ADR-018 ek kararı gereği **ayrı ve kontrollü** olarak mevcut jsonb belgeleri normalize tabloya taşımayı değerlendirir. Bu analiz, taşımadan önce **gerçek veriyi ölçtü** — ve bulgu kararı değiştiriyor.

### Ölçülen durum (canlı, 7 Tem 2026)

| Metrik | Değer |
|---|---|
| Toplam jsonb belge | **59** (28 soruda) |
| Hepsi olaya bağlı mı (M5 `olay_id`) | **Evet** — `olay_belgeleri` bağlanabilir |
| Tür dağılımı | dekont **36**, fatura **20** (16 alış + 4 satış), senet **2**, perakende-fiş **1** |
| Farklı karşı taraf | **25** |
| Mevcut 6 cari ile unvan eşleşmesi | **0** |
| VKN taşıyan belge | 46/59 — ama VKN'ler büyük ölçüde **placeholder** |

### Veri kalitesi bulguları (kritik)
Bu içerik **Modül-1 (kuruluş/açılış)** verisidir ve semantik olarak gürültülüdür:

1. **Placeholder VKN:** `1234567890` onlarca farklı "unvan"da paylaşılıyor → VKN kimlik değil, dolgu.
2. **İşletme = karşı taraf hatası:** Senaryo şirketi "Pendik Dayanıklı A.Ş." **21 kez karşı taraf** olarak geçiyor (oysa işletmenin kendisi). Karşı taraf = *başka* bir varlık olmalı.
3. **Hesap etiketi = unvan hatası:** "Pendik Dayanıklı A.Ş. (Ticari Mal Stok)", "(Birikmiş Amortisman)", "(Satıcılar)", "Ortaklar Avansı", "Ortaklar Nakden Sermaye Ödemesi" — bunlar cari değil, **muhasebe hesabı/işlem açıklaması** unvan alanına düşmüş.
4. **`islemTuru` standart dışı:** `DekontIslemTuru` enum'unda 7 değer var; veride `SERMAYE_TAAHHUDU`, `AVANS_ODEME`, `ACILIS_FISI`, `ACILIS_KAYDI`, `"ACILIS_ kaydi"` (boşluk+küçük harf), `BLOKE_ISLEMI`, `ACILIS_DEKONTI`, `ACILIS_BAKIYESI`… ~19/36 dekont enum dışı; çoğu "açılış" türevi ve tutarsız.
5. **Açılış belgesi, fatura kılığında:** fatura kalemi "Ticari Mal Stok Açılışı" — normal alış/satış faturası değil, açılış kaydının belgesi. Ayrıca fatura'da **matrah/KDV/toplam saklanmıyor**, `kalemler`den hesaplanmalı.

**Özet teşhis:** Bu jsonb, temiz bir normalize tabloya *mekanik* taşınamaz. Taşınırsa `belgeler` tablosuna 25 çöp cari referansı, ~19 standart-dışı işlem türü, işletme-as-cari ve fatura-kılıklı-açılış kirliliği girer.

---

## 1. Haritalama analizi (mekanik geçiş yapılsaydı)

| Alan | Kaynak (jsonb) | Hedef (belgeler) | Zorluk |
|---|---|---|---|
| `belge_tipi` | `tur` (+`faturaTipi`) | fatura→`alis_faturasi`/`satis_faturasi`; dekont→`banka_dekontu`; senet→`senet`; perakende-fis→`perakende_fisi` | **Düşük** — deterministik |
| `belge_no` | faturaNo/dekontNo/senetNo/fisNo | belge_no | Düşük |
| `tarih` | tarih/islemTarihi/duzenlemeTarihi | tarih | Düşük |
| `toplam` | dekont: `tutar` ✓; fatura: **YOK → kalemlerden hesapla** (Σ miktar×birimFiyat×(1−iskonto)+KDV) | toplam | **Orta** — hesap + yuvarlama |
| `matrah`/`kdv_tutari` | fatura: kalemler+kdvOrani'den türet; dekont: yok | matrah/kdv_tutari | **Orta** |
| `yon` (normalize) | fatura faturaTipi→gelen/giden; dekont: `islemTuru`+borç/alacaktan **türet** | yon | **Yüksek** — islemTuru gürültülü |
| `meta` | dekont `yon:BORÇ/ALACAK`, islemTuru, valör, iban; fatura ettn; senet vade/borçlu | meta jsonb | Düşük (olduğu gibi taşı) |
| `satirlar` | kalemler | satirlar jsonb | Düşük |
| **`cari_id`** | karşı taraf unvan/vkn | cari_kartlar FK | **ÇOK YÜKSEK** — 0 eşleşme, gürültülü karşı taraf |
| `olay_belgeleri` | soru.olay_id + belge | M2M satır | Düşük — hepsi olay-bağlı |

**En zayıf iki halka:** `cari_id` (eşleşecek temiz cari yok, karşı taraflar gürültülü) ve `yon` türetimi (islemTuru standart dışı). Deterministik olmayan bu iki alan, "raporlu değil, best-effort" yapılırsa yanlış veri üretir.

---

## 2. Seçenekler

### Seçenek A — Tam mekanik geçiş (cari_id NULL + tam rapor)
59 belgeyi taşı: tip/no/tarih/toplam(hesapla)/meta/satirlar/olay_belgeleri deterministik; `cari_id` **NULL**; `yon` best-effort; standart-dışı `islemTuru` `meta`'ya olduğu gibi. Tüm karşı taraf + standart-dışı islemTuru **rapora** düşer. jsonb durur (dual-read).
- **Artı:** İçerik normalize tabloda görünür; olay_belgeleri dolu.
- **Eksi:** `belgeler` tablosu **gürültüyle kirlenir** (fatura-kılıklı açılış, işletme-as-cari kalıntısı, ~19 standart-dışı tip). Üretim kütüphanesine karışır. cari_id zaten boş → belge yarım.

### Seçenek B — Bulk geçişi ERTELE, ileriye-dönük doldur (ÖNERİLEN)
Gürültülü Modül-1 jsonb'unu **taşıma**. `belgeler` tablosu **yeni içerikle** (Olay Stüdyosu / Modül-1 yeniden yazımı, belge-önce) dolsun. Legacy jsonb frontend cutover'a (M11) kadar yerinde kalır; frontend zaten jsonb okuyor → **fonksiyonel kayıp yok**.
- **Artı:** Temiz tablo temiz kalır; sıfır kirlilik. Bu analiz zaten "rapor"dur — karar dokümante. M5 etiket dersiyle birebir.
- **Eksi:** olay_belgeleri şimdilik boş kalır (olay_yetkinlikleri/olay_muavinleri gibi — tutarlı). Modül-1 yeniden yazılana kadar normalize belge yok.

### Seçenek C — Küratörlü elle geçiş
28 soru insan gözüyle incelenir; gerçek karşı taraflar cari olarak açılır, belgeler temiz kurulur.
- **Artı:** En yüksek kalite.
- **Eksi:** Yüksek emek; içerik yakında yeniden yazılacaksa israf (Modül-1 zaten birkaç kez yeniden kuruldu).

---

## 3. Nihai öneri

**Seçenek B — bulk geçişi erteleyip `belgeler`'i ileriye-dönük doldurmak.**

Gerekçe:
1. **Fonksiyonel gereksizlik:** Frontend `sorular.belgeler` jsonb okuyor; taşımanın *bugün* hiçbir işlevsel getirisi yok. `belgeler`'in değeri (belge_analizi soru tipi, simülasyon belge kütüphanesi, OCR/AI) yeni içerikle doğar, bu legacy Modül-1 belgeleriyle değil.
2. **Kirlilik riski > değer:** Veri; placeholder VKN, işletme-as-cari, standart-dışı islemTuru, fatura-kılıklı açılış taşıyor. Bunu temiz tabloya sokmak, ADR-018'in "üretime açılmamış temiz katalog" ruhuna aykırı.
3. **İçerik uçuculuğu:** Modül-1 birkaç kez yeniden kuruldu (git geçmişi); bu belgeler yeniden yazılabilir. Geçici veriyi normalize etmek borç üretir.
4. **M5 emsali:** Etiket-backfill'i kötü eşleşince boşalttık. Aynı disiplin: kör/mekanik taşıma yanıltıcıdır.

**Bu, M6b'yi bir *migration* değil, bir *karar + rapor* yapar.** Bu doküman raporun kendisidir; M6b SQL'i **yazılmaz**. `belgeler`/`olay_belgeleri` boş kalır (M6a'daki gibi), yeni içerikle dolar.

### Fallback (kullanıcı bulk taşıma isterse): Seçenek A — ama izole
Eğer legacy görünürlüğü isteniyorsa, taşınan satırlar **işaretlensin** (örn. `belgeler.meta` içine `{"kaynak":"legacy-modul1","review":true}` veya ayrı bir `kaynak` alanı) ki üretim kütüphanesinden ayrışsın; `cari_id` NULL; tam karşı-taraf + islemTuru raporu üretilsin. Bu, kirliliği "karantinaya" alır ama tabloyu yine de doldurur.

---

## 4. Riskler

| # | Risk | Şiddet | Not |
|---|---|---|---|
| R1 | Seçenek A seçilirse `belgeler` üretim kütüphanesi legacy gürültüyle kirlenir | **Yüksek** | Fallback'teki `kaynak` işaretlemesi/karantina şart |
| R2 | `cari_id` her koşulda NULL → belgeler karşı-tarafsız yarım kalır | Orta | Karşı taraf ancak temiz cari küratörlüğüyle bağlanır (ayrı iş) |
| R3 | `yon` türetimi standart-dışı islemTuru'da yanlış olur | Orta | Best-effort değil; belirsiz olan `ic`/rapor |
| R4 | Erteleme (B) seçilirse olay_belgeleri uzun süre boş kalır | Düşük | Bilinçli; olay_yetkinlikleri/muavinleri ile aynı desen; frontend etkilenmez |
| R5 | fatura toplam hesabı (kalem×fiyat×iskonto+KDV) yuvarlama/eksik alan | Orta | Hesap yalnız Seçenek A'da gerekir; A seçilirse recompute+rapor |

---

## 5. Karar noktaları (senin onayın)

1. **Ana karar:** Seçenek **B (ertele, ileriye-dönük doldur — önerilen)** mi, Seçenek **A (izole/karantinalı taşı)** mı, yoksa **C (küratörlü)** mı?
2. B seçilirse: M6b SQL'i **yazılmaz**; bu doküman "rapor + karar" olarak commit'lenir. `belgeler` yeni içerikle dolacak.
3. A seçilirse: taşınan satırlar için **karantina işareti** (`kaynak`/`meta.review`) ister misin? `cari_id` NULL + tam rapor tasarlanır.

---

## Kapanış

M6b analizi, "önce ölç, sonra taşı" disiplininin neden değerli olduğunu gösterdi: mevcut belge jsonb'u temiz bir normalize migration için fazla gürültülü (Modül-1 kuruluş içeriği, placeholder VKN, işletme-as-cari, standart-dışı islemTuru, fatura-kılıklı açılış). **Öneri: bulk geçişi erteleyip `belgeler`'i temiz/yeni içerikle ileriye-dönük doldurmak** — M5 etiket dersinin belge tarafındaki karşılığı. M6a'nın kurduğu yapı hazır ve bekliyor; onu gürültüyle doldurmak yerine değerli içerikle doldururuz.
