# ADR-003 — Kanonik Temeller müfredatı ve tek doğruluk kaynağı

## Durum

Proposed — 2026-08-11

Bağımsız denetim (2026-08-11) sonucunda önerildi. Ürün sahibi onayı bekleniyor.

## Bağlam

Denetimde Temeller müfredatının **birbiriyle çelişen dört sürümü** aynı anda canlı bulundu:

| Sürüm | Yapı | Nerede | Durum |
|---|---|---|---|
| A | 45 ders · 3 kart · 10 bölüm | `docs/sources/Muhasebe.docx` | Muhasebe2.docx ile revize edildi |
| B | **39 ders · 3 kart · 10 bölüm** | `docs/sources/Muhasebe2.docx` | Belgelerin en güncel sürümü |
| C | 19 ders · 5 bölüm | `src/data/temeller-mufredat-denetimi.ts` | `20260809000002` seed'inin ara durumu |
| D | 13 modül (M1–M13) | Notion "Muhasebe Akademi İçerik Şablonu" | Keşfet öncesi atölye yapısı |

Bu çokluk somut zarar üretiyordu:

- `20260809000005_temeller_39_ders.sql` veritabanını B'ye taşırken, admin içerik
  denetimi ekranı hâlâ C'ye göre ölçüyordu; sonuçları anlamsızdı.
- Notion Müfredat ve Ders İçerikleri veri tabanları B'ye göre kurulmuş, ancak
  Notion'da korunan iki kaynak sayfa D'yi tarif ediyor.
- İçerik üretimine hangi yapıya doldurulduğu belirsizken başlamak, üretilen
  metnin sonradan yeniden düzenlenmesi riskini taşıyordu.

Ayrıca Muhasebe2.docx'in kendi "45 → 39" değişim özeti eksiktir: saydığı bir
ekleme ve beş birleştirme 40 verir. Kayıp altıncı çıkarma —
"Borç ve Alacak Ne Demektir?" dersinin "Hesabın İki Tarafı: Borç ve Alacak"
içinde eritilmesi — belgede açıklanmamış; Muhasebe.docx T2/Bölüm 2 listesi ve
`20260809000005` migration'ının `temeller_birlesmeler` tablosuyla doğrulanmıştır.

## Karar

**1. Temeller müfredatının kanonik sürümü B'dir: 3 kart · 10 bölüm · 39 ders.**

Kanonik tanım tek yerde tutulur:
`supabase/migrations/20260809000005_temeller_39_ders.sql` içindeki
`temeller_ders_hedefleri` tablosu. Ders adı, bölümü ve sırası buradan okunur.

**2. Diğer üç sürüm tarihseldir.**

- A (45 ders): kaynak belge olarak korunur; ürün hedefi değildir.
- C (19 ders): `TEMELLER_V2_SEED_DERSLER` adıyla yalnız `20260809000002`
  migration'ının sözleşme testinde kalır. Denetim ekranı artık kullanmaz.
- D (13 modül): Notion'daki iki kaynak sayfa korunur, ancak müfredat otoritesi
  değildir. Bu sayfalardaki değerli içerik (karakter evreni, yazım kuralları,
  yevmiye biçimi) müfredattan bağımsız olarak geçerliliğini sürdürür.

**3. Katman sınırları.**

- **Word belgeleri** eğitim tasarımının kaynağıdır. Temeller için Muhasebe2.docx,
  Yetkinlikler ve Uzmanlıklar için Muhasebe.docx önceliklidir.
- **Repo** mevcut ürün gerçeğidir. Bir konuda repo ile Notion çelişirse, neyin
  canlıda olduğu sorusunda **repo** esas alınır.
- **Notion** kalıcı bilgi merkezidir. Öğrenme hedefi, ön koşul, kavram ve mevzuat
  ilişkilerinde **Notion** esas alınır.
- Bir bilgi iki sistemde de gerekiyorsa kopyalanmaz; ilişkiyle bağlanır ve
  kaynağı `Kod Kaynağı` / `Kaynak` alanında gösterilir.

**4. Zamana bağlı mevzuat bilgisi ders metnine gömülmez.**

Oran, tutar, süre ve eşik içeren her ifade; kaynak kurum, resmî bağlantı, madde,
geçerlilik yılı ve son doğrulama tarihi olmadan yayımlanamaz.

## Gerekçe

Muhasebe2.docx yalnız daha yeni değil, pedagojik olarak da daha sağlamdır:
kişilik kavramını mali nitelikteki olaydan önce veriyor, borç/alacağın "+/−"
olmadığını açıkça kuruyor, aynı zihinsel işi iki derse bölen başlıkları
birleştiriyor. 39 derslik yapı zaten Notion'da (Müfredat + Ders İçerikleri) ve
veritabanı migration'ında uygulanmış durumda; başlıkları üç sistemde birebir
tutuyor. Kanonik ilan etmek yeni iş değil, mevcut çoğunluğu resmileştirir.

## Sonuçlar

**Olumlu**

- Admin içerik denetimi doğru hedefe göre ölçer.
- İçerik üretimi tek yapıya doldurulur; sonradan yeniden düzenleme riski kalkar.
- Repo–Notion çelişkilerinde başvurulacak bir kural oluşur.

**Olumsuz / kabul edilen maliyet**

- `20260809000005` birleşen yedi dersin içeriğini taşımaz; migration bunu açıkça
  belirtiyor ("editoryal içerik üretilmez"). Bu yedi dersin gövdesi elle
  tamamlanmalıdır; aksi hâlde ders adı tam kapsam vaat ederken içerik yarım kalır:
  - Belge: Ekonomik Olayın Kayıt Dayanağı
  - Temel Muhasebe Denklemi: Varlıklar = Borçlar + Özkaynak
  - Hesap Nedir ve Neden Hesaplara İhtiyaç Duyarız?
  - Hesabın İki Tarafı: Borç ve Alacak
  - Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap  ← üç dersin işini taşıyor, en yüksek bilişsel yük
  - Mizan Neyi Kontrol Eder, Neyi Edemez?
  - (yeni) İşletme ile Sahibinin İşlemlerini Ayırmak — hiç içeriği yok
- Notion'daki 39 ders kaydının gövdesi şu an aynı şablon metnidir; kanonik yapı
  doğru olsa da içerik üretimi henüz başlamamıştır.

## İlgili

- ADR-001 — İşletmeler modeli
- ADR-002 — Keşfet ile V2 sorumluluk sınırı
- `docs/curriculum/CUR-004-Mufredat.md` — kanonik müfredatın okunur dökümü
- `supabase/migrations/20260809000005_temeller_39_ders.sql` — kanonik tanım
- `src/data/temeller-mufredat-denetimi.ts` — denetim ekranının hedef listesi
