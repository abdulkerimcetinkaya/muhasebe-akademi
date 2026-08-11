# CUR-102 — Keşfet Pilot: KUR-001

**Durum:** Teknik entegrasyon hazır; migration/deploy bekliyor  
**Altın referans:** [CUR-100](CUR-100-Altin-Referans-KUR-001.md)  
**Keşfet dersi:** Temeller → Muhasebe Kaydı → Belgelerden Muhasebe Kaydı

## Amaç

Keşfet'in anlatım katmanı ile V2 olay, belge, Question Engine, Learning Engine ve mevzuat katmanını tek bir gerçek içerikte uçtan uca doğrulamak.

## Doğrulanan üretim verisi

2026-08-09 tarihinde uzak veritabanında salt okunur sorguyla doğrulandı:

- Soru: `soru-mal-alis-veresiye-001` — `onayli`
- Olay: `olay-mal-alis-veresiye-001` — `onayli`, işlem tarihi `2026-03-15`
- Belge: 1
- Normalize çözüm: 1
- Olay yetkinliği: 4
- Çözüm–mevzuat bağı: 2
- Geçerli mevzuat: VUK md.229 ve KDVK md.29/1
- İki mevzuat kaydında da kaynak URL mevcut.

Bu içerik yeni üretilmiş varsayımsal üretim verisi değildir; mevcut onaylı KUR-001 ve CUR-100 altın referansı kullanılır.

## Kullanıcı akışı

1. Kullanıcı Keşfet'te Temeller kartını açar.
2. Muhasebe Kaydı bölümünde “Belgelerden Muhasebe Kaydı” dersine gelir.
3. BlockNote anlatımı belge → olay → mantık → hesap → borç/alacak → kayıt → kontrol → tablo etkisi zincirini açıklar.
4. “Ölçümlü görev” kutusu KUR-001'i mevcut `/problemler/:soruId` ekranında açar.
5. Yanlış deneme Learning Engine'e yanlış olarak; doğru deneme mevcut `ilerleme_kaydet` RPC'si üzerinden başarı ve yetkinlik olarak yazılır.
6. Problem tamamlandığında kullanıcı aynı Keşfet dersine döner.
7. Zorunlu soru doğru çözülmeden ders tamamlanamaz.
8. Ders tamamlanınca yalnız `kesfet_ilerleme` yolculuk kaydı yazılır.
9. Yapısal mevzuat bağlantıları olay tarihindeki geçerli sürümle ders bağlamında gösterilir.

## Öğrenme standardı eşlemesi

| Zincir adımı | Pilot karşılığı |
|---|---|
| Belge | Alış faturası ALS2026-000147 |
| Ekonomik olay | Veresiye ticari mal alışı |
| Muhasebe mantığı | Stok ve indirilecek KDV artar; satıcı borcu doğar |
| Hesap seçimi | 153.01, 191.01, 320.001 |
| Borç/alacak | 153/191 borç, 320 alacak |
| Kayıt | Normalize KUR-001 cevap anahtarı |
| Kontrol | Question Engine doğrulaması |
| Finansal tablo etkisi | Stok/KDV varlığı ve satıcı borcu artar; nakit değişmez |
| Mevzuat | VUK 229, KDVK 29/1; işlem tarihine göre sürüm |

## Pilot başarı ölçütleri

Dağıtım sonrası değerlendirme için:

- Dersi açanların ölçümlü göreve başlama oranı,
- göreve başlayanların doğru çözüme ulaşma oranı,
- ilk denemede doğruluk,
- ipucu/AI/çözüm gösterimi kullanımı,
- doğru çözümden sonra Keşfet dersini tamamlama oranı,
- olayın dört yetkinliğinde güncelleme oluşması,
- ders ve problem ekranı arasındaki geri dönüşte kayıp/hata oranı.

Mevcut Vercel sayfa analitiği temel trafik sinyali sağlar. Ayrıntılı ürün olayları için ayrı bir ölçüm kararı alınmadan yeni analitik bağımlılığı eklenmez.

## Yayın kabul kapısı

- [x] Mevcut onaylı olay kullanılıyor.
- [x] Gerçekçi belge bağlantısı var.
- [x] Normalize, dengeli cevap anahtarı var.
- [x] Yetkinlik ağırlıkları var.
- [x] İşlem tarihinde geçerli, kaynaklı mevzuat var.
- [x] Ders tamamlanması ve yetkinlik ilerlemesi ayrılmış durumda.
- [x] Migration SQL uzak veritabanında transaction + rollback ile başarıyla çalıştırıldı.
- [ ] Migration geçmişi uzlaştırıldı ve migration kalıcı uygulandı.
- [ ] Giriş yapılmış öğrenci ve admin oturumuyla tarayıcı smoke testi yapıldı.
- [ ] Pilot davranış metrikleri dağıtım sonrası gözden geçirildi.

