# M5 — Muhasebe Olayı Çekirdeği · Mimari Analiz

**Sürüm:** 1.0 · **Tarih:** 7 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) (ADR-002/007/008/009/015/016) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) (§2.2, §4, §8) · [SDD-V2.md](SDD-V2.md)
**Kapsam:** M5 migration'ının mimari değerlendirmesi ve karar kaydı. **SQL / migration / frontend içermez** — yalnız tasarım analizi.
**Statü:** Onaya sunuldu. Onay sonrası M5 SQL'i bu dokümana referansla yazılır.

---

## 0. M5 nedir — bir cümlede

M5, `muhasebe_olaylari` **aggregate root**'unu (ADR-002) hayata geçiren, `sorular` tablosunu bu köke bağlayan (`olay_id`) ve **ölçüm/keşif eksenini (yetkinlik/etiket) soru düzeyinden olay düzeyine taşıyan** additive + backfill migration'ıdır. M5 sonrası platformun atomu artık "soru" değil, "muhasebe olayı"dır; soru bu olayın bir tiple render edilmiş instance'ıdır.

### M5'in doğrulanmış başlangıç durumu (canlı, 7 Tem 2026)

| Varlık | Durum | M5'e etkisi |
|---|---|---|
| `muhasebe_olaylari` | **yok** | M5 kuracak |
| `sorular` | 70 satır, hepsi `onayli`; kolonlar: …`belgeler`, `muavinler`, `etiketler` jsonb var; `olay_id`/`tip`/`destek_seviyesi`/`config` **yok** | +4 kolon + 70 backfill |
| `soru_yetkinlikleri` | tablo var, **0 satır**, hiçbir kod okumuyor | olay düzeyine taşınır (maliyetsiz) |
| `soru_etiketleri` | tablo var, **0 satır** | olay düzeyine taşınır |
| `yetkinlikler` / `etiketler` / `soru_tipleri` | dolu (22 / 22 / 9) — FK hedefi hazır | olay M2M'leri bağlanabilir |
| `muavin_hesaplar` v2 | 23 satır (M4 tamam) | `olay_muavinleri` FK hedefi hazır |
| `belgeler` | **yok** (M6) | `olay_belgeleri` **M5'te kurulamaz** |
| `mevzuat_maddeleri` | **yok** (M8) | `cozum_mevzuat` **M5'te kurulamaz** |
| `cozumler` | eski düz şema (id, soru_id, sira, kod, borc, alacak) | M5 dokunmaz (M7'nin işi) |

---

## 1. Ürün mimarisi değerlendirmesi

**Karar veren mekanizma:** ADR-002 (olay merkezli) + ADR-007 (içerik merkezli).

M5, ürünün "213 soru üretildi, sonra tamamı arşivlendi" felaketini (ADR girişindeki salınım kaydı) yapısal olarak imkânsızlaştıran ilk somut adımdır. Soru-merkezli modelde her yeni soru tipi senaryonun yeniden yazılmasını isterdi; olay-merkezli modelde **1 olay → N soru tipi × N destek seviyesi**.

- **Değer:** İçerik yeniden kullanımı yapısal hale gelir. Bugünkü 70 soru, M5 sonrası 70 olaya dönüşür; her olaydan `yevmiye_kaydi` dışında `hata_bulma`, `coktan_secmeli`, `bosluk_doldurma` tipleri **ek senaryo yazmadan** türetilebilir (soru_tipleri'nde `uretim_yontemi`).
- **Risk:** Olay kurulum maliyeti soru kurulum maliyetinden yüksek (SDD 1 no'lu ürünsel risk). M5 bunu *çözmez* ama *hazırlar*: Content Engine (S7 Olay Stüdyosu) olmadan olay kurulumu elle ağır kalır. M5'in kendisi bu maliyeti artırmaz çünkü backfill mevcut soruları otomatik olaya çevirir.
- **Sıralama isabeti:** M5'in M3–M4'ten sonra gelmesi doğru — olay, muavin evrenine (`olay_muavinleri`) bağlanır; muavin tablosu oturmadan olay kurulamazdı.
- **MVP disiplini:** M5 yalnız *iskelet*. `beyanname_etkileri`, `hata_kurallari`, `config` bilinçli jsonb kalır (V2-VERI-MODELI §9). Aşırı normalizasyon tuzağına (ADR-016 dezavantaj) düşülmez.

**Ürünsel verdict:** M5 doğru zamanda, doğru kapsamda. Tek uyarı: M5 tek başına kullanıcıya *görünmez* (frontend hâlâ `sorular`'ı okur). Değer S4'te (Question Engine ilk türev tipler) görünür olur. Bu bir "görünmez sprint" — beklenti buna göre yönetilmeli.

---

## 2. Yazılım mimarisi değerlendirmesi

**Karar veren mekanizma:** ADR-001 (DDD, İçerik bounded context) + ADR-016 (M2M) + V2-VERI-MODELI §6 (RLS şablonları).

- **Aggregate sınırı:** `muhasebe_olaylari` aggregate root; `cozumler` + `cozum_satirlari` aggregate içi (cascade); `sorular`, `simulasyon_adimlari` aggregate'ler arası (restrict). M5 yalnız root'u ve dış bağı (`sorular.olay_id` **restrict** — kullanılan olay silinemez) kurar.
- **Additive güvenlik:** M5 hiçbir mevcut kolonu düşürmez, hiçbir tip değiştirmez. `sorular`'a 4 nullable/defaultlu kolon ekler → `uniteler-loader.ts`, `kontrol.ts`, admin panel, `atolye_sorulari`, `ilerleme`, liderlik RPC'leri **dokunulmadan** çalışır (ADR-002'nin kritik uyumluluk kararı: yeni tablo değil, kolon).
- **RLS örtüşmesi (ADR-001 bedava dayanıklılık):** `muhasebe_olaylari` = İçerik şablonu (`durum='onayli' or is_admin() or ekleyen_id=auth.uid()`); olay_* M2M'leri olayın onay durumunu izler (dolaylı). Bu, `sorular`'ın mevcut `durum='onayli'` public-read deseniyle birebir tutarlı.
- **Geçiş dönemi çift şema:** `olay_id IS NULL` = eski (olaysız) soru; dolu = olaya bağlı. M5 tüm 70 soruyu backfill'lediği için IS NULL kümesi boş kalır, ama kolon **nullable** tutulur (admin yeni soru eklerken olay zorunluluğu uygulama katmanında; NOT NULL kısıtı Olay Stüdyosu gelene kadar konmaz).
- **Bağımlılık dürüstlüğü:** `olay_belgeleri` (→belgeler) ve `cozum_mevzuat` (→mevzuat_maddeleri) FK hedefleri M5'te yok. Bunları M5'e sokmak *forward-reference* olur. **Kararı bu analiz keskinleştiriyor:** M5, FK hedefi hazır olan üç M2M'i kurar (yetkinlik, etiket, muavin); belge ve mevzuat M2M'leri kendi migration'larına (M6, M8) bırakılır. V2-VERI-MODELI §8'in "olay_* M2M'leri" ifadesi bu bağımlılıkla sınırlandırılır.

**Yazılımsal verdict:** M5 saf additive + izole backfill; regresyon yüzeyi minimal. Tek gerçek karar noktası soru↔olay yetkinlik/etiket bağının yönü (§9, Karar 4) — ve o da tablolar boş olduğu için maliyetsiz.

---

## 3. Muhasebe doğruluğu değerlendirmesi

**Karar veren mekanizma:** S0 #6 (`sorular` korunur, olaydan türev) + ADR-014 (gerçek senaryo).

M5'in muhasebe doğruluğu açısından *dolaylı* etkisi var — M5 çözüm/kayıt verisine (`cozum_satirlari`, M7) dokunmaz. Ama olay katmanı muhasebe doğruluğunun **taşıyıcısı** olur:

- **Olay = ekonomik gerçeklik atomu:** Muhasebede kayıt bir "soru"ya değil, gerçekleşen bir olaya (satış, tahsilat, tahakkuk) dayanır. `muhasebe_olaylari.senaryo` + `islem_tarihi` bu gerçekliği modeller. `islem_tarihi` alanı (V2-VERI-MODELI §2.2) M5'te eklenmezse simülasyon kronolojisi (ADR-010) sonradan retrofit ister — **M5'te eklenmeli** (nullable, MVP'de boş).
- **Bir olay, birden çok belge:** SGK tahakkuku örneği (bordro + tahakkuk fişi, V2-VERI-MODELI §13.4) tek olayın iki belge taşıdığını gösterir. M5 `olay_belgeleri` M2M'ini kurmasa da (M6), olay tablosunun bu çokluğu kaldıracak şekilde tasarlanması gerekir — `belgeler` olaya kolon değil M2M ile bağlanır. M5'te bu sadece tasarım taahhüdüdür.
- **Doğruluk henüz M5'te *zorlanmaz*:** Denge (Σborç=Σalacak), muavin zorunluluğu, cari bağı — hepsi `cozum_satirlari`/`muavin_hesaplar` katmanında (M4 trigger'ı + M7). M5 olay iskeletidir; bir olayın "çözümü tam mı" güvencesi M7'de gelir. M5'te olay `durum='onayli'` olsa bile çözümü olmayabilir — bu geçiş dönemi tutarsızlığı **kabul edilir** ve M7 doğrulamasıyla kapanır.

**Muhasebe verdict:** M5 doğruluk kurallarını taşımaz ama hiçbirini ihlal etmez. Tek somut gereklilik: `islem_tarihi` alanının M5'te eklenmesi (kronoloji retrofit'ini önlemek). Olay↔belge çokluğunun M2M ile modellenmesi taahhüdü korunmalı.

---

## 4. Eğitim tasarımı değerlendirmesi

**Karar veren mekanizma:** ADR-009 (Learning Engine) + ADR-015 (Yetkinlik) + S0 #8 (öğretim zinciri).

- **Ölçüm ekseni netleşir:** Üniteler *navigasyon* (nerede çalışıyorum), yetkinlikler *ölçüm* (neyi biliyorum). M5'in en önemli eğitimsel kararı yetkinlik bağını **olay** düzeyine koymaktır (§9). Neden: bir olay "veresiye satış" ise, ondan türeyen `yevmiye_kaydi` de `hata_bulma` da `coktan_secmeli` de **aynı** yetkinlik profilini (kdv 0.5, cari-hesap 0.5) paylaşır. Ağırlık soru düzeyinde tutulursa aynı profil N kez kopyalanır ve **sapabilir** (bir soruda kdv 0.5, kardeşinde 0.4 → tutarsız XP).
- **Scaffold hazırlığı:** `destek_seviyesi` (rehberli/standart/serbest) M5'te `sorular`'a eklenir. Bu, ADR-004/009/010'un scaffold vaadinin veri ayağı. MVP'de hepsi `standart`; ileri seviye (`serbest`, öğrenci kendi muavinini açar) v2.1.
- **XP kaynağı tekilleşir:** Doğru çözümde `ZORLUK_PUAN × olay_yetkinlikleri.agirlik` ilgili yetkinliklere dağıtılır (ADR-009). Kaynak olay olduğu için, öğrenci aynı olayı iki farklı soru tipiyle çözse bile XP olay-yetkinlik ağırlığından tek kaynaktan hesaplanır — çift sayım riski azalır.
- **"Benzer senaryo" önerisi:** Yetkinlik kesişimi olay düzeyinde daha anlamlı ("bu olayla aynı yetkinlikleri paylaşan diğer *olaylar*"); soru düzeyinde olsa aynı olayın kardeş soruları "benzer" diye önerilir — gürültü.

**Eğitim verdict:** Yetkinlik/etiket olay düzeyine taşınmalı — bu M5'in *pedagojik* çekirdek kararıdır, teknik bir ayrıntı değil. `destek_seviyesi` ve `islem_tarihi` M5'te eklenerek scaffold ve kronoloji retrofit'i önlenir.

---

## KARARLAR (özet — dört açık soruya net yanıt)

| # | Soru | **Karar** | Gerekçe |
|---|---|---|---|
| **K1** | `muhasebe_olaylari` ana (aggregate root) tablo mu olacak? | **EVET, aggregate root.** | ADR-002 (Kabul Edildi). `cozumler.olay_id`, `sorular.olay_id`, `simulasyon_adimlari.olay_id` hepsi buraya bağlanır. M5 bu kökü kurar. |
| **K2** | `sorular` artık `olay_id` ile mi çalışacak? | **EVET — `olay_id` nullable FK (restrict) eklenir; 70 soru 1:1 backfill'lenir; NOT NULL kısıtı KONMAZ.** | Additive uyumluluk (ADR-002). Backfill sonrası IS NULL kümesi boş ama kolon nullable kalır → admin yeni soru akışı olay olmadan kırılmaz; zorunluluk Olay Stüdyosu (S7) ile uygulama katmanında gelir. |
| **K3** | `belge_turleri` / `belgeler` M5 kapsamında mı, M6'ya mı? | **M6'ya ERTELENİR.** `belge_tip` bir **enum**'dur, `belge_turleri` tablosu yoktur (V2-VERI-MODELI §5). `belgeler` tablosu + `olay_belgeleri` M2M = M6. | M5'te `belgeler` olmadığı için `olay_belgeleri` FK hedefi yok — kurulamaz. Olay↔belge çokluğu M5'te yalnız *tasarım taahhüdü* (M2M ile bağlanacak, kolon değil). |
| **K4** | `soru_yetkinlikleri`/`soru_etiketleri` korunacak mı, `olay_yetkinlikleri`/`olay_etiketleri` mi? | **OLAY düzeyine taşınır. Boş `soru_yetkinlikleri`/`soru_etiketleri` M5'te DROP edilir; `olay_yetkinlikleri`/`olay_etiketleri` kurulur.** Bir ADR-017 açılır. | Her iki tablo **0 satır**, hiçbir kod okumuyor, M2 kendi notunda (satır 17-18) bunu geçici işaretlemişti. Ölçüm/keşif olay-düzeyi özelliğidir (§4); soru düzeyi sapma ve gürültü üretir. Maliyet sıfır. |

> **ADR disiplini notu:** K4 bir M2M bağını (M2'de `sorular`, hedefte `olay`) değiştirdiği için **ADR-017** açılmalı (M2'nin ilgili notu "Yerini Aldı" değil, "değerlendirildi ve olay düzeyine alındı" olarak referanslanır). M2'nin kendi yorumu bu değerlendirmeyi zaten öngördüğünden bu bir *salınım* değil, *planlı netleşme*.

---

## 5. Önerilen tablolar (M5 kapsamı)

### 5a. Yeni tablo — çekirdek
- **`muhasebe_olaylari`** (aggregate root, text PK `olay-…`): `baslik`, `senaryo`, `islem_tarihi` (date, null), `zorluk` (mevcut enum), `ipucu`, `durum` (mevcut `soru_durum` enum, default `taslak`), `kaynak`, `ekleyen_id` (→kullanicilar, set null), `isletme_id` (text, null — v2.1'e kadar hep null, **FK yok**, ADR-010 evren deseni), timestamps.

### 5b. Yeni tablo — olay M2M (FK hedefi hazır olanlar)
- **`olay_yetkinlikleri`** — (olay_id [cascade], yetkinlik_id [restrict]), `agirlik numeric(3,2) default 1 check (0<agirlik<=1)`. **XP dağıtımının kaynağı.**
- **`olay_etiketleri`** — (olay_id [cascade], etiket_id [cascade]). Filtre/keşif.
- **`olay_muavinleri`** — (olay_id [cascade], muavin_id [restrict]). Sorunun dropdown evreni (eski `sorular.muavinler` jsonb'un normalize hedefi). *Tablo M5'te kurulur, doldurma M7'ye ertelenir* (kod→muavin eşlemesi orada).

### 5c. Mevcut tablo değişikliği
- **`sorular`** +4 kolon: `olay_id` (text, *FK muhasebe_olaylari* restrict, **null**), `tip` (text, *FK soru_tipleri* not null default `'yevmiye_kaydi'`), `destek_seviyesi` (yeni enum, not null default `'standart'`), `config` (jsonb default `'{}'`).

### 5d. Yeni enum
- **`destek_seviyesi`**: `rehberli`, `standart`, `serbest`.

### 5e. DROP edilen (boş, maliyetsiz)
- **`soru_yetkinlikleri`**, **`soru_etiketleri`** (0 satır, kod okumuyor).

### 5f. M5'te KURULMAYAN (bağımlılık) — bilinçli erteleme
| Tablo | Neden ertelendi | Nereye |
|---|---|---|
| `olay_belgeleri` | `belgeler` tablosu yok | M6 |
| `cozum_mevzuat` | `mevzuat_maddeleri` yok | M8 |
| `cozum_satirlari` / `cozumler` v2 | kod→muavin eşlemesi (kırıcı) | M7 |

---

## 6. Tablo ilişkileri

```
muhasebe_olaylari(id) ◄── sorular.olay_id              [restrict, null]   (K2)
                      ◄── olay_yetkinlikleri.olay_id   [cascade]
                      ◄── olay_etiketleri.olay_id      [cascade]
                      ◄── olay_muavinleri.olay_id      [cascade]
                      ◄── cozumler.olay_id             [cascade]   (M7'de)
                      ◄── simulasyon_adimlari.olay_id  [restrict]  (M10'da)
                      ◄── olay_belgeleri.olay_id       [cascade]   (M6'da)

yetkinlikler(id)   ◄── olay_yetkinlikleri.yetkinlik_id [restrict]
etiketler(id)      ◄── olay_etiketleri.etiket_id       [cascade]
muavin_hesaplar(id)◄── olay_muavinleri.muavin_id       [restrict]
soru_tipleri(id)   ◄── sorular.tip                      [restrict]
kullanicilar(id)   ◄── muhasebe_olaylari.ekleyen_id     [set null]
```

**Cascade felsefesi (V2-VERI-MODELI §3 ile aynı):** aggregate-içi bağlar (olay→olay_* M2M, olay→cozum) **cascade**; aggregate'ler arası / katalog bağları (olay→yetkinlik/muavin, soru→olay) **restrict** — kullanılan katalog/olay silinmeden bağ sökülür. `olay_etiketleri` etiket tarafı cascade (etiket serbest sınıflama, silinince bağ da gitsin).

---

## 7. Soru ↔ Muhasebe Olayı ilişkisi

- **Kardinalite:** 1 olay → **N soru** (her soru bir `tip` ile). Ters yön: 1 soru → **0..1 olay** (`olay_id` null = eski soru).
- **Miras kuralı (uygulama katmanı):** Soru instance'ında `senaryo`/`baslik` null bırakılırsa olaydan miras alınır; doldurulursa override (örn. `hata_bulma` farklı yönerge metni taşır). M5 backfill'de her soru kendi senaryosunu **kendi** tutar (1:1), miras optimizasyonu sonraki üretimde başlar.
- **Backfill (70 soru → 70 olay, 1:1):**
  - Her `onayli` soru için bir olay üretilir: `id = 'olay-' || sorular.id` (deterministik, idempotent), `baslik/senaryo/zorluk/ipucu/durum/kaynak/ekleyen_id` kopyalanır.
  - `sorular.olay_id` bu olaya set edilir; `sorular.tip = 'yevmiye_kaydi'` (mevcut soruların hepsi yevmiye).
  - `olay_etiketleri` ← `sorular.etiketler` jsonb/array **best-effort** eşlenir (etiket id'si katalogda varsa bağlanır, yoksa rapora düşer — kayıp yok, `sorular.etiketler` M11'e kadar durur).
  - `olay_yetkinlikleri` **boş bırakılır** — yetkinlik ağırlığı otomatik türetilemez (içerik uzmanı kararı); ünite→yetkinlik heuristiği düşük değerli/riskli. İçerik geçişinde (S4 öncesi) elle/AI-taslak doldurulur. Learning Engine (M9/S5) bu boşluğa kadar zaten devrede değil.
  - `olay_muavinleri` **boş bırakılır** — doldurma M7 (kod→muavin).
- **Bozulmayan bağlar:** `ilerleme.soru_id`, `atolye_sorulari.soru_id`, katkıcı/liderlik hepsi `sorular.id`'ye bağlı kalır — olay katmanı üstte şeffaf.

---

## 8. Belge ↔ Muhasebe Olayı ilişkisi

- **M5'te ilişki KURULMAZ** (K3) — `belgeler` tablosu M6'da. M5 yalnız *tasarım taahhüdünü* dondurur:
  - Belge olaya **kolon değil M2M** (`olay_belgeleri`) ile bağlanır. Sebep: bir belge N olayda (aynı fatura → kayıt olayı + KDV olayı), bir olay N belgede (bordro + tahakkuk fişi, V2-VERI-MODELI §13.4).
  - `belge_tip` **enum** (tablo değil) — her tip bir render şablonu ister, ürün kararıyla çoğalmaz (V2-VERI-MODELI §5 karar kuralı).
  - Belgesiz olaylar (açılış/kapanış/amortisman/reeskont) için ilişki **0..N** — belge opsiyonel. Bu olaylar `belge_yon='ic'` (iç fiş) değerini ister; enum M6'da finalize edilir (ADR-003 açık kararı).
- **M5'in belge için tek görevi:** `muhasebe_olaylari`'nı belge çokluğunu kaldıracak şekilde tasarlamak (yani olaya belge kolonu **eklememek**). Bu taahhüt M5'te yerine getirilir; gerçek bağ M6'da.

---

## 9. Yetkinlik/Etiket: soru düzeyi → olay düzeyi taşıma kararı (K4 detay)

### Neden taşınıyor
| Boyut | Soru düzeyi (mevcut, boş) | Olay düzeyi (öneri) |
|---|---|---|
| Tutarlılık | Aynı olayın N sorusu ağırlığı N kez kopyalar → sapma riski | Tek kaynak, sapma yok |
| XP kaynağı (ADR-009) | Soru başına; çift sayım riski | Olay-yetkinlik ağırlığından tek hesap |
| "Benzer senaryo" | Kardeş sorular "benzer" çıkar → gürültü | Olay kesişimi anlamlı |
| Bakım | Yeni tip eklendikçe ağırlık tekrar girilir | Tip eklemek ağırlığı etkilemez |
| Maliyet (bugün) | 0 satır — kayıp yok | 0 satır — sıfır backfill |

### Kararın sınırı — ne taşınMIYOR
- **`sorular.tip`** yetkinliği zımnen ima edebilir (`hata_bulma` tipi → `hata-bulma` yetkinliği). Bu bağ **`soru_tipleri`→yetkinlik türevi** olarak kod/katalog düzeyinde çözülür, **per-soru saklanmaz**. Böylece "bu olay hangi becerileri öğretir" (olay_yetkinlikleri) ile "bu render tipi hangi ek beceriyi zorlar" (tip türevi) ayrışır.
- **Per-soru override** (bir sorunun olaydan farklı yetkinlik ağırlığı taşıması) MVP'de **gerekmiyor** — ihtiyaç kanıtlanırsa v2.2'de `soru_yetkinlik_override` olarak eklenir (ADR-016 "ihtiyaç kanıtlanınca" ilkesi).

### Etiket için ek not
`sorular.etiketler` jsonb/array (eski, hâlâ dolu olabilir) → M5 backfill'de `olay_etiketleri`'ne best-effort taşınır, `sorular.etiketler` M11'e kadar dual-read için **durur**. Üç temsil (eski jsonb, boş `soru_etiketleri`, yeni `olay_etiketleri`) M5 sonunda **ikiye** iner (jsonb + olay); M11'de **bire** (olay) iner.

---

## 10. M5 migration planı (sıra — SQL değil)

Tek migration dosyası, idempotent, manuel çalıştırmaya uygun (kullanıcı tercihi), transaction sarmalı, sonunda doğrulama + `notify pgrst`.

| Adım | İçerik | Kırıcı? |
|---|---|---|
| 1 | `create type destek_seviyesi` (rehberli/standart/serbest) | Hayır |
| 2 | `create table muhasebe_olaylari` (+ RLS İçerik şablonu, index `durum where onayli`) | Hayır |
| 3 | `create table olay_yetkinlikleri / olay_etiketleri / olay_muavinleri` (+ RLS dolaylı-onay, ters-yön index'ler) | Hayır |
| 4 | `alter table sorular add olay_id / tip / destek_seviyesi / config` (nullable/defaultlu) + index `(olay_id)`, `(tip)` | Hayır (additive) |
| 5 | **Backfill:** 70 onaylı soru → 70 olay (deterministik id); `sorular.olay_id`/`tip` set | Hayır |
| 6 | **Backfill:** `sorular.etiketler` → `olay_etiketleri` (best-effort, eşleşmeyen rapora) | Hayır |
| 7 | `drop table soru_yetkinlikleri, soru_etiketleri` (0 satır) | Hayır (boş) |
| 8 | **Doğrulama DO bloğu:** olay sayısı = onaylı soru sayısı; her sorunun `olay_id` dolu; `tip` FK geçerli; yetim olay yok; eşleşmeyen etiket raporu; tablo/enum varlık kontrolü | — |
| 9 | `notify pgrst, 'reload schema'` | — |

**Önemli:** `olay_yetkinlikleri` ve `olay_muavinleri` M5'te **boş** kalır (içerik/M7 dolduracak) — bu bir eksik değil, bilinçli faz ayrımı. Doğrulama bu boşluğu "hata" saymaz.

**ADR-017** (yetkinlik/etiket olay düzeyine) migration ile birlikte yazılır; ADR-V2.md'ye eklenir.

---

## 11. Riskler

| # | Risk | Şiddet | Önlem |
|---|---|---|---|
| R1 | Etiket backfill'de `sorular.etiketler` değerleri `etiketler` katalog id'leriyle eşleşmezse sessiz kayıp | Orta | Best-effort + **eşleşmeyen listesi migration raporunda**; `sorular.etiketler` M11'e kadar durur (geri alınabilir) |
| R2 | `olay_yetkinlikleri` boş kalınca Learning Engine "veri yok" sanar | Düşük | M9/S5'e kadar Learning Engine devrede değil; boşluk bilinçli, içerik geçişinde dolar |
| R3 | K4 drop'u bir gün "aslında soru düzeyi lazımdı"ya dönerse salınım | Düşük | Tablolar boş+kullanılmıyor; per-soru override yolu (v2.2) açık bırakıldı; ADR-017 kararı gerekçeli dondurur |
| R4 | `sorular.olay_id` nullable kalınca zamanla olaysız soru birikir (veri hijyeni) | Orta | Olay Stüdyosu (S7) NOT NULL'a geçiş kapısı; ara dönemde admin panel "olaysız soru" filtresi |
| R5 | Deterministik `olay-<soru_id>` id çakışması (idempotent re-run) | Düşük | `on conflict do nothing/update`; re-run backfill'i bozmaz |
| R6 | Olay `onayli` ama çözümü M7'ye kadar yok → geçiş tutarsızlığı | Kabul | Bilinçli; M7 doğrulaması kapatır. M5 kullanıcıya görünmez (frontend `sorular` okur) |
| R7 | `islem_tarihi` M5'te atlanırsa simülasyon kronolojisi retrofit ister | Orta | **M5'te ekle** (nullable) — §3 gereği |
| R8 | ADR-017 açılmadan drop yapılırsa karar kaydı boşluğu (proje anayasa disiplini) | Düşük | Migration + ADR-017 aynı commit'te |

---

## 12. Test planı

### 12a. Migration doğrulaması (SQL, migration içi DO bloğu — M1–M4 deseni)
- `count(muhasebe_olaylari)` = `count(sorular where durum='onayli')` (=70).
- Her `sorular.olay_id` dolu ve geçerli FK; `tip` `soru_tipleri`'nde var.
- Yetim olay yok (`muhasebe_olaylari` \ `sorular.olay_id`) — 1:1 backfill'de olmamalı.
- `soru_yetkinlikleri`/`soru_etiketleri` düşmüş (`to_regclass IS NULL`).
- `olay_yetkinlikleri`/`olay_etiketleri`/`olay_muavinleri`/`muhasebe_olaylari` var; `destek_seviyesi` enum var.
- Eşleşmeyen etiket sayısı raporlanır (hata değil, uyarı).

### 12b. Dry-run (canlı, BEGIN…ROLLBACK — M4a'da kanıtlanan yöntem)
Gerçek uygulamadan önce migration gövdesi rollback'li işlemde çalıştırılır; yukarıdaki sayımlar exception mesajıyla toplanır; hiçbir kalıcılık bırakılmaz. Temizse `apply_migration` onaya sunulur.

### 12c. Regresyon (mevcut akışlar M5 sonrası bozulmamalı)
- `uniteler-loader.ts` / `SoruEkrani`: soru çözme akışı `olay_id` eklenmiş `sorular`'la çalışır (yeni kolonları okumaz → etkilenmez).
- `kontrol.ts`: `cozumler` dokunulmadı → yevmiye kontrolü aynen.
- Admin panel: soru listeleme/düzenleme yeni kolonları görmezden gelir (henüz UI yok).
- `atolye_sorulari`, `ilerleme`, liderlik RPC'leri: `sorular.id` bağları korundu.

### 12d. İleri-doğrulama (M5'in sonraki adımlara zemini)
- `olay_muavinleri` boş ama tablo M7 backfill'ini kabul edecek yapıda (FK muavin_hesaplar'a bağlı).
- `olay_belgeleri`/`cozum_mevzuat` M5'te yok — M6/M8 bunları eklerken olay tablosu hazır.

---

## Kapanış — M5'in tek cümlelik taahhüdü

M5, **görünmez ama temel** bir sprint: kullanıcı hiçbir değişiklik görmez, ama platformun atomu bu migration'la "soru"dan "muhasebe olayı"na döner; ölçüm ekseni (yetkinlik) ve keşif ekseni (etiket) doğru katmana (olay) yerleşir; ve bunların hepsi mevcut 70 soruyu, `ilerleme`yi, atölyeleri, admin'i **hiç kırmadan** additive olarak yapılır.

**Sonraki adım:** Onayın gelirse M5 SQL'i + ADR-017 bu dokümana referansla yazılır (ayrı adım, ayrı onay).
