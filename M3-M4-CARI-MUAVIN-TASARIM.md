# M3-M4 — Cari & Muavin Mimari Tasarımı

**Sürüm:** 1.0 · **Tarih:** 6 Temmuz 2026 · **Durum:** Tasarım — onay bekliyor (SQL yazılmadı)
**Referans:** [SDD-V2.md](SDD-V2.md) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md) · [ADR-V2.md](ADR-V2.md) · [KARARLAR-M1-M2.md](KARARLAR-M1-M2.md)

## Kapsam

Kullanıcı bunu "M3" olarak adlandırdı; aslında **iki migration'lık tek mantıksal birim** — "cari-muavin evreni":

- **M3 — `cari_kartlar`** (yeni tablo)
- **M4 — `muavin_hesaplar` v2** (mevcut boş tabloyu yeniden kur)

Ayrı iki dosya, çünkü `muavin_hesaplar.cari_id → cari_kartlar(id)` FK bağı var: cari önce gelmeli. Ama tasarım birlikte yapılır, çünkü cari trigger'ı, evren deseni ve seed sırası iç içe.

---

## 🔴 KRİTİK BULGU — M4 "görünmez" değildir

M1-M2 additive ve sıfır-regresyondu (hiçbir kod okumuyordu). **M4 farklı.** `muavin_hesaplar` tablosu şu an boş (20260518000008 ile temizlendi) ama **kod tarafı hâlâ eski şemaya bağlı ve canlı:**

| Dosya | Kullanım | M4'ten etkilenir mi? |
|---|---|---|
| `src/lib/muavin.ts` | Data katmanı: okuma + `muavinYarat({tip})` + `kod` ile update/delete | **Evet** — `tip` kolonu kalkıyor, PK kod→uuid |
| `src/pages/admin/AdminMuavinHesaplarSayfasi.tsx` | Tam CRUD admin sayfası | **Evet** — create/update/delete yolu `tip` ve `kod` kullanıyor |
| `src/components/YeniMuavinModal.tsx` | Muavin oluşturma, `tip` seçtiriyor | **Evet** — `tip` alanı kalkıyor |
| `src/components/HesapKoduInput.tsx` | Soru çözme dropdown'u, `MuavinTip` ile gruplama | **Evet** — gruplama `tip`'e dayalı |
| `src/lib/hesap.ts`, `SoruForm.tsx`, `SoruEkrani.tsx` | muavin import ediyor | Dolaylı — tip imzaları değişince |
| `src/lib/database.types.ts` | `MuavinHesapRow`, `MuavinTip` tipleri | **Evet** — yeniden üretilmeli |

**Sonuç:** M4, şema **+ frontend** koordineli değişimidir. Şemayı frontend'siz deploy etmek muavin admin sayfasını ve muavin oluşturmayı kırar. Bu, M4'ü "lokal-önce test" gerektiren bir adım yapar (kullanıcı iş akışıyla uyumlu).

**Neden yine de temiz rebuild öneriyorum (dual-phase değil):**
- Tablo **boş** — veri riski yok, drop & recreate bedava.
- `tip`'i tutmak (geçici uyumluluk için) ADR-004'ün uyardığı tam salınımı geri getirir. `tip` = TDHP grubu = `ana_kod`'un ilk 2 hanesi — **saklamak yerine türetmek** kararın kanıtı.
- Frontend değişimi küçük ve iyi sınırlı (aşağıda M4b). Şimdi temiz yapmak, sonra iki fazlı drop'tan ucuz.

---

## M3 — `cari_kartlar` tasarımı

Bu tablo **tamamen görünmez** (hiçbir kod `cari_kartlar` okumuyor — grep ile doğrulandı). Saf additive.

| Alan | Tip | Kısıt | Gerekçe |
|---|---|---|---|
| `id` | uuid | PK | Cari birçok evrende/olayda; uuid stabil kimlik |
| `tip` | `cari_tip` enum | not null | musteri/tedarikci/personel/kamu/banka/diger (KARARLAR C3) |
| `unvan` | text | not null | 'ABC A.Ş.' |
| `kisa_ad` | text | null | dropdown/belge gösterimi |
| `vkn_tckn` | text | null | belge gerçekçiliği (ADR-014) |
| `vergi_dairesi` | text | null | |
| `il` | text | null | |
| `iban` | text | null | banka tipi + dekont |
| `meta` | jsonb | default '{}' | tip'e özel: personel→sgk_no, banka→şube (gösterim verisi, JOIN yok) |
| `isletme_id` | text | null, **FK YOK** | evren deseni (ADR-010); null=global havuz |
| `olusturan_user_id` | uuid | *FK kullanicilar* on delete set null, null | null=platform içeriği; dolu=öğrencinin açtığı kart (v2.1) |
| `aktif` | boolean | default true | soft delete |
| `created_at`, `updated_at` | | trigger | |

**Enum:** `cari_tip` bu migration'da oluşturulur (ilk kullanım — KARARLAR C5 "ilk kullanımda oluştur" ilkesi).

**İlişki notu — `isletme_id` FK YOK:** `isletmeler` tablosu M10'da geliyor. `isletme_id` şimdi **FK'sız nullable text** kolon olarak eklenir; FK constraint M10'da `isletmeler` var olunca eklenir. Global havuz `null` kullanır, o yüzden MVP boyunca FK'nın yokluğu davranışı etkilemez.

**RLS (KARARLAR §E — hibrit sahiplik):**
```
select: olusturan_user_id is null or olusturan_user_id = auth.uid() or is_admin()
insert (öğrenci): olusturan_user_id = auth.uid() and isletme_id is not null
all: is_admin()
```
Platform carileri herkese görünür; öğrencinin açtığı kart yalnız kendine; global havuza öğrenci yazamaz.

**Seed (M3):** Global havuz çekirdek carileri — Vergi Dairesi (kamu), SGK (kamu), 3-4 banka (banka), tanıdık müşteri/tedarikçi (ABC A.Ş., Yıldız Ticaret — ADR-014 "tanıdık dünya"). Bu cariler M4'te 102/360/361 muavinlerine bağlanır.

---

## M4 — `muavin_hesaplar` v2 tasarımı

Mevcut tablo boş → **drop & recreate** (KARARLAR A1, V2-VERI-MODELI §11 çakışma #4).

| Alan | Tip | Kısıt | Değişim |
|---|---|---|---|
| `id` | uuid | PK | **DEĞİŞTİ** — eski PK `kod` idi |
| `kod` | text | not null, format check `^[0-9]{3}(\.[0-9]+)+$` | korunur (format check ADR-005 katmanı) |
| `ana_kod` | text | *FK hesap_plani* on delete restrict; prefix check `kod like ana_kod \|\| '.%'` | korunur |
| `ad` | text | not null | korunur |
| `cari_id` | uuid | *FK cari_kartlar* on delete restrict, null | **YENİ** — S0 #4 bağı |
| `varsayilan` | boolean | not null default false | **YENİ** — A1 oto-seçim (secim_zorunlu=false hesaplarda) |
| `isletme_id` | text | null, **FK YOK** (M10) | **YENİ** — evren |
| `olusturan_user_id` | uuid | *FK kullanicilar* set null, null | **YENİ** — öğrenci muavini (v2.1) |
| `sira` | int | default 0 | korunur |
| `aciklama` | text | null | korunur |
| `aktif` | boolean | default true | korunur (soft delete) |
| `created_at`, `updated_at` | | trigger | korunur |
| ~~`tip`~~ | | **KALDIRILDI** | TDHP grubu `ana_kod`'dan türetilir (ADR-004; üç kez semantik değiştirdi) |

**Tekillik (KARARLAR A1 + V2-VERI-MODELI §12.5):**
`unique nulls not distinct (isletme_id, olusturan_user_id, kod)` — global havuzda (her ikisi null) kod tekil; her işletme ve öğrenci evreni kendi kod uzayını taşır.
⚠️ **PG15+ gerektirir** — M4 öncesi Supabase Postgres sürümü doğrulanmalı. PG<15 ise fallback: kısmi unique index çifti (`where isletme_id is null and olusturan_user_id is null` + evren-scoped ayrı index).

**`varsayilan` tekilliği:** partial unique — global havuzda her `ana_kod` için en fazla bir `varsayilan=true` (`unique (ana_kod) where isletme_id is null and olusturan_user_id is null and varsayilan`).

**Cari zorunluluğu trigger'ı (S0 #4 — M4'ün kalbi):**
Constraint trigger, insert/update'te: muavinin `ana_kod`'unun `hesap_plani.cari_gerektirir=true` olması hâlinde `cari_id` null olamaz. CHECK yetmez (tablolar arası lookup). Seed cari-önce sıralanır (performans).

**RLS:** cari_kartlar ile aynı hibrit desen.

**Seed (M4):**
- Cari-olmayan havuz muavinleri (varsayilan=true, oto): 100.01, 153.01, 190.01, 191.01, 391.01, 600.01, 610.01, 611.01, 632.01, 760.01, 770.01, 780.01, 689.01…
- Cari-bağlı muavinler (seed'lenen carilere): 102.01→banka, 360.01/02/03→Vergi Dairesi, 361.01→SGK, birkaç 120.xxx/320.xxx→tanıdık müşteri/tedarikçi.

---

## Üç kuralın netleştirilmesi (kullanıcı talebi)

Kritik ayrım: bu üç kural **M3/M4'te tam olarak enforce edilmez** — M4 zemini kurar, kilit M7/M10'da vurulur.

| Kural | Mekanizma | Nerede |
|---|---|---|
| **1. Muavin zorunluluğu** (ADR-004) | Kayıt satırı muavin_hesaplar'a bağlanmak zorunda: `cozum_satirlari.muavin_id` + `yevmiye_satirlari.muavin_id` **NOT NULL FK** | M7 + M10 (M4 değil) — M4 yalnız muavin evrenini kurar |
| **2. Ana hesaba kayıt yasağı** (ADR-005) | İki katman: (a) `muavin_hesaplar.kod` format check → 3 haneli ana kod muavin olamaz; (b) kayıt FK'sı muavin_hesaplar'a → ana kod referanslanamaz | (a) **M4** · (b) M7 + M10 → birlikte yapısal imkânsızlık |
| **3. Cari bağlantısı** (S0 #4) | `hesap_plani.cari_gerektirir=true` hesabın muavini `cari_id` olmadan açılamaz — constraint trigger | (flag) M1 · **(trigger) M4** ← S0 #4'ün asıl enforce noktası |

**Özet:** Muavin zorunluluğu ve ana hesap yasağı M7/M10'da veri-tabanı seviyesinde kilitlenir; M4 bunun için gereken muavin evrenini + format garantisini kurar. **Cari bağı ise M4'te tamamlanır** (trigger). Yani M4 "cari zorunluluğunun" tam sahibi, "muavin zorunluluğunun" hazırlayıcısıdır.

---

## Açık kararların çözümü

| Konu | Karar | Yürürlük |
|---|---|---|
| `varsayilan` bayrağı (A1) | muavin_hesaplar'a eklenir; partial unique (ana_kod başına bir global varsayılan) | M4 |
| `unique nulls not distinct` / PG15 (§12.5) | Kullan; **M4 öncesi PG sürümü doğrula**; PG<15 ise kısmi index fallback | M4 pre-check |
| `isletme_id` FK ertelemesi | Kolon şimdi (FK'sız text); FK M10'da `isletmeler` gelince | M3/M4 kolon, M10 FK |
| `olusturan_user_id` FK | `kullanicilar` mevcut → FK şimdi eklenir | M3/M4 |
| cari tip ↔ ana_kod uyumu (B5) | **DB'de zorlanmaz** (hangi ana_kod hangi tip karmaşık). Admin-UI lint + moderasyon. Non-blocking | Admin UI (sonra) |
| `tip` kolonu | Kaldırılır; frontend `ana_kod`'un ilk 2 hanesinden grubu türetir | M4b (frontend) |

---

## Uygulanabilir Migration Planı

### Ön koşul (M4 SQL yazımından önce)
- [ ] **Supabase Postgres sürümü ≥ 15** doğrula (`unique nulls not distinct` için). Değilse kısmi-index fallback'e geç.

### Adım M3 — `cari_kartlar` (görünmez, additive)
1. `create type cari_tip` (6 değer)
2. `create table cari_kartlar` (+ `olusturan_user_id` FK kullanicilar; `isletme_id` FK'sız)
3. Index: `(isletme_id, tip)`, `(olusturan_user_id) where not null`
4. RLS: hibrit sahiplik (3 politika)
5. Seed: çekirdek global cariler (VD, SGK, bankalar, tanıdık müşteri/tedarikçi)
6. DO doğrulama: cari sayısı beklenen mi, tip'ler geçerli mi
7. `notify pgrst`
→ **Sıfır regresyon.** Tek başına deploy edilebilir, lansman hattını etkilemez.

### Adım M4a — `muavin_hesaplar` v2 SQL (şema)
1. `drop table muavin_hesaplar cascade` (boş — güvenli) → `create table` (uuid PK, yeni kolonlar, −tip)
2. Format + prefix check; `unique nulls not distinct` (veya fallback); `varsayilan` partial unique
3. Cari zorunluluğu constraint trigger (cari_gerektirir + cari_id)
4. Index: `(ana_kod)`, `(cari_id)`, `(isletme_id, aktif) where aktif`
5. RLS: hibrit sahiplik
6. Seed: havuz muavinleri (varsayilan) + cari-bağlı muavinler (cari-önce sıralı)
7. DO doğrulama: muavin sayısı, her cari_gerektirir muavinde cari_id dolu mu, her secim_zorunlu=false ana_kod'da bir varsayılan var mı
8. `notify pgrst`

### Adım M4b — Frontend uyum (M4a ile BİRLİKTE deploy — ayrı olamaz)
1. `database.types.ts` yeniden üret (cari_kartlar + yeni muavin_hesaplar şekli)
2. `muavin.ts`: `tip` alanını kaldır → grubu `ana_kod.slice(0,2)` ile türet; `MuavinTip` grup türetiminden gelsin; update/delete `id` (uuid) ile (global havuzda `kod` da çalışır ama `id` temiz); `YeniMuavin`'e `cari_id?`/`varsayilan?` ekle
3. `YeniMuavinModal.tsx`: `tip` seçiciyi kaldır (oto-türetilir); `cari_gerektirir` ise cari seçici göster
4. `HesapKoduInput.tsx`: gruplama `tip` yerine türetilmiş gruptan; `varsayilan` oto-seçim
5. `AdminMuavinHesaplarSayfasi.tsx`: CRUD'u yeni imzalara uyarla; cari sütunu
6. **Lokal test:** muavin admin sayfası (liste/create/update/delete) + soru çözme dropdown'u (HesapKoduInput) + YeniMuavinModal

### Sıra ve bağımlılık
```
[PG15 doğrula] → M3 (cari) → M4a (muavin şema) → M4b (frontend) → lokal test → deploy
                    ▲ görünmez        ▲──────────── birlikte, koordineli ──────────▲
```

### Geri alma
- M3: `drop table cari_kartlar; drop type cari_tip;` — temiz.
- M4a: tablo boş → `drop table` güvenli; ama M4b deploy edildiyse frontend eski şemayı bekler → **M4a/M4b birlikte geri alınır.**

### Risk özeti
| Risk | Şiddet | Önlem |
|---|---|---|
| M4 frontend kırılması (admin muavin + soru dropdown) | **Orta** | M4a+M4b birlikte; lokal test zorunlu; küçük ve sınırlı değişim |
| PG<15 (`nulls not distinct` yok) | Düşük | Ön-koşul kontrolü; kısmi-index fallback hazır |
| Cari trigger seed'i yavaşlatır | Düşük | Row-level tek lookup; cari-önce seed sırası |
| `isletme_id` FK'sız kalması | Yok | Bilinçli; M10'da FK; global null davranışı etkilemez |
| tip↔ana_kod uyum kayması | Düşük | Türetim tip mismatch'i imkânsız kılar (kolon yok); ayrıca admin lint |

---

## Karar özeti

- **M3 (cari_kartlar):** görünmez, additive, tek başına deploy edilebilir. Onaya hazır.
- **M4 (muavin v2):** şema + frontend koordineli adım — "görünmez değil". Temiz rebuild öneriliyor (tip kaldır, türet), çünkü tablo boş ve `tip`'i tutmak salınımı geri getirir.
- **Üç kural:** cari bağı M4'te tamamlanır (trigger); muavin zorunluluğu ve ana hesap yasağı M4'ün kurduğu zemin üzerine M7/M10'da kilitlenir.
- **Ön-koşul:** Postgres ≥ 15 doğrulaması M4 SQL'inden önce.

**Sonraki adım:** Onayınla önce M3 SQL'i (görünmez, güvenli), ayrı bir turda M4a+M4b (koordineli, testli). Bu tasarımı onaylıyor musun, yoksa M4'te `tip`'i geçici tutan dual-phase yaklaşımı mı tercih edersin?
