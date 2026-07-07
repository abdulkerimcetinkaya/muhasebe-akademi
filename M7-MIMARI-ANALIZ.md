# M7 — Çözümler Modülü · Mimari Analiz

**Sürüm:** 1.0 · **Tarih:** 7 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) (ADR-002/004/005/006/008/009/012/016) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) (§2.2, §2.3, §12) · [M5-MIMARI-ANALIZ.md](M5-MIMARI-ANALIZ.md) · [M6-MIMARI-ANALIZ.md](M6-MIMARI-ANALIZ.md)
**Kapsam:** M7 (Çözümler) migration'ının mimari değerlendirmesi. **SQL / kod / frontend içermez.**
**Statü:** Onaya sunuldu. M7 V2'nin **tek kırıcı** migration'ıdır — en yüksek dikkat.

---

## 0. En kritik netlik: `cozumler` = CEVAP ANAHTARI, kullanıcının cevabı DEĞİL

Görevdeki soruların bir kısmı ("kullanıcı çözüm oluştururken", "öğrenci düzenleyebilir mi", "aynı olaya birden fazla çözüm", "puan çözüm tablosunda mı") iki **ayrı** kavramı karıştırıyor. M7'nin anayasası bu ayrımdır:

| Kavram | Nedir | Nerede yaşar | Kim üretir |
|---|---|---|---|
| **Cevap anahtarı** | Olayın *doğru* yevmiye kaydı (referans) | `cozumler` + `cozum_satirlari` (olay aggregate'i) | İçerik üreticisi/admin |
| **Kullanıcının cevabı — soru modu** | Öğrencinin denemesi + sonucu | `ilerleme` (dogru_mu, süre) — mevcut tablo | Öğrenci |
| **Kullanıcının cevabı — simülasyon** | Öğrencinin yazdığı yevmiye | `yevmiye_kayitlari` + `yevmiye_satirlari` (M10, append-only) | Öğrenci |

**`cozumler`/`cozum_satirlari` M7'de KULLANICININ ÇÖZÜMÜNÜ TUTMAZ.** O, olayın cevap anahtarıdır (ADR-008: "cevap anahtarı tek kaynak `cozum_satirlari`; tüm validator'lar buradan beslenir"). Kullanıcı bir soruyu çözdüğünde `kontrol.ts` cevabını bu anahtara karşı **deterministik** doğrular (ADR-012, AI değil), sonuç `ilerleme`ye yazılır. Kullanıcının kalıcı yevmiye üretimi simülasyonda `yevmiye_satirlari`'dır (M10).

Bu netlik olmadan M7 yanlış modellenir (kullanıcı-başına cozum satırı → ölçek patlaması + ilerleme ile çift kayıt, V2-VERI-MODELI §11 satır 6). **M7 yalnız cevap anahtarını kurar.**

---

## 0.1 Ölçülen veri gerçeği (canlı, 7 Tem 2026) — M6b'nin tersine TEMİZ

| Metrik | Değer | Anlamı |
|---|---|---|
| Mevcut `cozumler` satırı | **256** (grain = satır) | Küçük — içerik ölçeği |
| Çözüm taşıyan soru | **70/70** | Hepsi cevap anahtarlı ve olay-bağlı (M5) |
| Kod formatı | **256/256 muavin-formatlı** (`^\d{3}\.`) | **Sıfır ana-hesap kodu** → ADR-005 veride zaten sağlı |
| Denge bozuk soru | **0** | Bütün cevap anahtarları Σborç=Σalacak ✓ |
| Farklı muavin kodu | **25** | |
| Global `muavin_hesaplar`'da olan | **9/256 satır** | 25 kodun çoğu `sorular.muavinler` jsonb'unda **soru-yerel** |

**M6b ile kontrast:** Belge verisi çöptü (erteledik). Çözüm verisi **temiz**: muavin-formatlı, dengeli, olay-bağlı. Üstelik `kontrol.ts` bu veriye **bağımlı** (dual-read zorunlu). Bu yüzden M7 backfill'i **erteleme değil, yapılmalı** — ama dikkatle.

---

## 1. Ürün Mimarisi

- **Kullanıcı çözüm oluştururken sistem nasıl çalışmalı?** Kullanıcı *cevap anahtarı üretmez*. Soru modunda muavin dropdown'ından satır kurar → `kontrol.ts` cevap anahtarına (`cozum_satirlari`) karşı doğrular → `ilerleme`. Cevap anahtarını admin/içerik üreticisi kurar (Olay Stüdyosu, S7).
- **Çözüm tek kayıt mı olmalı?** Cevap anahtarı olay başına **1..N varyant** (alternatif geçerli çözümler: aralıklı vs sürekli envanter, 7/A vs 7/B). `unique(olay_id, varyant)`. Her varyant bir başlık (`cozumler`) + N satır (`cozum_satirlari`).
- **Aynı olaya birden fazla çözüm?** — *İki anlam:* (a) **Cevap anahtarı:** evet, `varyant` ile (authored alternatifler). (b) **Kullanıcı:** kullanıcı olayı defalarca deneyebilir ama bu `ilerleme` kayıtlarıdır (soru) / `yevmiye_kayitlari` (sim), **`cozumler` satırı değil.**
- **Taslak çözüm gerekli mi?** Hayır ayrı bir kavram olarak. Cevap anahtarının onay durumu **olaydan** miras alınır (`muhasebe_olaylari.durum`). Olay aggregate'i onaylıysa çözümü de tam olmalı (aggregate tutarlılığı). Kullanıcı tarafında soru modu "taslak" tanımaz (gönder→kontrol); sim modunda yevmiye append-only (kaydedilmiş, ters kayıtla düzeltilir).
- **Öğrenci çözümünü sonradan düzenleyebilir mi?** Cevap anahtarını hayır (o içerik). Kendi denemesini: soru modunda tekrar çözebilir (yeni `ilerleme`); sim modunda **silmez, ters kayıtla düzeltir** (gerçek muhasebe pratiği — ADR-005/010, `yevmiye_kayitlari` append-only).
- **Atölye ve sınav aynı modeli kullanabilir mi?** Evet. İkisi de aynı cevap anahtarını (`cozum_satirlari`) doğrulama kaynağı olarak kullanır; fark *kompozisyon ve zamanlama* (ADR-008: "sınav modu yeni tip değil, tiplerin zamanlı kompozisyonu"). Cevap anahtarı tek, tüketiciler çok.

---

## 2. Yazılım Mimarisi (DDD)

**Seçilen: A** — `muhasebe_olaylari` (aggregate **root**) → `cozumler` (aggregate-içi **entity**) → `cozum_satirlari` (**child**).

| Seçenek | Değerlendirme | Verdict |
|---|---|---|
| **A) cozumler root → cozum_satirlari child** | Kısmen doğru ama **cozumler root DEĞİL.** Çözüm, olaydan bağımsız yaşamaz (bir olayın çözümüdür). Doğru sınır: **olay root**, cozumler onun içinde entity, cozum_satirlari child. | ✅ (düzeltilmiş) |
| **B) cozum_satirlari aggregate** | Reddedildi. Satırın bağımsız yaşam döngüsü/invariant'ı yok; tek başına anlamsız (denge kuralı ancak satır *kümesinde* geçerli). | ❌ |
| **C) Başka model** | — | — |

**Aggregate sınırı:** `muhasebe_olaylari` (root) ⊃ `cozumler` (entity, `olay_id` cascade) ⊃ `cozum_satirlari` (child, `cozum_id` cascade). Tümü aggregate-içi → **cascade** (olay silinince çözümleri, çözüm silinince satırları gider). Tutarlılık sınırı aggregate'in tamamıdır: bir çözümün dengesi (Σborç=Σalacak), min-2-satır bütünlüğü, muavin geçerliliği hep bu sınır içinde garanti edilir.

**Aggregate DIŞI (restrict FK):** `cozum_satirlari.muavin_id → muavin_hesaplar` (paylaşılan referans; kullanılan muavin silinemez). Muavin, çözüm aggregate'inin *dışındadır* (M4'te tanımlı, M6 belge/M5 olay ile aynı sınıf). Bu, ADR-016'nın "aggregate-içi cascade, aggregate-arası restrict" felsefesidir.

**cozumler neden root değil:** DDD'de root = dış dünyanın aggregate'e giriş kapısı + tutarlılık bekçisi. Çözüme dışarıdan (soru, simülasyon, kontrol) hep **olay üzerinden** erişilir (`olay_id`). Çözümün kendi başına global kimliği yoktur; olayın cevabıdır. Root'u olay yapmak, ADR-002'nin (olay merkezli) doğal sonucudur.

---

## 3. Muhasebe Doğruluğu — en kritik bölüm

### `cozum_satirlari` hangi alanları taşımalı?

| Alan | Karar | Gerekçe |
|---|---|---|
| **muavin_id** | ✅ `uuid NOT NULL FK muavin_hesaplar restrict` | ADR-004/005 · S0#3. Kayıt bu düzeyde. |
| **borc** | ✅ `numeric(14,2) not null default 0 check (borc >= 0)` | Tek taraflılık altta |
| **alacak** | ✅ `numeric(14,2) not null default 0 check (alacak >= 0)` | |
| (satır) | ✅ `check (borc = 0 or alacak = 0)` | Bir satır tek taraflıdır |
| **açıklama** | ✅ `text null` | Satır-özel not (opsiyonel) |
| **sıra** | ✅ `int not null; unique(cozum_id, sira)` | Görüntüleme sırası |
| **belge referansı** | ❌ **satırda YOK** | Belge olay düzeyinde bağlanır (`olay_belgeleri`, M6). Tek satır belgeye referans vermez — kayıt *bütünü* belgeden türer. Satıra `belge_id` denormalizasyon olur. |
| **olay referansı** | ❌ **satırda YOK (geçişli)** | Satır → `cozum_id` → `cozumler.olay_id`. Satıra doğrudan `olay_id` denormalizasyon. |

### `cozumler` (başlık) alanları
`id`, `olay_id` (FK, cascade, NOT NULL), `varyant` (int, `unique(olay_id,varyant)`), `varyant_adi`, `aciklama` (muhasebe mantığı — öğrenme zincirinin 5. halkası), `beyanname_etkileri` jsonb (MVP jsonb, motor v2.2), `hata_kurallari` jsonb (katman-2 geri bildirim + `hata_bulma` tipi kaynağı).

### ADR-005 "Ana hesaba kayıt yapılamaz" — DB mi, uygulama mı, her ikisi mi?

**HER İKİSİ — ama farklı nesneler için, katmanlı:**

1. **DB katmanı — YAPISAL (birincil, cevap anahtarı için):** `cozum_satirlari.muavin_id NOT NULL FK → muavin_hesaplar(id)`. `muavin_hesaplar.kod` format CHECK'i (`^[0-9]{3}(\.[0-9]+)+$`) 3 haneli ana kodun o tabloya girmesini engeller → ana hesap muavin_hesaplar'da **yok** → referans edilemez. **Ana hesaba kayıt geçişli olarak imkânsız.** Bu bir uygulama kuralı değil, veri tabanı garantisidir (ADR-005 "yapısal yasak"). Uygulama bug'ı bunu delemez.

2. **DB katmanı — BÜTÜNLÜK (cevap anahtarı için, ADR-005 açık kararı):** Cevap anahtarı *dengesiz* olamaz — yoksa her öğrenci haksız "yanlış"a düşer. Üç kural:
   - **Denge:** Σborç = Σalacak (çözüm başına) → **deferred constraint trigger** (satırlar tek tek insert edildiğinden commit anında kontrol; V2-VERI-MODELI §12.4).
   - **Min 2 satır:** her çözümde ≥2 satır (tek satırlı yevmiye olmaz) → statement/commit trigger.
   - **Tek taraflılık:** satır check (yukarıda).

3. **Uygulama katmanı — KULLANICI CEVABI (kontrol.ts):** Öğrenci ana hesap girmeye çalışırsa `kontrol.ts` `muavin_gerekli` hatası verir (ADR-005: kontrol.ts yeniden yazılır; artık ana hesabı sessizce kabul etmez). Bu, *kullanıcının denemesi* içindir — cevap anahtarının DB garantisinden ayrı.

**Özet:** Cevap anahtarı bütünlüğü = **DB** (NOT NULL FK + denge/min-2 trigger + satır check). Kullanıcı cevabı doğrulaması = **uygulama** (kontrol.ts). İkisi farklı nesneler; ADR-005 her iki katmanda da, ama ayrı sorumlulukla.

---

## 4. Eğitim Tasarımı

**Akış (ADR-003/014, S0#8):** Belge → Olay → Yevmiye Kaydı → **Kontrol** → Açıklama → Mevzuat. Evet, doğru sıra. Detay M6-MIMARI-ANALIZ §4'te.

**Puanlama hangi aşamada?** — **KONTROL aşamasında.** Kullanıcı yevmiyesini gönderir → `kontrol.ts` `cozum_satirlari`'na karşı **deterministik** doğrular (AI değil, ADR-012) → doğruysa:
- `ilerleme` satırı (dogru_mu, süre) yazılır (mevcut).
- Puan (`ZORLUK_PUAN`, olaydan zorluk) + streak/rozet (mevcut motivasyon katmanı) işlenir.
- XP `ZORLUK_PUAN × olay_yetkinlikleri.agirlik` ile `kullanici_yetkinlikleri`'ne dağıtılır (ADR-009, M9).

**Puan `cozumler`'de tutulmaz** (Karar 7): türetilendir. `cozumler` cevap anahtarıdır; bir kullanıcının kazandığı puan *denemeye özeldir* (`ilerleme` + XP agregasyonu), cevap anahtarına yazılmaz (türetilen saklanmaz — ADR-006/009 ilkesi). Zorluk `cozumler`'de değil olayda (`muhasebe_olaylari.zorluk`).

---

## 5. Veri Modeli (SQL değil — taslak)

### 5a. `cozumler` (mevcut tablo — grain değişimi: satır → BAŞLIK)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid PK | (mevcut) |
| olay_id | text | *FK muhasebe_olaylari* cascade, **NOT NULL** (yeni; soru_id'nin yerine) |
| varyant | int | not null default 1; `unique(olay_id, varyant)` |
| varyant_adi | text | null — 'Aralıklı envanter' |
| aciklama | text | null — muhasebe mantığı |
| beyanname_etkileri | jsonb | not null default '[]' (MVP jsonb) |
| hata_kurallari | jsonb | not null default '[]' |
| created_at/updated_at | timestamptz | trigger |
| *(geçiş)* soru_id, sira, kod, borc, alacak | | **KALIR** (dual-read, M11'de drop) |

### 5b. `cozum_satirlari` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid PK | |
| cozum_id | uuid | *FK cozumler* cascade, **NOT NULL** |
| sira | int | not null; `unique(cozum_id, sira)` |
| muavin_id | uuid | *FK muavin_hesaplar* restrict, **NOT NULL** (ADR-004/005) |
| borc | numeric(14,2) | not null default 0, `check (borc >= 0)` |
| alacak | numeric(14,2) | not null default 0, `check (alacak >= 0)` |
| aciklama | text | null |
| — | | `check (borc = 0 or alacak = 0)` |

### 5c. Aggregate bütünlük trigger'ları (yeni — ADR-005 açık kararı)
- `cozum_denge_trg` — deferred constraint trigger: çözüm başına Σborç=Σalacak.
- `cozum_min_satir_trg` — çözüm başına ≥2 satır.

### 5d. Başka tablo gerekli mi?
**Hayır.** `cozum_mevzuat` M2M (çözüm↔madde) M8'e ait. Kullanıcı cevabı için yeni tablo yok (soru: `ilerleme` mevcut; sim: `yevmiye_*` M10). MVP jsonb kalan: `beyanname_etkileri`, `hata_kurallari` (motor v2.2'de terfi).

---

## 6. Performans

**Kritik ölçek notu:** `cozum_satirlari` **cevap anahtarıdır** → içerikle büyür (olay × varyant × ~3-5 satır ≈ bugün 256, olgunlukta birkaç bin). Kullanıcıyla büyümez. **Asıl ölçek `yevmiye_satirlari`'dır** (M10: 10k kullanıcı × sim × adım × satır ≈ 60M+, partition riski — ADR-006). M7'nin performans ihtiyacı **mütevazı**.

| Konu | Öneri |
|---|---|
| **Index** | `cozumler(olay_id)`; `cozum_satirlari(cozum_id)`; `cozum_satirlari(muavin_id)` — **FK'lara zorunlu** (Postgres FK'ya oto-index açmaz: silme + join + muavin kullanım sayacı). |
| **FK** | `cozumler.olay_id→muhasebe_olaylari` [cascade]; `cozum_satirlari.cozum_id→cozumler` [cascade]; `cozum_satirlari.muavin_id→muavin_hesaplar` [restrict]. |
| **NOT NULL** | `cozumler.olay_id`, `cozumler.varyant`; `cozum_satirlari.cozum_id`, `.muavin_id`, `.sira`; `borc`/`alacak` (default 0). |
| **Unique** | `cozumler(olay_id, varyant)`; `cozum_satirlari(cozum_id, sira)`. |

RLS (İ dolaylı): `cozumler`/`cozum_satirlari` olayın onay durumunu izler (mevcut `cozumler_public_read_onayli` deseni). `cozum_satirlari` → `cozumler` üzerinden tek-seviye exists (V2-VERI-MODELI §12.6; ölçek küçük, ucuz).

---

## 7. Gelecek Etkileri

| Modül | Etki |
|---|---|
| **M8 Mevzuat** | `cozum_mevzuat` M2M (`cozum_id → mevzuat_maddeleri`) çözümü maddeye bağlar. `cozumler` = mevzuat çapasının kancası; etki analizi ("bu madde hangi çözümleri etkiler") buradan yürür (ADR-011). |
| **M9 Learning Engine** | Kontrol `cozum_satirlari`'na karşı → dogru_mu → XP `olay_yetkinlikleri`'nden dağıtılır. `hata_kurallari` (jsonb) → katman-2 geri bildirim + `hata_bulma` tipi çeldiricileri. |
| **M10 Simülasyon** | `yevmiye_satirlari` (kullanıcı) `cozum_satirlari`'na (cevap anahtarı) karşı doğrulanır. **Cevap anahtarı/kullanıcı cevabı ayrımı burada kazanç:** aynı anahtar, ayrı kullanıcı-store. `erp_uygulama` validator'ı. |
| **Çok kullanıcılı atölye** | N öğrenci aynı olayı çözer → her biri ayrı `ilerleme`/`yevmiye`; `cozum_satirlari` **paylaşılan salt-okunur anahtar**. Ölçeklenir (anahtar içerik, kullanıcı-başına değil). |
| **Eğitmen değerlendirmesi** | Öğretmen öğrencinin `ilerleme`/`yevmiye`'sini cevap anahtarına karşı görür — deterministik fark. `cozum_satirlari` referans. |
| **AI çözüm analizi** | `ai-yanlis-analizi` (kullanıcı cevabı, `cozum_satirlari`, `hata_kurallari`) okur → açıklar. AI müşteridir (ADR-012), anahtarı üretmez; normalize satır → kısa/tipli/önbelleklenebilir prompt. |

---

## Kararlara net cevaplar

| # | Soru | **Karar** |
|---|---|---|
| 1 | cozumler aggregate root olmalı mı? | **HAYIR.** Root = `muhasebe_olaylari` (ADR-002). cozumler onun içinde entity. |
| 2 | cozum_satirlari child entity mi? | **EVET** — cozumler'in child'ı (cascade). Seçenek A (düzeltilmiş). |
| 3 | muavin_id NOT NULL olmalı mı? | **EVET, kesin.** NOT NULL FK → muavin_hesaplar. ADR-004/005'in DB garantisi; ana hesaba kayıt yapısal imkânsız. |
| 4 | Kullanıcı aynı olaya birden fazla çözüm verebilmeli mi? | **Cevap anahtarı:** evet, `varyant` ile (authored). **Kullanıcı:** denemeleri `ilerleme`/`yevmiye`'dir, `cozumler` değil. |
| 5 | Çözüm versiyonlanmalı mı? | **Hayır (M7'de).** `varyant` = alternatif geçerli çözüm, versiyon değil. İçerik versiyonlama admin in-place; tam versiyonlama v2.2+. Kullanıcı "versiyonu" = ters kayıt (M10). |
| 6 | Taslak çözüm gerekli mi? | **Hayır ayrı kavram.** Onay durumu olaydan miras (`muhasebe_olaylari.durum`). |
| 7 | Puan çözüm tablosunda mı? | **HAYIR.** Türetilen saklanmaz. Puan/XP `ilerleme` + `kullanici_yetkinlikleri` (ADR-009). |
| 8 | Yeni ADR gerekli mi? | **EVET — ADR-019** (aşağıda). |

---

## Nihai mimari öneri

**M7, olay aggregate'i içinde cevap anahtarını normalize eder:** `cozumler` (başlık: olay_id + varyant + mantık/beyanname/hata) → `cozum_satirlari` (satır: muavin_id NOT NULL + borç/alacak + denge/min-2 trigger). Kullanıcı cevabı M7 kapsamı DIŞI (ilerleme mevcut; yevmiye M10). Mevcut 256 satır **temiz** olduğundan (muavin-formatlı, dengeli, olay-bağlı) backfill **yapılır** (M6b'nin tersine), ama iki riskli halka nedeniyle **iki alt-adıma bölünür**:

- **M7a — yapı + muavin terfisi:** `cozum_satirlari` + `cozumler` başlık kolonları + bütünlük trigger'ları; **25 soru-yerel muavini** (`sorular.muavinler` jsonb) global `muavin_hesaplar`'a terfi (dedup: **kod+ad**; sadece kod eşleşip ad farklıysa **birleştirme YOK, rapora düşer** — V2-VERI-MODELI §12.2); `olay_muavinleri` (M5'te boş bırakılan) bu terfiyle doldurulur.
- **M7b — cevap anahtarı backfill + doğrulama:** 256 eski `cozumler` satırı → 256 `cozum_satirlari` (kod→muavin_id eşleme) + 70 `cozumler` başlık (olay başına varyant=1); **denetim sorgusu migration'ın parçası:** her olayda eski satır sayısı = yeni, eski Σborç/Σalacak = yeni (V2-VERI-MODELI §12.1). Eski `cozumler` kolonları **M11'e kadar KALIR** (dual-read — `kontrol.ts` bozulmaz).

**Kritik bağımlılık:** `kontrol.ts` eski `cozumler` şeklini okur. M7 eski kolonları düşürmez → dual-read; frontend cutover (yeni `cozum_satirlari` okuma) ayrı iş, M11'de eski kolonlar drop. **M7 kırıcıdır çünkü grain değişir; ama dual-read ile canlı sistem çalışmaya devam eder.**

---

## Yeni ADR önerisi — ADR-019

**ADR-019 — Cevap anahtarı (`cozumler`) ile kullanıcı cevabının (`ilerleme`/`yevmiye`) ayrılması**
- **Karar:** `cozumler`/`cozum_satirlari` yalnız **cevap anahtarıdır** (olay aggregate'i, içerik). Kullanıcının denemesi **asla** burada saklanmaz: soru modu → `ilerleme`, simülasyon → `yevmiye_kayitlari`/`yevmiye_satirlari` (M10). Puan/XP türetilir, cevap anahtarında tutulmaz.
- **Neden:** İki kavramın karışması ölçek patlaması (kullanıcı-başına cozum satırı), ilerleme ile çift kayıt ve puanın yanlış katmanda tutulması riskini doğurur. Bu ayrım ADR-008 (validator'lar cevap anahtarından beslenir) ve ADR-009 (XP türetilir) ilkelerinin M7'deki somutlaşmasıdır.
- **İlişkili:** ADR-002, ADR-008, ADR-009, ADR-004/005.
- **Not:** ADR-005'in açık kararı (`cozum_satirlari` denge + min-2-satır bütünlüğü) M7'de trigger'larla kapatılır — bu ADR-005'in tamamlanması, ayrı ADR değil.

---

## Riskler ve alternatifler

| # | Risk / Alternatif | Şiddet | Önlem |
|---|---|---|---|
| R1 | **kod→muavin dedup çakışması** (aynı kod farklı ad → iki cari tek muavinde birleşir) | **Yüksek** | Dedup anahtarı kod+ad; kod eşleşip ad farklıysa **birleştirme YOK, rapor**; elle çözüm (V2-VERI-MODELI §12.2) |
| R2 | **Backfill cevap anahtarını bozarsa** tüm platform "yanlış"a düşer, sessiz bozulma | **Çok yüksek** | Migration içi denetim: eski satır/Σ = yeni; uyuşmazlık → transaction geri alınır; kısmi durum bırakılmaz (V2-VERI-MODELI §12.1). Feature flag ile eski/yeni kontrol paralel kıyas (frontend, sonra) |
| R3 | **Grain değişimi + kontrol.ts bağımlılığı** | **Yüksek** | Eski kolonlar M11'e kadar KALIR (dual-read); M7 yalnız *ekler*, düşürmez |
| R4 | **Denge trigger'ı seed'i yavaşlatır / deferred karmaşıklığı** | Orta | Deferred constraint trigger, commit anında; backfill tek transaction (V2-VERI-MODELI §12.4). 256 satır — maliyet ihmal edilebilir |
| R5 | **Modül-1 içeriği yeniden yazılırsa backfill throwaway** | Düşük | M6b'den farklı: veri temiz + `kontrol.ts` hard-bağımlı → backfill gerekli (throwaway değil). Yeniden yazım gelirse zamanlama koordine edilir |
| ALT | **Alternatif: M7'yi de ertele (M6b gibi)** | — | Reddedildi: belge fonksiyonel tüketicisizdi; çözüm `kontrol.ts`'in hard bağımlılığı + veri temiz → ertelenemez |
| ALT | **Alternatif: kullanıcı cevabını da cozumler'de tut** | — | Reddedildi: ADR-019 — ölçek + çift kayıt + puan katmanı felaketi |

---

## Kapanış — M7'nin taahhüdü

M7, platformun **cevap anahtarını** olay aggregate'i içinde normalize eder ve ADR-004/005'i (muavin zorunlu / ana hesaba kayıt yasağı) `muavin_id NOT NULL FK` ile **veritabanı garantisine** dönüştürür. En büyük mimari kazanç, ADR-019'un netliğidir: **cevap anahtarı ≠ kullanıcı cevabı** — bu ayrım M10 simülasyonunu, çok kullanıcılı atölyeyi ve eğitmen değerlendirmesini bedavaya doğru modelde tutar. Veri temiz olduğundan backfill yapılır (M6b'nin tersine), ama kırıcı grain değişimi ve `kontrol.ts` bağımlılığı nedeniyle **M7a (yapı+terfi) / M7b (backfill+doğrulama)** olarak bölünür ve eski kolonlar dual-read için M11'e kadar korunur.

**Sonraki adım:** Onayın gelirse **ADR-019** yazılır, ardından **M7a SQL taslağı** (M6a akışının aynısı: taslak → dry-run → onay → apply → test). Özellikle **muavin terfi dedup stratejisi** ve **M7a/M7b bölünmesi** senin onayını bekliyor.
