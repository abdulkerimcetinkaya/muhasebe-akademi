# M9 — Learning Engine · Mimari Analiz

**Sürüm:** 1.0 · **Tarih:** 8 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) (ADR-009/015/019) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) (§2.3, §8) · [M5-MIMARI-ANALIZ.md](M5-MIMARI-ANALIZ.md) (olay_yetkinlikleri) · [M7-MIMARI-ANALIZ.md](M7-MIMARI-ANALIZ.md)
**Kapsam:** M9 (Learning Engine) migration'ının mimari değerlendirmesi. **SQL / migration / apply / commit içermez.**
**Statü:** Onaya sunuldu.

---

## 0. M9 nedir + ADR-009/015 bağlamı

M9, öğrenme ölçümünü "soru çözüldü/çözülmedi"den (mevcut `ilerleme`) **yetkinlik bazlı** ölçüme taşır (ADR-009). Üniteler *navigasyon* eksenidir (nerede çalışıyorum); yetkinlikler *ölçüm* eksenidir (neyi ne kadar biliyorum — ADR-015). `kullanici_yetkinlikleri` mevcut `ilerleme`nin **yanına** gelir, yerine değil. Doğru çözümde `ZORLUK_PUAN × olay_yetkinlikleri.agirlik` ilgili yetkinliklere dağıtılır.

### 0.1 Ölçülen durum (canlı, 8 Tem 2026)

| Varlık | Durum | M9'a etkisi |
|---|---|---|
| `ilerleme` | **2 satır, 1 kullanıcı** (id, user_id, soru_id, dogru_mu, sure_saniye, kullanilan_ai, cozum_gosterildi, **kazanilan_puan**) | Gerçek geçmiş yok → backfill konusuz |
| `olay_yetkinlikleri` (M5) | **0 satır** (yapı var, ağırlık yok) | XP dağıtımının **kaynağı boş** → akış dormant |
| `kullanici_yetkinlikleri` | **yok** | M9 kuracak |
| `yetkinlikler` (M2) | 22 (hiyerarşik) | FK hedefi hazır |
| `kullanicilar` | 8 (ağırlıkla test/admin) | |
| sorular olay-bağlı | 70 | soru→olay zinciri hazır; olay→yetkinlik ağırlığı yok |

**Kritik gözlem:** M9'un XP akışı **iki bağımlılığa** dayanır — (a) `olay_yetkinlikleri` ağırlıkları (boş), (b) `ilerleme` geçmişi (2 satır). İkisi de yok → M9 **yapı kurar, akış içerik gelince aktifleşir**. Backfill *yapılacak bir şey olmadığı için* değil, gürültülü olduğu için değil, **konusuz** olduğu için yapılmaz (M6b/M7b'den farklı — orada veri vardı, burada yok).

---

## 1. `kullanici_yetkinlikleri`

Kullanıcı × yetkinlik başına biriken ölçüm (V2-VERI-MODELI §2.3).

| Alan | Tip | Not |
|---|---|---|
| **user_id** | uuid *FK kullanicilar* cascade | bileşik PK (KVKK silme: cascade) |
| **yetkinlik_id** | text *FK yetkinlikler* cascade | bileşik PK |
| xp | int not null default 0 | **biriken** akümülatör (çözümde artar) |
| dogru_sayisi | int not null default 0 | |
| yanlis_sayisi | int not null default 0 | |
| son_calisma | timestamptz null | recency (zayıf alan + aralıklı tekrar) |

**Saklanan vs türetilen (ADR-009, bkz. §4):**
- **Saklanır (akümülatör):** `xp`, `dogru_sayisi`, `yanlis_sayisi` — çözüm anında (write) artar. Her okumada soru→olay→yetkinlik→ağırlık zincirini yeniden hesaplamamak için.
- **Türetilir (asla saklanmaz):** seviye (XP eşik fonksiyonu), toplam XP (sum), zayıf alan (başarı oranı + recency), skill-tree ilerlemesi → **view/fonksiyon**.

---

## 2. `olay_yetkinlikleri` ilişkisi — M9'un asıl bağımlılığı

- **M9 bu tabloya BAĞIMLI.** XP dağıtımı `olay_yetkinlikleri.agirlik`'ten hesaplanır (ADR-009). Tablo M5'te kuruldu ama **boş** (M5-MIMARI §7: ağırlık otomatik türetilemez, içerik kararı).
- **Ağırlık nasıl verilecek? → MANUEL/kürasyon** (§6.2). Her olaya, içerik üreticisi yetkinlik ağırlığı atar (bir olay: kdv 0.5, cari-hesap 0.5; toplam ≤ 1). Otomatik türetme (ünite/etiket/hesap kodundan) yanlış hiyerarşi → yanlış ölçüm riski (ADR-015 dezavantaj). AI taslak (ADR-012) hızlandırabilir ama insan onayı şart.
- **Sonuç:** M9 `kullanici_yetkinlikleri`'ni ve XP dağıtım mekanizmasını kurar; ama XP fiilen akmaya **`olay_yetkinlikleri` kürasyonla dolunca** başlar. Bu, M5'te bilinçli boş bırakmanın (olay_yetkinlikleri) M9'da ödenen faturasıdır — beklenen sıra.

---

## 3. `ilerleme` tablosu ile ilişki

- **`kullanici_yetkinlikleri` `ilerleme`'nin yanına gelir** (ADR-009). `ilerleme` = soru bazlı istatistik logu (her çözümde: dogru_mu, süre, kazanilan_puan). `kullanici_yetkinlikleri` = yetkinlik bazlı agregasyon. Çift kayıt değil — farklı eksenler (soru vs yetkinlik).
- **Mevcut geçmişten XP türetilebilir mi? → HAYIR (konusuz).** `ilerleme` 2 satır (1 kullanıcı, test). Üstelik türetme `olay_yetkinlikleri` ağırlıklarını ister — o da boş. İki taraf da yok → türetilecek anlamlı XP yok.
- **Backfill güvenli mi? → Backfill YOK.** Güvenlik sorunu değil, *konu* yok: geçmiş 2 satır + ağırlık 0. Backfill yazmak boşa migration.
- **İleriye dönük mü? → EVET.** `kullanici_yetkinlikleri` boş kurulur; XP, yeni çözümlerde (olay_yetkinlikleri kürasyonla dolduktan sonra) akümüle olur.

### XP yazım mekanizması (ileriye dönük)
Doğru çözümde (`ilerleme` insert, dogru_mu=true) XP dağıtılır: **soru → olay (sorular.olay_id) → olay_yetkinlikleri (ağırlıklar) → kullanici_yetkinlikleri upsert** (`xp += ZORLUK_PUAN × agirlik`, `dogru_sayisi++`, `son_calisma=now()`). İki seçenek:
- **DB trigger** (`ilerleme` after insert) — atomik, bypass edilemez; **öneri**.
- **RPC/uygulama** — esnek ama disiplin ister.
Ya da hibrit: `ilerleme_kaydet()` RPC hem ilerleme'yi yazar hem XP dağıtır (tek transaction).

**Çift sayım riski (ADR-009 flagged):** Aynı soruyu tekrar doğru çözmek XP'yi tekrar ekler mi? **MVP: soru başına ilk doğru çözümde** (idempotent — `ilerleme`de o (user, soru) için önceki doğru yoksa). Aralıklı tekrar (tekrar XP, azalan) v2.1 (ADR-009 spaced repetition). Bu, **award politikası** açık alt-kararıdır (§6).

**Frontend adaptasyonu — AYRI COMMIT:** Yeni doğru yol `ilerleme_kaydet()` RPC'sidir. Uygulamanın mevcut doğrudan `ilerleme` insert'inden RPC çağrısına geçmesi **M9 kapsamı dışı, ayrı bir frontend commit**'idir. Geçişe kadar RPC ile doğrudan insert bir süre yan yana yaşar (doğrudan insert XP dağıtmaz; yalnız RPC dağıtır). Bu, muavin/cari frontend commit'i gibi ayrı ele alınır.

---

## 4. ADR-009 / ADR-015 uyumu

- **XP türetilen mi saklanan mı? → İKİSİ, ayrımıyla:** per-yetkinlik `xp` **saklanır** (write-time akümülatör — olay→yetkinlik zincirini her okumada koşmamak için); **seviye / toplam XP / zayıf alan saklanmaz, türetilir** (ADR-009 "türetilen saklanmaz" bunlara uygulanır). Banka bakiyesi analojisi: bakiye (xp) tutulur, faiz/rapor (seviye/zayıf alan) hesaplanır.
- **Yetkinlik sistemi nasıl güncellenecek?** Yetkinlik *kataloğu* (M2, hiyerarşik 22) sabit; kullanıcının yetkinlik *ilerlemesi* çözümle artar (write). Seviye eşikleri bir fonksiyon/config; değişirse migration'sız (view yeniden hesaplar).
- **Mevcut motivasyon katmanı korunur** (ADR-009): puan/streak/rozet/liderlik (`ilerleme.kazanilan_puan`, mevcut) sökülmez; `kullanici_yetkinlikleri` üstüne eklenir. Yetkinlik rozetleri ("KDV Ustası") mevcut rozet sistemini genişletir (gelecek).

---

## 5. M7 / M8 etkisi

- **M7 (cevap anahtarı ayrı — ADR-019):** M9, kullanıcının **cevabını** değil **sonucunu** okur. Akış: `kontrol.ts` (kullanıcı cevabı vs `cozum_satirlari`) → dogru_mu → `ilerleme` → XP. M9, cevap anahtarına (`cozum_basliklari/satirlari`) doğrudan dokunmaz; kontrol *sonucunu* tüketir. Ayrım temiz. **Not:** cevap anahtarı da (M7a) boş → yeni içerik gelince kontrol→ilerleme→XP zinciri baştan sona akar.
- **M8 (mevzuat):** İleride **mevzuat-bazlı yetkinlik analitiği** mümkün: `cozum_mevzuat → madde → kaynak` bir yetkinliğe eşlenip "bu kullanıcı KDV mevzuatında zayıf" çıkarımı üretebilir. Ama bu bir **gelecek zenginleştirme**, çekirdek M9 değil. Çekirdek ölçüm `olay_yetkinlikleri` üzerinden; mevzuat katmanı opsiyonel ikinci eksen (v2.2).

---

## 6. Açık kararlar

| # | Karar | Öneri |
|---|---|---|
| 6.1 | **XP backfill yapılacak mı?** | **HAYIR.** İki taraf da boş (ilerleme 2 satır + olay_yetkinlikleri 0). Konusuz → ileriye dönük akümülasyon. |
| 6.2 | **Yetkinlik ağırlıkları manuel mi otomatik mi?** | **Manuel/kürasyon** (içerik üreticisi olaya atar; AI taslak + insan onay). Otomatik türetme yanlış ölçüm riski. |
| 6.3 | **Kullanıcı seviyeleri saklanacak mı, view mı?** | **View/fonksiyon (türetilir).** Seviye = XP eşik fonksiyonu; toplam/zayıf alan da view. Yalnız `xp/dogru/yanlis` akümülatörü saklanır. |
| 6.4 | **XP award politikası (alt-karar)** | MVP: **soru başına ilk doğru çözüm** (idempotent). Aralıklı tekrar (tekrar/azalan XP) v2.1. |
| 6.5 | **XP yazım mekanizması** | `ilerleme` trigger **veya** `ilerleme_kaydet()` RPC (tek transaction, çift sayım guard'lı). Öneri: RPC (esneklik + atomiklik). |

---

## Nihai mimari öneri

**M9, `kullanici_yetkinlikleri`'ni ve XP dağıtım mekanizmasını kurar; backfill YOK, XP ileriye dönük akümüle olur.** XP akışı `olay_yetkinlikleri` kürasyonla dolunca aktifleşir.

### Kapsam (M9)
1. `kullanici_yetkinlikleri` tablosu (bileşik PK, xp/dogru/yanlis/son_calisma) + Sahiplik RLS
2. XP dağıtım mekanizması: `ilerleme_kaydet()` RPC **veya** `ilerleme` trigger (soru→olay→olay_yetkinlikleri→upsert), idempotent (ilk-doğru)
3. Türetim view'ları: `kullanici_yetkinlik_seviye` (seviye/toplam), `kullanici_zayif_alan` (başarı oranı + recency)
4. **Backfill YOK** — doğrulama `kullanici_yetkinlikleri=0` bekler
5. Yeni ADR **gerekmez** — M9 ADR-009/015'i doğrudan uygular

### Bağımlılık zinciri (aktifleşme sırası)
```
olay_yetkinlikleri kürasyonu (içerik)  ─┐
cozum_basliklari/satirlari (yeni içerik) ─┼─→ kontrol → ilerleme → XP → kullanici_yetkinlikleri
sorular.olay_id (M5, HAZIR) ─────────────┘
```
M9 yapıyı kurar; zincir içerik gelince baştan sona akar.

---

## Riskler ve alternatifler

| # | Risk / Alternatif | Şiddet | Önlem |
|---|---|---|---|
| R1 | **Çift XP sayımı** (tekrar çözüm / trigger iki kez) | Orta | İlk-doğru idempotency (ADR-009 flagged); RPC/trigger tek-yol |
| R2 | **olay_yetkinlikleri boş kaldıkça M9 dormant** — "çalışmıyor" algısı | Düşük | Bilinçli; M9 yapı, kürasyon içerik işi; beklenen sıra (M5→M9) |
| R3 | **Yetkinlik ağırlığı toplamı > 1** (içerik hatası) | Düşük | Ağırlık check (0<agirlik≤1, M5'te var); olay başına toplam ≤1 doğrulama sorgusu/uygulama |
| R4 | **Seviye eşik fonksiyonu değişirse geçmiş bozulur mı** | Düşük | Seviye türetilir (saklanmaz) → eşik değişince view otomatik yeniden hesaplar, migration yok |
| ALT | **XP'yi de türet (saklama)** | — | Reddedildi: her okumada soru→olay→yetkinlik→ağırlık zinciri pahalı; akümülatör doğru denge |
| ALT | **Seviyeyi sakla** | — | Reddedildi: ADR-009 "türetilen saklanmaz"; senkron borcu |

---

## Kapanış — M9'un taahhüdü

M9, ölçümü becerinin kendisinde toplar (ADR-015): "Elif KDV'de iyi, tevkifatta zayıf" çıkarımını mümkün kılar; kişiselleştirme, zayıf-alan tekrarı ve seviye-bazlı scaffold'un (ADR-004/010) veri ayağıdır. Mevcut motivasyon katmanı (puan/streak/rozet) sökülmez, üstüne eklenir. Veri gerçeği M9'u basitleştiriyor: **backfill konusuz** (ilerleme 2 satır + olay_yetkinlikleri boş); M9 yapıyı kurar, XP `olay_yetkinlikleri` kürasyonuyla ileriye dönük akar. Türetilen (seviye/zayıf alan) saklanmaz; yalnız xp akümülatörü tutulur.

**Sonraki adım:** Onayın gelirse **M9 SQL taslağı** (M6a/M7a/M8 akışı: taslak → dry-run → onay → apply → test). Özellikle **XP yazım mekanizması (RPC vs trigger)** ve **award politikası (ilk-doğru)** senin onayını bekliyor. Yeni ADR gerekmiyor.
