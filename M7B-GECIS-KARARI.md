# M7b — Çözüm Verisi Geçiş Kararı (legacy `cozumler` → `cozum_satirlari`)

**Sürüm:** 1.0 · **Tarih:** 7 Temmuz 2026
**Bağlı dokümanlar:** [M7-MIMARI-ANALIZ.md](M7-MIMARI-ANALIZ.md) · [ADR-V2.md](ADR-V2.md) (ADR-004/005/019/020) · [M6B-GECIS-ANALIZI.md](M6B-GECIS-ANALIZI.md) (belge tarafındaki emsal)
**Kapsam:** M7a'da kurulan cevap anahtarı yapısına (`cozum_basliklari` + `cozum_satirlari`) mevcut legacy `cozumler` verisinin geçişinin **kararı**. **Migration / SQL / backfill / muavin terfisi içermez.**
**Statü:** Karar dokümanı. M8'e geçişi bloklamaz.

---

## 0. M7b nedir

M7a cevap anahtarının **temiz normalize yapısını** kurdu (backfill'siz). M7b, mevcut legacy `cozumler` verisinin (256 satır) bu yapıya taşınıp taşınmayacağının kararıdır. Ölçüm, mekanik taşımanın **yapılmaması gerektiğini** gösteriyor — M6b belge kararının çözüm tarafındaki karşılığı. Bu doküman raporun kendisidir; **M7b migration üretmez.**

---

## 1. Ölçülen mevcut veri (canlı, 7 Tem 2026)

| Metrik | Değer | Yorum |
|---|---|---|
| Legacy `cozumler` satırı | **256** (grain = satır) | 70 soru için cevap anahtarı |
| Kod formatı | **256/256 muavin-formatlı** (`^\d{3}\.`) | Sıfır ana-hesap → ADR-005 veride zaten sağlı |
| **Denge** | **bozuk soru = 0** | Tüm cevap anahtarları Σborç = Σalacak ✓ (veri "temiz") |
| Farklı muavin kodu | **25** | |
| Global `muavin_hesaplar`'da olan | **9/256 satır** (yalnız `120.001`, `320.001`) | 247 satır soru-yerel muavine bağlı |
| **Cari-gerektiren, terfi edilemeyen kod** | **8** | `102.001, 102.002, 102.003, 121.001, 300.001, 321.001, 331.002, 360.001` — M4 `muavin_cari_zorunlu` trigger'ı `cari_id`'siz açtırmaz; `sorular.muavinler` jsonb'unda cari yok |
| **Aynı kod, farklı ad (çakışma)** | **7 kod** | `102.001 (3 ad), 500.001 (3), 500.002 (3), 500.003 (3), 501.001 (2), 501.002 (2), 501.003 (2)` — soru-yerel ad-alanı çakışması |

**Önemli ikilik:** Veri *hesaben* temiz (muavin-formatlı, dengeli) ama muavin *kimliği* soru-yerel ve global tutarsız. Mekanik terfi bu tutarsızlığı global tabloya taşır.

---

## 2. Neden mekanik geçiş yapılamaz — mapping çıkmazı

`cozum_satirlari.muavin_id` **NOT NULL FK** (ADR-004/005). Bir legacy satırı taşımak için, kodunun global `muavin_hesaplar`'da bir satıra karşılık gelmesi şart. Bu iki noktada kırılıyor:

1. **Ad-alanı çakışması (7 kod):** `500.001` global tabloda tek satır olabilir (`unique(isletme_id, olusturan_user_id, kod)`), ama 3 farklı sermaye ortağını temsil ediyor. Aynı kodu 3 farklı ad'la global yapamayız. Otomatik dedup (kod+ad) bunları **çakışma** olarak işaretler; birleştirme yapılamaz → doğru muavin belirsiz.
2. **Cari zorunluluğu bloğu (8 kod):** `102.001` (Bankalar), `320`/`321` (Satıcılar), `360` (Ödenecek vergiler) gibi `cari_gerektirir=true` hesapların muavini `cari_id` olmadan **açılamaz** (M4 trigger). `sorular.muavinler` jsonb'unda `{kod, ad}` var, cari yok → `cari_id` üretilemez.

İki sorun örtüşüyor (`102.001` hem çakışma hem cari-blok). Sonuç: **25 kodun en az 15'i temiz terfi edilemez.**

---

## 3. Karar

| # | Karar |
|---|---|
| 1 | **Legacy `cozumler` korunacak** — 256 satır aynen kalır (M11'e kadar). |
| 2 | **`kontrol.ts` legacy veriyle çalışmaya devam edecek** — mevcut 70 soru bozulmaz (dual-read). |
| 3 | **Yeni içerik `cozum_basliklari` + `cozum_satirlari`'nı dolduracak** — ileriye-dönük, belge-önce, doğru global muavinlerle (Olay Stüdyosu / yeniden yazım). |
| 4 | **Mevcut 256 satır mekanik backfill EDİLMEYECEK** — soru-yerel muavinler global tabloya terfi edilmeyecek. |

`cozum_basliklari` / `cozum_satirlari` şimdilik **boş** kalır (M6a belge yapısı gibi, tutarlı desen).

---

## 4. Gerekçe

1. **Aynı muavin kodu farklı anlamlarda kullanılmış** (7 kod, ör. `500.001` üç farklı ortak) → global namespace'e tek kimlikle taşınamaz.
2. **Cari gerektiren kodlar `cari_id` olmadan terfi edilemez** (8 kod) → M4 trigger'ı yapısal olarak reddeder; jsonb'da cari bilgisi yok.
3. **Kısmi terfi veri bütünlüğünü bozar** → 25 kodun 10'unu taşıyıp 15'ini bırakmak, cevap anahtarını yarım ve tutarsız bırakır; `cozum_satirlari.muavin_id NOT NULL` bu satırları zaten kabul etmez.
4. **Cevap anahtarında yanlış muavin üretmek, kullanıcı doğrulamasını hatalı hale getirir** → `kontrol.ts` (yeni) cevap anahtarına karşı doğrular; yanlış/uydurma muavin, her öğrenciyi haksız "yanlış"a düşürür (ADR-005'in "dengesiz cevap anahtarı" riskinin muavin-kimliği versiyonu).
5. **Fonksiyonel gereksizlik** → `kontrol.ts` legacy `cozumler` kolonlarını okuyor; backfill *bugünkü işlev için* gerekmiyor (M6b belge ile aynı mantık).
6. **İçerik uçuculuğu** → Modül-1 birkaç kez yeniden kuruldu (git geçmişi); geçici veriyi kirli biçimde normalize etmek borç üretir.

---

## 5. Değerlendirilen alternatifler (neden reddedildi)

| Alternatif | Neden reddedildi |
|---|---|
| **A — Tam mekanik terfi + backfill** | 8 cari-blok + 7 çakışma yüzünden mümkün değil; zorlanırsa trigger reddeder / yanlış muavin üretir |
| **B — Kısmi terfi (temiz ~10 kod) + rapor** | Cevap anahtarını yarım bırakır; `muavin_id NOT NULL` kalan satırları kabul etmez; tabloyu kirletir |
| **C — Küratörlü elle geçiş** | Yüksek emek; içerik yeniden yazılacaksa israf; ayrı cari kartları + doğru global muavin kodlaması gerektirir (aslında "yeniden yazım"a eşdeğer) |
| **D (SEÇİLEN) — Erteleme, ileriye-dönük doldurma** | En temiz; legacy korunur, `kontrol.ts` çalışır, yeni yapı doğru içerikle dolar |

---

## 6. Sonuç

- **M7b bir karar/rapor dokümanıdır** — bu dosyanın kendisi.
- **Migration üretmeyecek** — SQL/backfill/terfi yok.
- **M8'e geçişi BLOKLAMAZ** — M8 (Mevzuat: `cozum_mevzuat` M2M) `cozum_basliklari`'na bağlanır; yapı hazır. Mevzuat bağı yeni içerikle birlikte kurulur; legacy backfill'e bağımlı değil.
- **Legacy temizliği M11'de** — `cozumler` (ve tüm dual-read kolonları) frontend cutover sonrası düşürülür.

---

## Kapanış

M7a temiz cevap anahtarı yapısını verdi; M7b onu **gürültüyle değil, doğru içerikle** doldurma kararıdır. Mevcut çözüm verisi *hesaben* temiz olsa da muavin *kimliği* soru-yerel ve global tutarsız (7 çakışma + 8 cari-blok); mekanik terfi cevap anahtarına yanlış muavin sokar ve kullanıcı doğrulamasını bozar. M6b belge kararının çözüm tarafındaki ikizidir: **ölç, kirliyse taşıma, ileriye-dönük yeniden yaz.** Legacy `cozumler` + `kontrol.ts` M11'e kadar dokunulmadan çalışır.
