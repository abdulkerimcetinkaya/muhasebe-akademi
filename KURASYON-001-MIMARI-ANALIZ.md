# Kürasyon-001 — Ticari Mal Alış Faturası · İçerik Tasarımı

**Sürüm:** 1.0 · **Tarih:** 8 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) · [M5](M5-MIMARI-ANALIZ.md)/[M6](M6-MIMARI-ANALIZ.md)/[M7](M7-MIMARI-ANALIZ.md)/[M8](M8-MIMARI-ANALIZ.md)/[M9](M9-MIMARI-ANALIZ.md)-MIMARI-ANALIZ
**Kapsam:** M5-M9 zincirinin uçtan uca çalıştığını kanıtlayacak **1 tam örnek muhasebe olayının** içerik tasarımı. **SQL / migration / apply / commit içermez** — yalnız tasarım.
**Statü:** **DONDURULDU (8 Temmuz 2026).** İçerik tasarımı kabul edildi. Sonraki aşama: bu dokümana referansla **içerik seed SQL taslağı** (sıra: mevzuat maddeleri → olay → yetkinlik → etiket → belge → cozum_basligi → cozum_satirlari → cozum_mevzuat).

---

## 0. Amaç + neden bu olay

V2'nin tüm yapısal iskeleti ayakta ama içerik katmanları boş (M5-M9 forward-fill). Bu kürasyon **tek bir olayı tam kurarak** (olay + belge + cevap anahtarı + yetkinlik + mevzuat + soru) M5→M9 zincirinin uçtan uca aktifleştiğini kanıtlar. "Ticari mal alış faturası" seçildi çünkü: (a) en temel ve sık olay, (b) üç muavin (153/191/320) M4'te **zaten seed**, (c) cari-bağlı hesap (320→Delta) muavin+cari zorunluluğunu (ADR-004/S0#4) test eder, (d) KDV → mevzuat bağı doğal.

### Hazır içerik (canlı, doğrulandı)
| Varlık | Değer |
|---|---|
| `153.01` Ticari Mallar | id `276f189d…` (cari_id null) |
| `191.01` İndirilecek KDV | id `b189026e…` (cari_id null) |
| `320.001` Delta Tedarik Ltd. Şti. | id `104c1e15…` (cari_id `473c5eaf…`, cari_gerektirir=true ✓) |
| Cari: Delta Tedarik | id `473c5eaf…`, tip=tedarikci |
| Yetkinlikler | belge-okuma, kdv, cari-hesap, yevmiye-kaydi (+muhasebe-temelleri) |
| Etiketler | belge, kdv, cari, genel-muhasebe |
| `alis_faturasi` belge tipi | aktif ✓ · `yevmiye_kaydi` soru tipi aktif ✓ |
| Normal bakiye | 153 borç, 191 borç, 320 alacak ✓ (kayıt yönüyle tutarlı) |

**Kürasyonun oluşturacağı YENİ içerik:** muhasebe_olayi, olay_yetkinlikleri, olay_etiketleri, belge, olay_belgeleri, cozum_basligi, cozum_satirlari, mevzuat_maddeleri (KDVK md.29 + VUK md.229 — **şu an boş**), cozum_mevzuat, soru instance.

---

## 0.1 Senaryo (somut)

> **İşletme, Delta Tedarik Ltd. Şti.'den 50.000 TL tutarında ticari mal satın aldı. %20 KDV uygulandı (10.000 TL). Ödeme 30 gün vadeli — veresiye. Karşılığında alış faturası düzenlendi.**

Tutarlar: matrah **50.000**, KDV **10.000**, toplam **60.000**. Yöntem: **aralıklı envanter** (varyant 1).

---

## 1. `muhasebe_olayi`

| Alan | Değer |
|---|---|
| id | `olay-mal-alis-veresiye-001` (admin-okunur) |
| baslik | Ticari Mal Alışı (Veresiye) |
| senaryo | *(0.1'deki anlatı)* |
| islem_tarihi | 2026-03-15 (kronoloji; simülasyona hazır) |
| zorluk | `orta` (kdv + cari + veresiye üç kavram) |
| ipucu | "Alışta yüklenilen KDV *indirilecek* KDV'dir; ödeme yapılmadıysa borç 320'de doğar." |
| durum | `onayli` |
| kaynak | `manuel` |
| isletme_id | null (global havuz — soru modu) |

---

## 2. `olay_yetkinlikleri` (XP dağıtımının kaynağı — ADR-009/015)

Ağırlıklar toplamı ≤ 1 (her biri 0<agirlik≤1):

| yetkinlik_id | agirlik | Gerekçe |
|---|---|---|
| kdv | 0.40 | Olayın merkezi kavramı (indirilecek KDV) |
| cari-hesap | 0.20 | Veresiye → tedarikçi cari takibi (320) |
| belge-okuma | 0.20 | Faturadan olay teşhisi |
| yevmiye-kaydi | 0.20 | Kayıt kurma + denge |
| **Toplam** | **1.00** | |

> **M9 aktivasyonu:** Bu satırlar M5'te boş bırakılan `olay_yetkinlikleri`'ni doldurur → `ilerleme_kaydet()` XP dağıtımı bu olayda **artık dormant değil**.

---

## 3. `olay_etiketleri` (filtre/keşif)

`belge`, `kdv`, `cari`, `genel-muhasebe` (M2 kataloğundan; küratörlü taksonomi olay düzeyinde — ADR-017).

---

## 4. Belge içeriği (`belgeler` + `olay_belgeleri`)

| Alan | Değer |
|---|---|
| belge_tipi | `alis_faturasi` |
| belge_no | ALS2026-000147 |
| tarih | 2026-03-15 |
| cari_id | `473c5eaf…` (Delta Tedarik — **karşı taraf = satıcı**) |
| yon | `gelen` (işletmeye gelen alış) |
| matrah | 50.000,00 |
| kdv_orani | 20,00 |
| kdv_tutari | 10.000,00 |
| tevkifat_orani / tutari | null (tevkifatsız) |
| toplam | 60.000,00 |
| para_birimi | TRY |
| satirlar (jsonb, gösterim) | `[{"aciklama":"Ticari Mal","miktar":100,"birim":"Adet","birim_fiyat":500,"iskonto":0}]` |
| meta (jsonb) | `{"ettn":"…","vade_gun":30}` |

**`olay_belgeleri`:** (olay-mal-alis-veresiye-001, bu belge, sira=1, rol=`ana`).

> **M6 aktivasyonu:** `belgeler` + `olay_belgeleri` ilk gerçek içeriğini alır. Belge = paylaşılan referans varlık (ADR-016); karşı taraf `cari_id` ile normalize.

---

## 5. `cozum_basligi` (cevap anahtarı başlığı — M7a/ADR-020)

| Alan | Değer |
|---|---|
| id | *(uuid, üretilecek)* |
| olay_id | olay-mal-alis-veresiye-001 |
| varyant | 1 |
| varyant_adi | Aralıklı envanter |
| aciklama (muhasebe mantığı) | "Ticari mal alışında mal bedeli 153'e borç yazılır. Yüklenilen KDV *indirilecek* KDV'dir (191, borç) — bu satışta hesaplanan KDV değildir. Ödeme yapılmadığından toplam borç 320 Satıcılar'da (Delta) alacak olarak doğar." |
| beyanname_etkileri (jsonb) | `[{"beyanname":"KDV1","satir":"İndirilecek KDV","etki":10000}]` |
| hata_kurallari (jsonb) | `[{"yanlis_kod":"391","mesaj":"Alışta 391 Hesaplanan KDV kullanılmaz; yüklenilen KDV 191 İndirilecek KDV'dir."},{"yanlis_kod":"153","dogru":"320","mesaj":"Veresiye alışta karşı hesap 320 Satıcılar'dır, kasa/banka değil."}]` |

---

## 6. `cozum_satirlari` (cevap anahtarı satırları — muavin_id NOT NULL, ADR-004/005)

| sira | muavin_id | muavin | borç | alacak |
|---|---|---|---|---|
| 1 | `276f189d…` | 153.01 Ticari Mallar | **50.000** | 0 |
| 2 | `b189026e…` | 191.01 İndirilecek KDV | **10.000** | 0 |
| 3 | `104c1e15…` | 320.001 Delta Tedarik | 0 | **60.000** |
| | | **Σ** | **60.000** | **60.000** |

**T-hesabı görünümü:**
```
        153 Ticari Mallar            191 İndirilecek KDV          320 Satıcılar (Delta)
     ┌──────────┬──────────┐     ┌──────────┬──────────┐     ┌──────────┬──────────┐
     │ B 50.000 │          │     │ B 10.000 │          │     │          │ A 60.000 │
     └──────────┴──────────┘     └──────────┴──────────┘     └──────────┴──────────┘
```

**M7 kısıt doğrulaması (hepsi geçer):**
- `muavin_id NOT NULL` ✓ (üçü de gerçek muavin; ana hesaba kayıt yapısal imkânsız — ADR-005)
- Denge trigger: Σborç=Σalacak=60.000 ✓
- Min-2-satır: 3 satır ✓
- Tek-taraflılık: her satır ya borç ya alacak ✓
- 320.001 cari-bağlı (cari_gerektirir=true → Delta cari'sine bağlı muavin) ✓

---

## 7. Mevzuat bağlantısı (`cozum_mevzuat` — M8/ADR-021)

`mevzuat_maddeleri`/`versiyonlari` **boş** → kürasyon önce **madde kimlik+versiyonunu oluşturur**, sonra bağlar:

**Yeni maddeler (kimlik + versiyon):**
| kaynak | madde_no | başlık | metin (özet) | effective_date |
|---|---|---|---|---|
| kdvk | 29/1 | Vergi İndirimi | "Mükellefler, faaliyetlerine ilişkin olarak yüklendikleri KDV'yi hesaplanan KDV'den indirebilir." | 1985-01-01 |
| vuk | 229 | Fatura | "Fatura, satılan emtia veya yapılan iş karşılığında müşterinin borçlandığı meblağı gösteren ticari vesikadır." | 1961-01-10 |

**`cozum_mevzuat` bağları** (cozum_basligi ↔ madde **kimliği**, versiyona değil):
| baslik_id | madde | aciklama |
|---|---|---|
| *(bu cozum)* | KDVK md.29/1 | "191 İndirilecek KDV'nin dayanağı — indirim hakkı." |
| *(bu cozum)* | VUK md.229 | "Kaydın dayanağı fatura belgesidir." |

> **M8 aktivasyonu:** İlk `mevzuat_maddeleri`/`versiyonlari` + `cozum_mevzuat`. Çözümün tıklanabilir, tarihe-duyarlı resmî dayanağı oluşur; etki analizi ("KDVK md.29 değişirse bu çözüm") artık mümkün.

---

## 8. Learning Engine'e yansıma (M9)

Öğrenci soruyu **doğru** çözünce `ilerleme_kaydet()` RPC'si:
1. `ilerleme` satırı yazar (dogru_mu=true, kazanilan_puan).
2. soru→olay→`olay_yetkinlikleri` zinciriyle XP dağıtır. **İlk doğru** olduğundan (idempotency):

| yetkinlik | agirlik | XP (= round(base × agirlik), base=orta=10) | dogru_sayisi |
|---|---|---|---|
| kdv | 0.40 | **4** | +1 |
| cari-hesap | 0.20 | **2** | +1 |
| belge-okuma | 0.20 | **2** | +1 |
| yevmiye-kaydi | 0.20 | **2** | +1 |
| | | **Σ 10 XP** | |

- İkinci doğru çözüm → XP **yazmaz** (guard); dogru_sayisi yine artar.
- Yanlış çözüm (örn. 391 kullanımı) → `hata_kurallari` geri bildirimi + `yanlis_sayisi++`.
- `kullanici_yetkinlik_durum` view'ı seviye/başarı oranını türetir; yeterli yanlışta `kullanici_zayif_alan`'da görünür.

> **M9 aktivasyonu:** `olay_yetkinlikleri` (§2) dolduğundan XP fiilen akar — dormant değil.

---

## 9. Soru instance (olayı çözülebilir kılan — M5/ADR-008)

Olaydan bir soru türetilir (öğrenci bunu çözer):
| Alan | Değer |
|---|---|
| olay_id | olay-mal-alis-veresiye-001 |
| tip | `yevmiye_kaydi` (aktif) |
| destek_seviyesi | `standart` |
| baslik/senaryo | olaydan miras (override yok) |
| unite_id | Mal Alış ünitesi |

İleride aynı olaydan `hata_bulma` (391 çeldiricisi hazır — §5 hata_kurallari) ve `coktan_secmeli` tipleri **ek senaryo yazmadan** türetilir (ADR-002/008 — içerik merkezliliğin ilk somut getirisi).

---

## 10. Uçtan uca zincir — kanıt

```
BELGE (alis_faturasi, Delta)                         → M6
  ↓ teşhis
OLAY (mal-alis-veresiye) + yetkinlik + etiket        → M5 (+M2)
  ↓ öğrenci çözer (soru: yevmiye_kaydi)              → M5 soru
KONTROL (yevmiye vs cozum_satirlari)                 → M7 cevap anahtarı
  ↓ dogru_mu
ilerleme_kaydet() → XP → kullanici_yetkinlikleri     → M9
  ↓ dayanak
cozum_mevzuat → KDVK 29 / VUK 229                    → M8
```

**Her katman ilk gerçek içeriğini alır ve kısıtları (muavin zorunlu, denge, cari zorunlu, RLS, XP idempotency) gerçek veriyle doğrular.**

---

## 11. Açık notlar / riskler

| # | Not | |
|---|---|---|
| N1 | **Mevzuat maddeleri önce oluşturulmalı** — cozum_mevzuat FK'sı için KDVK md.29 + VUK md.229 kimlik+versiyonu şart. Kürasyon sırası: madde → cozum_mevzuat. | Sıra |
| N2 | **Uygulama sırası (yazılırken):** cari(var) → muavin(var) → belge → olay → olay_yetkinlikleri/etiketleri/belgeleri → cozum_basligi → cozum_satirlari (denge deferred, tek transaction) → mevzuat_maddeleri/versiyonlari → cozum_mevzuat → soru. | Sıra |
| N3 | **Denge:** cozum_satirlari tek transaction'da 3 satır (deferred trigger commit'te kontrol). | M7a |
| N4 | **islem_tarihi 2026-03-15 < mevzuat effective_date** kontrolü: KDVK 29 (1985) / VUK 229 (1961) < 2026 → geçerli versiyon çözümlenir ✓ | M8 |
| N5 | Bu kürasyon **elle mi, seed script mi, Olay Stüdyosu mu** ile girilecek? MVP'de elle SQL/seed; Olay Stüdyosu (S7) sonra. | Yöntem |

---

## Kapanış

Bu kürasyon, "içerik merkezlilik"in (ADR-002/007) ilk somut kanıtıdır: tek olay bir kez tam kurulur, ondan soru(lar) türer, çözülünce M6→M5→M7→M9→M8 zinciri uçtan uca akar. Yapı (M5-M9) hazırdı; bu içerikle **aktif** olduğu gösterilir. Muhasebe doğruluğu (153/191 borç, 320 alacak, indirilecek KDV, veresiye) ve tüm DB kısıtları (muavin zorunlu, denge, cari zorunlu, XP idempotency) gerçek veriyle doğrulanır.

**Sonraki adım:** Onayın gelirse bu olayın **içerik SQL'i / seed'i** hazırlanır (M-serisi akışı: taslak → dry-run → onay → apply → uçtan uca test: öğrenci çözer, XP akar, mizan bakiyesi doğrular). Ya da önce **Olay Stüdyosu** yöntemini tartışırız. Bu doküman içeriğin *tasarımını* dondurur.
