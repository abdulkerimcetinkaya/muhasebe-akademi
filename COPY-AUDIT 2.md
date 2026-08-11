# MuhasebeAkademi Metin Denetimi

## Kapsam

- Taranan kaynak dosyası: 117
- Otomatik taramada bulunan yaklaşık Türkçe kullanıcı metni: 1.821
- Taranan alanlar: public sayfalar, kullanıcı bileşenleri, data sabitleri, `content/`, kullanıcı hata/başarı mesajları, SEO metinleri ve kullanıcıya ulaşabilen Supabase içerikleri
- Kapsam dışı: kod yorumları, değişken adları, geliştirici logları, test fixture’ları ve API/veritabanı alan adları

Sayı, TypeScript/TSX ve Markdown dosyalarındaki Türkçe karakter içeren string/JSX metinlerinin mekanik taramasıdır. Template interpolation ve veritabanından gelen parçalı metinler nedeniyle kesin çeviri anahtarı sayısı olarak değerlendirilmemelidir.

## Korunan ses

Mevcut metinlerde korunması gereken dört özellik belirlendi:

- Muhasebe belgesi ve hesap koduyla konuşan somut anlatım
- Öğrenciye doğrudan `sen` diye hitap eden yakınlık
- Kısa arayüz komutları
- Akademik içeriği gereksiz jargona boğmayan açıklamalar

## Bulgular ve düzenlemeler

| Dosya / konum | Mevcut metin | Sorun | Kalıp | Önerilen / uygulanan metin | Gerekçe | Risk |
|---|---|---|---|---|---|---|
| `src/components/OpenBookHero.tsx` hero | Kayıt tutmayı bir uzman gibi öğren. | Doğrulanamaz sonuç vaadi | Importance puffery | Kayıt tutmayı yevmiye kaydı yaparak öğren. | Sonuç yerine yöntemi söyler. | Düşük |
| `src/components/OpenBookHero.tsx` meta | Gerçek senaryolar · AI hata analizi · İş hayatına hazırlık | Son madde soyut | Portability test | Fatura ve dekont senaryoları · Anında kontrol · AI hata analizi | Özellikleri mekanizmayla anlatır. | Düşük |
| `src/pages/AnaSayfa.tsx` yetenek 01 | Fatura, makbuz, dekont. Olay, taraflar, tutar. Sınıfta görmediğin pratiği masan başında çöz. | Üst üste dramatik parçalar | Dramatic fragmentation | Fatura, makbuz ve dekontlardaki işlemleri yevmiye kaydına dönüştür. | Tek, somut eylem verir. | Düşük |
| `src/pages/AnaSayfa.tsx` yetenek 02 | Her işletmede teori + bol soru… kalıcı öğren. | Belirsiz miktar ve öğrenme vaadi | Importance puffery | Aynı muhasebe kavramını farklı işletme ve işlem senaryolarında uygula. | Vaat yerine uygulamayı anlatır. | Düşük |
| `src/pages/AnaSayfa.tsx` yetenek 03 | Yanlış cevabını satır satır açıklar… kavramsal anlatır. | İkinci cümle soyut | Fake-strong verb | Yanlış satırı, hesap kodunu ve borç-alacak seçimini ayrı ayrı açıklar. | Analizin kapsamını somutlaştırır. | Düşük |
| `src/pages/AnaSayfa.tsx` yetenek 04 | Stajda göreceğin yevmiye fişinin tam aynısı… | Doğrulanamaz aynılık ve sonuç | Importance puffery | Stajda karşılaşacağın belgelere ve yevmiye kayıtlarına önceden çalış. | Garanti vermeden amacı korur. | Düşük |
| `src/pages/AnaSayfa.tsx` açıklama | …sınıftan iş hayatına geçişin pürüzsüz olsun. | Soyut ve abartılı sonuç | Importance puffery | Takıldığında AI asistan, hatalı satırı ve hesap kodunu açıklasın. | Ürünün yaptığı işe döner. | Düşük |
| `src/pages/AnaSayfa.tsx` bölüm başlığı | Tek amacı: gerçek hayata hazırlamak. | Yapay iki nokta ve soyut vaat | Colon reveal | Gerçek muhasebe işlemlerine hazırlan. | Kısa ve konuya özgü. | Düşük |
| `src/pages/AnaSayfa.tsx` süreç başlığı | Üç adım, üç saniye. | Kanıtsız hız iddiası | Importance puffery | Üç adımda bir yevmiye kaydı. | Akışı anlatır, süre vaat etmez. | Düşük |
| `src/pages/ProblemlerSayfasi.tsx` hero | Çöz, anında gör, ustalaş. | Slogan ritmi ve sonuç vaadi | Robotic rhythm | Gerçek işlemlerden yola çıkan soruları çöz; hatalı satırları ve borç-alacak dengesini hemen gör. | Öğrencinin göreceği sonucu belirtir. | Düşük |
| `src/pages/ProblemlerSayfasi.tsx` CTA | Çöze Başla | Dilbilgisi ve gereksiz başlık düzeni | Formatting slop | Soruyu çöz | Doğal ve doğrudan eylem. | Düşük |
| `src/pages/UnitelerSayfasi.tsx` hero | Her işletme türü kendi senaryolarına… sahiptir. | Resmî ve dolaylı yapı | Fake-strong verb | Her işletme türünde farklı belge, hesap ve kayıt akışlarıyla çalışırsın. | Kullanıcının eylemini öne çıkarır. | Düşük |
| `src/pages/UnitelerSayfasi.tsx` CTA | Modülleri Aç | Başlık düzeni ve belirsiz fiil | Formatting slop | Modülleri gör | Sonucu daha doğru anlatır. | Düşük |
| `src/pages/UnitelerSayfasi.tsx` boş durum | Admin panelinden ekleyebilirsin. | Son kullanıcıya iç operasyon talimatı | Portability/context failure | Daha sonra tekrar kontrol et. | Kullanıcının erişebildiği eylemi verir. | Düşük |
| `src/pages/SozlukSayfasi.tsx` açıklama | …ve daha fazlası — örneklerle… | Jenerik genişletme ve dekoratif tire | Formatting slop | Terimleri örnekler ve ilgili TDHP hesap kodlarıyla açıklar. | Sözlüğün kapsamını somutlaştırır. | Düşük |
| `src/pages/SozlukSayfasi.tsx` placeholder | Terim ara — örn. … | Kısa UI metninde uzun tire | Em dash | Terim ara: amortisman, KDV, yevmiye | İki noktayı gerçek örnek işlevinde kullanır. | Düşük |
| `src/pages/PremiumSayfasi.tsx` hero | Premium öğrenmeyi hızlandıran katmandır. | Soyut ve doğrulanamaz hız iddiası | Importance puffery | Premium, AI hata analizi ve adım adım çözüm desteği ekler. | Satın alınan özellikleri söyler. | Orta |
| `src/pages/PremiumSayfasi.tsx` rozet | En İyi Değer | Kanıtsız değerlendirme | Interpretive metadiscourse | Premium | Kullanıcıya ne düşüneceğini söylemez. | Orta |
| `src/pages/PremiumSayfasi.tsx` alt başlık | Yapay zeka rehberli öğrenme | Soyut ürün dili | Portability test | AI hata analizi ve çözüm desteği | Somut özellik adları. | Orta |
| `src/components/AIAsistanYanPanel.tsx` kota | Yarın tekrar 3 yeni hak… | `hak/sorgu` tutarsızlığı ve uzun cümle | Synonym cycling | Ücretsiz hesabına yarın 3 yeni sorgu tanımlanır… | Kota terimini standardize eder. | Düşük |
| `src/components/AIAsistanYanPanel.tsx` CTA | Premium’u Keşfet | Satın alma bağlamında belirsiz fiil | Fake-strong verb | Premium’u incele | Eylemin sonucunu açıklar. | Düşük |
| `src/components/PremiumGate.tsx` CTA | Premium’u Keşfet | Aynı belirsiz CTA | Fake-strong verb | Premium’u incele | Terminoloji tutarlılığı sağlar. | Düşük |
| `src/pages/BakimSayfasi.tsx` bilgi | Açılışta ilk sen haberdar olacaksın. | Doğrulanamaz öncelik | Importance puffery | Açılış tarihini e-postayla bildireceğiz. | Kanalı ve eylemi söyler. | Düşük |
| `src/pages/PremiumSonucSayfasi.tsx` başlık | Premium üyeliğin aktif! | Gereksiz ünlem | Formatting slop | Premium üyeliğin aktif | Sonuç tek başına yeterli. | Düşük |
| `src/pages/PremiumSonucSayfasi.tsx` kurum açıklaması | …bir adım daha kaldı 👇 | Emoji ve belirsiz sonraki adım | Formatting slop | Premium erişimi tanımlamak için öğrenci listesini gönder. | Sonraki adımı belirtir. | Düşük |
| `src/components/HataBildirModal.tsx` timeout | Sunucu yanıt vermedi (15s)… | Teknik dil ve biçim | Portability/context failure | Bildirim gönderilemedi. İnternet bağlantını kontrol edip tekrar dene. | İşlem ve çözüm görünür. | Düşük |
| `src/components/HataBildirModal.tsx` fallback | Bilinmeyen hata. | İşlemsiz ve eylemsiz hata | Portability test | Bildirim gönderilemedi. Lütfen tekrar dene. | Kullanıcı neyin olmadığını anlar. | Düşük |
| `src/components/HataBildirModal.tsx` başarı | Teşekkürler. En kısa sürede inceleyeceğiz. | Belirsiz süre vaadi | Weasel/importance | Bildirimi inceleme listesine ekledik. | Sistem sonucunu söyler. | Düşük |
| `src/pages/GirisSayfasi.tsx` fallback | Bilinmeyen hata. | Bağlamsız hata | Portability test | İşlem tamamlanamadı. Lütfen tekrar dene. | Kullanılabilir sonraki adım verir. | Düşük |

## Güçlü olduğu için korunan metinler

- `Yevmiye kayıtlarına devam etmek için giriş yap.`
- `Ücretsiz hesabını oluştur, ilerlemeni bulutta sakla.`
- `Filtreyle eşleşen soru yok.`
- `Bağlantıyı kontrol edip sayfayı yenile.`
- `Borç-Alacak dengeli`
- `Hesap kodu`
- `Dönem Sonu İşlemleri`
- `KDV dahil 1.200,00 ₺ tutarındaki satış nakit tahsil edildi.`

Bu cümleler kısa, bağlama özgü ve kullanıcı eylemini ya da muhasebe bilgisini doğrudan aktarıyor.

## Yüksek riskli, otomatik uygulanmayan öneriler

| Alan | Bulgu | Önerilen işlem | Risk nedeni |
|---|---|---|---|
| `content/` eğitim içerikleri | Bazı uzun açıklamalarda tekrar ve edilgen yapı olabilir. | Konu uzmanıyla bölüm bölüm dil redaksiyonu yap. | Muhasebe anlamı değişebilir. |
| Supabase soru seed’leri | Senaryo anlatımları farklı tonlarda. | Terminoloji kontrolü yap; tutar ve kayıt yönlerine dokunma. | Veritabanında yayımlanan muhasebe içeriği. |
| Premium iade metni | `İlk 7 gün koşulsuz iade` ifadesi hukuk ve operasyon doğrulaması gerektirir. | Mesafeli Satış Sözleşmesi ve gerçek iade akışıyla karşılaştır. | Hukuki ve finansal iddia. |
| Premium fatura metni | E-arşiv/e-fatura gönderim şekli doğrulanmalı. | İyzico ve faturalama operasyonuyla karşılaştır. | Ödeme ve vergi bilgisi. |
| Erken erişim | `1 yıl ücretsiz`, `100 yer` ve geri bildirim koşulu. | Kampanya koşullarıyla eşleştir. | Fiyat ve kampanya vaadi. |
| SEO açıklamaları | Soru, işletme ve içerik sayıları değişebilir. | Build sırasında güncel kaynaktan üret veya düzenli kontrol et. | Doğrulanabilir ürün iddiası. |
| AI cevap sistem promptları | Asistanın kesinlik ve kaynak gösterme davranışı ayrıca incelenmeli. | Prompt ve hata davranışı için ayrı AI güvenilirlik denetimi yap. | Öğretim doğruluğu. |
| KVKK ve sözleşme metinleri | Dil sadeleştirmesi hukuki kapsamı etkileyebilir. | Hukukçu onayıyla ayrı redaksiyon yap. | Hukuki metin. |

## En sık bulunan sorunlar

1. Soyut veya kanıtsız sonuç vaatleri
2. Art arda slogan gibi kurulan kısa cümleler
3. Başka bir eğitim ürününe taşınabilecek jenerik açıklamalar
4. Belirsiz `Keşfet`, `Devam` ve `Başlat` CTA’ları
5. Sonraki adımı söylemeyen fallback hata mesajları
6. Kısa arayüz metinlerinde dekoratif uzun tire ve gereksiz ünlem

## Son değerlendirme

Uygulanan düzenlemeler ürün davranışını, muhasebe içeriğini, fiyatı, veri modelini ve component yapısını değiştirmez. Metinlerin büyük bölümü zaten kısa ve ürüne özgü olduğundan toplu yeniden yazım yapılmamıştır. Yeni metinler `$no-ai-slop` değerlendirmesindeki anlamı koruma, portability, somutluk, doğrudan fiil, biçim ve doğal okuma kontrollerinden geçirilmelidir.
