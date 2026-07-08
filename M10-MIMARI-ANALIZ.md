# M10 — Simülasyon Motoru · Mimari Analiz

**Sürüm:** 1.0 · **Tarih:** 8 Temmuz 2026
**Bağlı dokümanlar:** [ADR-V2.md](ADR-V2.md) (ADR-002/004/005/006/010/019) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) (§2.4, §10, §12) · [M7-MIMARI-ANALIZ.md](M7-MIMARI-ANALIZ.md) · [M9-MIMARI-ANALIZ.md](M9-MIMARI-ANALIZ.md)
**Kapsam:** M10 (Simülasyon) migration'ının mimari değerlendirmesi. **SQL / migration / apply / commit içermez.**
**Statü:** **DONDURULDU (8 Temmuz 2026).** Tasarım kabul edildi; **migration v2.1'e ertelendi (Seçenek A).** M10 V2'nin **en büyük ve en çok bağımlılık taşıyan** modülüdür (ADR-010); mevcut içerik katmanları kürasyonlanana kadar kurulmayacak (dormant yapı + bakım yüzeyi üretmemek için). Bu doküman M10'un tasarımını dondurur; migration, ilk simülasyon içeriği yazımına başlanacağı v2.1'de bu dokümana referansla yazılır.

---

## 0. M10 nedir + ADR-006/010 bağlamı

M10, platformu "uygulama"dan "simülasyon"a taşır: öğrenci bir işletmenin dönemini **kronolojik yaşar** — kendi kasası, carileri, defteri, mizanı. Tekil soru çözmekten yapısal farkı: kalıcı bir işletme evreni, **append-only** defter, **canlı (view) mizan**. İçerik merkezliliğin (ADR-002/007) doğal sonucu: simülasyon adımı da "tarihli bir muhasebe olayı"dır — ayrı içerik tipi icat edilmez (ADR-010).

### 0.1 Ölçülen durum (canlı, 8 Tem 2026) — evren deseni HAZIR

| Varlık | Durum | M10'a etkisi |
|---|---|---|
| M10 tabloları (isletmeler, simulasyonlar, adımlar, kullanici_simulasyonlari, yevmiye_*) | **hiçbiri yok** | greenfield |
| `isletme_id` (cari_kartlar, muavin_hesaplar, muhasebe_olaylari, belgeler) | **dördünde de VAR** (nullable, FK'siz) | M10 `isletmeler`'i kurup FK bağlayabilir |
| `olusturan_user_id` (cari/muavin/belge) | **var** | serbest mod öğrenci içeriği |
| `muavin_evren_kod_uniq` | `UNIQUE NULLS NOT DISTINCT (isletme_id, olusturan_user_id, kod)` | **evren anahtarı yerinde** |
| enum | zorluk/modul_zorluk var; `yevmiye_kaynak`/`isletme_tip` **yok** | M10 kuracak |
| `hesap_plani.normal_bakiye` | var | mizan ters-bakiye uyarısı |
| İçerik bağımlılıkları (olaylar, cozum_basliklari, olay_yetkinlikleri) | **boş** (forward-fill) | **M10 dormant kalır** — sim içeriği yazılana kadar |

**Kritik gözlem:** Evren deseni M3-M6'da bilinçli ve doğru döşenmiş — `isletme_id` her yerde bekliyor. M10 `isletmeler`'i (ertelenen FK hedefi) + sim/yevmiye katmanını kurar. **Ama M10, M5-M9'dan çok daha büyük** (6 tablo + 2+ view + RPC + trigger) ve tüm içerik bağımlılıkları boş → yazılırsa **dormant**. Bu, timing kararını doğuruyor (§ Nihai öneri).

---

## 1. `isletmeler`

- **İçerik/şablon işletme — kullanıcıya özel DEĞİL.** İşletme (ör. "Yıldız Ticaret A.Ş.") bir kez *authored* içeriktir; öğrenci onun *içinde* oynar. Kullanıcıya özel olan `yevmiye` katmanıdır, işletme değil (§7.3).
- **Alanlar:** id (text 'yildiz-ticaret'), ad, tip (`isletme_tip`: ticaret/hizmet/uretim/eticaret/ihracatci), vkn, donem_yili, aciklama, aktif.
- **Evren deseni sınırları:** `isletme_id` null = **global havuz** (soru modu içeriği, bugünkü davranış); dolu = **o işletmenin özel evreni** (simülasyon). `muavin_evren_kod_uniq (isletme_id, olusturan_user_id, kod)` sayesinde her işletmenin kendi "100.01 Merkez Kasa"sı olur; her öğrencinin (serbest mod) kendi eklediği cari/muavin `olusturan_user_id` ile aynı evrende ayrışır.
- **İki eksenli evren anahtarı:** `isletme_id` (hangi işletme) + `olusturan_user_id` (platform içeriği mi, bu öğrencinin eklediği mi). Böylece: platform sim içeriği (`isletme_id` dolu, `olusturan_user_id` null) + öğrencinin serbest eklemeleri (`isletme_id` dolu, `olusturan_user_id` dolu) aynı işletme evreninde yan yana.
- **FK bağlama:** M10 `isletmeler`'i kurunca cari/muavin/belge/olay'daki `isletme_id`'ye FK constraint eklenebilir (hepsi null → güvenli). Öneri: bütünlük için ekle.

---

## 2. `simulasyonlar` ve `simulasyon_adimlari`

- **`simulasyonlar`** (monografi/senaryo): id (text 'yildiz-ticaret-2026'), isletme_id *FK restrict*, ad, zorluk (`modul_zorluk`), durum (`soru_durum`), premium (boolean — PremiumGate, ADR-010 hibrit freemium), sira.
- **`simulasyon_adimlari`**: id, simulasyon_id *FK cascade*, sira (`unique(simulasyon_id, sira)`), islem_tarihi (kronoloji), **olay_id *FK restrict*** (adım = tarihli olay — olay havuzunu yeniden kullanır), kontrol_modu (`check ('anlik','donem_sonu')`).
- **Adım sırası:** `sira` + `islem_tarihi` = kronolojik akış. Öğrenci adımları sırayla yaşar; `kullanici_simulasyonlari.mevcut_adim` ilerlemeyi tutar.
- **`kullanici_simulasyonlari`** (per-user oyun durumu): user_id + simulasyon_id (bileşik PK), mevcut_adim, durum (`check ('devam','tamamlandi','birakti')`), baslama, bitirme.
- **Destekli / serbest mod ayrımı:** `destek_seviyesi` (M5, rehberli/standart/serbest). Simülasyonda **serbest mod = öğrenci kendi cari/muavinini açar** (`olusturan_user_id`, scaffold zirvesi — ADR-010). Destek seviyesi olaydan (`sorular.destek_seviyesi` / olay) miras alınabilir ya da adım/simülasyon düzeyinde taşınabilir. Öneri: adım, olayın destek seviyesini miras alır; simülasyon bir "taban seviye" taşıyabilir.

---

## 3. `yevmiye_kayitlari` ve `yevmiye_satirlari` — KULLANICI CEVABI (ADR-019)

- **Konumlanma:** Bunlar **kullanıcının cevabıdır** (simülasyon modunda), cevap anahtarı DEĞİL. ADR-019: soru modu → `ilerleme`; simülasyon → `yevmiye_*`. Kullanıcının kalıcı yevmiye üretimi buradadır.
- **`yevmiye_kayitlari`**: id, user_id *FK cascade*, kaynak_tip (`yevmiye_kaynak`: soru/simulasyon), soru_id *FK null*, sim_adim_id *FK null*, yevmiye_no (kullanıcı-içi sıra), tarih, aciklama, dogru_mu (kontrol sonucu), **duzeltme_of_id *FK self* null** (ters kayıt). `check ((kaynak_tip='soru' and soru_id is not null) or (kaynak_tip='simulasyon' and sim_adim_id is not null))`.
- **`yevmiye_satirlari`**: id, yevmiye_id *FK cascade*, sira (`unique(yevmiye_id, sira)`), **muavin_id *FK muavin_hesaplar restrict* NOT NULL**, borc/alacak (`numeric(14,2) default 0, check >=0`), `check (borc=0 or alacak=0)`.

### M7 cevap anahtarıyla ilişki
`yevmiye_satirlari` (kullanıcı) `cozum_satirlari` (cevap anahtarı, M7a) ile **karşılaştırılarak** doğrulanır → `yevmiye_kayitlari.dogru_mu`. **Aynı cevap anahtarı, ayrı kullanıcı-store** — ADR-019 ayrımının en büyük kazancı. `erp_uygulama` / simülasyon validator'ı bu karşılaştırmayı yapar (deterministik, ADR-008/012).

### Ana hesaba kayıt yasağı + muavin zorunluluğu
`yevmiye_satirlari.muavin_id NOT NULL FK → muavin_hesaplar` — `cozum_satirlari` ile **aynı yapısal garanti** (ADR-004/005). Ana hesap muavin_hesaplar'da yok (kod format CHECK) → ana hesaba kayıt **yapısal imkânsız**. Kullanıcının denemesi de cevap anahtarı da bu garantiye tabi.

### Denge trigger'ı
Σborç = Σalacak (yevmiye başına). İki katmanlı (belt-and-suspenders):
- **`yevmiye_kaydet(satirlar jsonb)` RPC** — atomik yazım + denge kontrolü (V2-VERI-MODELI §12.4). Client tek RPC çağrısıyla tüm satırları gönderir (deferred constraint'in "satırlar tek statement'ta" gereğini karşılar).
- **Deferred constraint trigger** (M7a `cozum_satir_butunluk` deseni) — DB güvencesi olarak commit anında Σborç=Σalacak + min-2-satır.

---

## 4. Defter ve mizan view'ları (ADR-006)

**Tablo DEĞİL, VIEW** — türetilen saklanmaz; senkron hatası sınıfı tümüyle yok olur (ADR-006).

- **`buyuk_defter`** (view): `yevmiye_satirlari ⋈ yevmiye_kayitlari ⋈ muavin_hesaplar ⋈ hesap_plani`. Kolonlar: user_id, sim bağlamı (sim_adim→simulasyon→isletme), ana_kod, hesap adı, muavin kod/ad, **cari** (muavin.cari_id→cari_kartlar), tarih, yevmiye_no, borç, alacak. Hesap bazında kronolojik döküm.
- **`mizan`** (view'lar): `buyuk_defter`'in agregasyonu — üç kırılım:
  - **Genel mizan:** `group by ana_kod` → borç toplamı, alacak toplamı, borç/alacak bakiyesi.
  - **Muavin mizanı:** `group by muavin_id`.
  - **Cari kırılımı:** `group by cari_id` (muavin üzerinden) → "ABC A.Ş. bakiyesi".
  - `normal_bakiye` (M1) ile karşılaştırma → **"ters bakiye" uyarısı** bedava.
- **security_invoker=true** (M9 deseni) → RLS own-data uygulanır (öğrenci yalnız kendi defterini görür).
- **Performans:** view her erişimde hesaplar; `(user_id, kaynak_tip)` + `(sim_adim_id)` composite index'lerle tek-kullanıcı sorgusu ucuz (V2-VERI-MODELI §7/§12.1). Materialized view **değil** (senkron sorununu geri getirir, ADR-006).

---

## 5. ADR-006 / ADR-010 uyumu

- **Defter/mizan VIEW olarak üretilir (ADR-006):** kaydedilen tek gerçek `yevmiye_satirlari`'dır; defter onun hesap-bazlı dökümü, mizan defterin özeti. Yanlış kayıt mizanı *fiilen* bozar ve öğrenci bunu **görür** — pedagojik olarak değerli.
- **Simülasyon engine APPEND-ONLY (ADR-005/010):** hatalı kayıt **silinmez/güncellenmez**, **ters kayıtla** düzeltilir (`duzeltme_of_id`) — gerçek muhasebe pratiği. `yevmiye_kayitlari` append-only.
- **Evren deseni (ADR-010):** tek şema iki dünyaya hizmet — `isletme_id` null (soru modu global havuz) vs dolu (sim işletme evreni). İçerik tek havuz, dört yüzey (bilgi/uygulama/simülasyon/mevzuat).

---

## 6. M7 / M9 etkisi

- **M7 (cevap anahtarı ayrı):** `yevmiye_satirlari` (kullanıcı) `cozum_satirlari` (anahtar) ile doğrulanır. ADR-019 ayrımı burada **çekirdek kazanç** — aynı anahtar hem soru hem sim tarafından tüketilir, kullanıcı store'ları ayrı (`ilerleme` vs `yevmiye`).
- **M9 (learning engine):** Başarılı sim adımı XP üretmeli. Ama `ilerleme_kaydet()` **soru-anahtarlı** (soru_id); sim adımı `yevmiye` yazar, `ilerleme` değil. **Açık karar (§7):** sim adımının XP'si `sim_adim → olay → olay_yetkinlikleri` zinciriyle akmalı — M9'un XP dağıtım mantığı **paylaşılan bir iç fonksiyona** çıkarılıp hem `ilerleme_kaydet()` (soru) hem `yevmiye_kaydet()`/adım-tamamlama (sim) tarafından çağrılmalı. Böylece yetkinlik ölçümü iki moddan da beslenir, tek kaynaktan (olay_yetkinlikleri). Award politikası (ilk-doğru) sim için "adım başına ilk doğru".

---

## 7. Açık kararlar

| # | Karar | Öneri |
|---|---|---|
| 7.1 | **Kullanıcı kayıtları mutable mı append-only mi?** | **APPEND-ONLY** (ADR-005/010). Hatalı kayıt ters kayıtla (`duzeltme_of_id`) düzeltilir; silme/update yok. Gerçek muhasebe + denetlenebilirlik. |
| 7.2 | **Simülasyon cevabı ile soru modu cevabı ayrı mı?** | **AYRI store, AYNI anahtar.** Soru → `ilerleme`; sim → `yevmiye_*`. Cevap anahtarı (`cozum_satirlari`) ortak. `kaynak_tip` ayırır (ADR-019). |
| 7.3 | **`isletme_id` kullanıcıya mı, simülasyona mı, senaryoya mı bağlanacak?** | **İÇERİĞE.** `simulasyonlar.isletme_id` + cari/muavin/belge/olay.isletme_id (içerik evreni). Kullanıcıya değil — kullanıcı işletmenin *içinde* oynar; kendi eklemeleri `olusturan_user_id` ile aynı evrende. |
| 7.4 | **Denge mekanizması** | **RPC + deferred trigger** (belt-and-suspenders): `yevmiye_kaydet()` atomik yazar+kontrol; trigger DB güvencesi. |
| 7.5 | **Sim XP yolu** | M9 XP dağıtımını paylaşılan iç fonksiyona çıkar; hem `ilerleme_kaydet` hem sim adım-tamamlama çağırır. |
| 7.6 | **`yevmiye_satirlari` ölçek/partition** | Ertelenir (v2.1 ölçek, ADR-006/B6): 10k kullanıcı × sim × adım × satır ≈ 60M+. Partition (user_id/tarih) kanıtlanmış ihtiyaçta. |

---

## Nihai mimari öneri

**M10, evren desenini `isletmeler` ile kapatır ve append-only simülasyon motorunu kurar; defter/mizan view'dır, kullanıcı cevabı `yevmiye_*`'dir (cevap anahtarından ayrı, ADR-019).**

### Tasarım kapsamı (referans)
1. Enum: `isletme_tip`, `yevmiye_kaynak`
2. `isletmeler` (+ cari/muavin/belge/olay isletme_id → isletmeler FK bağlama)
3. `simulasyonlar` + `simulasyon_adimlari` + `kullanici_simulasyonlari`
4. `yevmiye_kayitlari` + `yevmiye_satirlari` (muavin_id NOT NULL; denge trigger)
5. `yevmiye_kaydet()` RPC (atomik + denge + XP dağıtımı paylaşımı)
6. `buyuk_defter` + `mizan` (genel/muavin/cari) view'ları (security_invoker)
7. RLS: içerik (isletmeler/simulasyonlar/adımlar) = Katalog/İçerik; kullanıcı (kullanici_simulasyonlari/yevmiye_*) = Sahiplik

### ⚠️ Timing / kapsam kararı — en önemli açık nokta
M10 **v2.1** kapsamıdır (V2-VERI-MODELI §10) ve M5-M9'dan **çok daha büyük** (6 tablo + 2+ view + RPC + trigger). Üstelik tüm içerik bağımlılıkları (olaylar, cozum_basliklari, olay_yetkinlikleri) **boş** → M10 yazılırsa **dormant** kalır (tüketici yok). M5-M9 küçük iskeletlerdi (dormant bırakmak ucuzdu); M10 büyük.

**Üç seçenek:**
- **A) Tasarımı dondur, migration'ı ERTELE** — sim içeriği (ilk işletme + simülasyon + adımlar) yazılmaya hazır olunca kur. Bu doküman tasarımı kilitler; büyük dormant yapı üretilmez.
- **B) M10a (içerik yapısı) / M10b (oyun motoru) böl** — M10a: isletmeler + simulasyonlar + adımlar (sim *içeriği* yazılabilsin); M10b: yevmiye + view + RPC (oyun motoru). İçerik önce, motor sonra.
- **C) Tümünü şimdi kur** — M5-M9 deseni; büyük ama dormant yapı.

**KARAR: A (onaylandı — 8 Temmuz 2026).** M10 tasarımı bu dokümanla kilitlendi; migration **yazılmadı** ve ilk simülasyon içeriği yazımına başlanacağı **v2.1'e ertelendi**. Gerekçe: M10 büyük ve tüketicisi yok; erken kurmak bakım yüzeyi + dormant karmaşıklık ekler, karşılığında bugün değer üretmez. İçerik kürasyonu (olay_yetkinlikleri, cozum_basliklari, ilk işletme) M10'dan önce gelmeli. B/C (böl / tümünü şimdi kur) reddedildi.

---

## Riskler ve alternatifler

| # | Risk | Şiddet | Önlem |
|---|---|---|---|
| R1 | **`yevmiye_satirlari` ölçek patlaması** (60M+) | Yüksek (v2.1) | Partition (user/tarih); view (user,sim) index'li; MV değil |
| R2 | **Denge yazımı** (satırlar tek statement gereği) | Orta | `yevmiye_kaydet()` RPC atomik; deferred trigger |
| R3 | **Defter/mizan view çapraz-kullanıcı** (öğretmen paneli) pahalı | Orta (gelecek) | Tek-kullanıcı ucuz; çapraz-kullanıcı için ayrı özet (asla canlı mizanda MV değil) |
| R4 | **M10 dormant** (içerik yok) → erken kurulursa boş karmaşıklık | Orta | Timing kararı A (ertele) |
| R5 | **Evren FK bağlama** cari/muavin/belge/olay'a FK eklerken | Düşük | Hepsi null → güvenli; M10'da eklenir |
| ALT | **Sim içeriğini sorulardan ayrı havuz yap** | — | Reddedildi (ADR-010): sim adımı = tarihli olay, tek havuz |
| ALT | **Defter/mizan tablo (trigger senkron)** | — | Reddedildi (ADR-006): senkron hatası; view |
| ALT | **Mutable yevmiye (silme/update)** | — | Reddedildi (ADR-005/010): append-only + ters kayıt |

---

## Kapanış — M10'un taahhüdü

M10, platformun "simülasyon platformu" vaadini kurar: öğrenci bir işletmenin dönemini kronolojik yaşar, kendi defterini/mizanını **kendi kayıtlarından türetilmiş** (view) olarak görür, hatasını ters kayıtla düzeltir (append-only). Evren deseni (M3-M6'da döşenmiş `isletme_id`) tek şemayı iki dünyaya hizmet ettirir; cevap anahtarı/kullanıcı cevabı ayrımı (ADR-019) sim motorunu doğru modelde tutar. **Ama M10 en büyük modül ve içeriği yok** — bu yüzden çekirdek öneri, tasarımı şimdi kilitleyip **migration'ı sim içeriği yazımına (v2.1) ertelemektir.**

**Karar (8 Tem 2026):** Seçenek **A** — tasarım donduruldu, migration v2.1'e ertelendi. Yeni ADR gerekmedi (M10, ADR-006/010/019 uygulaması).

**Sonraki aşama (M10 dışı):** İçerik kürasyonu — yapısal olarak hazır ama boş katmanları doldurmak:
- **olay_yetkinlikleri** (→ M9 XP akışı aktifleşir)
- **cozum_basliklari / cozum_satirlari** (→ M7 cevap anahtarı içeriği, yeni olaylar)
- **mevzuat madde metinleri** (→ M8 aktifleşir)
- **belge içeriği** (→ M6 aktifleşir)
- **ilk işletme + simülasyon senaryosu** hazırlığı (M10 migration'ının v2.1 tetikleyicisi)
- **RAG↔madde köprüsü** (madde kürasyonu sonrası, rag_chunks hedefiyle)

M10 migration'ı, ilk işletme-senaryo içeriği yazılmaya hazır olduğunda bu dokümana referansla kurulacaktır.
