# ADR-004 — V3: Beceri merkezli müfredat (26 birim · 9 Yetkinlik · 7+3 Uzmanlık)

## Durum

Superseded by [ADR-005](ADR-005-v6-31-kart-mimarisi.md) — 2026-08-11

Aynı gün 31 kartlık V6 mimarisi kabul edildi (7 Temeller + 16 Yetkinlikler +
8 Uzmanlıklar). Bu ADR'nin "kart ≠ ölçülen beceri" ayrımı ve yapı dondurma
kuralı ADR-005'te korunuyor; 26 birimlik yapı geçersizdir.

Ürün sahibi, Chief Architect'in araştırma destekli revizyon önerisini plan
onayıyla kabul etti. ADR-003'ün "kanonik Temeller = 39 ders" hükmünü
**geçersiz kılar** (Superseded); ADR-003'ün katman sınırları ve mevzuat
kuralları yürürlükte kalır.

## Bağlam

ADR-003, dört çelişen yapı arasından Muhasebe2.docx'in 39 derslik yapısını
kanonik ilan etmişti. Hemen ardından gelen mimari denetim şu teşhisi koydu:

> Ana sorun eksik başlık değil; "ders merkezli müfredat" ile "beceri merkezli
> ürün" arasında kalmak.

Somut gerekçeler:

- 39 ders içinde aynı zihinsel işi bölen mikro dersler var ("Hesap Sınıfı /
  Hesap Grubu / Ana Hesap" gibi). İçerik hacmini azaltıp çekirdek kavrama
  odaklanmak kavramsal hataları azaltıyor; yeni başlayanda çözümlü örnek +
  kademeli destek (guidance fading) bağımsız problem çözmeden daha verimli.
- Yetkinlikler konu kartı gibi kurulmuştu; gerçek muhasebe işi konu değil
  **iş akışıdır** (belge → kontrol → işlem → kayıt → cari/banka → mutabakat).
- Uzmanlık "daha zor konu" değil, **belirsiz problem çözme** seviyesidir;
  sektörler (savunma, inşaat, e-ticaret) yeni ders üretilecek alanlar değil,
  mevcut uzmanlıkların birleştiği capstone rotalardır.

Pivot zamanlaması: 39 dersin yalnız 2'si yazılmış ve ikisi de yeni yapının
1–2. birimi olarak aynen yaşıyor. Maliyet şu an en düşük seviyede.

## Karar

### 1. Temeller: 3 kart · 26 öğrenme birimi

| Kart (slug sabit) | Yeni ad | Birim |
|---|---|---|
| `muhasebe-baslangic` | İşletmeyi Muhasebe Gibi Görmek | 10 |
| `hesap-kayit-mantigi` | Olaydan Muhasebe Kaydına | 10 |
| `kayittan-finansal-tabloya` | Kayıttan Finansal Tabloya | 6 |

Kanonik 39 → 26 eşleştirmesi `supabase/migrations/20260811000002_temeller_26_birim.sql`
içindeki `temeller_ders_hedefleri` tablosudur; okunur döküm CUR-004 v2.0'dadır.
13 birleşmede kaynak ders silinmez, arşive alınır; öğrenci ilerlemesi kanonik
birime taşınır (20260809000005 deseni).

Temeller kapsam sınırı: KDV ayrıntısı, bordro, beyanname, dönem sonu
uygulamaları, TMS/TFRS ve ileri mevzuat **Temeller'e girmez**.

### 2. Yetkinlikler: 9 iş akışı kartı

Y1 Belgeden Muhasebe İşlemine · Y2 Satın Alma, Satıcı ve Ödeme ·
Y3 Satış, Müşteri ve Tahsilat · Y4 Kasa, Banka, Kart ve Finansman ·
Y5 Stok ve Duran Varlık İşlemleri · Y6 KDV ve e-Belge Operasyonları ·
Y7 Bordro ve SGK · Y8 Mutabakat ve Dönem Sonu Kontrolleri ·
Y9 Beyanname, Kapanış ve Raporlama.

Mevcut 6 karttan eşleme migration'dadır. Yayındaki 8 Yetkinlik dersi yeni
kartlara taşınır; yayındaki içerik alan kartlar kullanıcı erişimini korumak
için `acik` kalır/olur. `sirket-ticaret-islemleri` yeni modelde karşılıksız →
`gizli` (şirket/sermaye konuları İşletmeler M1/M13 + Uzmanlık katmanında).

### 3. Uzmanlıklar: 7 çekirdek + sektör rotaları

Çekirdek (fonksiyonel): Vergi Uygulamaları, Finansal Raporlama ve TMS/TFRS,
Maliyet ve Üretim, Proje ve Sözleşme, İleri Bordro-SGK-Teşvikler,
Dış Ticaret, Ar-Ge-Teknokent-Teşvikler.

Sektör rotaları (sektorel, şimdilik gizli): Savunma Sanayii, İnşaat & Taahhüt,
e-Ticaret. Rota = yeni ders seti değil; çekirdek uzmanlıkları ön koşul ağıyla
birleştiren capstone. `yonetim-muhasebesi` çekirdek listede değil → gizli
(raporlama teması Y9'da yaşar).

### 4. İşletmeler track'i ayrı devam eder — rol ayrımıyla

Ürün sahibi kararı: İşletmeler (4 işletme · 13 modül · 145 alt başlık) ayrı
track olarak kalır (ADR-001 yürürlükte). Çakışma maliyetini sınırlayan kural:

- **Keşfet öğretir** — kavram, beceri, iş akışı dersleri yalnız Keşfet'te yazılır.
- **İşletmeler simüle eder** — dönem simülasyonu ve uygulama pratiği sunar;
  kavram anlatımı içermez, gerektiğinde ilgili Keşfet dersine bağlanır.
- Aynı ders metni iki yerde yazılmaz. İşletmeler'in 145 alt başlığı, Yetkinlik
  içeriği üretilirken senaryo/kapsam kaynağıdır.

**ADR-003 düzeltmesi:** ADR-003 "13 modül (Notion İçerik Şablonu)" yapısını
tarihsel saymıştı. Bu yanlıştı — o liste canlı İşletmeler track'idir
(`isletmeler → isletme_modulleri → modul_alt_basliklari`). Çelişen tarihsel
yapı sayısı üçtür (45 / 39 / 19); İşletmeler ayrı ve yaşayan bir üründür.

### 5. Yapı dondurma kuralı

Bu, üç günde üçüncü yapısal değişikliktir. Bundan sonra Temeller/Yetkinlikler/
Uzmanlıklar iskeletinde yapısal değişiklik ancak şu iki kanıttan biriyle
önerilebilir: (a) üretilmiş gerçek içerikten gelen somut ders tasarımı engeli,
(b) gerçek kullanıcı verisi. "Daha iyi bir taksonomi fikri" tek başına yeterli
gerekçe değildir.

## Gelecek fazlar (bu kararla kabul, bu geçişte uygulanmaz)

İçerik üretim fazına girdiler; şema değişikliği gerektirenler ayrı ADR ister:

- **Mastery dizisi (M0–M9):** olayı anla → değişen değeri bul → hesabı bul →
  yönü belirle → eksik kaydı tamamla → sıfırdan kaydet → hata avı → belgeden
  kaydet → işlem zinciri → karma iş günü.
- **Belge zorluk sistemi (B0–B5):** belgesiz → sade → gerçeğe yakın → tam →
  çoklu belge → dosya.
- **Beceri bazlı ilerleme:** "ders %" yerine yetkinlik skoru
  (doğruluk + zorluk + ipucu + tekrar + son görülme).
- **Anlatım/pratik oran hedefleri:** Temeller ~%35/65 → Yetkinlik ~%20/80 →
  Uzmanlık ~%10/90 (tasarım hedefi, bilimsel sabit değil).
- **Kart 2 finali** (Temeller'de eksik olan ölçüm noktası) içerik fazında eklenir.
- Temas hedefi: Temeller boyunca ~75–100 kayıt teması (10–15 çözümlü,
  15–20 yarım, 30–40 bağımsız, 20–30 karışık tekrar); blocked → interleaved →
  spaced pratik düzeni.

## Sonuçlar

**Olumlu:** içerik üretimi tek ve daha kısa listeyle başlar (26 birim);
Yetkinlikler iş ilanlarındaki gerçek işlere karşılık gelir; sektörler için
içerik tekrarı üretilmez; kullanıcı ilerlemesi ve yazılmış 2 ders korunur.

**Maliyet / kabul edilen riskler:** Notion'daki 39 kayıt ve dünkü ADR-003/CUR-004
revize edilir; arşivdeki ders sayısı 20'ye çıkar (7 + yeni 13) — bunlar içerik
yazarken kaynak metindir, çöp değildir; "Gün Sonu Kontrolü" alıştırması Y8'e
taşındığı için Y8 açılana dek kullanıcı erişiminden çıkar.

## İlgili

- ADR-001 — İşletmeler modeli (yürürlükte)
- ADR-002 — Keşfet/V2 sorumluluk sınırı (yürürlükte)
- ADR-003 — Kanonik Temeller müfredatı (Superseded by ADR-004)
- CUR-004 v2.0 — kanonik okunur döküm
- `supabase/migrations/20260811000002..4` — geçiş migration'ları
