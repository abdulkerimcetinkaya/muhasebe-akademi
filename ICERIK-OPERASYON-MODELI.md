# İçerik Operasyon Modeli — Muhasebe Akademisi V2

**Sürüm:** 1.0 · **Tarih:** 8 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) (ADR-002/007/011/012/018/021) · [KURASYON-001-MIMARI-ANALIZ.md](KURASYON-001-MIMARI-ANALIZ.md) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md)
**Kapsam:** İçeriğin nasıl hazırlanacağı, doğrulanacağı, versiyonlanacağı, güncelleneceği ve ölçekleneceğinin operasyon standardı. **SQL / migration / seed apply / commit içermez.**
**Statü:** **ONAYLANDI — DONDURULDU (8 Temmuz 2026).** Bu belge, kalıcı içerik girişinin standardıdır; her içerik §8 akışından ve §10 checklist'inden geçer. KUR-001, bu standardın **ilk uygulaması** olarak apply edilir.

---

## 0. Amaç + mevcut durum + ilkeler

**Neden şimdi:** M1-M10 mimari fazı bitti; yapı hazır ama içerik boş. KUR-001 (tek olay) dry-run'ı başarılı — *tek* olay çalışıyor. Ama yüzlerce olay/soru + mevzuat güncellemesi + kalite kontrolü bir **operasyon standardı** olmadan sürdürülebilir değil. Bu doküman o standardı kurar; KUR-001 apply'ı bunun *ilk uygulaması* olur.

**Mevcut durum:**
- M1-M9 canlı (yapı), M10 v2.1'e ertelendi (tasarım donduruldu).
- KUR-001 seed taslağı yazıldı, dry-run temiz, **apply beklemede**.
- İçerik katmanları boş; aktivasyon içerikle gelir.

**Yönlendirici ilkeler (ADR):**
- **Olay merkezli (ADR-002):** İçeriğin atomu *muhasebe olayı*; soru = olayın bir tiple render'ı. 1 olay → N soru.
- **İçerik merkezli (ADR-007):** Yeniden kullanım yapısal — cari N olayda, belge N soruda, olay N soru tipinde. Darboğaz içerik üretim hızı.
- **AI müşteridir, motor değildir (ADR-012):** AI üretir/açıklar; **asla onaylamaz, asla puanlamaz**. Her AI çıktısı `taslak` doğar.
- **Mevzuat versiyonlama (ADR-011/021):** Çözümün deterministik dayanağı; değişiklik takibi operasyonel süreç.
- **Telif ilkesi:** Yalnız açık/resmi (Kategori 1) kaynaklar.

---

## 1. İçerik türleri

| Tür | Tablo(lar) | Not |
|---|---|---|
| **Muhasebe olayı** (atom) | `muhasebe_olaylari` | Aggregate root; her içeriğin merkezi |
| Belge | `belgeler` + `olay_belgeleri` | 13 tip (ADR-018); alış/satış faturası, dekont, bordro… |
| Cevap anahtarı | `cozum_basliklari` + `cozum_satirlari` | Varyantlı (7/A-7/B, aralıklı/sürekli envanter) |
| Mevzuat maddesi | `mevzuat_maddeleri` + `_versiyonlari` | Kimlik/versiyon (ADR-021) |
| Çözüm↔mevzuat bağı | `cozum_mevzuat` | Her onaylı çözümün dayanağı |
| Yetkinlik/etiket bağı | `olay_yetkinlikleri` (Σ=1) + `olay_etiketleri` | Ölçüm + keşif |
| Soru instance | `sorular` (tip, destek_seviyesi) | yevmiye_kaydi aktif; hata_bulma/coktan_secmeli türev |
| RAG kaynağı | `rag_chunks` (+`rag_kaynaklar`) | Ayrı, semantik (AI asistan); içerik değil *bağlam* |
| Simülasyon (v2.1) | `isletmeler`/`simulasyonlar`/`adimlari` | Adım = tarihli olay (aynı havuz) |

**Kural:** Yeni içerik her zaman *olay* olarak kurulur; "tekil soru" üretimi emekli (ADR-002).

---

## 2. İçerik kaynakları

| Kaynak | Kullanım | Telif |
|---|---|---|
| **mevzuat.gov.tr / gib.gov.tr** | Mevzuat madde metinleri (VUK/KDVK/GVK/KVK/TTK/5510 + tebliğler) | ✅ resmi/açık |
| **Fuat Hoca broşürü** | TDHP hesap planı referansı (272 hesap) | ✅ referans |
| **Yevmiye Kayıt Müfredatı** | Ünite/konu yapısı | ✅ iç |
| **e-Belge standartları** | Belge formatları (ETTN, tevkifat, valör) | ✅ resmi |
| **Cari kütüphanesi** | Tanıdık şirketler (ABC A.Ş., Delta, Yıldız) — süreklilik | ✅ iç kurgu |
| **AI taslak** (`ai-belge-uret`, prompt şablonları) | İlk taslak hızlandırma | çıktı `taslak` |
| **Katkıcı sistemi** | Şablon doldurma (5 onayda Premium) | moderasyon |

**Telif kırmızı çizgisi (rag_kurulumu ilkesi):** PwC/Deloitte/EY/KPMG raporları + telifli kitaplar **eklenemez**. Yalnız Kategori 1 (açık/resmi). TMS/TFRS (KGK Mavi Kitap), Ümit Güner açıklamalı MSUGT (yazar serbest paylaşımı) — istisna.

---

## 3. Standart içerik şablonu (Kürasyon-XXX)

**KUR-001 dokümanı şablonun kendisidir.** Her küratörlü olay şu 9 elementi tanımlar:
1. `muhasebe_olayi` (id `olay-<slug>-NNN`, baslik, senaryo, islem_tarihi, zorluk, ipucu, durum)
2. `olay_yetkinlikleri` — **ağırlık toplamı = 1.00** (zorunlu)
3. `olay_etiketleri` — küratörlü taksonomiden (ADR-017)
4. `belge`(ler) + `olay_belgeleri` — karşı taraf `cari_id` (normalize)
5. `cozum_basligi` (+varyant) — aciklama (mantık) + beyanname_etkileri + hata_kurallari
6. `cozum_satirlari` — **denge (Σborç=Σalacak)** + **muavin_id NOT NULL**
7. `cozum_mevzuat` — dayanak (≥1 madde kimliği)
8. Soru instance(lar) — tip + destek_seviyesi
9. (v2.1) simülasyon adımı bağı

**Adlandırma:** `olay-<slug>-NNN`, `soru-<slug>-NNN`, `belge_no` gerçekçi seri. **Seed disiplini:** idempotent, **doğal-anahtar lookup** (uuid gömme yasak), tek transaction (denge trigger commit'te).

---

## 4. Muhasebe doğrulama süreci

Her olay `onayli` olmadan önce bir **muhasebe uzmanı (SMMM/YMM)** kontrolünden geçer:

- **Denge:** Σborç = Σalacak (DB trigger + göz).
- **Muavin zorunlu:** her satır `muavin_id` (ana hesaba kayıt yok — ADR-005).
- **Cari zorunlu:** `cari_gerektirir` hesaplarda muavin cariye bağlı (120/320/360/102…).
- **Normal bakiye:** mizanda ters bakiye yok (`hesap_plani.normal_bakiye` ile).
- **KDV/tevkifat/stopaj:** oran + tutar + yön (indirilecek vs hesaplanan) doğru.
- **Yöntem varyantı:** aralıklı/sürekli envanter, 7/A-7/B tutarlı; birden çok geçerli çözüm `varyant`.
- **Min 2 satır + tek taraflılık.**

**Kritik:** Cevap anahtarı hatası her öğrenciyi *haksız yanlışa* düşürür → muhasebe onayı **insan zorunlu**, atlanamaz.

---

## 5. Mevzuat doğrulama süreci

- **Her onaylı çözümün dayanağı olmalı** (`cozum_mevzuat` ≥1 madde).
- Madde metni **resmi kaynaktan** (mevzuat.gov.tr), doğru madde no, doğru fıkra.
- `effective_date`/`expire_date` doğru (yürürlük); olayın `islem_tarihi`nde madde geçerli olmalı.
- **Deterministik ≠ RAG:** Çözüm dayanağı yapısal `cozum_mevzuat` (halüsinasyona yer yok); RAG (`rag_chunks`) yalnız AI asistan *bağlamı* (yaklaşık). İkisi karıştırılmaz (ADR-011).
- Mevzuat metni bir **mevzuat/vergi uzmanı** onayından geçer.

---

## 6. Versiyonlama modeli

| Katman | Model |
|---|---|
| **Olay/soru içeriği** | `durum` akışı: taslak → inceleme → onayli → arsiv. Şimdilik **yerinde düzenleme** (ADR-002: tam içerik versiyonlama ileride v2.2). |
| **Mevzuat** | **Kimlik/versiyon (ADR-021):** metin değişince yeni `mevzuat_madde_versiyonlari` satırı (eskiye `expire_date`, yeniye `effective_date`); **append-only**, kimlik sabit. |
| **Cevap anahtarı** | `varyant` = alternatif geçerli çözüm (versiyon değil). |
| **Kullanıcı kaydı (sim)** | Append-only + ters kayıt (ADR-005/010) — v2.1. |

---

## 7. Mevzuat değişikliklerinin takibi (ADR-011 "gizli süper güç")

**Süreç:**
1. **Tespit:** Resmi Gazete / GİB takibi (MVP manuel; gelecekte otomatik uyarı).
2. **Yeni versiyon:** İlgili maddeye yeni `mevzuat_madde_versiyonlari` (effective_date=değişiklik tarihi); eskiye `expire_date`.
3. **Etki analizi (tek sorgu):** `cozum_mevzuat → madde kimliği` üzerinden etkilenen tüm `cozum_basligi`'lar bulunur → admin **"gözden geçir" kuyruğu**.
4. **Gözden geçir:** Etkilenen çözümler kontrol edilir; gerekirse güncellenir, yeniden onaylanır.

**Neden kimliğe bağlı (ADR-021):** Versiyona pinlense bağ kırılırdı; kimliğe bağlı olduğundan madde değişse de etki analizi sağlam.

---

## 8. Yeni içerik ekleme akışı

```
Kürasyon dokümanı (tasarım)          → KURASYON-NNN-MIMARI-ANALIZ.md
  ↓ onay
Seed SQL taslağı                      → supabase/seeds/kurasyon-NNN-*.sql
  ↓ dry-run (BEGIN…ROLLBACK + assert)
Doğrulama (checklist §10)             → muhasebe + mevzuat + pedagoji + teknik
  ↓ onay
Apply (execute_sql — migration değil)
  ↓
Uçtan uca test                        → soru çöz → ilerleme_kaydet → XP → mizan
  ↓
onayli (öğrenciye açık)
```

**Ölçekleme (ADR-007):**
- **Şablon kütüphanesi:** "veresiye alış" şablonu cari/tutar/tarih parametreleriyle çoğaltılır.
- **AI taslak → insan onay** (§11).
- **Katkıcı:** şablon doldurma (tam olay kurmaktan kolay), moderasyon kuyruğu.

---

## 9. Seed ile başlama → Olay Stüdyosu'na geçiş

| Faz | Yöntem | Kriter |
|---|---|---|
| **Faz 1 (şimdi)** | Elle **seed SQL** (KUR-001 gibi), dry-run/apply disiplini | Az sayıda, yüksek kalite; standardı oturtmak |
| **Faz 2** | **Parametrik seed script** (şablondan toplu) | Şablon soyutlaması olgunlaşınca |
| **Faz 3 (S7)** | **Olay Stüdyosu** (admin UI): formla olay kurma + AI taslak + moderasyon kuyruğu | Olay sayısı eşiği / katkıcı akışı açılınca |

**Geçiş mantığı:** Seed disiplini standardı (checklist, dry-run) kanıtlar; Olay Stüdyosu bu standardı UI'a gömer. Erken UI yatırımı standart oturmadan risklidir → önce seed.

---

## 10. İçerik kalite kontrol checklist'i

**Muhasebe:** □ Denge (Σborç=Σalacak) □ muavin_id NOT NULL □ cari zorunluluğu □ normal bakiye □ KDV/tevkifat doğru □ yöntem varyantı □ min-2-satır

**Mevzuat:** □ Dayanak var (cozum_mevzuat ≥1) □ doğru madde/fıkra □ resmi kaynak □ yürürlük tarihi (islem_tarihi'nde geçerli)

**Pedagoji:** □ Senaryo gerçekçi □ ipucu yardımcı □ hata_kurallari çeldiricileri doğru □ zorluk uygun □ yetkinlik ağırlıkları anlamlı **(Σ=1)** □ etiketler doğru

**Teknik:** □ Idempotent seed □ doğal-anahtar (uuid gömme yok) □ dry-run temiz □ uçtan uca test (XP akıyor, mizan doğru) □ cevap anahtarı ≠ kullanıcı cevabı

**Telif:** □ Kaynak açık/resmi (Kategori 1)

**Onay:** □ Muhasebe uzmanı □ mevzuat uzmanı □ durum=onayli

---

## 11. AI destekli üretim + insan onayı sınırı (ADR-012)

**İlke:** AI **müşteridir**, motor değildir.

| AI yapabilir | AI ASLA yapamaz |
|---|---|
| Belge/senaryo/olay **taslağı** üretmek (`ai-belge-uret`) | İçeriği **onaylamak** |
| Yanlış cevabı **açıklamak** (`ai-yanlis-analizi`) | **Puanlamak** (kontrol deterministik) |
| Hata_kurallari / çeldirici **önermek** | Cevap anahtarını **yayınlamak** |
| Mevzuat madde metni **özetlemek** (taslak) | Mevzuat dayanağını **kesinleştirmek** |

**İnsan onayı sınırı (atlanamaz):**
- **Cevap anahtarı (`cozum_satirlari`)** — muhasebe uzmanı onayı **zorunlu**. Yanlış anahtar = her öğrenci haksız yanlış.
- **Mevzuat dayanağı** — mevzuat uzmanı onayı zorunlu.
- **Muhasebe doğruluğu + pedagoji** — insan.

**Güvenlik kapısı:** Tüm AI çıktısı `durum='taslak'` doğar → insan onayı olmadan öğrenciye ulaşmaz. AI, üretim *hızını* artırır; *kaliteyi/doğruluğu* insan garanti eder.

---

## 12. KUR-001 gibi içerikler hangi aşamada apply edilir

**Apply ön koşulları (hepsi):**
1. Kürasyon dokümanı **onaylı** (tasarım donduruldu).
2. Seed **dry-run temiz** (assert'ler + denge trigger geçti).
3. **Checklist §10 geçti** (muhasebe + mevzuat + pedagoji + teknik + telif + uzman onayı).
4. Uçtan uca test planı hazır.
5. **Bu operasyon standardı (bu doküman) onaylı.**

**KUR-001 özelinde:** 1-2 tamam; 3-5 bu dokümanın onayıyla tamamlanır. **Bu doküman onaylanınca KUR-001, standart altında apply edilen ilk içerik olur.** Bundan sonra her içerik aynı akıştan (§8) geçer.

**Batch vs tekil:** MVP'de **tekil, yüksek kalite** (KUR-001 gibi); şablon+AI olgunlaşınca **batch**. Pazar eşiği ~150 olay (PAZAR-ANALIZI); tekilden batch'e geçiş bu hacmi besler.

---

## Ek: Roller

| Rol | Sorumluluk |
|---|---|
| **Küratör** | Kürasyon dokümanı + seed taslağı; §10 teknik/pedagoji |
| **Muhasebe onaycısı** (SMMM/YMM) | Denge, muavin, cari, KDV, yöntem — §4 |
| **Mevzuat onaycısı** | Dayanak, madde, yürürlük — §5 |
| **Admin** | Apply, durum yönetimi, etki analizi kuyruğu, katkıcı moderasyonu |
| **AI** | Taslak üretimi + açıklama (müşteri, onaycı değil) |

---

## İçerik yaşam döngüsü

```
KAYNAK (resmi mevzuat / şablon / AI taslak)
  ↓ küratör
KÜRASYON DOKÜMANI (tasarım) → SEED TASLAĞI
  ↓ dry-run + checklist §10
UZMAN ONAYI (muhasebe + mevzuat)
  ↓ apply (execute_sql)
UÇTAN UCA TEST (XP + mizan)
  ↓
onayli → ÖĞRENCİYE AÇIK
  ↓ mevzuat değişince (§7)
ETKİ ANALİZİ → GÖZDEN GEÇİR → yeni versiyon / güncelle
```

---

## Kapanış

İçerik, platformun asıl darboğazıdır (ADR-007) ve tek olayın (KUR-001) çalışması bunu çözmez — **standart** çözer. Bu model: içeriğin *nasıl* kurulacağını (olay merkezli, 9 element), *nereden* besleneceğini (resmi/açık kaynak), *nasıl* doğrulanacağını (muhasebe+mevzuat+pedagoji+teknik checklist, insan onayı zorunlu), *nasıl* güncelleneceğini (mevzuat kimlik/versiyon + etki analizi) ve *nasıl* ölçekleneceğini (seed → şablon → Olay Stüdyosu) tanımlar. AI hızlandırır, insan garanti eder (ADR-012). **KUR-001 apply'ı, bu standart onaylanınca onun ilk uygulaması olarak yapılır.**

**Karar (8 Tem 2026):** Standart onaylandı. Kabul edilen çizgi: seed-önce/Olay-Stüdyosu-sonra · AI yalnız taslak (cevap anahtarı/mevzuat/yayın onayı insanda) · mevzuat append-only versiyonlanır · §10 checklist apply-öncesi kapı · KUR-001 standardın ilk uygulaması.

**Sonraki aşama:** KUR-001 apply (execute_sql — migration değil) + uçtan uca test (soru çöz → `ilerleme_kaydet` → XP → mizan).
