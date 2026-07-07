# M6 — Belgeler Modülü · Mimari Analiz

**Sürüm:** 1.0 · **Tarih:** 7 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) (ADR-003/007/014/016) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) (§2.2, §4, §5, §13) · [M5-MIMARI-ANALIZ.md](M5-MIMARI-ANALIZ.md) · [SDD-V2.md](SDD-V2.md)
**Kapsam:** M6 migration'ının mimari değerlendirmesi ve karar kaydı. **SQL / migration / frontend içermez.**
**Statü:** Onaya sunuldu. Onay sonrası M6 SQL'i bu dokümana referansla yazılır.

---

## 0. M6 nedir — bir cümlede

M6, ADR-003'ün (belge-merkezli öğrenme) veri ayağını kuran migration'dır: `sorular.belgeler` jsonb'unda gömülü duran belgeyi **birinci sınıf, yeniden kullanılabilir domain nesnesine** (`belgeler` tablosu) terfi eder, muhasebe olayına `olay_belgeleri` M2M ile bağlar (M5'te ertelenen parça) ve belge tiplerini bir katalogda tanımlar.

### M6'nın doğrulanmış başlangıç durumu (canlı, 7 Tem 2026)

| Varlık | Durum | M6'ya etkisi |
|---|---|---|
| `belgeler` tablosu | **yok** (sadece `sorular.belgeler` jsonb kolonu var) | M6 tabloyu kuracak |
| `belge_tip` enum / `belge_tipleri` tablo | **ikisi de yok** | M6 kuracak (§5, karar D1) |
| `belge_yon` enum | **yok** | M6 kuracak (gelen/giden/**ic**) |
| `sorular.belgeler` jsonb | **28 soruda dolu**, `tur` discriminator, 5 tip | best-effort backfill kaynağı |
| `Belge` union (`src/types/index.ts`) | 5 tip, zengin alanlar, iki taraf | normalize hedefi + geçici dual-read |
| `olay_belgeleri` M2M | **yok** (M5'te ertelendi) | M6 teslim edecek — FK hedefi `belgeler` artık var |
| `cari_kartlar` | dolu şema (vkn/tckn/unvan/vergi_dairesi) | belge karşı-taraf FK hedefi hazır |
| `muhasebe_olaylari` | M5 tamam (aggregate root) | belge olaya M2M ile bağlanır |

**Kritik gözlem:** `sorular.belgeler` jsonb'u ADR-003'ün dediği gibi *zaten gerçek e-belge alanlarını taşıyor* (ETTN, tevkifatPay/Payda, valör, keşide yeri, iki taraf kimliği). M6 sıfırdan icat etmez — mevcut zengin şemayı normalize eder.

---

## 1. Ürün Mimarisi

### Belgeler neden ayrı bir varlık olmalı?
Çünkü belge **paylaşılan bir gerçekliktir**, sorunun/olayın iç detayı değil. Aynı satış faturası hem "kayıt olayı"nda hem "KDV olayı"nda kullanılır; aynı cari onlarca belgede görünür. jsonb gömme (mevcut) bunu yapısal olarak imkânsız kılıyordu (ADR-016): bir belge yalnız bir soruda yaşıyordu, FK bütünlüğü yoktu, "bu belge kaç olayda kullanıldı" sorulamıyordu. Ayrı varlık = yeniden kullanım + FK bütünlüğü + kullanım sayacı + tek düzeltme noktası.

### Belge ↔ muhasebe olayı ilişkisi nasıl olmalı?
**Çoktan çoğa (`olay_belgeleri` M2M).** Belge olaya *kolon* ya da *child* değil, bağımsız varlık olarak M2M ile bağlanır. Gerekçe iki yönlü çokluk:

### Bir olay birden fazla belgeye sahip olabilir mi? — **EVET.**
Kanıt (V2-VERI-MODELI §13.4): SGK bordro tahakkuku tek olaydır ama **iki belge** taşır — bordro + tahakkuk fişi. Benzer: ithalat olayı (fatura + gümrük beyannamesi + dekont).

### Aynı belge birden fazla olay tarafından kullanılabilir mi? — **EVET.**
Kanıt: aynı satış faturası → "veresiye satış kaydı" olayı + "ay sonu KDV" olayı + "tahsilat" olayı. Belge bir kez tanımlanır, N olayda referanslanır (ADR-007 yeniden kullanılabilirlik matrisi).

Bu iki "EVET" birlikte **N:N**'i zorunlu kılar → M2M tek doğru modeldir. (Child entity 1 olay→N belge'yi kaldırır ama belge paylaşımını kaldıramaz.)

### Eğitim açısından belge kullanıcıya nasıl gösterilmeli?
Belge, öğrencinin **ilk karşılaştığı yüzey** olmalı (ADR-003/014): gerçek bir fatura/dekont/bordro görseli (render şablonu), soyut tutar değil. Öğrenci belgeden olayı *kendisi teşhis eder*. Detay §4'te.

---

## 2. Yazılım Mimarisi — Aggregate sınırları

Üç seçenek değerlendirildi:

| Seçenek | Değerlendirme | Verdict |
|---|---|---|
| **A) belgeler = muhasebe_olaylari'nın child entity'si** | Belge olay aggregate'i içinde yaşar; olay silinince belge de gider. **Reddedildi:** aynı belge N olayda paylaşıldığından belge bir olaya ait olamaz — child modeli belge yeniden kullanımını yapısal olarak öldürür. | ❌ |
| **B) belgeler = tam bağımsız aggregate root** | Kendi yaşam döngüsü, kendi invariant'ları olan bir kök. **Kısmen doğru ama fazla ağır:** belgenin olaydan/cari'den bağımsız güçlü bir invariant'ı yok (denge kuralı çözümde, cari zorunluluğu muavinde). Belge "kök" değil, **paylaşılan referans varlık**tır. | ~ |
| **C) belgeler = bağımsız varlık + `olay_belgeleri` M2M** (cari_kartlar/muavin_hesaplar deseni) | Belge, İçerik bounded context'inde `cari_kartlar` ve `muavin_hesaplar` ile aynı sınıfta: kendi başına yaşayan, olaya M2M ile bağlanan **paylaşılan referans varlık**. Belge + kalemleri (jsonb) küçük bir aggregate; kök belgedir. Olaylar arası bağ M2M + FK restrict (ADR-016). | ✅ **Seçilen** |

**DDD gerekçesi (C):**
- **Artı:** Belge, cari ve muavin ile *aynı deseni* izler (bağımsız yaşa, M2M ile bağlan) → tutarlı zihinsel model, tek RLS şablonu ailesi. Aggregate sınırı = tutarlılık sınırı: belge kendi içinde tutarlı (belge_no + tarih + toplam), olayla ilişkisi M2M'de. Cross-aggregate referans FK restrict ile korunur (kullanılan belge silinemez).
- **Eksi:** jsonb'a göre daha çok tablo + RLS + index (ADR-016 kabul edilmiş bedel). Belge kalemleri normalize *edilmez* (bilinçli jsonb — §6.1 "gösterim verisi jsonb, ilişkisel veri tablo").
- **Sınır netliği:** Belge, `muhasebe_olaylari` aggregate'inin *dışındadır* (paylaşıldığı için). `cozum_satirlari` (M7) olayın içindedir (paylaşılmaz). Bu ayrım ADR-016'nın "gömülü mü M2M mi" kuralının belge tarafındaki uygulamasıdır.

**Bounded context:** belgeler → İçerik context (cari_kartlar, muhasebe_olaylari, cozumler ile birlikte). RLS'i paylaşılan-varlık deseniyle (K + sahiplik) kurulur (§5).

---

## 3. Muhasebe Doğruluğu

### Belge tiplerinin muhasebe olaylarıyla ilişkisi
Her belge tipi bir *olay ailesini* tetikler; belge, VUK md.229 vd. gereği kaydın **dayanağıdır**.

| Belge | Tipik olay | yön | Karşı taraf (cari) | Not |
|---|---|---|---|---|
| Satış faturası | Yurtiçi satış, hasılat | giden | müşteri | matrah+KDV; e-fatura ETTN |
| Alış faturası | Mal/hizmet alımı | gelen | tedarikçi | indirilecek KDV; tevkifat olası |
| İrsaliye (sevk) | Mal sevki (fatura öncesi) | gelen/giden | müşteri/tedarikçi | **tutarsız/tutarlı ayrı** — çoğu zaman muhasebe kaydı üretmez, faturayla eşleşir; "belge var, kayıt yok" öğretimi için değerli |
| Banka dekontu | Tahsilat/ödeme/havale/masraf | gelen/giden | banka + karşı taraf | dekont `yon: BORÇ/ALACAK` banka hesabı perspektifi (meta'ya) |
| Serbest meslek makbuzu (SMM) | Müşavir/avukat hizmeti | gelen | serbest meslek erbabı | KDV + **GV stopajı (%20)** — iki yükümlülük |
| Çek | Alınan/verilen çek, tahsil/tediye | gelen/giden | keşideci/lehtar | vade + banka; portföy/teminat |
| Senet (bono/poliçe) | Alacak/borç senedi | gelen/giden | borçlu/lehtar | vade + reeskont (dönem sonu) |
| Gider pusulası | Vergi mükellefi olmayandan alım | gelen | belgesiz satıcı | **GV stopajı**; VUK md.234 |
| Bordro | Ücret tahakkuku | **ic** (iç fiş) | personel | brüt/SGK/GV/net — çok bileşenli |
| Tahakkuk fişi | KDV/SGK/vergi tahakkuku | **ic** | kamu (VD/SGK) | belgeye değil sürece dayanır |
| Beyanname | KDV1/KDV2/Muhtasar/SGK | **ic** | kamu | *sınırda* — belge mi, süreç çıktısı mı? (aşağıda) |
| Amortisman listesi | Dönem sonu amortisman | **ic** | — | VUK md.313; destekleyici liste, tek kayda kaynak |

**İki belge tipi sınırda:**
- **Beyanname:** Bir *belge* mi, yoksa kayıtların *çıktısı* mı? Öneri: `beyanname` belge tipi olarak durur (mükellef beyannameyi bir belge olarak görür), ama beyanname **etkileri** ayrı yaşar (`cozumler.beyanname_etkileri` jsonb, M7). Yani beyanname belgesi = girdi/görsel; beyanname motoru = M8/v2.2.
- **Amortisman listesi:** Belge değil, destekleyici hesaplama tablosu. `ic` yön + `amortisman_listesi` tipiyle modellenir; kalemleri (varlık/oran/tutar) jsonb.

### `yön` ekseninin netleşmesi (ADR-003 açık kararının çözümü)
Belgenin normalize `yon` kolonu = **işletme perspektifi**, üç değer:
- **gelen** — işletmeye gelen (alış, gider, gelen dekont)
- **giden** — işletmeden çıkan (satış, verilen dekont)
- **ic** — iç fiş: dış karşı taraf yok ya da kamu (bordro, tahakkuk, açılış/kapanış, amortisman, reeskont)

> ⚠️ **Dikkat — iki farklı `yon`:** Mevcut jsonb'da dekontun `yon: BORÇ/ALACAK`'ı **banka hesabı** perspektifidir (borç bakiye artışı vb.), işletme perspektifi değil. Bu, normalize `yon` (gelen/giden/ic) ile **karıştırılmamalı**; dekontun BORÇ/ALACAK'ı `meta` jsonb'a gider. Bu ayrım M6 backfill'inin en ince noktasıdır.

### Belge hangi bilgileri saklamalı?
İki katman — **ilişkisel (kolon)** vs **gösterim (jsonb)**, ADR-016 §6.1 kuralı:

**Kolon (sorgulanır, FK, öğretim/doğrulama girdisi):**
`belge_tipi` (FK), `belge_no`, `tarih`, `cari_id` (karşı taraf FK), `isletme_id` (evren), `yon`, `matrah`, `kdv_orani`, `kdv_tutari`, `tevkifat_orani` ('9/10'), `tevkifat_tutari`, `toplam`, `para_birimi` (TRY default — ihracat/döviz forward-compat).

**jsonb (gösterim, JOIN yapılmaz, tip-özel):**
- `satirlar` — belge kalemleri (ad, miktar, birim, birim_fiyat, iskonto).
- `meta` — tip-özel: fatura→ettn/faturaTipi; dekont→islemTuru/valör/**yon(borç/alacak)**/bsmv/masraf; çek→vade/banka/şube/keşide yeri; senet→vade/borçlu; bordro→brüt/sgk_işçi/gv/net/sgk_işveren; SMM→stopaj.

**Karşı taraf normalizasyonu:** jsonb'da iki taraf (satıcı+alıcı) tutuluyor. Normalize modelde **karşı taraf → `cari_id`** (FK cari_kartlar), işletmenin kendisi → `isletme_id` bağlamı (global havuzda null). Yani satış faturasında alıcı=cari, satıcı=işletme; alışta satıcı=cari. Karşı tarafın zengin kimliği (unvan/vkn) artık `cari_kartlar`'da yaşar — belgede tekrar edilmez.

---

## 4. Eğitim Tasarımı — öğrenme akışı

**Önerilen akış (ADR-003/014, S0 #8 zinciri):**

```
1. BELGE          → Öğrenci gerçek belgeyi görür (render şablonu). "Elime bu geldi."
2. OLAY TEŞHİSİ   → "Bu ne? Veresiye satış." (bazı tiplerde ayrı adım: belge_analizi)
3. YEVMİYE KAYDI  → Muavin seçerek kaydı yazar (cari/muavin dropdown = olay_muavinleri)
4. ANLIK KONTROL  → Deterministik (kontrol.ts + validator, ADR-008/012) — AI değil
5. MANTIK         → cozumler.aciklama: "neden alacak muavin cariye?"
6. MEVZUAT        → cozum_mevzuat (M8): "KDVK md.10'a dayanır"
7. BENZER SENARYO → yetkinlik kesişimi (M9)
```

**Kritik cevap — "önce belge mi, önce olay mı?":** **Önce belge.** Gerçek muhasebecinin işi belgeyle başlar; teori-önce model "hesap ezberleyen ama belge okuyamayan" öğrenci üretir (ADR-003). Belge → olay çıkarımı, soyut soruda bulunmayan asıl beceridir.

**Nüanslar:**
- **Belgesiz olaylar** (açılış, kapanış, amortisman, reeskont): belge opsiyonel (`olay_belgeleri` 0..N). Bu olaylarda `ic` fiş gösterilir ya da doğrudan senaryo metniyle başlanır.
- **İrsaliye'nin pedagojik değeri:** "belge var ama muhasebe kaydı yok/faturayı bekler" — öğrenciye *her belge kayıt üretmez* gerçeğini öğretir.
- **Scaffold (destek_seviyesi, M5):** `rehberli` seviyede belgenin kritik alanları (matrah, KDV, tevkifat) vurgulanır; `serbest` seviyede öğrenci belgeden kendisi çıkarır.
- **Soru tipi bağı (ADR-008):** `belge_analizi` tipi doğrudan belgeyi sorar ("bordroda işveren payı ne kadar?"); cevap anahtarı belge alanlarından/`meta`'dan türer — ayrı cevap saklanmaz.

---

## 5. Veri Modeli (SQL değil — taslak)

### 5a. `belge_tipleri` (yeni — KATALOG tablo) — Karar D1
`soru_tipleri` deseninin ikizi. **Enum değil tablo** (gerekçe: Karar D1 / ADR-018).

| Alan | Tip | Not |
|---|---|---|
| **id** | text PK | 'satis_faturasi', 'alis_faturasi', 'irsaliye', 'perakende_fisi', 'banka_dekontu', 'smm_makbuzu', 'cek', 'senet', 'bordro', 'gider_pusulasi', 'tahakkuk_fisi', 'beyanname', 'amortisman_listesi' (~13) |
| ad | text not null | 'Satış Faturası' |
| kategori | text | 'ticari' / 'mali' / 'resmi' / 'bordro' (gruplama/ikon) |
| varsayilan_yon | belge_yon | tipin tipik yönü (satis→giden, bordro→ic) |
| gerekli_alanlar | text[] | render + doğrulama ipucu ('{matrah,kdv_orani}') |
| thiings_icon | text | görsel |
| aktif | boolean default false | **renderer hazır olmadan tip açılmaz** (soru_tipleri deseni) |
| sira | int | |

### 5b. `belgeler` (yeni — paylaşılan referans varlık)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid PK | |
| belge_tipi | text | *FK belge_tipleri* restrict |
| belge_no | text | not null (mevcut belge_no üretim kurallarıyla) |
| tarih | date | not null |
| cari_id | uuid | *FK cari_kartlar* restrict, **null** (karşı taraf; iç fişte null/kamu) |
| isletme_id | text | null — evren (ADR-010), null=global havuz |
| olusturan_user_id | uuid | *FK kullanicilar* null — v2.1 serbest seviye |
| yon | belge_yon | not null (gelen/giden/ic) |
| matrah | numeric(14,2) | null |
| kdv_orani | numeric(5,2) | null |
| kdv_tutari | numeric(14,2) | null |
| tevkifat_orani | text | null ('9/10') |
| tevkifat_tutari | numeric(14,2) | null |
| toplam | numeric(14,2) | not null |
| para_birimi | text | not null default 'TRY' |
| satirlar | jsonb | default '[]' — kalemler (gösterim) |
| meta | jsonb | default '{}' — tip-özel |
| aktif | boolean | default true (soft delete) |
| created_at / updated_at | timestamptz | trigger |

### 5c. `olay_belgeleri` (yeni — M2M; M5'ten devreden)

| Alan | Tip | Kısıt |
|---|---|---|
| **olay_id** | text | *FK muhasebe_olaylari* cascade — bileşik PK |
| **belge_id** | uuid | *FK belgeler* restrict — bileşik PK |
| sira | int | default 0 — birden çok belgede sıra |
| rol | text | null — belgenin olaydaki rolü ('ana'/'ek'/'tahakkuk'); SGK örneğinde bordro=ana, tahakkuk fişi=ek |

### 5d. Yeni enum: `belge_yon`
`gelen`, `giden`, `ic` — (ADR-003 açık kararının çözümü; `ic` eklendi).

### 5e. Başka gerekli tablo?
**Hayır — MVP için üç tablo + bir enum yeterli.** Bilinçli *jsonb* kalanlar: `belgeler.satirlar`, `belgeler.meta` (§6.1 kuralı). Bilinçli *ertelenen*: belge↔mevzuat (VUK belge düzeni maddeleri) M8'e; belge OCR kaynak/asset alanı (`storage_path`) OCR modülüne (gelecek). Beyanname **motoru** ayrı (v2.2), beyanname *belgesi* burada bir tip.

---

## 6. Gelecek Etkileri

| Modül | M6'nın etkisi |
|---|---|
| **M7 Çözümler** | Belge, cevap anahtarının *girdi gerçekliği*: matrah+oran → KDV tutarları çözümde tutarlı olmalı. `belge_analizi` soru tipi validator'ı belge alanlarını okur. **FK bağı yok** (olay↔belge, olay↔cozum ayrı) → M6, M7'nin *önünde* olması içerik gerçekçiliği için iyi ama sıkı bağımlılık değil. Belge tutarları ↔ cozum_satirlari tutarları tutarlılık lint'i M7'de değerlendirilir. |
| **M8 Mevzuat** | Belge tipi ↔ VUK belge düzeni (md.229–242). `cozum_mevzuat` çözümü maddeye bağlar; belge de ileride VUK belge maddelerine bağlanabilir (opsiyonel köprü). Tevkifat belgesi → KDV GUT maddeleri. M6 bunu *hazırlar*, bağ M8'de. |
| **M9 Learning Engine** | `belge-okuma` yetkinliği M2 seed'inde **zaten var**. Belge varlığı `belge_analizi` soru tipini açar → yeni XP yüzeyi. `olay_yetkinlikleri`'nde belge-okuma ağırlığı olan olaylar belgeyle somutlaşır. |
| **M10 Simülasyon** | **En güçlü sinerji.** Simülasyon adımı = işletmeye *gelen belge* → öğrenci kaydeder. `isletme_id` evren deseni: sim belgeleri isletme_id dolu, kendi belge kütüphanesi. Belge, sim adımının tetikleyici girdisidir. `olay_belgeleri` sim akışında doğrudan kullanılır. |
| **OCR** | Gelecek modül. Yüklenen gerçek belge → OCR → yapısal alanlar → otomatik `belgeler` satırı. **M6'nın normalize kolonları OCR'ın hedef şemasıdır**; `meta` jsonb varyansı emer. `storage_path` alanı OCR modülünde eklenir. Belge tablosu OCR-ready doğar. |
| **AI belge analizi** | `ai-belge-uret` Edge Function **zaten var** (belge jsonb üretiyor). M6 onun çıktı hedefini normalize eder. Yapısal belge → kısa/tipli/önbelleklenebilir prompt (ADR-012): "bu faturanın tevkifatı" sorusu tek alan okur. Belge alanları ayrı ayrı adreslenebilir → ucuz, cache'lenebilir AI. |

---

## Nihai mimari öneri

**M6, `belgeler`'i bağımsız paylaşılan referans varlık olarak kurar (Seçenek C), `olay_belgeleri` M2M ile olaya bağlar, belge tiplerini `belge_tipleri` katalog tablosunda tutar (enum değil), ve `sorular.belgeler` jsonb'unu best-effort backfill'ler (dual-read, M11'e kadar durur).**

### M6 kapsamı (özet)
1. `belge_tipleri` katalog tablosu + ~13 tip seed (Katalog RLS)
2. `belge_yon` enum (gelen/giden/**ic**)
3. `belgeler` tablosu + RLS (K + sahiplik, cari_kartlar deseni) + index'ler
4. `olay_belgeleri` M2M + RLS (dolaylı-onay, olay M2M deseni) — **M5'ten devreden**
5. (Karar D2) `sorular.belgeler` jsonb → `belgeler` + `olay_belgeleri` backfill
6. `sorular.belgeler` jsonb **durur** (dual-read, M11 drop)
7. Doğrulama DO bloğu + `notify pgrst`

### RLS deseni
- `belge_tipleri` = **Katalog** (public read, admin write) — soru_tipleri gibi.
- `belgeler` = **K + sahiplik** (`olusturan_user_id is null or = auth.uid() or is_admin()`) — cari_kartlar/muavin_hesaplar ile aynı (paylaşılan varlık, sahiplik karması). Dolaylı-onay değil çünkü belge içeriği hassas değil ve gerçek kardeşleri cari/muavin bu deseni kullanıyor.
- `olay_belgeleri` = **dolaylı-onay** (olayın onay durumunu izler) — olay_yetkinlikleri/etiketleri/muavinleri ile aynı.

---

## Yeni ADR önerisi

### ADR-018 — Belge tipinin katalog tablosu olması (belge_tip enum'unun yerini alır)
- **Karar:** `belge_tip` **enum** yerine `belge_tipleri` **katalog tablosu**.
- **Neden:** (1) `soru_tipleri` (ADR-008) ile birebir tutarlılık — belge de bir render-plugin çiftine (görsel şablon + alan doğrulama) sahiptir ve `aktif` bayrağıyla renderer hazır olmadan açılmamalıdır. (2) Tip başına yapısal metadata (`kategori`, `varsayilan_yon`, `gerekli_alanlar`, `thiings_icon`) — enum taşıyamaz. (3) Tipler ürün kararıyla çoğaldı: v1'de 5 (`fatura/perakende-fis/cek/senet/dekont`), V2 hedefinde 10+, M6'da ~13 (irsaliye/SMM/gider pusulası/bordro/tahakkuk/beyanname/amortisman eklendi) — enum ALTER migration'ı ister, tablo satır ekler.
- **Neyin yerini alır:** V2-VERI-MODELI §5'in "belge_tip enum" kararı. §5'in gerekçesi ("her tip render şablonu ister → kod değişikliği zaten şart") geçerli ama `soru_tipleri` de aynı durumda olup tablo seçildi; tutarlılık kazanır.
- **Bedel (dezavantaj):** Belge insert'inde FK lookup (enum sabit değerine göre mikro-maliyet); tip listesi artık veri (katalog seed disiplini). Kabul edilir.
- **İlişkili:** ADR-003, ADR-008, ADR-016.

> V2-VERI-MODELI §5 "enum mu tablo mu" karar kuralı belge tipini "sınırda" işaretlemişti; ADR-018 bu sınırı tutarlılık lehine tabloya çeker. Migration ile birlikte ADR-V2.md'ye eklenir (ADR-019+ formatı).

**İkincil karar kaydı (ayrı ADR gerektirmez):** `belge_yon`'a `ic` değerinin eklenmesi ADR-003'ün "belge_yon='ic'" açık kararının kapanışıdır — ADR-003'ün "Gelecek Etkiler" maddesi referanslanır.

---

## Riskler ve alternatifler

| # | Risk / Alternatif | Şiddet | Önlem / Karar |
|---|---|---|---|
| R1 | **Backfill karmaşıklığı:** jsonb `tur`→`belge_tipi` haritalama (fatura → satis/alis_faturasi, `faturaTipi`/`yon` çıkarımıyla); dekont `yon:BORÇ/ALACAK` ≠ normalize `yon` | **Yüksek** | Haritalama tablosu migration içinde; dekont borç/alacak → `meta`, normalize `yon` işlem türünden türetilir; belirsiz kalan rapora düşer (M5 deseni) |
| R2 | **Karşı taraf → cari_id:** jsonb karşı taraf (unvan/vkn) mevcut 6 global cari ile eşleşmeyebilir | **Yüksek** | **Öneri (Karar D3):** M6 backfill'de `cari_id` NULL bırak (olay_muavinleri'nin M5'te boş bırakılması gibi); cari eşleme/oluşturma içerik küratörlüğü işi. Belge alanları+meta taşınır, karşı taraf sonra bağlanır. Alternatif: vkn eşleşmesiyle best-effort |
| R3 | **Backfill'i M6'ya sokmak vs ertelemek** (M5 etiket dersi: kötü eşleşen backfill boş bırakıldı) | Orta | **Öneri:** Yapı + belge_tipleri seed **kesin M6'da**; jsonb backfill **best-effort, dual-read**. Eşleşmeyen belge rapora düşer, `sorular.belgeler` durur → kayıp yok. Backfill tümüyle ayrı migration'a bile alınabilir (M6a yapı / M6b backfill) |
| R4 | **belge_tipleri tablo kararı** ileride "enum yeterdi"ye dönerse | Düşük | Tablo boşsa/az kullanılıyorsa geri dönüş ucuz; ADR-018 gerekçeli dondurur; soru_tipleri emsali güçlü |
| R5 | **irsaliye/beyanname gibi "kayıt üretmeyen" belgeler** olay modeline uymayabilir | Orta | Bunlar `olay_belgeleri`'ne bağlı ama olayları "kayıt yok/eşleşme bekliyor" tipinde; pedagojik değer (belge≠kayıt). Zorlama yok — belge opsiyonel |
| R6 | **`yon` semantik çakışması** (banka borç/alacak vs işletme gelen/giden) sessiz veri bozar | Orta | §3 uyarısı backfill'de zorunlu kural; dekont `yon` alanı asla normalize `yon`'a map edilmez |
| ALT | **Alternatif: belge_tip enum + jsonb'ı olduğu gibi bırak** | — | Reddedildi: enum metadata/aktif taşımaz (D1); jsonb yeniden kullanımı öldürür (ADR-016) |

---

## Kapanış — M6'nın taahhüdü

M6, ADR-003'ün ("belge-merkezli öğrenme") felsefesini veriye çevirir: platformun "izlenen değil çözülen" farkı, öğrencinin **gerçek belgeyle karşılaşıp olayı teşhis etmesiyle** başlar. Teknik olarak belge, cari ve muavin ile aynı sınıfa (paylaşılan referans varlık) oturur; olaya M2M ile bağlanır; tipleri `soru_tipleri` gibi bir katalogda yaşar. M5'te ertelenen `olay_belgeleri` bu migration'da teslim edilir.

**Karar özeti:**
- **D1:** belge tipi = **katalog tablosu** (enum değil) → **ADR-018**
- **D2:** jsonb backfill = **best-effort + dual-read** (yapı kesin, taşıma temkinli)
- **D3:** backfill'de `cari_id` **NULL** (karşı taraf eşleme sonra) — öneri, onayına sunulur
- **belge_yon** = gelen/giden/**ic** (ADR-003 açık kararının kapanışı)

**Sonraki adım:** Onayın gelirse M6 SQL'i + ADR-018 bu dokümana referansla yazılır (ayrı adım, ayrı onay). Özellikle **D3 (cari_id backfill)** ve **backfill'in M6'da mı ayrı M6b'de mi** olacağı senin kararını bekliyor.
