# M1-M2 Öncesi Kesin Kararlar

**Sürüm:** 1.0 · **Tarih:** 6 Temmuz 2026
**Referans:** [ADR-V2.md](ADR-V2.md) · [SDD-V2.md](SDD-V2.md) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md)
**Amaç:** V2-VERI-MODELI'nin "Açık Kararlar" tablosundaki M1-M2-öncesi maddeleri kesin karara bağlamak. Bu belge onaylandığında M1-M2 migration yazımı başlar.

**Kapsam uyarısı:** Bazı kararlar (varsayılan muavin bayrağı, muavin seed'i) M1-M2'de değil, **M4'te** yürür — ama M1'in `hesap_plani` bayrak seed'i onlara bağlı olduğu için burada kilitlenir. Her kararın *yürürlük migration'ı* parantezle belirtildi.

---

## A) Kesin Kararlar

### A1 — Varsayılan muavin seçim mekanizması (yürürlük: M4 / M1 bayrakları)

İki **ortogonal** bayrak sistemi kurulur:

| Bayrak | Tablo | Migration | Anlamı |
|---|---|---|---|
| `muavin_secim_zorunlu` | `hesap_plani` | **M1** | UI kullanıcıyı muavini *aktif seçmeye* zorlar mı? |
| `varsayilan` | `muavin_hesaplar` | M4 | Zorlamadığında hangi muavin otomatik dolar? |

**UI davranış kuralı:**
- `muavin_secim_zorunlu = false` → UI, o ana hesabın `varsayilan = true` muavinini otomatik seçer. Kullanıcı görmez, otomatik dolar. (191, 391, 600, 770, 100 gibi.)
- `muavin_secim_zorunlu = true` → UI dropdown açar, ön-seçim yapmaz; kullanıcı doğru muavini/cariyi seçmek zorundadır. (120, 320, 335, 360, 102 gibi.)

**Bütünlük garantisi (M4):** `muavin_hesaplar` üzerinde partial unique index — global havuzda (`isletme_id is null and olusturan_user_id is null`) her `ana_kod` için en fazla bir `varsayilan = true`. `muavin_secim_zorunlu = false` olan her ana hesabın tam olarak bir varsayılan muavini olması içerik değişmezidir (moderasyon kontrol eder).
**Fallback:** `varsayilan` işaretli muavin yoksa en düşük `sira`. (Savunma amaçlı; normalde oluşmaz.)

**Neden iki bayrak, tek değil:** "Kullanıcı seçmeli mi?" (pedagojik karar, hesap bazında) ile "otomatik hangisi?" (veri, muavin bazında) farklı sorular. Tek bayrağa sıkıştırmak, "çoklu muavin var ama zorunlu değil" durumunu (teorik olarak) çözemez bırakırdı. Bu ADR-004'ün "Dezavantajlar"da işaretlediği boşluğu kapatır.

### A2 — `cari_gerektirir` kuralı (yürürlük: M1)

`hesap_plani.cari_gerektirir = true` ⟺ muavini, **işletme dışı belirli bir gerçek/tüzel kişiyle yürüyen bakiyeyi** temsil eden hesap. Bu hesaplarda muavin cari kartsız açılamaz (S0 #4, trigger M4).

Kural sonucu: `cari_gerektirir = true` olan her hesap zorunlu olarak `muavin_secim_zorunlu = true`'dur (kullanıcı doğru cariyi seçmeli). Tersi geçerli değil (391 zorunlu-seçim ama cari-değil).

### A3 — `cozum_satirlari` bütünlük garantisi (yürürlük: M7 — burada kilitlenir)

Cevap anahtarı üç kuralla korunur:

1. **Tek taraf kuralı** (row-level CHECK, M7): `borc = 0 OR alacak = 0` ve `borc >= 0 AND alacak >= 0`.
2. **Denge kuralı** (deferred constraint trigger, commit anında): bir `cozum`'un tüm satırları için `abs(Σborc − Σalacak) < 0.01`.
3. **Minimum yapı kuralı** (aynı trigger): satır sayısı ≥ 2 **ve** en az bir borç satırı **ve** en az bir alacak satırı.

**Mekanizma:** Deferred trigger, çünkü çok satır tek transaction'da yazılırken ara durumlar dengesizdir; kontrol commit anında yapılır. Admin yazımı `cozum_kaydet(cozum_id, satirlar jsonb)` RPC'siyle atomik gider (dostane hata mesajı). `yevmiye_satirlari` (M10) *aynı* mekanizmayı `yevmiye_kaydet()` ile kullanır — tutarlı desen.
**Neden şimdi kilitleniyor:** Dengesiz cevap anahtarı her öğrenciyi haksız "yanlış"a düşürür ve sessizce yayılır (V2-VERI-MODELI C1). Muavin zorunluluğu kadar temel bir bütünlük kuralı.

### A4 — `ust_kod` M1'e girmez (yürürlük: ertelendi)

58 grup başlığının (`GRUP_ISIMLERI`) DB'ye taşınması M1 kapsamı **dışında**. Şimdilik kodda kalır. Gerekirse ayrı migration ile eklenir. Gerekçe: MVP muavin/kayıt mantığı için gerekli değil; M1'i dar tutmak regresyon yüzeyini küçültür.

### A5 — Doküman tutarlılık düzeltmeleri

V2-VERI-MODELI §13 örnek akışları bu kararlarla hizalanır: "391.01 Hesaplanan KDV %20" → `391.01 Hesaplanan KDV` (tek havuz, A-bölümü B2 kararı); SGK akışındaki `770.01/770.02` ayrımı → tek `770.01 Genel Yönetim Gideri` (MVP, gider kırılımı v2.2). Bu düzeltmeler V2-VERI-MODELI'ye işlenecek.

---

## B) Seed Listeleri

### B1 — Muavin seed tasarımı (yürürlük: M4, burada kilitlenir)

**İlke:** Global havuz muavinleri (`isletme_id = null`, `olusturan_user_id = null`). Cari-gerektirmeyen hesaplarda tek "genel" muavin (frictionless MVP); kırılım (KDV oranı, gider türü, satış türü) v2.1+ raporlama/beyanname modülüne ertelenir.

**Soruda sorulan hesaplar:**

| Ana hesap | Seed muavin(ler) | secim_zorunlu | cari | varsayilan |
|---|---|---|---|---|
| **191 İndirilecek KDV** | `191.01 İndirilecek KDV` | false | — | ✓ |
| **391 Hesaplanan KDV** | `391.01 Hesaplanan KDV` | false | — | ✓ |
| **600 Yurtiçi Satışlar** | `600.01 Yurtiçi Satışlar` | false | — | ✓ |
| **770 Genel Yönetim Gid.** | `770.01 Genel Yönetim Gideri` | false | — | ✓ |

**Neden 191/391 tek havuz (oran kırılımı yok):** MVP'de KDV oranı belgede (`belgeler.kdv_orani`) ve çözüm açıklamasında öğretilir; muavin seçiminde değil. Oran kırılımı (191.01/02/03, 391.01/02/03) KDV beyanname modülü geldiğinde (v2.1) açılır. Bu, başlangıç öğrencisinin KDV muavinini otomatik doldurarak sürtünmeyi düşürür.
**Neden 600/770 tek muavin:** Satış türü / gider çeşidi kırılımı (7/A) v2.2 maliyet modülü işidir; MVP'de tek genel muavin.

**Yapısal muavin desenleri (M4 tam seed — buradaki liste temsilîdir, kural nettir):**

| Hesap grubu | Desen | secim_zorunlu | cari |
|---|---|---|---|
| 100 Kasa | `100.01 Merkez Kasa` (MVP tek; çoklu kasa v2.1) | false | — |
| 101/103 Çekler | `101.01 Alınan Çekler-Portföy`, `103.01 Verilen Çekler` | false | — |
| 102 Bankalar | `102.01 …Bankası` — her banka bir muavin | **true** | banka ✓ |
| 120 Alıcılar | müşteri başına muavin | **true** | musteri ✓ |
| 121 Alacak Senetleri | müşteri başına muavin | **true** | musteri ✓ |
| 320 Satıcılar | tedarikçi başına muavin | **true** | tedarikci ✓ |
| 321 Borç Senetleri | tedarikçi başına muavin | **true** | tedarikci ✓ |
| 335 Personele Borçlar | personel başına muavin | **true** | personel ✓ |
| 360 Öd. Vergi ve Fonlar | `360.01 Ödenecek KDV`, `360.02 Gelir V. Stopajı`, `360.03 Sorumlu Sıf. Öd. KDV` | **true** | kamu ✓ (Vergi Dairesi) |
| 361 Öd. SGK Primleri | `361.01 Ödenecek SGK` | false | kamu ✓ (SGK) |
| 600/601/610/611 Gelir | tek `.01` genel muavin | false | — |
| 191/391/190 KDV | tek `.01` havuz | false | — |
| 153 Ticari Mallar | `153.01 Ticari Mallar` | false | — |
| 620/621/632/760/770/780 Gider-Maliyet | tek `.01` genel muavin | false | — |

**Global cari seed (M3):** Vergi Dairesi (kamu), SGK (kamu), 3-4 örnek banka (banka), birkaç tanıdık müşteri/tedarikçi (ABC A.Ş., Yıldız Ticaret vb. — ADR-014 tanıdık dünya). 360/361/102 muavinleri bu carilere bağlanır.

### B2 — Yetkinlik seed (yürürlük: M2)

Hiyerarşik (`ust_yetkinlik_id` self-FK). ~20 yetkinlik:

```
muhasebe-temeli (kök)
├── belge-okuma
├── cari-hesap
│   └── muavin-hesap
├── odeme-araclari        (çek/senet/banka)
├── kdv
│   ├── kdv-mahsup
│   ├── kdv-iade
│   └── tevkifat
├── stok
│   └── envanter-yontemleri
├── bordro
├── duran-varlik
│   └── amortisman
├── dis-ticaret
│   ├── ihracat
│   └── ithalat
└── donem-sonu
    ├── reeskont
    ├── karsilik
    └── kapanis
```

MVP'de aktif kullanılan: muhasebe-temeli, belge-okuma, cari-hesap, muavin-hesap, odeme-araclari, kdv, kdv-mahsup, tevkifat, stok. Diğerleri seed'lenir ama içerik geldikçe ağırlık alır.

### B3 — Etiket seed (yürürlük: M2)

Başlangıç seti (`kategori`: kavram / islem / sektor):

`veresiye` · `pesin` · `vadeli` · `senetli` · `cekli` · `iade` · `iskonto` · `nakliye` · `avans` · `ay-sonu` · `acilis` · `kapanis` · `tevkifatli` · `ihracat` · `ithalat` (kavram/işlem). Sektör etiketleri simülasyonla (v2.1) genişler.

### B4 — soru_tipleri seed (yürürlük: M2)

7 tip katalogda tanımlanır; yalnız `yevmiye` aktif (validator'ı `kontrol.ts` hazır). Diğerleri plugin'i geldikçe açılır.

| id | ad | gerekli_bilesenler | uretim_yontemi | aktif | faz |
|---|---|---|---|---|---|
| `yevmiye` | Yevmiye Kaydı | {cozum} | otomatik | **true** | v2.0 |
| `hata_bulma` | Hata Bulma | {cozum, hata_kurallari} | yari_otomatik | false | v2.0 (S4) |
| `coktan_secmeli` | Çoktan Seçmeli | {cozum} | yari_otomatik | false | v2.0 (S4) |
| `belge_analizi` | Belge Analizi | {belge} | yari_otomatik | false | v2.1 |
| `mizan_analizi` | Mizan Analizi | {cozum} | yari_otomatik | false | v2.1 |
| `beyanname` | Beyanname | {cozum, beyanname_etkileri} | yari_otomatik | false | v2.2 |
| `erp_uygulama` | ERP Uygulama | {belge, cozum} | manuel | false | v2.2 |

---

## C) Enum Listeleri (kesin — yürürlük: M2)

### C1 — `belge_yon` (3 değer)
`gelen` · `giden` · `ic`

- **gelen:** belge işletmeye dışarıdan gelir — alış faturası, gelen dekont, alınan SMM makbuzu.
- **giden:** işletme düzenler — satış faturası, kesilen makbuz.
- **ic:** self-generated iç fiş — bordro, KDV/SGK tahakkuk fişi, açılış/kapanış/mahsup/amortisman/reeskont. *(B3 boşluğunu kapatır — dönem sonu üniteleri artık modele sığar.)*

### C2 — `belge_tip` (11 değer)
`satis_faturasi` · `alis_faturasi` · `perakende_satis_fisi` · `gider_pusulasi` · `serbest_meslek_makbuzu` · `banka_dekontu` · `cek` · `senet` · `bordro` · `tahakkuk_fisi` · `mahsup_fisi`

Mevcut `Belge` union eşlemesi (M6 backfill): `fatura` → satis/alis (yön çıkarımı), `perakende-fis` → perakende_satis_fisi, `cek` → cek, `senet` → senet, `dekont` → banka_dekontu. Yeni: gider_pusulasi, serbest_meslek_makbuzu, bordro, tahakkuk_fisi, mahsup_fisi.
`mahsup_fisi` = genel iç fiş (açılış/kapanış/amortisman/reeskont ortak tipi — enum şişkinliğini önler).

### C3 — `cari_tip` (6 değer)
`musteri` · `tedarikci` · `personel` · `kamu` · `banka` · `diger`

- musteri (120,121) · tedarikci (320,321) · personel (335,195) · kamu (360,361 — vergi dairesi, SGK, belediye) · banka (102,103,300) · diger (131,331,136,326 — ortaklar, diğer alacak/borç; alt ayrım `meta`'da).

### C4 — M2'de oluşturulan diğer enum'lar
- `mevzuat_tip`: `kanun` · `yonetmelik` · `teblig` · `ozelge` · `sirkuler` · `genelge`
- `destek_seviyesi`: `rehberli` · `standart` · `serbest`

### C5 — M2'ye girmeyen enum'lar (ilk kullanımda oluşturulur)
`isletme_tip`, `yevmiye_kaynak` → M10 (simülasyon). Şimdi oluşturmaya gerek yok; değerleri V2-VERI-MODELI §5'te kayıtlı.

**Enum genişletme notu:** Yeni değer gerekirse `ALTER TYPE ADD VALUE` ucuzdur (PG12+), ama değer *silinemez*. Bu yüzden listeler kapsayıcı tutuldu. Yeni değer eklemek migration ister ama tablo kilitlemez.

---

## D) M1 Kapsamı — `hesap_plani_v2_alanlar`

**Ekle (additive, 272 satırı bozmadan):**
1. `normal_bakiye text check (normal_bakiye in ('borc','alacak'))` — nullable.
2. `muavin_secim_zorunlu boolean not null default false`.
3. `cari_gerektirir boolean not null default false`.

**Seed / UPDATE (272 hesap):**
- `normal_bakiye`: mekanik kural — `tur` AKTİF/GİDER/MALİYET → `borc`, PASİF/GELİR → `alacak`, KAPANIŞ → null. Ardından ~18 kontra hesap manuel override (103,122,129,199,222,232,257,268,278,298 → alacak; 610,611,612 → borc; vb.).
- `cari_gerektirir = true`: A2 kuralına uyan hesaplar (102,120,121,126,159,320,321,326,329,335,336,360,361,368,369 …).
- `muavin_secim_zorunlu = true`: tüm `cari_gerektirir = true` hesaplar + çoklu-muavin cari-olmayan hesaplar (100 çoklu-kasa gelince, 101,103 …). MVP'de tek-muavinli hesaplar false.

**M1 kapsamı DIŞI:** `ust_kod` (A4), muavin tablosu, cari tablosu, herhangi bir yeni tablo.

**M1 sonucu:** `hesap_plani` 3 yeni kolonla dolu; hiçbir kod bu kolonları henüz okumuyor → görünmez değişiklik.

---

## E) M2 Kapsamı — `katalog_yetkinlik_etiket_sorutipi`

**Oluştur — enum'lar (C1-C4):** `belge_yon`, `belge_tip`, `cari_tip`, `mevzuat_tip`, `destek_seviyesi`.
*(Tablolar bu enum'ları M3-M6'da kullanır; enum'ları erken oluşturmak Postgres'te sorunsuz ve migration sırasını gevşetir.)*

**Oluştur — tablolar + RLS [K şablonu] + seed:**
1. `yetkinlikler` (self-FK hiyerarşi) + B2 seed (~20).
2. `etiketler` + B3 seed (~15).
3. `soru_tipleri` (+ `uretim_yontemi` kolonu dahil) + B4 seed (7 tip, yalnız `yevmiye` aktif).

**RLS:** Üçü de katalog şablonu — `for select using (true)` + `for all using (is_admin())`.

**M2 kapsamı DIŞI:** muhasebe_olaylari, cari_kartlar, belgeler, cozumler değişimi, mevzuat tabloları (M3+).

**M2 sonucu:** 3 yeni katalog tablosu + 5 enum var; hiçbir kod bunları henüz sorgulamıyor → görünmez değişiklik.

---

## F) Riskler

| # | Risk | Şiddet | Önlem |
|---|---|---|---|
| F1 | `normal_bakiye` kontra hesap istisnaları atlanır (~18 hesap) | Düşük | Kontra listesi seed'e açık yazılır; hiçbir kod okumadığı için M4 öncesi düzeltilebilir |
| F2 | `muavin_secim_zorunlu`/`cari_gerektirir` yanlış değer | Düşük | Kimse okumadığından M4 öncesi risksiz düzeltilir; A2 kuralı seed'i tekilleştirir |
| F3 | Yetkinlik hiyerarşisi yanlış tasarım → sonra yanlış önkoşul | Orta | Katalog tablosu (düzenlenebilir); seed öncesi B2 grafı gözden geçirilir |
| F4 | Enum değeri sonradan gerekir | Düşük | Listeler kapsayıcı; `ADD VALUE` ucuz, tablo kilitlemez |
| F5 | Muavin/varsayılan kararı (A1) M4'te yanlış çıkar | Düşük | Karar burada yazılı kilitli; M4 bunu uygular, S0-tipi salınım engellenir |
| F6 | Lansman (Hat A) ile çakışma | Yok | M1-M2 tümüyle additive, sıfır regresyon; lansman haftasında bile deploy edilebilir |

**Genel değerlendirme:** M1-M2'nin tüm riskleri düşük veya yok, çünkü ikisi de yalnız *ekler* ve hiçbir mevcut kod yolu yeni yapıları okumaz. En yüksek etkili kararlar (A3 denge, A1 muavin) M7/M4'te *yürür* ama *burada kilitlenir* — asıl risk o migration'lara taşınır, M1-M2'ye değil.

---

## G) M1-M2'ye geçilebilir mi?

**EVET.**

**Gerekçe:**
1. Sorulan 10 açık kararın tamamı kesin karara bağlandı (A-C bölümleri).
2. M1-M2 kapsamı net ve tümüyle additive (D-E): 3 hesap_plani kolonu + 5 enum + 3 katalog tablosu. Hiçbir kırıcı değişiklik, hiçbir mevcut tablo dönüşümü yok.
3. Regresyon yüzeyi sıfır (H10): hiçbir mevcut kod yolu yeni kolonları/tabloları okumaz — "görünmez sprint". Lansman hattını (Hat A) etkilemez.
4. M4/M7'de yürüyecek ağır kararlar (muavin, denge) burada yazılı kilitlendi; ilgili migration'lar bu belgeyi uygular, yeniden karar vermez — ADR felsefesiyle (salınım yok) tutarlı.

**Tek koşul:** B2 yetkinlik grafı seed'i, F3 riski nedeniyle M2 yazımından hemen önce bir kez gözden geçirilsin (hiyerarşi domain açısından doğru mu?). Bu, migration'ı bloklamaz — seed içeriği son anda düzeltilebilir.

**Sonraki adım:** Onayınla M1 (`hesap_plani_v2_alanlar`) migration'ını yazmaya başlarım; ardından M2. İkisi de tek dosya, geri alınabilir, manuel çalıştırmaya uygun.
