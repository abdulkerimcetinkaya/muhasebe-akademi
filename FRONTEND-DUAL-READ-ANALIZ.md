# Frontend Dual-Read Analizi — Legacy `cozumler` vs V2 `cozum_satirlari`

**Sürüm:** 1.0 · **Tarih:** 9 Temmuz 2026
**Bağlı dokümanlar:** [LEGACY-ICERIK-ENVANTER.md](LEGACY-ICERIK-ENVANTER.md) · [M7-MIMARI-ANALIZ.md](M7-MIMARI-ANALIZ.md) · [M9-MIMARI-ANALIZ.md](M9-MIMARI-ANALIZ.md) · [KURASYON-001-MIMARI-ANALIZ.md](KURASYON-001-MIMARI-ANALIZ.md)
**Kapsam:** Frontend'in eski `cozumler` yapısı ile yeni `cozum_basliklari`/`cozum_satirlari` yapısını ayırmasının tasarımı. **SQL / migration / apply / commit / kod yazımı içermez** — yalnız analiz.

---

## 0. Kritik çekirdek bulgu

Frontend'in tüm cevap-anahtarı tüketicileri (`kontrol.ts` → `yanlisAnaliziYap`, `SoruEkrani` → `kontrol()`, `CozumModal`) tek bir veriyi okur: **`soru.cozum` = `CozumSatir[]` (`{kod, borc, alacak}`)**. Bu diziyi **`uniteler-loader.ts` doldurur** (legacy `cozumler` tablosundan, `cozumById[soru_id]`).

**Sonuç:** Dual-read'in kalbi **yalnız loader'dadır**. Loader `soru.cozum`'u doğru kaynaktan doldurursa (V2 → `cozum_satirlari` muavin kodlarına map'lenmiş; legacy → mevcut `cozumById`), **`kontrol.ts`/`SoruEkrani`/`CozumModal` hiç değişmez.** V2 cevap anahtarı `{muavin_id, borc, alacak}` → `{kod, borc, alacak}`'a map edilir (muavin_hesaplar.kod), yani kontrol.ts'in beklediği şekle girer.

---

## 1. Mevcut soru listeleme KUR-001'i gösteriyor mu?

**Evet — ama bozuk.** `uniteler-loader.ts` soruları `durum='onayli'` ile yükler; KUR-001 (`soru-mal-alis-veresiye-001`, onaylı, ünite `mal-alis-satis`) listeye **girer**. Ancak:
- `cozumById['soru-mal-alis-veresiye-001']` → **undefined** (legacy `cozumler`'de yok) → `soru.cozum = []` (boş cevap anahtarı).
- `kontrol.ts`: `hepsiDogru = ... && userRows.length === cozumRows.length(0)` → kullanıcı ne girerse girsin **eşleşme yok**; boş anahtara karşı kontrol anlamsız.
- Belge: `sorular.belgeler` jsonb boş (belge `belgeler` tablosunda) → belge görünmez.
- Muavin: `sorular.muavinler` jsonb boş → soru-yerel muavin yok (global fallback var).

**Yani KUR-001 listede görünür, açılır, ama çözülemez/kontrol edilemez.** Bu, LEGACY-ICERIK-ENVANTER §7'deki "KUR-001 kırık" bulgusunun kod-düzeyi kanıtı.

---

## 2. `kontrol.ts` eski `cozumler`'e nasıl bağlı?

**Doğrudan bağlı değil — saf fonksiyon.** `kontrol.ts` (`satirlariKontrolEt`, `yanlisAnaliziYap`) parametre olarak `cozumRows: CozumSatir[]` alır; tabloya erişmez. Bağ zinciri:
```
uniteler-loader.ts: supabase.from('cozumler') → cozumById[soru_id] → soru.cozum
SoruEkrani.kontrol(): yanlisAnaliziYap(kayitlar, soru.cozum, birlesikMuavinler)
```
`kontrol.ts` kod-tabanlı çalışır (`kodEsler`): tam eşleşme + (legacy) ana-hesap→muavin prefix kabulü. **V2'de beklenen kod zaten muavin (153.01) olduğundan `kodEsler` doğal olarak muavin-düzeyi eşleşme zorlar** (ana hesap kabulü yalnız beklenen 3-haneliyken devreye girer) — bu ADR-005 ile uyumlu bir yan etki.

---

## 3. Yeni V2 cevap anahtarı nereden okunmalı?

```
cozum_satirlari  ⋈ cozum_basliklari (baslik_id)      [hangi çözüm]
                 ⋈ muhasebe_olaylari (olay_id)         [soru.olay_id ile eşleş]
                 ⋈ muavin_hesaplar (muavin_id → kod)   [kontrol.ts kod bekliyor]
→ map → { kod: muavin.kod, borc, alacak }   (varyant=1; ileride varyant seçimi)
```
Yani loader, `soru.olay_id` üzerinden `cozum_basliklari` (varyant 1) → `cozum_satirlari` → `muavin_hesaplar.kod` çekip **legacy `cozumById` ile aynı `{kod,borc,alacak}` şekline** map'ler. KUR-001 için sonuç: `[{153.01,B50k},{191.01,B10k},{320.001,A60k}]`.

**Varyant notu:** MVP'de varyant=1 alınır; çoklu varyant (7/A-7/B) ileride "kabul edilen çözümlerden biri" mantığıyla (her varyanta karşı kontrol, biri tutarsa doğru).

---

## 4. V2 içerik ile legacy içerik nasıl ayrıştırılmalı?

**Ayırt edici:** Sorunun olayında **`cozum_basliklari` var mı?**
- Var → **V2 yol** (yeni cevap anahtarı, belge tablosu, olay_muavinleri, ilerleme_kaydet).
- Yok → **legacy yol** (eski `cozumler`, `sorular.belgeler`/`muavinler` jsonb, doğrudan ilerleme).

**Loader'da uygulama:**
1. `SORU_LISTE_KOLONLARI`'na **`olay_id, tip`** ekle.
2. `cozum_basliklari` (varyant 1) + `cozum_satirlari` + `muavin_hesaplar.kod` yükle → `v2CozumByOlay[olay_id]` map'i kur.
3. Her soru için: `v2CozumByOlay[soru.olay_id]` varsa **onu** kullan, yoksa `cozumById[soru.id]` (legacy).

Bu, mevcut `cozumById` deseninin yanına ikinci bir map eklemek + soru başına dallanmaktır (tek dosya, ~loader).

---

## 5. KUR-001 açılmadan önce minimum frontend değişikliği

**Katman 1 — "Kırık değil" (zorunlu minimum):** *loader cevap-anahtarı dual-read.*
- `uniteler-loader.ts`: `olay_id` kolonu + `cozum_basliklari`/`cozum_satirlari`/muavin-kod yüklemesi + `soru.cozum`'u V2/legacy'ye göre doldurma.
- **Önbellek sürümü** artır (`mli_uniteler_cache_v14` → `v15`) — yeni alanlar için.
- `kontrol.ts`, `SoruEkrani`, `CozumModal`: **değişmez** (hepsi `soru.cozum` tüketiyor).
- Sonuç: KUR-001 çözülebilir + kontrol edilebilir (cevap anahtarı doğru).

**Katman 2 — Belge görünürlüğü:** *belge dual-read.*
- `soruBelgeleriniYukle`: V2 ise `belgeler`⋈`olay_belgeleri` → `Belge` union'a map; değilse mevcut `sorular.belgeler` jsonb.
- KUR-001 senaryosu tutarları metinde taşıdığından soru belgesiz de çözülebilir; ama belge-merkezli öğrenme (ADR-003) için gerekli.

**Katman 3 — XP akışı (M9):** *ilerleme_kaydet() geçişi* (§6).

**Minimum-viable KUR-001 için Katman 1 yeterli.** Katman 2-3 tam deneyim için.

---

## 6. M9 `ilerleme_kaydet()` çağrısı nereye bağlanmalı?

**Mevcut:** `ilerleme-supabase.ts → soruCozumKaydetSupabase()` doğrudan `supabase.from('ilerleme').insert(...)` yapar (+ aktivite upsert). Çağrı zinciri: `SoruEkrani.kontrol()` doğru → `onCozuldu` → App handler → `soruCozumKaydetSupabase`.

**Değişiklik:** `soruCozumKaydetSupabase` içindeki doğrudan insert'i **`supabase.rpc('ilerleme_kaydet', {_soru_id, _dogru_mu:true, _sure_saniye, _kullanilan_ai, _cozum_gosterildi, _kazanilan_puan})`** ile değiştir; **aktivite upsert'i koru** (RPC aktivite yazmaz). `yanlisKaydetSupabase` da RPC'ye geçebilir (`_dogru_mu:false` → yanlis_sayisi++).

**Kapsam:** RPC **hem legacy hem V2** için güvenli — legacy sorunun olayı wrapper (olay_yetkinlikleri boş) → XP no-op, yalnız ilerleme yazılır. V2'de XP akar. Yani **evrensel geçiş** (tüm çözümler RPC'den) temiz; legacy'de davranış değişmez, V2'de XP kazanılır.

**Not:** Puan hesabı frontend'de kalır (`puanHesapla`/`ZORLUK_PUAN`) ve `_kazanilan_puan` olarak geçilir (motivasyon katmanı); XP dağıtımı RPC içinde zorluk-base'inden bağımsız hesaplanır (ADR-009).

---

## 7. Riskler ve geçiş planı

| # | Risk | Önlem |
|---|---|---|
| R1 | **Önbellek bayatlığı** — eski cache V2 alanlarını taşımaz | `UNITELER_CACHE_KEY` sürüm artışı (v14→v15); eski cache otomatik geçersiz |
| R2 | **olay_muavinleri boş** (KUR-001'de seed edilmedi) → V2 muavin dropdown evreni yok | Fallback: global `muavin_hesaplar` (KUR-001'in 153.01/191.01/320.001'i global'de var). İleride kürasyon `olay_muavinleri` ekler (scoped dropdown) |
| R3 | **Belge dual-read atlanırsa** V2 soru belgesiz görünür | Katman 2; senaryo metni tutarları taşıdığından çözüm bloklanmaz (kırık değil, eksik) |
| R4 | **Varyant** — MVP tek varyant; çoklu varyant kontrolü yok | Varyant=1 al; çoklu varyant "biri tutarsa doğru" mantığı ileride |
| R5 | **kontrol.ts katılığı** — V2'de ana-hesap kabul edilmez | İstenen davranış (ADR-005); V2 anahtarı muavin kodlu → doğal muavin-zorunluluğu |
| R6 | **ilerleme_kaydet evrensel geçiş** legacy davranışını bozar mı | Bozmaz — legacy olay wrapper'ı olay_yetkinlikleri'siz → XP no-op, ilerleme aynen yazılır |
| R7 | **Yeni loader sorguları performans** (2 ek tablo) | cozum_basliklari/satirlari küçük (içerik ölçeği); tek Promise.all'a eklenir |

### Geçiş planı (aşamalı)
1. **Katman 1 (loader dual-read + cache bump)** → KUR-001 çözülebilir. *Tek başına V2 içeriği "kırık değil" yapar.*
2. **Katman 2 (belge dual-read)** → belge-merkezli deneyim.
3. **Katman 3 (ilerleme_kaydet RPC geçişi)** → XP akışı (M9 aktif).
4. **Test:** KUR-001'i gerçek kullanıcıyla çöz → kontrol doğru + (Katman 3) XP `kullanici_yetkinlikleri`'ne aktı mı.
5. **Legacy regresyon:** 70 legacy soru aynen çalışıyor mu (soru.cozum legacy'den geliyor).

Her katman bağımsız commit; Katman 1 kritik yol (V2 içeriğin görünürlük ön koşulu).

---

## Özet

| Soru | Yanıt |
|---|---|
| 1. Listeleme KUR-001'i gösteriyor mu | Evet ama **bozuk** (cozum boş) |
| 2. kontrol.ts eski cozumler'e bağı | Saf fonksiyon; **loader** legacy cozumler'den `soru.cozum` doldurur |
| 3. V2 anahtarı nereden | `cozum_satirlari⋈cozum_basliklari(olay_id)⋈muavin_hesaplar` → `{kod,borc,alacak}` |
| 4. Ayrıştırma | Olayında `cozum_basliklari` var mı → V2/legacy; **loader dallanır** |
| 5. Minimum değişiklik | **Loader cevap-anahtarı dual-read + cache bump** (kontrol.ts/SoruEkrani değişmez) |
| 6. ilerleme_kaydet nereye | `soruCozumKaydetSupabase` → doğrudan insert yerine `rpc('ilerleme_kaydet')`, aktivite korunur; evrensel güvenli |
| 7. Riskler/plan | Cache/belge/varyant/olay_muavinleri; 3 katmanlı aşamalı geçiş |

**Çekirdek karar:** Dual-read'in yükü **yalnız `uniteler-loader.ts`'de**. `soru.cozum` doğru kaynaktan dolunca kontrol/ekran/modal dokunulmaz — minimum, düşük riskli. KUR-001'i kullanıcıya güvenle açmak için **Katman 1 zorunlu ön koşul**; belge (K2) ve XP (K3) ardışık iyileştirmeler.

**Sonraki adım:** Bu analiz onaylanırsa, ilk uygulama işi **Katman 1 (loader dual-read)** — kod değişikliği (ayrı frontend commit'i). Bu doküman tasarımı dondurur; kod yazımı ayrı onayla.
