# M4 — muavin_hesaplar v2: Şema + Frontend Etki Analizi

**Sürüm:** 1.0 · **Tarih:** 6 Temmuz 2026 · **Durum:** Analiz — SQL/kod yazılmadı
**Referans:** [M3-M4-CARI-MUAVIN-TASARIM.md](M3-M4-CARI-MUAVIN-TASARIM.md) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) · [ADR-V2.md](ADR-V2.md) (ADR-004/005/016) · [KARARLAR-M1-M2.md](KARARLAR-M1-M2.md)
**Bağlam:** M1, M2, M3 Supabase'de uygulı. `muavin_hesaplar` boş ama frontend eski şemaya bağlı. M4 = **koordineli şema (M4a) + frontend (M4b)** adımı.

---

## 1. Mevcut `muavin_hesaplar` kullanım analizi

**DB durumu (canlıdan doğrulandı):** tablo **boş (0 satır)**.
Güncel şema: `kod` (PK), `ana_kod` (FK→hesap_plani), `ad`, `tip` (text), `aciklama`, `sira`, `aktif`, `created_at`, `updated_at`.
Kısıtlar: `muavin_hesaplar_pkey` (PK=kod), `muavin_hesaplar_ana_kod_fkey`, `muavin_kod_format` (`^[0-9]{3}(\.[0-9]+)+$`), `muavin_ana_kod_uyumu` (kod, ana_kod ile başlar), `muavin_hesaplar_tip_check` (TDHP grup kodları '10'..'78').

**İki kilit gerçek (kaldırma kararını doğruluyor):**
- **`tip` zaten türetiliyor.** Frontend `tip`'i `ana_kod`'un ilk 2 hanesinden üretmeyi 3 yerde yapıyor: `HesapKoduInput.tsx:47` (`tip: m.kod.slice(0,2)`), `YeniMuavinModal.tsx:21-25` (`tipTahmini`). Yani `tip` saklanan bir kolon değil, türev — ADR-004'ün "kaldır" kararı zaten fiilen kanıtlı.
- **Ana hesaba kayıt yasağı zaten soft-enforce.** `SoruForm.tsx:161-167` muavin formatı zorunlu kılıp ana hesap kaydını reddediyor; `HesapKoduInput.tsx:283-292` "Ana hesaba kayıt yapılamaz" uyarısı gösteriyor. M4/M7 bunu DB seviyesinde sertleştirecek.

**Tablo boş olduğundan:** veri taşıma yok, drop & recreate maliyetsiz. Risk kodda, veride değil.

---

## 2. Etkilenen frontend dosyaları

Grep + satır düzeyi inceleme sonucu, etki üç kademede:

### 🔴 YÜKSEK — `tip` yazma/okuma + kod-kimlik + CRUD
| Dosya | Ne yapıyor | M4 etkisi |
|---|---|---|
| `src/lib/muavin.ts` | Data katmanı. `YeniMuavin.tip` zorunlu; `muavinYarat({tip})`; `muavinGuncelle(kod)`/`muavinSil(kod)` **kod ile**; `MUAVIN_SINIFLARI`/`TIP_ETIKETLERI`/`TIP_LISTESI` | `tip` alanı çıkar; mutasyonlar `id`'ye geçer; grup-etiket altyapısı KALIR (türetilmiş değer beslenir); `YeniMuavin`'e `cari_id?`/`varsayilan?` eklenir |
| `src/pages/admin/AdminMuavinHesaplarSayfasi.tsx` | Tam CRUD. `bos()` tip:'10'; tip form select (250-270); tipFiltresi (39,155,369-384); `TIP_ETIKETLERI[m.tip]` (410); `muavinGuncelle(m.kod)`/`muavinSil(m.kod)` | tip form alanı kalkar (ana_kod'dan türet); tip filtresi → grup filtresi (ana_kod'dan); display türetilir; mutasyonlar `id`'ye geçer; **cari seçici + varsayilan checkbox** eklenir |
| `src/components/YeniMuavinModal.tsx` | Muavin oluşturma. `tipTahmini` (21); tip select (173-193); `muavinYarat({tip})` (82) | tip select kaldırılır; `muavinYarat`'tan tip çıkar; **cari_gerektirir ise cari seçici** eklenir |

### 🟡 ORTA — yalnız `tip` gösterimi
| Dosya | Ne yapıyor | M4 etkisi |
|---|---|---|
| `src/components/HesapKoduInput.tsx` | Soru çözme dropdown'u. `TIP_ETIKETLERI[o.muavin.tip]` (359) grup etiketi gösterir | `tip` yerine `ana_kod`'dan türetilmiş grup etiketi; ayrıca `varsayilan` oto-seçim eklenebilir |

### 🟢 DÜŞÜK — yalnız tip yükseltme, `tip` kullanmıyor
| Dosya | Ne yapıyor | M4 etkisi |
|---|---|---|
| `src/lib/hesap.ts` | `hesapAdiBul(kod, muavinler?)` — sadece `kod`/`ad` kullanır | Tip değişimi (import); `tip` kullanmadığı için mantık değişmez |
| `src/components/SoruForm.tsx` | `aktifMuavinleriYukle()` yükler, HesapKoduInput'a geçer; `hesapAdiBul` | Tip değişimi; liste yükleme aynı; zaten ana-hesap-yasak var (161-167) |
| `src/pages/SoruEkrani.tsx` | `aktifMuavinleriYukle()` yükler | Tip değişimi; mantık aynı |

### 🔧 Yeniden üretim
| Dosya | Etki |
|---|---|
| `src/lib/database.types.ts` | `MuavinHesapRow`, `MuavinTip`, `muavin_hesaplar` Insert tipi + yeni `cari_kartlar` tipi → **yeniden üretilir** |

**Özet:** 3 yüksek + 1 orta + 3 düşük + 1 regen = **8 dosya.** Değişimlerin çoğu mekanik (tip→türetme, kod→id). En yoğun iş AdminMuavinHesaplarSayfasi (CRUD + cari seçici).

---

## 3. Yeni `muavin_hesaplar` tablo tasarımı

| Alan | Tip | Kısıt | Değişim |
|---|---|---|---|
| `id` | uuid | PK default gen_random_uuid() | **YENİ PK** (eski: kod) |
| `kod` | text | not null, format check `^[0-9]{3}(\.[0-9]+)+$` | korunur |
| `ana_kod` | text | FK→hesap_plani restrict; uyum check `kod like ana_kod\|\|'.%'` | korunur |
| `ad` | text | not null | korunur |
| `cari_id` | uuid | FK→cari_kartlar restrict, null | **YENİ** (S0 #4) |
| `varsayilan` | boolean | not null default false | **YENİ** (A1 oto-seçim) |
| `isletme_id` | text | null, **FK YOK** (isletmeler M10) | **YENİ** (evren) |
| `olusturan_user_id` | uuid | FK→kullanicilar set null, null | **YENİ** (öğrenci muavini, v2.1) |
| `sira` | int | default 0 | korunur |
| `aciklama` | text | null | korunur |
| `aktif` | boolean | default true | korunur |
| `created_at`/`updated_at` | timestamptz | trigger | korunur |
| ~~`tip`~~ | — | **KALDIRILIR** | ana_kod'dan türetilir |

**Tekillik:** `unique nulls not distinct (isletme_id, olusturan_user_id, kod)` — **PG17.6 doğrulandı, sorunsuz** (PG15+ gerekiyordu). Global havuzda (ikisi null) kod tekil; her evren kendi kod uzayı.
**Varsayılan tekilliği:** partial unique — global havuzda `ana_kod` başına bir `varsayilan=true`.
**Kaldırılan kısıt:** `muavin_hesaplar_tip_check` (tip kolonu gidiyor).

---

## 4. Cari kart bağlantısı nasıl kurulacak

**İki mekanizma:**

1. **FK bağı:** `muavin_hesaplar.cari_id → cari_kartlar(id)` (restrict). Muavin bir cari karta işaret eder (örn. `120.01.001` → "ABC A.Ş." carisi).

2. **Zorunluluk (S0 #4):** `hesap_plani.cari_gerektirir=true` (M1'de 50 hesapta işaretli) olan hesabın muavini `cari_id` olmadan açılamaz. Bu **tablolar-arası** kural — CHECK yetmez (cari_gerektirir başka tabloda), **constraint trigger** gerekir:
   - Trigger insert/update'te muavinin `ana_kod`'unu `hesap_plani`'de bakar; `cari_gerektirir=true` ise `cari_id is not null` şartını dayatır, değilse hata.

**UI tarafı (M4b):** Muavin oluşturma formlarında (YeniMuavinModal, AdminMuavinHesaplarSayfasi) seçilen `ana_kod`'un `cari_gerektirir` durumu okunur (hesap_plani'den); true ise **cari seçici** görünür ve zorunlu olur, cari_id form'a bağlanır. False ise cari seçici gizli.

**Seed bağımlılığı (önemli):** M3 cari kartları **seed'siz** uygulandı (kapsam gereği). M4'ün cari-bağlı muavinleri (360→Vergi Dairesi, 361→SGK, 102→banka) cari kart gerektirir. Bu yüzden **M4a seed'i, M3'ün ertelediği çekirdek cari kartları da içerir** (VD, SGK, bankalar, örnek müşteri/tedarikçi) — muavinlerden önce.

---

## 5. Ana hesaba kayıt yasağı nasıl sağlanacak

**İki katman (ADR-005):**

- **Katman A — M4 (yapısal zemin):** `muavin_hesaplar.kod` format check `^[0-9]{3}(\.[0-9]+)+$` → 3 haneli ana kod bu tabloya **giremez**. Muavin evreni ana hesabı yapısal olarak dışlar.
- **Katman B — M7 + M10 (kilit):** `cozum_satirlari.muavin_id` ve `yevmiye_satirlari.muavin_id` NOT NULL FK → `muavin_hesaplar(id)`. Ana kod muavin tablosunda olmadığı için referanslanamaz → ana hesaba kayıt **imkânsız**.

**M4'ün rolü:** Katman A'yı kurar (format check zaten mevcut, yeni tabloda korunur). Tam kilit M7/M10'da.

**Frontend (zaten var, korunur):** `SoruForm.tsx:161-167` muavin formatı zorunlu kılıyor; `HesapKoduInput.tsx:283-292` ana hesap uyarısı gösteriyor. M4b bu davranışı bozmaz; M7'de kontrol.ts sertleşince (ana hesap girişi artık kabul değil, hata) tam hizalanır.

---

## 6. M4a — Migration planı (şema)

Ön koşul: PG≥15 → **PG17.6 doğrulandı ✓.**

1. **Çekirdek cari seed** (M3'ten ertelenen): Vergi Dairesi (kamu), SGK (kamu), 2-3 banka (banka), birkaç örnek müşteri/tedarikçi (musteri/tedarikci) — muavinlerden önce.
2. **drop table muavin_hesaplar** (boş, güvenli) → **create table** yeni şema (uuid PK, cari_id, varsayilan, isletme_id, olusturan_user_id; −tip).
3. **Kısıtlar/index:** format + ana_kod uyum check; `unique nulls not distinct (isletme_id, olusturan_user_id, kod)`; varsayilan partial unique; index (ana_kod), (cari_id), (isletme_id, aktif) where aktif.
4. **Cari zorunluluğu constraint trigger** (cari_gerektirir + cari_id).
5. **updated_at trigger** (set_updated_at).
6. **RLS:** hibrit sahiplik (cari_kartlar ile aynı desen: public/own read, admin all, own insert isletme_id not null).
7. **Muavin seed:** (a) cari-olmayan havuz muavinleri `varsayilan=true` (100.01, 153.01, 190.01, 191.01, 391.01, 600.01, 610.01, 611.01, 632.01, 760.01, 770.01…); (b) cari-bağlı muavinler seed'lenen carilere (360.01/02/03→VD, 361.01→SGK, 102.01→banka, örnek 120.xxx/320.xxx).
8. **DO doğrulama:** her `cari_gerektirir` muavinde `cari_id` dolu mu; her `muavin_secim_zorunlu=false` ana_kod'da bir `varsayilan` var mı; toplam muavin sayısı; format ihlali yok.
9. `notify pgrst`.

**Uygulama:** apply_migration ile (M1-M3 gibi), begin/commit çıkararak; sonra execute_sql ile görünür doğrulama.

---

## 7. M4b — Frontend uyarlama planı

**Sıra: types → data katmanı → formlar → dropdown.** M4a ile **birlikte** deploy (ayrı olamaz).

1. **`database.types.ts`** yeniden üret (yeni muavin_hesaplar + cari_kartlar). `MuavinTip` string-union'ı kalabilir (grup etiketi için); `MuavinHesapRow`'a `id`/`cari_id`/`varsayilan`/`isletme_id`/`olusturan_user_id` gelir, `tip` gider.
2. **`muavin.ts`:**
   - `tip` alanını `YeniMuavin`'den çıkar; `cari_id?`, `varsayilan?` ekle.
   - `muavinGuncelle`/`muavinSil` imzasını `kod` → `id` (uuid) yap.
   - Grup etiketi için `grupTuret(ana_kod)= ana_kod.slice(0,2)` yardımcı; `MUAVIN_SINIFLARI`/`TIP_ETIKETLERI` KALIR (bu türetilmiş değerle beslenir).
3. **`YeniMuavinModal.tsx`:** tip select'i (173-193) kaldır; `muavinYarat`'tan tip çıkar; seçili `ana_kod` `cari_gerektirir` ise **cari seçici** (cari_kartlar listesi) göster + zorunlu; cari_id'yi bağla.
4. **`AdminMuavinHesaplarSayfasi.tsx`:** tip form alanını (250-270) kaldır; tip filtresini grup filtresine çevir (ana_kod'dan türet) veya kaldır; `TIP_ETIKETLERI[m.tip]` → `TIP_ETIKETLERI[grupTuret(m.ana_kod)]`; mutasyonları `id`-bazlı yap; **cari sütunu + cari seçici + varsayilan checkbox** ekle.
5. **`HesapKoduInput.tsx`:** satır 359 `o.muavin.tip` → `grupTuret(o.muavin.ana_kod)`; satır 42-53'teki soru-özel muavin map'inde `tip` üretimini `grupTuret`'e hizala; (ops.) `varsayilan` muavini oto-seç.
6. **`hesap.ts` / `SoruForm.tsx` / `SoruEkrani.tsx`:** yalnız tip import'ları; `tip` kullanmadıkları için mantık değişmez (derleme uyumu).

---

## 8. Test planı (lokal-önce)

**A. DB seviyesi (M4a sonrası, execute_sql ile):**
- Cari zorunluluk trigger'ı: `cari_gerektirir=true` hesaba (örn. 120) `cari_id=null` muavin insert → **reddedilmeli**; `cari_id` dolu → kabul.
- `cari_gerektirir=false` hesaba (örn. 191) cari'siz muavin → kabul.
- Format: ana kod ('120') insert → format check **reddetmeli**.
- Evren tekillik: aynı global kod iki kez → unique **reddetmeli**.
- Varsayilan: bir ana_kod'a iki `varsayilan=true` → partial unique **reddetmeli**.
- Seed doğrulama: DO bloğu sayıları + cari-bağlı muavinlerde cari_id dolu.

**B. Frontend (M4b sonrası, lokal `npm run dev`):**
- **Admin muavin sayfası:** liste yükleniyor (seed'li), tip sütunu grup etiketiyle görünüyor; yeni muavin oluştur (cari-gerektiren ana_kod → cari seçici çıkıyor, zorunlu); düzenle (id-bazlı); pasifleştir; sil (id-bazlı).
- **YeniMuavinModal:** soru editöründen "+ yeni muavin" → tip alanı yok, cari-gerektiren hesapta cari seçici var.
- **Soru çözme dropdown (HesapKoduInput):** muavin önerileri grup etiketiyle görünüyor; ana hesap uyarısı çalışıyor; varsayilan oto-seçim (eklendiyse).
- **Soru editörü (SoruForm):** muavin listesi yükleniyor, ana-hesap-yasak validasyonu çalışıyor.
- **Derleme:** `tsc` hatasız (tip imzaları güncel).

---

## 9. Riskler ve rollback planı

| Risk | Şiddet | Önlem |
|---|---|---|
| M4a şema + M4b kod ayrı deploy → admin muavin sayfası/oluşturma kırılır | **Orta** | Zorunlu **birlikte deploy**; lokal test kapısı; değişim mekanik ve sınırlı (8 dosya) |
| `tip` türetme regresyonu (grup etiketi yanlış) | Düşük | Türetme deseni 3 yerde zaten kanıtlı (slice(0,2)); `TIP_ETIKETLERI` altyapısı korunuyor |
| kod→id mutasyon kayması (yanlış satır güncelle/sil) | Düşük | Global havuzda kod tekil (kod-bazlı kısa vadede çalışır), ama id-bazlıya geçilir; test A/B kapsıyor |
| Cari seed bağımlılığı (M3 seed'siz) | Orta | M4a önce çekirdek cari seed'ler, sonra cari-bağlı muavin; seed cari-önce sıralı |
| Cari trigger seed'i yavaşlatır | Düşük | Row-level tek lookup; seed hacmi küçük |
| database.types.ts elle/yanlış üretim | Düşük | Supabase generate_typescript_types ile üret (elle değil) |

**Rollback:**
- **M4a:** yeni tablo **boş** (seed hariç) → `drop table muavin_hesaplar` + eski şemayı geri kur güvenli. Ama M4b deploy edildiyse frontend yeni şema bekler → **M4a ve M4b birlikte geri alınır** (git revert + DB restore).
- **Cari seed:** M4a'da eklenen cari kartlar `delete` ile temizlenebilir (henüz referans yok).
- **En güvenli:** M4a+M4b'yi tek PR/tek deploy olarak ele al; sorun çıkarsa ikisini birlikte geri al. Lansman haftasına denk getirme.

---

## Özet ve öneri

- **Etki:** 8 dosya (3 yüksek/1 orta/3 düşük/1 regen). Değişimlerin çoğu mekanik; en yoğun iş AdminMuavinHesaplarSayfasi.
- **İki kolaylaştırıcı:** `tip` türetme deseni ve ana-hesap-yasak frontend'de **zaten var** — M4 bunları resmileştiriyor, sıfırdan kurmuyor.
- **Kritik sıralama:** M4a çekirdek cari seed'i içermeli (M3 ertelemişti), yoksa cari-bağlı muavin seed'i başarısız olur.
- **Deploy disiplini:** M4a + M4b tek koordineli adım; ayrı deploy yasak; lokal test zorunlu.

**Sonraki adım (onayınla):** M4a SQL'ini yaz (çekirdek cari seed + muavin v2 şema + trigger + seed + doğrulama), lokal/DB doğrula; ardından M4b frontend uyarlaması. İstersen önce sadece M4a'yı yazıp uygulayalım, frontend'i ayrı turda ele alalım (M3 gibi kontrollü ilerleme).
