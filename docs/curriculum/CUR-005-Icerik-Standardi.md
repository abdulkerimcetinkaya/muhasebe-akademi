# CUR-005 — İçerik Standardı

**Durum:** Taslak v0.3

---

# Amaç

Bu belge, gelecekte yazılacak bütün KUR (muhasebe olayı) içeriklerinin standardını tanımlar. Her KUR içeriği bu yapıya ve ilkelere uyar; böylece platform genelinde tutarlı bir öğrenme deneyimi sağlanır.

Bu standart, CUR-001 (Vizyon) ve CUR-002 (Öğrenme Modeli) belgelerini temel alır ve `docs/decisions/` altındaki ürün kararlarıyla (DD-001…DD-005) uyumludur.

---

# İçerik Şablonu

Her KUR içeriği aşağıdaki bölümleri bu sırayla içerir.

## 1. Olay Bilgisi

Olayın kimliği: başlık, modül/bölüm, zorluk, tahmini süre ve bağlı olduğu yetkinlik(ler).

## 2. Öğrenme Hedefleri

Kullanıcının bu olay sonunda kazanacağı beceriler. Hedefler **yetkinlik odaklı** yazılır; hesap kodu ezberi olarak değil, "kullanıcı … yapabilir" biçiminde ifade edilir.

## 3. İşletme Senaryosu

Gerçek hayattaki bir işletme durumunu anlatan somut senaryo. Olay bir problemle başlar.

## 4. Gerçek Belge

Senaryoya ait, gerçek GİB formatına sadık belge (fatura, makbuz, dekont vb.). Sahte veya basitleştirilmiş belge kullanılmaz.

## 5. Belge Analizi

Belge üzerindeki alanların incelenmesi. Her kritik alan için muhasebe, mevzuat ve mesleki açıklama sunulur.

## 6. Mevzuat

Olayla ilgili mevzuat maddeleri. Mevzuat ayrı bir başlık olarak değil, olayın ve belgenin doğal parçası olarak bağlanır.

## 7. Mentor Rehberliği

Mentorun kademeli ipuçları ve yönlendirici soruları. Mentor doğrudan doğru cevabı vermez; düşündürür.

## 8. Muhasebe Kaydı

Olayın doğru yevmiye kaydı (cevap anahtarı): hesaplar, borç/alacak tutarları ve denge.

## 9. Finansal Etki

Kaydın mali tablolara ve işletmenin finansal durumuna etkisi.

## 10. Sık Yapılan Hatalar

Kullanıcıların bu olayda tipik olarak yaptığı hatalar ve her hatanın doğru muhakemeyle açıklaması.

## 11. Olay Varyasyonları

Aynı yetkinliği farklı koşullarda pekiştiren varyantlar (ör. peşin/veresiye, farklı KDV oranı).

## 12. Kazanılan Yetkinlikler

Olay tamamlandığında kullanıcının kazandığı yetkinliklerin net listesi.

## 13. Sonraki Görev

Kullanıcıyı bir sonraki olaya hazırlayan yönlendirme; öğrenme döngüsünü kapatır.

---

# İçerik Standartları

Her KUR içeriği aşağıdaki ilkelere uyar.

- Öğrenme hedefleri hesap kodu odaklı değil, **yetkinlik odaklı** yazılır.
- Gerçek belge kullanılır; sahte veya basitleştirilmiş belge kabul edilmez.
- Mevzuat, olayın doğal parçasıdır; ayrı ders olarak sunulmaz.
- Mentor doğrudan doğru cevabı söylemez; yönlendirir.
- Kullanıcı sınırsız deneme yapabilir.
- Aynı yetkinlik farklı varyasyonlarla pekiştirilir.
- Her olay, gerçek hayattaki bir problemi çözer.

---

# İçerik Üretim ve Onay Süreci

Bir KUR içeriği doğrudan yayına girmez; taslaktan onaya belirli bir akışla ilerler. Bu süreç, içerik çoğalmadan önce kalite ve onay standardını güvence altına alır.

## Akış

1. **Product Discovery** — Öğretilecek muhasebe olayı ve öğrenme ihtiyacı belirlenir.
2. **Ürün kararı** — Product Owner içeriğin kapsamını ve önceliğini onaylar.
3. **CUR standardına göre içerik taslağı** — İçerik, bu belgedeki şablon (13 bölüm) ve ilkelere göre planlanır.
4. **Claude ilk taslak üretimi** — İlk taslak üretilir; bu taslak nihai değildir.
5. **Product Owner Review** — İçerik ürün gözüyle incelenir; ara bilgiler, mentor yönlendirmeleri, belge analizi, mevzuat bağlantıları ve soruya yansıyan kurgu gözden geçirilir.
6. **Revizyon** — Geri bildirimler uygulanır; gerekirse standardın kendisi de güncellenir.
7. **Architect Review** — İçerik teknik ve mimari tutarlılık açısından incelenir.
8. **Onay** — Nihai kabul verilir.
9. **GitHub'a referans içerik olarak işlenmesi** — Onaylanan içerik referans içerik olarak saklanır.

## İlkeler

- Her yeni KUR içeriği ilk aşamada **taslaktır**.
- Product Owner; içerikteki ara bilgileri, mentor yönlendirmelerini, belge analizini, mevzuat bağlantılarını ve soruya yansıyan kurguyu değiştirebilir.
- Revizyon yalnızca tek içeriği düzeltmek için yapılmaz; gerekirse **CUR-005 standardı da güncellenir**.
- Amaç, aynı kalite hatasının sonraki KUR içeriklerinde tekrar etmesini önlemektir.
- Claude içerik üretirken içeriği nihai kabul etmez; Product Review sonrası revize edilecek **taslak** olarak üretir.
- Nihai kabul **Architect Review** sonrası yapılır.
- Onaylanan içerikler GitHub'da referans içerik olarak saklanır.
- Onaylanmamış içerikler referans kabul edilmez.
