# M8 — Mevzuat Modülü · Mimari Analiz

**Sürüm:** 1.0 · **Tarih:** 7 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) (ADR-011/012/016/019/020) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) (§2.1, §2.5, §4, §12 C3) · [M7-MIMARI-ANALIZ.md](M7-MIMARI-ANALIZ.md)
**Kapsam:** M8 (Mevzuat) migration'ının mimari değerlendirmesi. **SQL / migration / apply / commit içermez.**
**Statü:** Onaya sunuldu.

---

## 0. M8 nedir + ADR-011 bağlamı

M8, ADR-011'in (Mevzuat versiyonlama) veri ayağını kurar: RAG'ın (semantik arama, `mevzuat_chunklar`) yanına **yapısal mevzuat katmanı** ekler. İki katman, tek köprü:
- **RAG (mevcut):** AI asistanının bağlamı — "yaklaşık doğru", sohbete uygun (halüsinasyona açık).
- **Yapısal (yeni):** Çözümlerin **resmî, deterministik** dayanağı — `cozum_basliklari` bir maddeye FK ile bağlanır (halüsinasyona yer yok, ADR-012).

**Gizli süper güç — etki analizi (ADR-011):** Bir madde değişince (yeni versiyon), o maddeye bağlı tüm cevap anahtarları tek sorguyla admin'in "gözden geçir" kuyruğuna düşer.

### 0.1 Ölçülen durum (canlı, 7 Tem 2026)

| Varlık | Durum | M8'e etkisi |
|---|---|---|
| `rag_chunks` (**aktif RAG**) | **var, 3327 satır** — OpenAI 1536; `rag_kaynaklar` (13 kaynak); ai-asistan `rag_ara` RPC ile kullanır | **DOKUNULMAZ** (köprü ertelendi) |
| `mevzuat_chunklar` | var, 275 satır — Nisan 30 migration'ından, **eski/ayrı** yapı (aktif RAG değil) | **DOKUNULMAZ** |
| `mevzuat_kaynaklar` / `mevzuat_maddeleri` / `cozum_mevzuat` | **yok** | M8 kuracak — yapısal katman **greenfield** |
| `cozum_basliklari` (M7a) | var, boş | mevzuat FK hedefi hazır |

> **Not (chunk tablosu düzeltmesi):** Canlıda **iki** chunk tablosu var. Aktif RAG **`rag_chunks`** (3327, OpenAI; ai-asistan `rag_ara`→`rag_chunks`) — proje hafızasındaki "3327 chunk / 13 kaynak" bilgisi **doğru**. `mevzuat_chunklar` (275) Nisan 30'dan kalma eski/ayrı yapı; aktif retrieval onu kullanmıyor. V2-VERI-MODELI §2.5 köprü için `mevzuat_chunklar`'ı referans almış (Mayıs 13 RAG yeniden kurulumundan habersiz) — **hatalı hedef**. Bu yüzden RAG↔madde köprüsü M8'den **çıkarıldı** (§4).

---

## 1. `mevzuat_kaynaklar`

Mevzuatın *kaynağı* (kanun/tebliğ/sirküler). KATALOG tablosu (soru_tipleri/belge_tipleri deseni).

| Alan | Tip | Not |
|---|---|---|
| **id** | text PK | 'kdvk', 'vuk', 'gvk', 'ttk', '5510', 'kdv-gut', 'vuk-teblig-459'… (okunur) |
| tip | `mevzuat_tip` enum | kanun / yonetmelik / teblig / sirkuler / genelge / ozelge |
| ad | text not null | 'Katma Değer Vergisi Kanunu' |
| numara | text null | '3065' |
| ust_kaynak_id | text *FK self* null | **opsiyonel hiyerarşi** — tebliğ→kanun (kaynak hiyerarşisi kararı §6.4) |
| source_url | text null | mevzuat.gov.tr / gib.gov.tr |
| aktif | boolean default true | |
| sira | int default 0 | |

**Kapsam (seed):** VUK, KDVK (3065), GVK, KVK, TTK, 5510 (SGK) + sık tebliğler (KDV GUT, VUK tebliğleri). Kullanıcının listelediği VUK/KDVK/GVK/TTK/SGK/Tebliğ/Sirküler tümü `tip` enum + satır ile karşılanır.

---

## 2. `mevzuat_maddeleri` — **kimlik/versiyon ayrımı (en kritik karar)**

### Problem (ADR-011 dezavantaj / V2-VERI-MODELI §12 C3)
V2-VERI-MODELI §2.1 maddeyi **tek tabloda** modellemişti: `mevzuat_maddeleri(id, madde_no, metin, versiyon, onceki_versiyon_id, effective_date, expire_date)` ve `cozum_mevzuat.madde_id` → **belirli bir versiyon satırı**. Bu **kırılgan:** madde değişince (yeni versiyon satırı) `cozum_mevzuat` hâlâ *eski* versiyonu gösterir; "bu çözüm KDVK md.9'a dayanır" bağı yürürlükten kalkmış versiyona pinlenir.

### Öneri: İKİ TABLO — kimlik (stabil) + versiyon (tarihli)

**`mevzuat_maddeleri` (KİMLİK — madde başına tek satır, stabil):**
| Alan | Tip | Not |
|---|---|---|
| **id** | uuid PK | Maddenin *stabil* kimliği (değişmez) |
| kaynak_id | text *FK mevzuat_kaynaklar* restrict | |
| madde_no | text not null | '9', '29/1', 'I/C-2.1.3.2.7' |
| — | | `unique (kaynak_id, madde_no)` |

**`mevzuat_madde_versiyonlari` (VERSİYON — tarihli metin):**
| Alan | Tip | Not |
|---|---|---|
| **id** | uuid PK | |
| madde_id | uuid *FK mevzuat_maddeleri* cascade | Kimliğe bağlı |
| versiyon | int not null | `unique (madde_id, versiyon)` |
| baslik | text not null | |
| metin | text not null | O versiyonun fıkra/özet metni |
| effective_date | date not null | Yürürlük başlangıcı |
| expire_date | date null | null = **yürürlükte** |
| source_url | text null | Versiyona derin link |
| aktif | boolean default true | (veya expire_date'ten türet) |

### Bunun kazandırdıkları
- **`cozum_mevzuat.madde_id` → KİMLİK** (versiyon değil). Çözüm "KDVK md.9"a bağlanır; **hangi metin** olayın/`islem_tarihi`nin tarihine göre çözümlenir (`effective_date ≤ T < coalesce(expire_date, ∞)`).
- **Değişiklik = yeni versiyon satırı** (kimlik aynı): eskiye `expire_date`, yeniye `effective_date`. Metin asla mutasyona uğramaz; versiyonlar append.
- **Etki analizi temiz:** madde değişti → yeni versiyon → o **kimliğe** bağlı tüm `cozum_mevzuat` satırları tek sorguyla bulunur (kimlik pinlemesi versiyon pinlemesinden sağlam).

> Bu, ADR-011'in "kimlik/versiyon ayrımı, okuma anında tarihe göre çözümleme" açık kararının somutlaşması ve V2-VERI-MODELI §2.1'in tek-tablo taslağından bilinçli sapma → **ADR-021**.

---

## 3. `cozum_mevzuat` M2M

Çözümü (varyant) mevzuat maddesine bağlar. **`cozum_basliklari`'na** bağlanır (M7a/ADR-020 başlık tablosu), legacy `cozumler`'e değil.

| Alan | Tip | Not |
|---|---|---|
| **baslik_id** | uuid *FK cozum_basliklari* cascade | Bileşik PK — **varyant düzeyi** (7/A vs 7/B farklı madde citeleyebilir) |
| **madde_id** | uuid *FK mevzuat_maddeleri* restrict | Bileşik PK — **KİMLİK** (versiyon değil) |
| aciklama | text null | "Bu kayıt KDVK md.9/1 vergi sorumlusu hükmüne dayanır" |

- **Bir çözüm → N madde** (tevkifat örneği: KDVK md.9 + KDV GUT I/C-2.1.3) ✓
- **Bir madde → N çözüm** (aynı istisna maddesi onlarca olayda) ✓ → M2M zorunlu (ADR-016).
- **restrict:** kullanılan madde silinemez (önce bağ sökülür).

---

## 4. RAG↔madde köprüsü — **M8'den ÇIKARILDI (ertelendi)**

RAG chunk'ını yapısal maddeye bağlayan köprü, ölçüm sonrası M8 kapsamından çıkarıldı. Üç gerekçe:

1. **Yanlış hedef riski:** Aktif RAG `rag_chunks` (3327), `mevzuat_chunklar` (275) değil. V2-VERI-MODELI §2.5'in `mevzuat_chunklar` referansı hatalı (RAG yeniden kurulumundan habersiz). Yanlış tabloya köprü = mimari borç.
2. **İşlevsizlik:** M8 `mevzuat_maddeleri`'ni **boş** bırakıyor (metin kürasyonla dolacak). Boş maddeye 3327 chunk köprülemek anlamsız — köprülenecek yapısal madde henüz yok.
3. **Ayrı karar gerektiriyor:** `rag_kaynaklar` (13, RAG doküman kaynağı) ↔ `mevzuat_kaynaklar` (7, yapısal hukuki kaynak) **uzlaştırması** ayrı bir mimari karardır; köprü bunu gerektirir.

**Karar:** M8 **hiçbir chunk tablosuna dokunmaz**. RAG↔madde köprüsü, madde metinleri kürasyonla girildikten *sonra*, doğru hedefle (`rag_chunks.madde_id` veya reconcile edilmiş bir kaynak modeli) ve kaynak-uzlaştırma kararıyla birlikte **ayrı, küçük bir migration**'da kurulur. ADR-011'in RAG+yapısal köprü vizyonu korunur, yalnız *zamanlaması* madde kürasyonu sonrasına ertelenir.

> **Not:** RAG (`rag_chunks`) bağımsız çalışmaya devam eder — M8 onu etkilemez. Köprü, RAG'ın çalışması için gerekli değil; yalnız "bu çözümün dayanağı bu madde, ve o maddeyle ilgili chunk'lar şunlar" ters bağlantısı için bir *zenginleştirme*dir.

---

## 5. Legacy etkisi

- **M8, legacy `cozumler` backfill'ine BAĞIMLI DEĞİL** (M7b kararı: mekanik backfill yok). `cozum_mevzuat` `cozum_basliklari`'na (yeni, boş) bağlanır; mevzuat bağı **yeni içerikle** kurulur.
- **Legacy `cozumler` mevzuat bağı almaz** — o dying tablo; M11'de düşer. Mevzuat sadece yeni cevap anahtarına (`cozum_basliklari`) bağlanır.
- **Aktif RAG (`rag_chunks`, 3327) korunur** — M8 hiçbir chunk tablosuna dokunmaz; ai-asistan `rag_ara` retrieval'ı aynen çalışır. RAG↔madde köprüsü ertelendi (§4).
- Yani M8 **tümüyle additive + greenfield**: hiçbir mevcut akışı kırmaz, hiçbir backfill'e/chunk tablosuna bağlı değil.

---

## 6. Açık kararlar

### 6.1 Mevzuat versiyonlama modeli → **iki tablo (kimlik + versiyon)** ✅
V2-VERI-MODELI §2.1'in tek-tablo + `onceki_versiyon_id` zinciri yerine `mevzuat_maddeleri` (kimlik) + `mevzuat_madde_versiyonlari` (versiyon). Gerekçe §2. → ADR-021.

### 6.2 Yürürlük tarihi yaklaşımı → **effective_date + nullable expire_date, tarihe göre çözümleme** ✅
Versiyon tablosunda `effective_date not null`, `expire_date null (=yürürlükte)`. "T tarihinde geçerli madde" = `effective_date ≤ T < coalesce(expire_date, 'infinity')`. T = olayın `islem_tarihi` (M5) veya içeriğin referans tarihi. Bu, ADR-011'in "canlı ekonomi modu / sınav yılı oranları" vizyonunu (gelecek) bedavaya hazırlar.

### 6.3 Aynı maddenin değişen versiyonları → **append-only versiyon satırı** ✅
Değişiklik: yeni `mevzuat_madde_versiyonlari` satırı (kimlik aynı), eskiye `expire_date`, yeniye `effective_date`. Metin **asla mutasyona uğramaz**. Örtüşmeyen tarih aralığı (madde başına) bir trigger/exclusion constraint ile korunabilir (öneri: MVP'de uygulama disiplini + doğrulama sorgusu; katı constraint v2.2).

### 6.4 Kaynak hiyerarşisi gerekir mi → **MVP'de hayır; opsiyonel hook** ⚠️
Hukuki hiyerarşi (kanun > tebliğ > sirküler > özelge) *vardır*, ama M8 referans amacı için **düz `mevzuat_kaynaklar` + `tip` enum yeterli**. Gelecek için `ust_kaynak_id` self-FK (nullable, `hesap_plani.ust_kod` deseni) eklenir ama zorunlu kullanılmaz. Katı hiyerarşi ihtiyacı kanıtlanınca (örn. "bu tebliğ hangi kanuna bağlı" navigasyonu) doldurulur.

---

## Nihai mimari öneri

**M8, yapısal mevzuat katmanını kimlik/versiyon ayrımıyla kurar ve cevap anahtarına (`cozum_basliklari`) bağlar; RAG'ı köprüyle tamamlar.**

### Kapsam
1. `mevzuat_tip` enum (kanun/yonetmelik/teblig/sirkuler/genelge/ozelge)
2. `mevzuat_kaynaklar` (katalog + seed: VUK/KDVK/GVK/KVK/TTK/5510 + sık tebliğler)
3. `mevzuat_maddeleri` (kimlik) + `mevzuat_madde_versiyonlari` (versiyon)
4. `cozum_mevzuat` M2M (`cozum_basliklari` ↔ madde kimliği)
5. **Chunk köprüsü YOK** — hiçbir chunk tablosuna dokunulmaz; RAG↔madde köprüsü madde kürasyonu sonrası `rag_chunks` hedefiyle ayrı migration (§4)
6. RLS: katalog/madde/versiyon = **Katalog** (public read, admin write); `cozum_mevzuat` = **dolaylı-onay** (cozum_basliklari→olay üzerinden)
7. **Seed içeriği ayrı/kontrollü** — çekirdek kaynaklar M8'de; madde metinleri kürasyonla (yanlış madde metni = yanlış öğretim)

### İçerik stratejisi (M6b/M7b dersi)
Kaynak katalog + şema M8'de kurulur. Madde metinleri **kürasyonla** girilir (AI taslak + insan onay, ADR-012); kör/toplu içe aktarma yok. Mevcut 275 chunk köprüsü best-effort, çoğu null.

---

## Yeni ADR önerisi — ADR-021

**ADR-021 — Mevzuat maddesinde kimlik/versiyon ayrımı**
- **Karar:** Madde, tek tablo (metin+versiyon karışık) yerine `mevzuat_maddeleri` (kimlik: kaynak+madde_no) + `mevzuat_madde_versiyonlari` (tarihli metin) olarak modellenir. `cozum_mevzuat` ve `mevzuat_chunklar` **kimliğe** bağlanır; metin tarihe göre çözümlenir.
- **Neden:** Tek-tablo modelinde `cozum_mevzuat.madde_id` belirli versiyona pinlenir → madde değişince kırılır (V2-VERI-MODELI §12 C3). Kimlik ayrımı bağı stabil tutar, etki analizini sağlamlaştırır, "T tarihinde geçerli madde" sorgusunu doğal kılar.
- **Yerini aldığı:** V2-VERI-MODELI §2.1'in tek-tablo + `onceki_versiyon_id` taslağı.
- **İlişkili:** ADR-011 (bu kararın açık bıraktığı düzeltme), ADR-016, ADR-020.

---

## Riskler ve alternatifler

| # | Risk / Alternatif | Şiddet | Önlem |
|---|---|---|---|
| R1 | **Yanlış madde metni = yanlış öğretim** | **Yüksek** | Madde seed'i kürasyonla; AI taslak + insan onay (ADR-012); toplu kör import yok |
| R2 | Örtüşen versiyon tarih aralıkları (aynı maddede iki geçerli versiyon) | Orta | MVP: doğrulama sorgusu + uygulama disiplini; katı exclusion constraint v2.2 |
| R3 | Köprü (`madde_id`) çoğunlukla null → "boş köprü" algısı | Düşük | Bilinçli best-effort; RAG bağımsız çalışır; köprü madde-yapılı içerik arttıkça dolar |
| R4 | Kaynak hiyerarşisi sonradan gerekirse | Düşük | `ust_kaynak_id` hook baştan var; doldurma ertelenir |
| ALT | **Tek-tablo versiyonlama (V2-VERI-MODELI §2.1)** | — | Reddedildi: versiyon pinlemesi kırılgan (C3), etki analizi zayıf |
| ALT | **Versiyonlama yok, tek metin** | — | Reddedildi: ADR-011 "güncellik operasyonel süreç" vaadini bozar; değişiklik takibi imkânsız |

---

## Kapanış — M8'in taahhüdü

M8, "güncel mevzuat"ı pazarlama vaadi olmaktan çıkarıp **operasyonel sürece** çevirir (ADR-011): her çözümün tıklanabilir, resmî, tarihe-duyarlı bir dayanağı olur; bir oran/madde değişince etkilenen içerik tek sorguyla bulunur. Kritik karar, maddenin **kimlik/versiyon ayrımıdır** (ADR-021) — bu, çözüm↔madde bağını madde değişse de sağlam tutar. M8 tümüyle additive + greenfield: RAG korunur, legacy backfill'e bağımlı değildir, yalnız yeni cevap anahtarına (`cozum_basliklari`) bağlanır.

**Sonraki adım:** Onayın gelirse **ADR-021** yazılır, ardından **M8 SQL taslağı** (M6a/M7a akışı: taslak → dry-run → onay → apply → test). Özellikle **kimlik/versiyon iki-tablo modeli** ve **madde seed kürasyon stratejisi** senin onayını bekliyor.
