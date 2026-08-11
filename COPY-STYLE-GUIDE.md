# MuhasebeAkademi Yazım Rehberi

Bu rehber, kullanıcıya görünen Türkçe metinlerin ortak sesini tanımlar. Amaç metinleri tek tip hâle getirmek değil; öğrencinin ne yapacağını ve sistemin ne yaptığını açıkça anlatmaktır.

## Ses

MuhasebeAkademi:

- Muhasebe terimlerinde kesin, açıklamalarda sade konuşur.
- Öğrenciye `sen` diye hitap eder; üstten konuşmaz.
- Özellikleri sıfatlarla değil, yaptığı işle anlatır.
- Hata durumunda kullanıcıyı suçlamaz ve uygulanabilir bir sonraki adım verir.
- Cesaretlendirir fakat gereksiz övgü, ünlem ve oyunlaştırma dili kullanmaz.
- Kısa arayüz metinlerinde doğrudan fiil kullanır.

## Terimler

| Kavram | Tercih edilen kullanım | Kaçınılacak kullanım |
|---|---|---|
| Ücretsiz plan | `Ücretsiz` veya `ücretsiz hesap` | `Free` |
| Ücretli plan | `Premium` | `Pro`, `ileri plan`, `üst paket` |
| AI özelliği | `AI asistan`, `AI hata analizi` | `kişisel öğretmen`, `seni anlayan AI` |
| Alıştırma | `soru`, bağlama göre `problem` | aynı ekranda `egzersiz`, `test`, `görev` dönüşümü |
| İşletme | `işletme türü` veya kısaca `işletme` | `ünite` (kullanıcı arayüzünde) |
| Muhasebe kaydı | `yevmiye kaydı` | bağlam yokken yalnızca `kayıt` |
| Hesap sistemi | `Tek Düzen Hesap Planı` veya `TDHP` | açıklamasız yeni kısaltmalar |
| Kullanım hakkı | `sorgu` | aynı bağlamda `hak`, `mesaj`, `kredi` dönüşümü |
| Koyu görünüm | `Karanlık tema` | `dark mode` |

## Butonlar

- Eylemi söyle: `Soruyu çöz`, `Modülleri gör`, `Premium’u incele`, `Giriş yap`.
- Başlıklarda ve butonlarda Türkçe cümle düzeni kullan; her kelimeyi büyük harfle başlatma.
- Belirsiz `Devam`, `Gönder` veya `Keşfet` yerine bağlam izin veriyorsa nesneyi belirt.
- Buton metninde nokta veya ünlem kullanma.
- Kullanıcıdan önce sistemin yapacağı işi anlatan edilgen ifadelerden kaçın.

## Hata mesajları

Hata mesajı mümkünse iki parçadan oluşur:

1. Ne tamamlanamadı?
2. Kullanıcı şimdi ne yapabilir?

Örnekler:

- `Bildirim gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.`
- `Kartlar yüklenemedi. Bağlantını kontrol edip sayfayı yenile.`
- `Google ile giriş tamamlanamadı. Lütfen tekrar dene.`

Teknik hata metnini doğrudan kullanıcıya göstermeden önce anlaşılır bir eylem ekle. Kullanıcının verisinin kaybolmadığı biliniyorsa bunu açıkça söyle; bilinmiyorsa garanti verme.

## Başarı mesajları

- Sonucu söyle: `Bildirim alındı`, `Şifren güncellendi`, `Premium üyeliğin aktif`.
- `Harika!`, `Tebrikler!`, `Muhteşem!` gibi otomatik övgüleri kullanma.
- Gerekliyse sonraki adımı ekle: `Öğrenci listesini gönder.`

## Boş durumlar

Boş durum, nedenin ardından bir sonraki adımı verir:

- `Filtreyle eşleşen soru yok. Aramayı temizle veya farklı bir zorluk seç.`
- `Henüz bir işletme türü yayımlanmadı. Daha sonra tekrar kontrol et.`

Kullanıcıya admin paneli, veritabanı veya iç operasyon talimatı gösterme.

## Noktalama ve biçim

- Kısa arayüz metinlerinde uzun tire kullanma; nokta veya virgül tercih et.
- Yapay dramatik iki nokta kullanma. İki nokta; örnek, liste, etiket ve gerçek açıklamalarda kullanılabilir.
- Emoji kullanma.
- Ünlem işaretini yalnızca metnin doğal ve gerekli olduğu nadir durumlarda kullan.
- Başlıklar ve butonlar cümle düzenindedir: `Premium’u başlat`, `Hata bildir`.
- `AI`, `KDV`, `TDHP`, `PDF`, `SGK` ve resmî hesap adlarının büyük harflerini koru.
- Türkçe tırnak gerektiren metinlerde `“…”` tercih et.

## Sayı, para ve tarih

- Para: `1.250,00 ₺`
- Oran: `%20`
- Tarih: `10 Ağustos 2026`
- Süre: `15 saniye`, kullanıcı metninde `15s` kullanma.
- Sayı ve para tablolarında tabular rakam kullan.

## Muhasebe içeriği

- `borç` ve `alacak` terimlerini gündelik anlamlarıyla değiştirme.
- Hesap kodları, tutarlar, vergi oranları, belge türleri ve kayıt yönleri editoryal sadeleştirme gerekçesiyle değiştirilmez.
- Teknik bir cümle belirsizse otomatik yeniden yazma; konu uzmanı incelemesine bırak.
- `Hatalı satır`, `hesap kodu`, `borç-alacak dengesi` gibi somut ifadeleri jenerik `sonuç` veya `performans` sözcüklerine tercih et.

## AI metinleri

- AI’ın insan olduğunu ima etme.
- Kesin doğruluk, kişiselleştirilmiş öğretmenlik veya öğrenciyi tam anlama iddiasında bulunma.
- Mekanizmayı söyle: `Yanlış satırı, hesap kodunu ve borç-alacak seçimini açıklar.`
- Kota bilgisini açık yaz: `Ücretsiz · günde 3 sorgu`.

## Önce / sonra

| Önce | Sonra |
|---|---|
| `Kayıt tutmayı bir uzman gibi öğren.` | `Kayıt tutmayı yevmiye kaydı yaparak öğren.` |
| `Çöz, anında gör, ustalaş.` | `Hatalı satırları ve borç-alacak dengesini hemen gör.` |
| `Premium öğrenmeyi hızlandıran katmandır.` | `Premium, AI hata analizi ve adım adım çözüm desteği ekler.` |
| `Premium’u Keşfet` | `Premium’u incele` |
| `Bilinmeyen hata.` | `İşlem tamamlanamadı. Lütfen tekrar dene.` |

## Son kontrol

Yeni veya değişen her metin için şu soruları yanıtla:

- Başka bir eğitim ürününe aynen taşınabilir mi?
- Kullanıcı ne yapacağını anlıyor mu?
- Sistem ne yaptığını somut olarak söylüyor mu?
- Yeni bir özellik, sonuç veya garanti iddiası ekliyor mu?
- Muhasebe anlamını veya ödeme/hukuk koşulunu değiştiriyor mu?
- Metin yüksek sesle okunduğunda doğal geliyor mu?

