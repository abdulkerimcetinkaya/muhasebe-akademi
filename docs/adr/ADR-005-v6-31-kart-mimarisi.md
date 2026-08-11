# ADR-005 — V6: 31 kartlık müfredat mimarisi ve sıfırdan kurulum

## Durum

Accepted — 2026-08-11

ADR-003 ve ADR-004'ü **supersede eder**. Eski Keşfet ağacı silinip yerine
7 Temeller + 16 Yetkinlikler + 8 Uzmanlıklar kuruldu.

## Bağlam

Chief Architect, IFAC IES 2 (foundation → intermediate → advanced), ACCA
(Applied Knowledge → Applied Skills → Strategic Professional) ve OpenStax'in
muhasebe döngüsü akışına dayanan bir revizyon önerdi. Üç katmanlı omurga
(Temeller → Yetkinlikler → Uzmanlıklar) korunuyor; değişen şey kartların
sınırları ve rolü.

Önerinin en değerli tarafı yapı değil, **ölçek felsefesi**:

> Müfredatı büyüterek değil, senaryo uzayını büyüterek kapsamlı hale getir.

Bir bölüm ("Vadeli Ticari Mal Alışı") altında iskonto, eksik belge, kısmi
ödeme, iade, fiyat farkı, döviz, tevkifat gibi onlarca varyasyon yaşayabilir.
Veri modeli buna zaten hazır: `kesfet_item_sorulari` ders başına sıra,
zorunluluk, minimum başarı ve destek seviyesi taşıyor.

## Karar

### 1. Yapı: 31 kart

| Katman | Kart | Kategori değeri |
|---|---:|---|
| Temeller | 7 | `Temeller` |
| Yetkinlikler | 16 | `Yetkinlikler` |
| Uzmanlıklar | 8 | `Uzmanlıklar` (`uzmanlik_turu='fonksiyonel'`) |

Kanonik liste: `supabase/migrations/20260811000007_kesfet_31_kart.sql`;
okunur döküm `docs/curriculum/CUR-004-Mufredat.md`; admin denetim hedefi
`src/data/kesfet-mufredat-hedefi.ts`.

Bölüm ve ders kırılımı **bu ADR'de yok** — ürün sahibinden kart kart gelecek,
her biri ayrı migration'la eklenecek. Tahmini hacim: 220–290 bölüm.

### 2. Eski ağaç gerçekten silindi

26 kart · 18 bölüm · 56 ders · 39 ön koşul · 18 ilerleme kaydı silindi
(`20260811000006_kesfet_sifirla.sql`). Bu, repo geleneğinden (hard delete
yerine `durum='gizli'` / `yayin_durumu='arsiv'`) **bilinçli bir sapmadır**:
müfredat baştan kuruluyor, eski kayıtları taşımak kalıcı karışıklık üretirdi.
Emniyet kemeri yedeklerdir:

- `docs/backups/kesfet-yedek-2026-08-11.json` — tüm yapı + ilerleme + ön koşul
- `docs/backups/kesfet-yazili-dersler-2026-08-11.json` — elle yazılmış 2 dersin
  tam içeriği (72'şer blok)

Silme yalnız Keşfet kapsamındaydı. Dokunulmayanlar (sayımla doğrulandı):
`sorular` 73 · `isletmeler` 4 · `modul_alt_basliklari` 145 · `yetkinlikler` 22.

### 3. Tüm kartlar `yakinda` başlar

İçerik üretilmeden hiçbir kart kullanıcıya açılmaz. Bir kart ancak bölümleri,
dersleri ve içeriği hazır olduğunda `acik` yapılır. Sözleşme testi bunu
koruyor (`kesfet-31-kart-migration.test.ts`).

### 4. Ön koşul ağı şimdilik boş

Kartların içi boşken ön koşul kurmak yanlış: sıfır dersli bir kart
"tamamlandı" sayılıp kapıyı yanlış açar. Ön koşullar bölüm/ders kırılımı
geldikçe eklenecek.

### 5. Kart ≠ ölçülen beceri

Öneri metni "hesap seçimi, borç/alacak, kayıt, kontrol tüm platform boyunca
ölçülen çekirdek beceriler olmalı" diyor. Bu katman **zaten var ve çalışıyor**:
`yetkinlikler` (22 tanımlı beceri) → `olay_yetkinlikleri` → `ilerleme_kaydet`
RPC → `kullanici_yetkinlikleri`. Yeni kart açmaya gerek yok; mevcut beceri
listesi genişletilecek.

Ürün sahibi kararı: **isim çakışması ölçüm tarafında çözülecek.** Menüdeki
kategori "Yetkinlikler" kalır; profil/skor tarafındaki "Yetkinlik" ifadesi
"Beceri" olur. (Frontend etiket değişikliği — ayrı iş kalemi.)

Not: "Hesap Seçimi ve Muhasebe Kaydı" hem Yetkinlik kartı #2 hem Temeller 3-4-5
konusu. Ürün sahibi kartın kalmasını seçti; içerik üretiminde Temeller'in
kavramı öğrettiği, Yetkinlik kartının varyasyonları çalıştırdığı ayrımı
korunmalı.

### 6. Sektör/Rol patikaları — dördüncü katman, ileride

Savunma Sanayii, İnşaat, e-Ticaret gibi alanlar **ayrı uzmanlık değil**;
mevcut uzmanlıkların bir sektöre uygulanmış birleşimi. Şema hazır
(`uzmanlik_turu='sektorel'`), kayıt açılmadı.

### 7. Yapı dondurma — bu sefer gerçekten

Bu, dört günde beşinci yapı revizyonu (45 → 39 → 26 → 31 kart; ayrıca repoda
19 derslik bayat bir hedef vardı). ADR-004'ün dondurma kuralı korunuyor ve
sertleştiriliyor:

> Kart/kategori iskeletinde bir sonraki değişiklik ancak (a) üretilmiş gerçek
> ders içeriğinden doğan somut bir tasarım engeli veya (b) gerçek kullanıcı
> verisi ile gerekçelendirilebilir. Taksonomi tercihi tek başına yeterli
> gerekçe değildir.

Sıradaki iş yapı değil **içerik**: Temeller kart 1'in bölüm/ders kırılımı.

## Sonuçlar

**Olumlu:** tek ve net iskelet; katalogda mükerrer/bayat kart yok; admin
denetimi gerçek hedefe göre ölçüyor; senaryo-odaklı büyüme veri modeliyle
uyumlu.

**Maliyet:** 18 ilerleme kaydı (ürün sahibinin test ilerlemesi) silindi;
elle yazılmış 2 ders yedekte, canlıda değil; ADR-003 ve ADR-004 aynı hafta
içinde geçersizleşti.

## İlgili

- ADR-001 — İşletmeler modeli (yürürlükte, dokunulmadı)
- ADR-002 — Keşfet/V2 sorumluluk sınırı (yürürlükte)
- ADR-003, ADR-004 — Superseded by ADR-005
- `20260811000006_kesfet_sifirla.sql` · `20260811000007_kesfet_31_kart.sql`
- `src/data/kesfet-mufredat-hedefi.ts` · `src/data/kesfet-31-kart-migration.test.ts`
