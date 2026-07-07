# Muhasebe Akademisi v2 — Database Design Document

**Sürüm:** 1.0 · **Tarih:** 6 Temmuz 2026 · **Bağlı doküman:** [SDD-V2.md](SDD-V2.md) (onaylı)
**Kapsam:** Alan düzeyinde veri modeli. Migration SQL'i içermez; migration'lar bu doküman baz alınarak ayrı ayrı yazılacaktır.

## S0 kararları (onaylı — bu dokümanın anayasası)

1. Muavin hesap zorunludur.
2. Ana hesaba doğrudan yevmiye kaydı yapılamaz.
3. Yevmiye satırları mutlaka `muavin_id` ile çalışır.
4. Cari gerektiren hesaplarda muavin mutlaka cari kartla bağlıdır.
5. Büyük defter ve mizan tablo değil, yevmiye satırlarından türetilen view'dır.
6. `sorular` tablosu korunur; `muhasebe_olaylari` üzerinden türetilmiş instance gibi çalışır.
7. Platform video tabanlı değildir.
8. Öğretim modeli: belge → senaryo → uygulama → anlık kontrol → mantık → mevzuat.

**S0'ın şemaya birinci dereceden etkisi:** Karar 1–3 "muavin bazı hesaplarda zorunlu" modelini geçersiz kılar — muavin *yapısal olarak evrenseldir*. `cozum_satirlari.muavin_id` ve `yevmiye_satirlari.muavin_id` NOT NULL FK olduğu için ana hesaba kayıt *veritabanı seviyesinde imkânsızdır*; uygulama kontrolüne güvenilmez. Bunun sonucu: kullanılan her ana hesap için (600, 391, 191 dahil) en az bir muavin açılır. Tek muavinli hesaplarda (örn. `600.01 Yurtiçi Satışlar`) UI otomatik seçer; cari-bağlı hesaplarda (120, 320…) kullanıcı doğru cariyi seçmek zorundadır.

---

## İçindekiler

1. [Tablo kataloğu (genel görünüm)](#1-tablo-kataloğu)
2. [Tablolar ve alanları](#2-tablolar-ve-alanları)
3. [PK / FK ilişki haritası](#3-pk--fk-ilişki-haritası)
4. [Çoktan çoğa tablolar](#4-çoktan-çoğa-tablolar)
5. [Enum değerleri](#5-enum-değerleri)
6. [RLS politika önerileri](#6-rls-politika-önerileri)
7. [Index önerileri](#7-index-önerileri)
8. [Migration sırası](#8-migration-sırası)
9. [MVP tabloları](#9-mvp-tabloları)
10. [v2.1+ tabloları](#10-v21-tabloları)
11. [Mevcut tablolarla çakışmalar](#11-mevcut-tablolarla-çakışmalar)
12. [Riskli migration noktaları](#12-riskli-migration-noktaları)
13. [Örnek veri akışları (4 senaryo)](#13-örnek-veri-akışları)

---

## 1. Tablo kataloğu

### Değişmeden korunan mevcut tablolar (bu dokümanda detaylanmaz)

`unites`, `unite_modulleri`, `modul_alt_basliklari`, `atolye_sorulari`, `unite_konulari`, `rozetler_katalog`, `kazanilan_rozetler`, `aktivite`, `kullanicilar`, `odemeler`, `indirim_kodlari`, `soru_hatalari`, `bildirimler` (+hedefleme), `sozluk`, `adminler`, `admin_log`, `ai_kullanim`, `ai_log`, `ai_cevap_cache`, `katkici_*`, `ilerleme`.

### Değişen mevcut tablolar

| Tablo | Değişiklik |
|---|---|
| `hesap_plani` | +4 kolon (normal_bakiye, muavin_secim_zorunlu, cari_gerektirir, ust_kod) |
| `muavin_hesaplar` | Yeniden kurulum: uuid PK, +cari_id, +isletme_id, +olusturan_user_id, −tip |
| `sorular` | +olay_id, +tip, +destek_seviyesi, +config; `belgeler`/`muavinler` jsonb deprecate |
| `cozumler` | soru_id→olay_id; satırlar `cozum_satirlari`'na taşınır; +varyant, +beyanname_etkileri, +hata_kurallari |
| `mevzuat_chunklar` | +madde_id (yapısal katmana köprü) |

### Yeni tablolar

| Bağlam | Tablolar |
|---|---|
| Katalog | `yetkinlikler`, `etiketler`, `soru_tipleri`, `mevzuat_kaynaklar`, `mevzuat_maddeleri` |
| İçerik | `muhasebe_olaylari`, `cari_kartlar`, `belgeler`, `cozum_satirlari` |
| İçerik M2M | `olay_belgeleri`, `olay_yetkinlikleri`, `olay_etiketleri`, `olay_muavinleri`, `cozum_mevzuat` |
| Öğrenme | `kullanici_yetkinlikleri` |
| Simülasyon (v2.1) | `isletmeler`, `simulasyonlar`, `simulasyon_adimlari`, `kullanici_simulasyonlari`, `yevmiye_kayitlari`, `yevmiye_satirlari` |
| Simülasyon view (v2.1) | `buyuk_defter` (view), `mizan` (view) |

---

## 2. Tablolar ve alanları

Gösterim: **PK** kalın, *FK* italik. Tüm tablolarda `created_at timestamptz default now()`; `updated_at` yalnız belirtilen tablolarda (mevcut `set_updated_at()` trigger'ı ile).

### 2.1 KATALOG

#### `hesap_plani` (mevcut + genişletme)

| Alan | Tip | Kısıt | Açıklama |
|---|---|---|---|
| **kod** | text | PK | '120', '600' — mevcut |
| ad, sinif, tur | | mevcut | tur: AKTİF/PASİF/GELİR/GİDER/MALİYET/KAPANIŞ |
| sira | int | mevcut | |
| normal_bakiye | text | check ('borc','alacak') null | **yeni** — mizan doğrulama + öğretim |
| muavin_secim_zorunlu | boolean | default false | **yeni** — true: UI otomatik varsayılan atamaz, kullanıcı muavini seçmek zorunda (120, 320, 335, 102…). false: tek muavin otomatik seçilir (600, 391…). *SDD'deki `muavin_zorunlu` alanının S0 sonrası netleşmiş hali — muavin artık evrensel olduğundan alanın anlamı "seçim zorunluluğu"dur.* |
| cari_gerektirir | boolean | default false | **yeni** — S0 #4: bu hesabın muavini cari kartsız açılamaz (120, 320, 335, 336, 360, 361, 102…) |
| ust_kod | text | *FK self* null | **yeni, opsiyonel** — 58 grup başlığı (`GRUP_ISIMLERI`) DB'ye taşınırsa 3 seviye hiyerarşi |

#### `yetkinlikler` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | text | PK — 'kdv', 'tevkifat', 'cari-hesap', 'bordro', 'ihracat', 'kdv-iade'… |
| ad | text | not null |
| aciklama | text | |
| ust_yetkinlik_id | text | *FK self* on delete set null — hiyerarşi (kdv → kdv-iade) |
| sira | int | default 0 |
| thiings_icon | text | |
| aktif | boolean | default true |

#### `etiketler` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | text | PK — 'veresiye', 'iade', 'ay-sonu'… |
| ad | text | not null |
| kategori | text | null — 'kavram' / 'hesap' / 'sektor' (serbest sınıflama) |

#### `soru_tipleri` (yeni — Question Engine kataloğu)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | text | PK — 'yevmiye', 'hata_bulma', 'coktan_secmeli', 'belge_analizi', 'mizan_analizi', 'beyanname', 'erp_uygulama' |
| ad | text | not null |
| aciklama | text | |
| gerekli_bilesenler | text[] | olayın hangi parçalarını ister: '{belge,cozum}' |
| min_destek_seviyesi | destek_seviyesi | null — bu tip hangi seviyeden itibaren açılır |
| aktif | boolean | default false — renderer hazır olmadan tip açılamaz |
| sira | int | default 0 |

**Neden tablo, enum değil:** Yeni tip eklemek satır eklemektir; enum ALTER migration ister. `aktif=false` sayesinde katalog tanımı ile frontend plugin'inin hazır olması ayrışır.

#### `mevzuat_kaynaklar` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | text | PK — 'kdvk', 'vuk', 'gvk', 'kdv-gut', '5510' |
| tip | mevzuat_tip | not null |
| ad | text | not null — 'Katma Değer Vergisi Kanunu' |
| numara | text | null — '3065' |
| source_url | text | null — mevzuat.gov.tr / gib.gov.tr |

#### `mevzuat_maddeleri` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK default gen_random_uuid() |
| kaynak_id | text | *FK mevzuat_kaynaklar* on delete restrict |
| madde_no | text | not null — '9', '29/1', 'I/C-2.1.3.2.7' |
| baslik | text | not null |
| metin | text | not null — ilgili fıkra/özet |
| effective_date | date | not null |
| expire_date | date | null — null = yürürlükte |
| versiyon | int | default 1 |
| onceki_versiyon_id | uuid | *FK self* null — versiyon zinciri |
| source_url | text | null — madde derin linki |

Kısıt önerisi: `unique (kaynak_id, madde_no, versiyon)`.

### 2.2 İÇERİK

#### `muhasebe_olaylari` (yeni — aggregate root)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | text | PK — 'olay-veresiye-satis-001' (admin-okunur; sorular/unites ile tutarlı) |
| baslik | text | not null |
| senaryo | text | not null — gerçek hayat anlatısı |
| islem_tarihi | date | null — kronoloji/simülasyon için |
| zorluk | zorluk | not null (mevcut enum) |
| ipucu | text | null |
| durum | soru_durum | not null default 'taslak' (mevcut enum yeniden kullanılır) |
| kaynak | text | null — 'manuel' / 'ai' / 'katkici' / 'sablon' |
| ekleyen_id | uuid | *FK kullanicilar* on delete set null — katkıcı sistemi |
| isletme_id | text | *FK isletmeler* null — null = global havuz (v2.1'e kadar hep null) |
| updated_at | timestamptz | trigger |

#### `cari_kartlar` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK |
| isletme_id | text | *FK isletmeler* null — null = global havuz |
| olusturan_user_id | uuid | *FK kullanicilar* null — null = platform içeriği; dolu = öğrencinin açtığı kart (serbest seviye, v2.1) |
| tip | cari_tip | not null |
| unvan | text | not null — 'ABC A.Ş.' |
| kisa_ad | text | null |
| vkn_tckn | text | null |
| vergi_dairesi | text | null |
| il | text | null |
| iban | text | null |
| meta | jsonb | default '{}' — tip'e özel: personel→sgk_no, banka→şube |
| aktif | boolean | default true |
| updated_at | timestamptz | trigger |

#### `muavin_hesaplar` (yeniden kurulum — tablo şu an boş)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK — **değişiklik: eski PK `kod` idi** |
| kod | text | not null, format check `^[0-9]{3}(\.[0-9]+)+$` (mevcut check korunur) |
| ana_kod | text | *FK hesap_plani* on delete restrict; prefix check `kod like ana_kod \|\| '.%'` (mevcut) |
| ad | text | not null — 'ABC A.Ş.' / 'Merkez Kasa' / 'Yurtiçi Satışlar' |
| cari_id | uuid | *FK cari_kartlar* on delete restrict, null — S0 #4: `hesap_plani.cari_gerektirir=true` ise dolu olmalı (trigger, bkz. §12) |
| isletme_id | text | *FK isletmeler* null |
| olusturan_user_id | uuid | *FK kullanicilar* null — öğrencinin açtığı muavin (v2.1) |
| sira | int | default 0 |
| aciklama | text | null |
| aktif | boolean | default true — soft delete (mevcut desen) |
| updated_at | timestamptz | trigger |

Kısıt: `unique nulls not distinct (isletme_id, olusturan_user_id, kod)` — global havuzda kod tekildir; her işletme ve her öğrenci evreni kendi kod uzayını taşır. (PG15+ özelliği; Supabase destekler.)
Kaldırılan: `tip` kolonu (TDHP grubu `ana_kod`'dan türetilir — üç kez semantik değiştirdi).

#### `belgeler` (yeni — `sorular.belgeler` jsonb'un normalize hali)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK |
| tip | belge_tip | not null |
| belge_no | text | not null — mevcut belge_no_format kurallarıyla üretilir |
| tarih | date | not null |
| cari_id | uuid | *FK cari_kartlar* on delete restrict, null — karşı taraf (bordroda personel, dekontta banka, tahakkukta kamu) |
| isletme_id | text | *FK isletmeler* null |
| yon | belge_yon | not null — işletme perspektifi |
| matrah | numeric(14,2) | null |
| kdv_orani | numeric(5,2) | null — %1/%10/%20 |
| kdv_tutari | numeric(14,2) | null |
| tevkifat_orani | text | null — '9/10' (pay/payda gösterimi, mevcut `FaturaBelge.tevkifatPay/Payda` ile uyumlu) |
| tevkifat_tutari | numeric(14,2) | null |
| toplam | numeric(14,2) | not null |
| satirlar | jsonb | default '[]' — belge kalemleri (ad, miktar, birim, birim_fiyat, iskonto) — **gösterim verisi, JOIN yapılmaz** |
| meta | jsonb | default '{}' — tip'e özel alanlar: çek→vade+banka, dekont→islem_turu+valör, bordro→brüt/kesinti kalemleri, fatura→ettn (mevcut `Belge` union alanları buraya haritalanır) |

#### `cozumler` (mevcut tablo, yeniden yapılanma)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK (mevcut) |
| olay_id | text | *FK muhasebe_olaylari* on delete cascade — **değişiklik: eski soru_id yerine** |
| varyant | int | default 1 — alternatif geçerli çözümler (7/A vs 7/B); `unique (olay_id, varyant)` |
| varyant_adi | text | null — 'Aralıklı envanter' |
| aciklama | text | null — muhasebe mantığı anlatısı (zincirin 6. halkası) |
| beyanname_etkileri | jsonb | default '[]' — `[{"beyanname":"KDV1","satir":"Hesaplanan KDV","etki":2000}]` — MVP'de jsonb, motor v2.2 |
| hata_kurallari | jsonb | default '[]' — `[{"yanlis_kod":"191","mesaj":"…"}]` — katman-2 geri bildirim |

Kaldırılan (geçiş sonunda): `soru_id`, `sira`, `kod`, `borc`, `alacak` — satırlar aşağıya taşınır.

#### `cozum_satirlari` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK |
| cozum_id | uuid | *FK cozumler* on delete cascade |
| sira | int | not null; `unique (cozum_id, sira)` |
| muavin_id | uuid | *FK muavin_hesaplar* on delete restrict, **NOT NULL — S0 #3'ün DB karşılığı** |
| borc | numeric(14,2) | default 0, check >= 0 |
| alacak | numeric(14,2) | default 0, check >= 0 |
| aciklama | text | null |

Kısıt: `check (borc = 0 or alacak = 0)` — bir satır tek taraflıdır.

### 2.3 ÖĞRENME

#### `sorular` (mevcut tablo — instance'a evrim)

Korunan alanlar: `id`, `unite_id`, `alt_baslik_id`, `baslik`, `zorluk`, `senaryo`, `ipucu`, `aciklama`, `durum`, `kaynak`, `yayinlanma_tarihi`, timestamps.

| Yeni alan | Tip | Kısıt |
|---|---|---|
| olay_id | text | *FK muhasebe_olaylari* on delete restrict, null — null = eski (olaysız) soru, geçiş dönemi |
| tip | text | *FK soru_tipleri* not null default 'yevmiye' |
| destek_seviyesi | destek_seviyesi | not null default 'standart' — scaffold ekseni |
| config | jsonb | default '{}' — tip'e özel üretim parametreleri (hata_bulma: hangi kural bozuldu; coktan_secmeli: çeldiriciler) |

Deprecate edilen (S10 temizliğinde drop): `belgeler` jsonb (→ `olay_belgeleri`), `muavinler` jsonb (→ `olay_muavinleri`), `etiketler` (→ `olay_etiketleri`).
**Not:** Soru instance'ında senaryo/baslik null bırakılırsa olaydan miras alınır (uygulama katmanı kuralı); override edilebilir (örn. hata_bulma tipi farklı yönerge metni taşır).

#### `ilerleme` (mevcut — değişmez)

`user_id`, `soru_id`, `dogru_mu`, `sure_saniye`, `created_at`. Soru bazlı istatistik logu olarak kalır. Yetkinlik agregasyonu `kullanici_yetkinlikleri`'ne yazılır.

#### `kullanici_yetkinlikleri` (yeni)

| Alan | Tip | Kısıt |
|---|---|---|
| **user_id** | uuid | *FK kullanicilar* on delete cascade — bileşik PK |
| **yetkinlik_id** | text | *FK yetkinlikler* on delete cascade — bileşik PK |
| xp | int | default 0 |
| dogru_sayisi | int | default 0 |
| yanlis_sayisi | int | default 0 |
| son_calisma | timestamptz | null |

Türetilir, saklanmaz: seviye (XP eşik fonksiyonu), zayıf alanlar (başarı oranı + recency view'ı), toplam XP (sum).

### 2.4 SİMÜLASYON (v2.1)

#### `isletmeler`

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | text | PK — 'yildiz-ticaret' |
| ad | text | not null — 'Yıldız Ticaret A.Ş.' |
| tip | isletme_tip | not null |
| vkn | text | null — belge gerçekçiliği |
| donem_yili | int | not null |
| aciklama | text | null |
| aktif | boolean | default true |

#### `simulasyonlar`

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | text | PK — 'yildiz-ticaret-2026' |
| isletme_id | text | *FK isletmeler* on delete restrict |
| ad | text | not null |
| aciklama | text | null |
| zorluk | modul_zorluk | not null (mevcut enum yeniden kullanılır) |
| durum | soru_durum | default 'taslak' |
| premium | boolean | default false — premium kapısı (PremiumGate ile) |
| sira | int | default 0 |

#### `simulasyon_adimlari`

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK |
| simulasyon_id | text | *FK simulasyonlar* on delete cascade |
| sira | int | not null; `unique (simulasyon_id, sira)` |
| islem_tarihi | date | not null — kronoloji |
| olay_id | text | *FK muhasebe_olaylari* on delete restrict — adım = tarihli olay |
| kontrol_modu | text | check ('anlik','donem_sonu') default 'anlik' |

#### `kullanici_simulasyonlari`

| Alan | Tip | Kısıt |
|---|---|---|
| **user_id** | uuid | *FK kullanicilar* cascade — bileşik PK |
| **simulasyon_id** | text | *FK simulasyonlar* cascade — bileşik PK |
| mevcut_adim | int | default 0 |
| durum | text | check ('devam','tamamlandi','birakti') default 'devam' |
| baslama | timestamptz | default now() |
| bitirme | timestamptz | null |

#### `yevmiye_kayitlari` (kullanıcı üretimi — append-only)

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK |
| user_id | uuid | *FK kullanicilar* on delete cascade |
| kaynak_tip | yevmiye_kaynak | not null |
| soru_id | text | *FK sorular* null |
| sim_adim_id | uuid | *FK simulasyon_adimlari* null |
| yevmiye_no | int | null — simülasyonda kullanıcı-içi sıra |
| tarih | date | not null |
| aciklama | text | null |
| dogru_mu | boolean | null — kontrol sonucu |

Kısıt: `check ((kaynak_tip='soru' and soru_id is not null) or (kaynak_tip='simulasyon' and sim_adim_id is not null))`.
Düzeltme politikası (SDD §10.3): hatalı kayıt silinmez, ters kayıtla düzeltilir — tablo append-only'dir; `duzeltme_of_id uuid FK self null` kolonu ters kaydı orijinaline bağlar.

#### `yevmiye_satirlari`

| Alan | Tip | Kısıt |
|---|---|---|
| **id** | uuid | PK |
| yevmiye_id | uuid | *FK yevmiye_kayitlari* on delete cascade |
| sira | int | not null; `unique (yevmiye_id, sira)` |
| muavin_id | uuid | *FK muavin_hesaplar* on delete restrict, **NOT NULL — S0 #3** |
| borc | numeric(14,2) | default 0, check >= 0 |
| alacak | numeric(14,2) | default 0, check >= 0; `check (borc = 0 or alacak = 0)` |

Denge kuralı (Σborç = Σalacak): birincil kontrol uygulama katmanında; DB güvencesi olarak *deferred constraint trigger* önerilir (bkz. §12).

#### `buyuk_defter` ve `mizan` (VIEW — S0 #5)

Tablo değildir. Tanım (sözel):

- **buyuk_defter:** `yevmiye_satirlari ⋈ yevmiye_kayitlari ⋈ muavin_hesaplar ⋈ hesap_plani`; kolonlar: user_id, simulasyon bağlamı, ana_kod, hesap adı, muavin_id, muavin kod/ad, tarih, yevmiye_no, borç, alacak. Hesap bazında kronolojik döküm.
- **mizan:** buyuk_defter'in `group by user_id, sim bağlamı, ana_kod` (genel mizan) ve `group by … muavin_id` (muavin mizanı) agregasyonu; kolonlar: borç toplamı, alacak toplamı, borç bakiyesi, alacak bakiyesi. `normal_bakiye` alanıyla karşılaştırılarak "ters bakiye" uyarısı üretilebilir.

Performans ihtiyacı doğarsa `materialized view` değil, kullanıcı+simülasyon filtreli sorgu + composite index tercih edilir (bkz. §7); MV senkron sorununu geri getirir.

### 2.5 MEVZUAT KÖPRÜSÜ

#### `mevzuat_chunklar` (mevcut — tek ek)

| Yeni alan | Tip | Kısıt |
|---|---|---|
| madde_id | uuid | *FK mevzuat_maddeleri* on delete set null, null — RAG chunk'ı ile yapısal madde eşleşmesi |

---

## 3. PK / FK ilişki haritası

```
hesap_plani(kod) ◄── muavin_hesaplar.ana_kod          [restrict]
cari_kartlar(id) ◄── muavin_hesaplar.cari_id           [restrict]
cari_kartlar(id) ◄── belgeler.cari_id                  [restrict]
isletmeler(id)   ◄── cari_kartlar / muavin_hesaplar / belgeler /
                     muhasebe_olaylari / simulasyonlar  [null → global havuz]

muhasebe_olaylari(id) ◄── cozumler.olay_id             [cascade]
                     ◄── sorular.olay_id               [restrict]
                     ◄── simulasyon_adimlari.olay_id   [restrict]
cozumler(id)          ◄── cozum_satirlari.cozum_id     [cascade]
muavin_hesaplar(id)   ◄── cozum_satirlari.muavin_id    [restrict, NOT NULL]
                      ◄── yevmiye_satirlari.muavin_id  [restrict, NOT NULL]

soru_tipleri(id)      ◄── sorular.tip                  [restrict]
yetkinlikler(id)      ◄── yetkinlikler.ust_yetkinlik_id [set null — hiyerarşi]
                      ◄── kullanici_yetkinlikleri      [cascade]

mevzuat_kaynaklar(id) ◄── mevzuat_maddeleri.kaynak_id  [restrict]
mevzuat_maddeleri(id) ◄── mevzuat_maddeleri.onceki_versiyon_id [versiyon zinciri]
                      ◄── mevzuat_chunklar.madde_id    [set null]

kullanicilar(id)      ◄── ilerleme / kullanici_yetkinlikleri /
                          yevmiye_kayitlari / kullanici_simulasyonlari [cascade]
sorular(id)           ◄── ilerleme.soru_id (mevcut) / atolye_sorulari (mevcut) /
                          yevmiye_kayitlari.soru_id
simulasyon_adimlari(id) ◄── yevmiye_kayitlari.sim_adim_id
yevmiye_kayitlari(id) ◄── yevmiye_satirlari.yevmiye_id [cascade]
```

**Cascade felsefesi:** Aggregate içi bağlar cascade (olay silinirse çözümleri, çözüm silinirse satırları gider); aggregate'ler arası bağlar restrict (kullanılan muavin/cari/olay silinemez — önce bağ sökülür). Kullanıcı verisi kullanıcıyla cascade (KVKK silme hakkı — mevcut `hesap_sil_rpc` deseniyle uyumlu).

---

## 4. Çoktan çoğa tablolar

| Tablo | Kolonlar (bileşik PK) | Ek alan | Amaç |
|---|---|---|---|
| `olay_belgeleri` | olay_id → muhasebe_olaylari [cascade], belge_id → belgeler [restrict] | sira int | Bir belge N olayda (aynı fatura: kayıt olayı + KDV olayı); bir olay N belge (bordro + tahakkuk fişi) |
| `olay_yetkinlikleri` | olay_id [cascade], yetkinlik_id [restrict] | agirlik numeric(3,2) default 1 | XP dağıtımı + zayıf alan tespiti |
| `olay_etiketleri` | olay_id [cascade], etiket_id [cascade] | — | Filtre/keşif |
| `olay_muavinleri` | olay_id [cascade], muavin_id [restrict] | — | Sorunun dropdown evreni (eski `sorular.muavinler` jsonb'un normalize hali) |
| `cozum_mevzuat` | cozum_id [cascade], madde_id [restrict] | aciklama text | "Bu kayıt KDVK md.9'a dayanır" + etki analizi sorgusu |
| `atolye_sorulari` | (mevcut) alt_baslik_id, soru_id | sira | Değişmez — atölye müfredatı soru instance'larına bağlanmaya devam eder |

**Neden `olay_muavinleri` M2M, muavin listesi olay kolonu değil:** Aynı muavin seti (Merkez Kasa, İş Bankası, ABC A.Ş.) onlarca olayda tekrar eder; M2M ile muavin bir kez tanımlanır, kullanım sayacı sorgulanabilir, cari tutarlılığı FK ile korunur.

---

## 5. Enum değerleri

### Mevcut — yeniden kullanılan

| Enum | Değerler | v2 kullanımı |
|---|---|---|
| `soru_durum` | taslak, inceleme, onayli, arsiv | sorular (mevcut) + **muhasebe_olaylari + simulasyonlar** |
| `zorluk` | kolay, orta, zor | sorular (mevcut) + **muhasebe_olaylari** |
| `modul_zorluk` | baslangic, orta, ileri, sinav | unite_modulleri (mevcut) + **simulasyonlar** |
| `odeme_durum`, `odeme_donem` | (mevcut) | değişmez |

### Yeni

| Enum | Değerler | Not |
|---|---|---|
| `cari_tip` | musteri, tedarikci, personel, kamu, banka, diger | |
| `belge_tip` | satis_faturasi, alis_faturasi, perakende_fisi, banka_dekontu, smm_makbuzu, cek, senet, bordro, gider_pusulasi, tahakkuk_fisi | `tahakkuk_fisi`: KDV/SGK/vergi tahakkukları (bkz. §13.3–13.4). Mevcut `Belge` union'ındaki 5 tip alt kümedir; fatura tipi `yon` ile alış/satışa ayrışır |
| `belge_yon` | gelen, giden | işletme perspektifi |
| `mevzuat_tip` | kanun, yonetmelik, teblig, ozelge, sirkuler, genelge | |
| `destek_seviyesi` | rehberli, standart, serbest | scaffold: rehberli = muavin listesi + ipucu açık; standart = liste var ipucu kapalı; serbest = kullanıcı muavin/cari açar |
| `isletme_tip` | ticaret, hizmet, uretim, eticaret, ihracatci | |
| `yevmiye_kaynak` | soru, simulasyon | |

**Enum mu, katalog tablosu mu — karar kuralı:** Değerleri *ürün kararıyla* çoğalanlar tablo (`soru_tipleri`, `yetkinlikler`, `etiketler`); değerleri *domain doğası gereği* sabit olanlar enum (`cari_tip`, `belge_yon`). Belge tipi sınırda — enum seçildi çünkü her tip bir render şablonu gerektirir (kod değişikliği zaten şart).

---

## 6. RLS politika önerileri

Üç şablon (mevcut politikalarla aynı desen):

- **[K] Katalog:** herkes okur, admin yazar — `for select using (true)` + `for all using (is_admin())`
- **[İ] İçerik:** onaylı olan herkese, taslak sahibine + admin'e — durum bazlı select
- **[S] Sahiplik:** yalnız kendi satırları — `auth.uid() = user_id`

| Tablo | Şablon | Özel not |
|---|---|---|
| hesap_plani, yetkinlikler, etiketler, soru_tipleri, mevzuat_kaynaklar, mevzuat_maddeleri, isletmeler | K | |
| muhasebe_olaylari | İ | `using (durum='onayli' or is_admin() or ekleyen_id=auth.uid())` — katkıcı taslağını görür |
| belgeler, cozumler, cozum_satirlari | İ (dolaylı) | Mevcut `cozumler_public_read_onayli` deseni: `exists (… olay onaylı)`. cozum_satirlari cozumler üzerinden iki seviye exists yerine cozumler'e join'li tek exists önerilir (performans, bkz. §12) |
| olay_* M2M'leri, cozum_mevzuat | İ (dolaylı) | Olayın onay durumunu izler |
| cari_kartlar, muavin_hesaplar | K + sahiplik karması | `using (olusturan_user_id is null or olusturan_user_id = auth.uid() or is_admin())` — platform içeriği herkese, öğrencinin açtığı kart yalnız kendine. Öğrenci insert: `with check (olusturan_user_id = auth.uid() and isletme_id is not null)` — global havuza kullanıcı yazamaz |
| sorular | mevcut politika korunur | `durum='onayli'` public read + katkıcı/admin |
| ilerleme, kullanici_yetkinlikleri, yevmiye_kayitlari, yevmiye_satirlari, kullanici_simulasyonlari | S | yevmiye_satirlari: parent üzerinden `exists (yevmiye_kayitlari.user_id = auth.uid())` |
| simulasyonlar, simulasyon_adimlari | K | Premium kapısı RLS'te değil uygulamada (PremiumGate) — içerik görünür, çözüm premium; mevcut hibrit freemium kararıyla tutarlı |
| mevzuat_chunklar | mevcut politika | değişmez |

**İki ilke:** (1) RLS *erişim* katmanıdır, *iş kuralı* katmanı değil — denge kontrolü, cari zorunluluğu gibi kurallar trigger/uygulama işidir. (2) Premium ayrımı RLS'e girmez — RLS'te premium kontrolü her sorguya `kullanicilar` join'i ekler ve freemium stratejisi değiştikçe migration gerektirir.

---

## 7. Index önerileri

FK kolonlarına Postgres otomatik index açmaz — her restrict/cascade FK'sına index şarttır (silme ve join performansı).

| Index | Gerekçe |
|---|---|
| `muavin_hesaplar (ana_kod)`, `(cari_id)`, `(isletme_id, aktif) where aktif` | dropdown sorguları; mevcut aktif partial deseni korunur |
| `muavin_hesaplar unique nulls not distinct (isletme_id, olusturan_user_id, kod)` | evren-içi kod tekilliği |
| `cari_kartlar (isletme_id, tip)`, `(olusturan_user_id) where olusturan_user_id is not null` | evren + tip filtreli listeler |
| `belgeler (cari_id)`, `(tip, tarih)` | belge kütüphanesi + kronoloji |
| `muhasebe_olaylari (durum) where durum='onayli'` | mevcut `sorular_durum_idx` deseni |
| `sorular (olay_id)`, `(tip)` | olay→türev sorular; tip bazlı listeler |
| `cozumler (olay_id)`, `cozum_satirlari (cozum_id)`, `(muavin_id)` | cevap anahtarı yükleme; muavin kullanım sayacı |
| `olay_yetkinlikleri (yetkinlik_id)` | "bu yetkinlikteki olaylar" — benzer senaryo sorgusunun ekseni (PK zaten olay_id-önde) |
| `olay_belgeleri (belge_id)`, `olay_muavinleri (muavin_id)`, `olay_etiketleri (etiket_id)` | M2M ters yön |
| `cozum_mevzuat (madde_id)` | **etki analizi:** "bu madde değişti, hangi çözümler etkilenir" |
| `mevzuat_maddeleri (kaynak_id, madde_no)`, `(effective_date, expire_date)` | madde arama + "T tarihinde yürürlükte" |
| `kullanici_yetkinlikleri (yetkinlik_id)` | agregat istatistik (PK user-önde) |
| `yevmiye_kayitlari (user_id, kaynak_tip)`, `(sim_adim_id)` | defter/mizan view'larının ana filtresi |
| `yevmiye_satirlari (yevmiye_id)`, `(muavin_id)` | mizan group-by yolu |
| `simulasyon_adimlari (simulasyon_id, sira)` | adım akışı |

Mevcut indexler (sorular, ilerleme, atolye_sorulari, mevzuat embedding ivfflat) değişmez.

---

## 8. Migration sırası

Her adım tek migration dosyası, tek başına uygulanabilir ve geri alınabilir. Manuel çalıştırma akışına uygun (kullanıcı tercihi); backfill içerenler idempotent yazılır.

| # | Migration | İçerik | Kırıcı? | Sprint |
|---|---|---|---|---|
| M1 | `hesap_plani_v2_alanlar` | +normal_bakiye, +muavin_secim_zorunlu, +cari_gerektirir (+ust_kod ops.) + 272 hesap için seed update | Hayır | S1 |
| M2 | `katalog_yetkinlik_etiket_sorutipi` | yeni enum'lar + yetkinlikler + etiketler + soru_tipleri + seed | Hayır | S1 |
| M3 | `cari_kartlar` | tablo + RLS + global havuz seed (çekirdek cariler: vergi dairesi, SGK, bankalar, örnek müşteri/tedarikçiler) | Hayır | S2 |
| M4 | `muavin_hesaplar_v2` | drop & recreate (tablo boş): uuid PK, cari_id, isletme_id, olusturan_user_id; −tip; cari-zorunluluk trigger'ı; çekirdek muavin seed (100.01, 102.01…, 191.01, 391.01, 600.01…) | Hayır (boş tablo) | S2 |
| M5 | `muhasebe_olaylari_iskelet` | muhasebe_olaylari + olay_* M2M'leri + sorular'a olay_id/tip/destek_seviyesi/config + **backfill: mevcut her onaylı soru → 1 olay** (senaryo/zorluk kopyalanır, soru olaya bağlanır) | Hayır (additive + backfill) | S2 |
| M6 | `belgeler_normalize` | belgeler + olay_belgeleri + backfill: `sorular.belgeler` jsonb → satırlar (tip haritalama: fatura→satis/alis_faturasi via yön çıkarımı, meta'ya union alanları) — jsonb DURUR (dual-read) | Hayır | S2 |
| M7 | `cozumler_v2` | cozumler'e olay_id/varyant/beyanname_etkileri/hata_kurallari + cozum_satirlari + **backfill: eski (soru_id, sira, kod, borc, alacak) → satırlar; kod→muavin eşleme** (bkz. §12.2) — eski kolonlar DURUR | **Evet** | S3 |
| M8 | `mevzuat_yapisal` | mevzuat_kaynaklar + mevzuat_maddeleri + cozum_mevzuat + mevzuat_chunklar.madde_id + çekirdek seed (KDVK, VUK, GVK, 5510 + en sık maddeler) | Hayır | S6 |
| M9 | `kullanici_yetkinlikleri` | tablo + `ilerleme`den backfill (soru→olay→yetkinlik zinciriyle geçmiş XP hesaplanır) | Hayır | S5 |
| M10 | `simulasyon_paketi` | isletmeler + simulasyonlar + simulasyon_adimlari + kullanici_simulasyonlari + yevmiye_kayitlari + yevmiye_satirlari + buyuk_defter/mizan view + denge trigger'ı | Hayır | S8 |
| M11 | `v2_temizlik` | drop: sorular.belgeler/muavinler/etiketler jsonb, cozumler eski kolonları; RLS denetim düzeltmeleri | **Evet (geri dönüşsüz)** | S10 |

**Sıra gerekçesi:** M3–M4 M5'ten önce gelmeli (olay muavin evrenine bağlanır); M7 tek kırıcı adımdır ve M4–M5 oturmadan yapılamaz (kod→muavin eşlemesi muavin tablosunu ister); M11 tüm dual-read'ler kapandıktan sonra en sona.

---

## 9. MVP tabloları (v2.0 — S1–S7)

| Grup | Tablolar |
|---|---|
| Katalog | hesap_plani genişletme, yetkinlikler, etiketler, soru_tipleri, mevzuat_kaynaklar, mevzuat_maddeleri |
| İçerik | muhasebe_olaylari, cari_kartlar, muavin_hesaplar v2, belgeler, cozumler v2, cozum_satirlari |
| M2M | olay_belgeleri, olay_yetkinlikleri, olay_etiketleri, olay_muavinleri, cozum_mevzuat |
| Öğrenme | sorular evrimi, kullanici_yetkinlikleri |

MVP'de jsonb kalan (bilinçli): `beyanname_etkileri`, `hata_kurallari`, `belgeler.satirlar`, `belgeler.meta`, `cari_kartlar.meta`, `sorular.config`.

## 10. v2.1+ tabloları

| Faz | Tablolar / yapılar | Bağımlılık |
|---|---|---|
| v2.1 | isletmeler, simulasyonlar, simulasyon_adimlari, kullanici_simulasyonlari, yevmiye_kayitlari, yevmiye_satirlari, buyuk_defter/mizan view'ları | MVP içerik çekirdeği |
| v2.1 | cari/muavin `olusturan_user_id` akışının UI'ı (serbest seviye) | kolonlar M3–M4'te hazır, akış sonra |
| v2.2 | beyannameler + beyanname_satirlari (jsonb'dan terfi), sınav modu yapıları | beyanname motoru |
| v2.2+ | olay embedding'leri (benzer senaryo semantiği), cozum_hata_kurallari tablosu (jsonb'dan terfi), kurum/sınıf evreni | kanıtlanmış ihtiyaç |

---

## 11. Mevcut tablolarla çakışmalar

| # | Çakışma | Çözüm |
|---|---|---|
| 1 | `cozumler` düz yapısı (soru_id, sira, kod serbest text, borc, alacak) — `kontrol.ts`, `SoruEkrani`, `HesapKoduInput`, admin formları, `scripts/seed-*.mjs` bu şekle bağlı | M7 dual-read: eski kolonlar M11'e kadar durur; `uniteler-loader.ts` yeni şemadan okuyup eski `CozumSatir[]` tipine map'ler (frontend tipi değişmeden backend geçer) |
| 2 | `sorular.muavinler` jsonb (19 Mayıs kararı: soruya özel muavin + FK'sız kod) — S0 bu kararı tersine çevirir | M5–M7 backfill: jsonb muavinler global `muavin_hesaplar`'a terfi (dedupe: aynı kod+ad tek satır), `olay_muavinleri` bağlanır |
| 3 | `sorular.belgeler` jsonb ↔ `belgeler` tablosu | M6 dual-read; `Belge` discriminated union frontend'de kalır, loader tablodan union'a map'ler |
| 4 | `muavin_hesaplar` PK=kod + `tip` kolonu (TDHP grubu) | M4 rebuild — tablo boşken uuid PK'ya geçiş bedava; `tip` düşer |
| 5 | `cozumler.cozumler_muavin_format` check (15 Mayıs) — kod format kısıtı hâlâ tabloda olabilir | M7'de eski check'ler temizlenir; format kuralı artık muavin_hesaplar'da |
| 6 | `ilerleme.dogru_mu` ↔ `yevmiye_kayitlari.dogru_mu` çift kayıt riski | Sözleşme: `ilerleme` = istatistik (her çözümde), `yevmiye_kayitlari` = satır arşivi (yalnız simülasyonda zorunlu). Soru modunda yevmiye kaydı yazılmaz |
| 7 | `mevzuat_chunklar.kaynak/baslik` serbest text ↔ yapısal madde | M8'de mevcut 3327 chunk'a madde_id best-effort eşlenir (kaynak+baslik eşleşmesi); eşleşmeyen null kalır — köprü opsiyoneldir |
| 8 | `atolye_sorulari`/`alt_baslik_id` soru instance'ına bağlı | Değişiklik yok — atölyeler instance'larla çalışmaya devam eder; olay katmanı üstte şeffaftır |
| 9 | `unite_konulari` (eski konu katmanı) yarı-emekli | v2 kapsamı dışı; M11 sonrası ayrı temizlik kararı |
| 10 | `sorular.etiketler` text[] (varsa) ↔ `olay_etiketleri` | M5 backfill + M11 drop |

---

## 12. Riskli migration noktaları

### 12.1 M7 — cozumler dönüşümü (en yüksek risk)

- **Risk:** Cevap anahtarı bozulursa tüm platform "yanlış"a düşer; sessiz bozulma fark edilmez.
- **Önlem:** Backfill sonrası *denetim sorgusu* migration'ın parçası olur: her olayda eski satır sayısı = yeni satır sayısı, eski Σborç/Σalacak = yeni toplamlar; uyuşmayan olay listesi raporlanır, migration kısmi durumda bırakılmaz (transaction). Frontend'de feature flag ile eski/yeni kontrol paralel çalıştırılıp sonuç kıyaslanır (S3 kabul ölçütü).

### 12.2 Kod → muavin eşlemesi (M7'nin içindeki asıl zorluk)

Mevcut `cozumler.kod` üç biçimde olabilir: ana hesap ('153'), soru-yerel muavin ('100.001' — tanımı `sorular.muavinler` jsonb'da), tanımsız serbest kod.

- Ana hesap → o hesabın varsayılan muavini (`kod + '.01'`) yoksa otomatik açılır
- Soru-yerel muavin → jsonb tanımı global tabloya terfi (kod+ad dedupe)
- Tanımsız → migration raporunda listelenir, elle çözülür (`_bekleyen` klasörü pratiğine uygun)

**Risk:** Dedupe yanlışı iki farklı cariyi tek muavinde birleştirebilir. **Önlem:** dedupe anahtarı kod+ad birlikte; sadece kod eşleşip ad farklıysa otomatik birleştirme YAPILMAZ, rapora düşer.

### 12.3 Cari zorunluluğu trigger'ı (S0 #4)

`cari_gerektirir=true` hesabın muavini cari'siz açılamaz — tablolar arası kural, check constraint yetmez, **constraint trigger** gerekir. Risk: trigger seed sırasında ölçekli insert'i yavaşlatabilir. Önlem: statement-level değil row-level ama basit tek lookup; seed'ler cari-önce sıralanır.

### 12.4 Denge trigger'ı (M10)

Σborç=Σalacak satır satır insert edilen yapıda ancak *deferred* (commit anı) trigger ile doğrulanabilir. Risk: Supabase client'ları tek-statement insert yapar; satırlar tek RPC/tek insert çağrısında gönderilmeli. Önlem: yevmiye kaydı `yevmiye_kaydet(satirlar jsonb)` RPC'siyle atomik yazılır — client tablo insert'i yerine RPC kullanır (RLS security definer içinde own-check).

### 12.5 `unique nulls not distinct`

PG15+ özelliği. Supabase projesi PG15+ olmalı — M4 öncesi doğrulanır. Değilse alternatif: partial unique index çifti (isletme_id null / not null ayrı).

### 12.6 İki seviyeli RLS exists zinciri

`cozum_satirlari` → cozumler → muhasebe_olaylari onay kontrolü iki join'li exists üretir; liste sorgularında maliyetli. Önlem: satırlar her zaman cozum üzerinden yüklenir (tekil sorgu deseni) ve/veya onaylı olay id'leri için `security definer` yardımcı fonksiyon; ölçüm S3'te yapılır.

### 12.7 M11 geri dönüşsüzlüğü

jsonb drop'ları sonrası eski koda dönüş yok. Önlem: M11'den önce tam yedek + iki hafta canlı gözlem; M11 lansman haftasına denk getirilmez.

---

## 13. Örnek veri akışları

Dört senaryo; her biri zinciri (Belge → Cari → Muavin → Olay → Çözüm → Beyanname → Mevzuat) farklı yönden zorlar. Tutarlar örnek amaçlı yuvarlanmıştır.

### 13.1 ABC A.Ş.'ye veresiye satış faturası (10.000 + %20 KDV)

| Adım | Tablo | Kayıt |
|---|---|---|
| 1 | cari_kartlar | tip=musteri, unvan='ABC A.Ş.', vkn, vergi_dairesi |
| 2 | muavin_hesaplar | `120.01.001 ABC A.Ş.` (ana_kod=120, cari_id=ABC — cari_gerektirir ✓, secim_zorunlu) · `600.01 Yurtiçi Satışlar` (varsayılan, oto) · `391.01 Hesaplanan KDV` (varsayılan, oto — oran belgede) |
| 3 | belgeler | tip=satis_faturasi, yon=giden, cari_id=ABC, matrah=10.000, kdv_orani=20, kdv_tutari=2.000, toplam=12.000, satirlar jsonb |
| 4 | muhasebe_olaylari + M2M | senaryo; olay_belgeleri(fatura); olay_muavinleri(3 muavin); olay_yetkinlikleri: kdv 0.5, cari-hesap 0.5; olay_etiketleri: veresiye |
| 5 | cozumler | aciklama ("alacak muavin cariye…"), beyanname_etkileri: `[{KDV1, Hesaplanan KDV, +2000}]`, hata_kurallari: `[{191, "Satışta hesaplanan KDV kullanılır"}]`; cozum_mevzuat → KDVK md.10 |
| 6 | cozum_satirlari | 120.01.001 **B 12.000** · 600.01 **A 10.000** · 391.01 **A 2.000** |
| 7 | sorular | tip=yevmiye instance (otomatik) + tip=hata_bulma instance (config: 191 kuralı bozulur) |

### 13.2 Tevkifatlı hizmet faturası (temizlik hizmeti alımı, 10.000 + %20 KDV, 9/10 tevkifat)

Alınan temizlik hizmeti; KDV 2.000'in 9/10'u (1.800) sorumlu sıfatıyla işletmede kalır, satıcıya yalnız 200 ödenir.

| Adım | Tablo | Kayıt |
|---|---|---|
| 1 | cari_kartlar | tip=tedarikci 'XYZ Temizlik Ltd.' + tip=kamu 'Kadıköy Vergi Dairesi' |
| 2 | muavin_hesaplar | `770.01 Genel Yönetim Gideri` (varsayılan, oto) · `191.01 İndirilecek KDV` (varsayılan, oto) · `320.01.005 XYZ Temizlik` (cari ✓, secim_zorunlu) · `360.03 Sorumlu Sıfatıyla Ödenecek KDV` (cari=Vergi Dairesi — cari_gerektirir ✓, **kamu cari deseni**) |
| 3 | belgeler | tip=alis_faturasi, yon=gelen, cari=XYZ, matrah=10.000, kdv_tutari=2.000, **tevkifat_orani='9/10', tevkifat_tutari=1.800**, toplam=10.200 (satıcıya borç) |
| 4 | cozum_satirlari | 770.01 **B 10.000** · 191.01 **B 2.000** · 320.01.005 **A 10.200** · 360.03 **A 1.800** |
| 5 | beyanname_etkileri | `[{KDV2, Tevkif Edilen KDV, +1800}, {KDV1, İndirilecek KDV, +2000}]` — **iki beyanname birden: jsonb dizisinin varlık sebebi** |
| 6 | cozum_mevzuat | KDVK md.9/1 (vergi sorumlusu) + KDV GUT I/C-2.1.3 (kısmi tevkifat) |
| 7 | olay_yetkinlikleri | tevkifat 0.6, kdv 0.4 |

Zinciri zorlayan yön: tevkifat alanlarının belge modelinde yerli olması (mevcut `FaturaBelge.tevkifatPay/Payda`'nın tabloya taşınmış hali) ve 360'ın kamu carisine bağlı muavini.

### 13.3 KDV tahakkuku (ay sonu mahsup: 191 = 8.000, 391 = 12.000)

Belgeye değil beyanname sürecine dayanan kayıt — `tahakkuk_fisi` belge tipinin varlık sebebi.

| Adım | Tablo | Kayıt |
|---|---|---|
| 1 | belgeler | tip=**tahakkuk_fisi**, yon=ic (iç fiş — dış karşı taraf yok), cari=Kadıköy Vergi Dairesi (kamu), toplam=4.000, meta: `{beyanname:'KDV1', donem:'2026-03'}` |
| 2 | muavin_hesaplar | `391.01` (varsayılan, oto) · `191.01` (varsayılan, oto) · `360.01 Ödenecek KDV` (cari=Vergi Dairesi ✓, secim_zorunlu) |
| 3 | cozum_satirlari | 391.01 **B 12.000** · 191.01 **A 8.000** · 360.01 **A 4.000** |
| 4 | beyanname_etkileri | `[{KDV1, Ödenmesi Gereken KDV, 4000}]` |
| 5 | cozum_mevzuat | KDVK md.29 (indirim) + md.46 (ödeme) |
| 6 | olay_yetkinlikleri | kdv-mahsup 1.0 |
| 7 | Varyant örneği | 191 > 391 olsaydı → ayrı olay değil, bu olayın kardeşi: `190 Devreden KDV` çözümü — iki olay `benzer senaryolar`da birbirine bağlanır (ortak yetkinlik: kdv-mahsup) |

Simülasyonda bu olay "ay sonu" adımıdır: kullanıcının Mart yevmiyelerinden mizan view'ı 191/391 bakiyelerini zaten üretir — doğru cevabın tutarları *kullanıcının kendi defterinden* gelir (`erp_uygulama` tipinin validator'ı mizan view'ına bakar). İçerik kurgusundaki 8.000/12.000, soru modundaki sabit varyanttır.

### 13.4 SGK tahakkuku (Mart bordrosu: brüt 30.000)

Tek olay, **iki belge** — `olay_belgeleri` M2M'inin varlık sebebi.

| Adım | Tablo | Kayıt |
|---|---|---|
| 1 | cari_kartlar | tip=personel 'Ali Yılmaz' (meta: sgk_no) + tip=kamu 'SGK Kadıköy SGM' + tip=kamu 'Vergi Dairesi' (mevcut) |
| 2 | muavin_hesaplar | `770.01 Genel Yönetim Gideri` (varsayılan, oto — MVP'de gider kırılımı yok) · `335.01.001 Ali Yılmaz` (cari=personel ✓) · `360.02 Ödenecek Gelir Vergisi Stopajı` (cari=VD ✓) · `361.01 Ödenecek SGK Primleri` (cari=SGK ✓) |
| 3 | belgeler #1 | tip=**bordro**, yon=ic (iç fiş), cari=Ali Yılmaz, toplam=30.000 (brüt), meta: `{brut:30000, sgk_isci:4500, gv_dv:3500, net:22000, sgk_isveren:6750}` |
| 4 | belgeler #2 | tip=**tahakkuk_fisi**, yon=ic (iç fiş), cari=SGK, toplam=11.250, meta: `{donem:'2026-03', isci:4500, isveren:6750}` |
| 5 | cozum_satirlari | 770.01 **B 36.750** (brüt 30.000 + işveren payı 6.750) · 335.01.001 **A 22.000** (net) · 360.02 **A 3.500** · 361.01 **A 11.250** |
| 6 | beyanname_etkileri | `[{MUHSGK, GV Stopajı, 3500}, {MUHSGK, SGK Prim Bildirimi, 11250}]` |
| 7 | cozum_mevzuat | GVK md.61/94 (ücret + stopaj) + 5510 md.80 (prime esas kazanç) |
| 8 | olay_yetkinlikleri | bordro 0.8, cari-hesap 0.2 |
| 9 | Türev sorular | tip=yevmiye · tip=belge_analizi ("bordrodaki işveren payı ne kadar?" — cevap anahtarı belge meta'sından) · tip=coktan_secmeli ("335'e hangi tutar yazılır?") |

Zinciri zorlayan yön: üç farklı kamu/personel carisinin üç ayrı pasif muavine dağılması ve tek olayın iki belge taşıması — dört akışın en iyi "içerik merkezlilik" vitrini.

---

## Kapanış — doğrulama listesi

Bu model S0'ın sekiz kararına şu mekanizmalarla cevap verir:

| S0 kararı | Mekanizma |
|---|---|
| 1–3 Muavin zorunlu / ana hesaba kayıt yok / muavin_id | `cozum_satirlari.muavin_id` + `yevmiye_satirlari.muavin_id` NOT NULL FK — yapısal imkânsızlık |
| 4 Cari bağı | `hesap_plani.cari_gerektirir` + muavin insert trigger'ı (§12.3) |
| 5 Defter/mizan view | §2.4 — tablo yok, `buyuk_defter`/`mizan` view |
| 6 sorular instance | `sorular.olay_id` + `tip` + `config`; ilerleme/atölye bağları kopmaz |
| 7 Video yok | Şemada video varlığı yok; içerik alanları BlockNote/metin/belge |
| 8 Öğretim zinciri | belgeler → muhasebe_olaylari → sorular → cozum_satirlari → hata_kurallari/aciklama → cozum_mevzuat → olay_yetkinlikleri (benzer senaryolar) |

**Sonraki adım:** M1–M2 migration'larının yazılması (S1 — görünmez sprint, additive). Onay verdiğinde başlarız.
