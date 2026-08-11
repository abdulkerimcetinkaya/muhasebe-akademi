# MuhasebeAkademi Projesi

## Proje Özeti
Muhasebe öğrencileri için LeetCode tarzı interaktif pratik platformu.
Tek Düzen Hesap Planı'nı senaryo tabanlı yevmiye kaydı alıştırmalarıyla öğretir.

Gerçeğe yakın belgelerle (fatura, makbuz, dekont) çalışılır; anında kontrol,
puan + streak, rozet, aktivite ısı haritası ile motivasyon katmanı sağlanır.

## Kanonik Çalışma Ağacı
Tek geçerli çalışma ağacı: **`/Users/abdulkerimcetinkaya/Desktop/muhasebelab`**
(git remote: `github.com/abdulkerimcetinkaya/muhasebe-akademi`).

`~/Documents/Codex/…/repo` altındaki kopya **eski bir anlık görüntüdür** — Keşfet
39-ders migration'ı ve `src/lib/kesfet-icerik.ts` orada yoktur. Oraya yapılan
düzeltmeler kaybolur; kullanılmamalıdır.

## Teknik Yapı
- **Vite + React 19 + TypeScript** (tek HTML + CDN mimarisi terk edildi; eski sürüm
  [src/_legacy-reference.html](src/_legacy-reference.html) içinde referans olarak duruyor)
- **Tailwind CSS** + PostCSS + Autoprefixer
- **react-router-dom v7** — `HashRouter` (`#/`, `#/problemler/:id`, `#/uniteler/:id`,
  `#/profil`, `#/giris`, `#/onboarding`, `#/premium`, `#/admin/*`)
- **Supabase**: Auth (e-posta/şifre), Postgres + RLS, Edge Functions
- **Erişim modeli:** Soru çözmek kayıt gerektirir. Anonim ziyaretçi
  soruları, üniteleri ve hesap planını görüntüleyebilir; ilerleme/puan/
  rozet sistemi kayıtlı kullanıcılar içindir. Çözüm verileri Supabase'e
  yazılır (`ilerleme-supabase.ts`). Eski anonim→bulut migration kodu
  duruyor ama artık devrede değil.
- **Fraunces** (display) + **Inter Tight** (body) fontları
- **Thiings** 3D PNG ikonları (`public/icons/`) + `lucide-react` UI ikonları

## Kod Organizasyonu

```
src/
├── App.tsx                   — router + üst seviye state + rozet kontrolü
├── main.tsx
├── components/               — 20 bileşen (Navbar, Footer, modallar, form parçaları,
│                                AIAsistanYanPanel, PremiumGate, HataBildirModal…)
├── pages/
│   ├── AnaSayfa, ProblemlerSayfasi, SoruEkrani, UnitelerSayfasi, UniteSayfasi,
│   │   ProfilSayfasi, GirisSayfasi, OnboardingSayfasi, PremiumSayfasi
│   └── admin/                — AdminAnaSayfa, Sorular, YeniSoru, DuzenleSoru,
│                                TopluEkle, Hatalar (6 sayfa)
├── contexts/                 — AuthContext, UnitelerContext
├── data/                     — hesap-plani.ts, rozetler.ts, sabitler.ts
│                               (üniteler ve sorular Supabase'den yükleniyor;
│                                uniteler-loader.ts fallback ile çalışır)
├── lib/
│   ├── supabase.ts, auth.ts, admin.ts, database.types.ts
│   ├── ilerleme.ts           — localStorage tabanlı ilerleme
│   ├── ilerleme-supabase.ts  — bulut senkron + migration
│   ├── uniteler-loader.ts    — ünite/soru yükleme
│   ├── kontrol.ts            — yevmiye doğrulama
│   ├── gunun-sorusu.ts       — günün sorusu seçim mantığı
│   ├── oneriler.ts           — "devam et" / "tekrar et" önerileri
│   ├── ai.ts                 — Edge Function çağrıları
│   └── format.ts
└── types/index.ts

supabase/
├── migrations/               — 23 migration:
│   ├── 20260422000001_init                — şema + RLS
│   ├── 20260422000002_admin_rls           — admin politikaları
│   ├── 20260422000003_premium_rpc         — erken erişim aktivasyon RPC (ilk 100 kişiye 1 yıl)
│   ├── 20260423000000_hesap_plani_seed    — 268 hesap (TDHP — Fuat Hoca PDF referansı; 20260504000001 ile 272'ye çıktı)
│   ├── 20260423000001_belgeler            — fatura/makbuz/dekont tablosu
│   ├── 20260423000002_seed_static_sorular — 11 ünite + 98 statik soru
│   ├── 20260425000001_ai_kullanim         — AI çağrı sayacı
│   ├── 20260425000002_iyzico              — ödeme tablosu (entegrasyon henüz yapılmadı)
│   ├── 20260425000003_more_sorular        — 132 ek soru (toplam 213)
│   ├── 20260426000001_rls_sikilastir      — RLS policy güçlendirme
│   ├── 20260427000001_kullanici_profil_alanlari — onboarding profil alanları
│   ├── 20260427000002_kullanici_adi_unique      — username UNIQUE constraint
│   ├── 20260427000003_yeni_unite_yapisi          — 11→15 ünite restructure
│   ├── 20260504000001_hesap_plani_eksik_hesaplar — 4 eksik hesap (440, 449, 472, 479) → 272
│   ├── 20260504000002_muavin_hesaplar — alt/yardımcı hesaplar tablosu (120.001 vb.)
│   ├── 20260504000003_sozluk_muavin_terimleri — 4 sözlük terimi (muavin/cari/yardımcı defter/muavin mizanı)
│   ├── 20260504000004_admin_kullanici_select — admin RLS: ilerleme, aktivite, rozet, ödeme tablolarına SELECT
│   ├── 20260504000005_admin_premium_yonetimi — admin_premium_ayarla RPC (hediye/uzat/iptal)
│   ├── 20260504000006_admin_moderasyon — ban kolonları + banla/unbanla/sil RPC + RLS güçlendirme
│   ├── 20260504000007_bildirim_hedefleme — bildirim hedef_tipi + bildirim_hedef tablosu
│   ├── 20260504000008_bildirim_segment_hedefleme — premium/free segment desteği
│   ├── 20260504000009_admin_yetkililer — adminler tablosu + ilerleme sıfırla RPC
│   └── 20260504000010_katkici_sistemi — katkıcı başvuru + soru ekleme + 5 onayda Premium
├── functions/                — Edge Functions:
│   ├── ai-asistan            — soru içinde AI rehber
│   ├── ai-belge-uret         — belge üretimi
│   ├── ai-yanlis-analizi     — yanlış cevap açıklaması
│   └── gonder-email          — admin → kullanıcı email (Resend, env: RESEND_API_KEY + RESEND_FROM_EMAIL)
└── seed.sql
```

## Veri Yapısı
- `HESAP_PLANI` — Tek Düzen Hesap Planı, **272 hesap** (kod, ad, sınıf, tür);
  hem kodda (`src/data/hesap-plani.ts`) hem Supabase `hesap_plani` tablosunda
  (FK için zorunlu). PDF referansı: Fuat Hoca broşürü.
- `GRUP_ISIMLERI` — 58 grup başlığı (10. Hazır Değerler, 11. Menkul Kıymetler…)
  → 3 seviyeli hiyerarşi (sınıf > grup > hesap) Hesap Planı modal'ında.
- `uniteler` tablosu — **15 ünite** ([Yevmiye Kayıt Müfredatı](Yevmiye_Kayit_Mufredati.docx)
  baz alındı, 27 Nisan 2026'da 11→15 restructure yapıldı):
  1. Açılış Kayıtları · 2. Hazır Değerler · 3. Mal Alış · 4. Mal Satış ·
  5. Ticari Alacaklar · 6. Ticari Borçlar · 7. KDV · 8. Personel ·
  9. MDV Alış-Satış · 10. Amortisman · 11. Reeskont/Karşılık ·
  12. Stok Değerleme · 13. Yabancı Kaynaklar · 14. Gelir Tablosu ·
  15. Dönem Sonu Kapanış
- `sorular` tablosu — 213 soru seed edilmişti; **16 Mayıs 2026'da tamamı
  `durum='arsiv'` yapıldı** (`20260516000010_tum_sorulari_arsivle.sql`), yani
  bu 213 soru kullanıcıya görünmüyor. 9 Temmuz 2026 ölçümüne göre canlı soru
  sayısı **71** (70 legacy + 1 KUR-001) — bkz. [LEGACY-ICERIK-ENVANTER.md](LEGACY-ICERIK-ENVANTER.md).
  Admin panelinden manuel düzeltme yapılabilir
  (`durum`: taslak/inceleme/onayli/arsiv). Cozumler tablosu hesap_plani'ye
  FK ile bağlı.
- `ROZETLER` — 12 başarı rozeti (kodda)
- Zorluk puanları: kolay 5p, orta 10p, zor 20p (`ZORLUK_PUAN`)

## Kullanıcı Tercihleri
- **Türkçe** cevap ver (kod, yorum, commit, UI — hepsi)
- **Dolgun** font stili (Fraunces bold) — incelik tercih edilmiyor
- Akademik ama modern ton
- **Beyaz + mavi** renk paleti (açık tema baskın)
- **Thiings 3D** ikonları kullan (emoji değil)
- Estetik: klasik + editorial + modern harmonisi

## Mevcut Durum (2026-04-26)

### Tamamlanan
- Vite/TS/React 19 migrasyonu
- Supabase Auth + bulut senkron (kayıt zorunlu — anonim çözüm yok)
- Admin paneli (6 sayfa): tekil/toplu soru ekleme, düzenleme, hata moderasyonu
- Premium altyapısı: özellik bazlı `PremiumGate` + erken erişim RPC + fiyatlandırma sayfası (günlük soru limiti **yok**, karar: hibrit freemium)
- AI Edge Functions (3): asistan, belge üretimi, yanlış analizi
- Belge sistemi (fatura/makbuz/dekont): tablo, editor, modal
- Hata bildir: kullanıcı UI + admin moderasyon listesi
- Günün sorusu, "devam et" önerisi, yanlış yapılanları tekrar et
- Onboarding akışı
- **TDHP tam entegrasyon:** 272 hesap (TDHP standart, eksik 4 hesap eklendi), 58 grup başlığı, 3
  seviyeli hiyerarşi (sınıf > grup > hesap)
- ~~**11 ünite, 213 soru**~~ — 213 sorunun tamamı 16 Mayıs 2026'da arşive alındı;
  güncel canlı soru sayısı 71 (bkz. Veri Yapısı bölümü)
- Ventriloc/qvery esinli major reskin (slate blue + cool pearl + bakır accent)

### Yol haritası (pazar analizi sonrası öncelikli — [PAZAR-ANALIZI.md](PAZAR-ANALIZI.md))

**Karar (24 Nisan 2026):** Hedef **en kısa sürede ürün çıkarmak**. Öğretmen
paneli ve sınav modu MVP'de değil — v1.1+. MVP B2C öğrenci lansmanı.

**P0 — MVP shipi için gerekli (sıralı)**
1. **Sitenin tam test edilmesi** — production akışı (kayıt → onboarding →
   soru çözme → puan → rozet) birden fazla cihazda doğrulanacak. Bu bitmeden
   ödeme açılmıyor (yasal sorumluluk).
2. **İyzico ödeme entegrasyonu** — `odemeler` tablosu var, Edge Function +
   ödeme akışı + abonelik yönetimi yok. Test sonrası yapılacak.
3. **Landing + onboarding friksiyonu** — ziyaretçiyi kayda, kaydolanı
   Premium'a çevirecek akış iyileştirmesi.

**Tamamlanan (eski P0)**
- ~~Soru sayısı 80 → 150~~ — 213'e çıkıldı.

**P1 — Lansman sonrası (v1.1+)**
4. Sınav modu + karışık soru modu
5. Öğretmen/sınıf paneli (dağıtım kanalı için kritik ama büyük iş)
6. Hesap sınıfları/grupları seviye haritası
7. Konu anlatım sayfaları
8. T hesabı görselleştirmesi
9. Liderlik tablosu + haftalık challenge
10. Sözlük / SSS / hesap planı tam sayfa (SEO)

## Referans Dosyalar
- [docs/adr/ADR-004](docs/adr/ADR-004-v3-beceri-merkezli-mufredat.md) +
  [docs/curriculum/CUR-004](docs/curriculum/CUR-004-Mufredat.md) — **kanonik müfredat**
  (V3: Temeller 26 birim · 9 Yetkinlik · 7+3 Uzmanlık; yapı dondurma kuralı burada)
- [PAZAR-ANALIZI.md](PAZAR-ANALIZI.md) — 24 Nisan pazar analizi, hedef kitle,
  SAM/SOM, rekabet, fiyat, konumlanma. Ürün kararlarında baz alınır.
- [DOKUMANTASYON.md](DOKUMANTASYON.md) — kullanıcıya yönelik, güncel (23 Nisan)
- [SISTEM-HARITASI.md](SISTEM-HARITASI.md) — 22 Nisan tarihli; soru sayısı/ünite
  verileri eski, **genel yol haritası kısmı hâlâ geçerli**
- [content/prompts/soru-uret.md](content/prompts/soru-uret.md) — yeni soru üretirken
  Claude'a verilecek prompt şablonu
