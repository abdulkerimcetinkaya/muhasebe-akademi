# Product Decision Records (PDR)

Bu klasör, Muhasebe Akademisi'nin **ürün kararlarını** kayıt altına alır.

Buradaki kararlar teknik değil ürünseldir; bu nedenle klasör bir ADR (Architecture Decision Record) değil, **PDR (Product Decision Record)** mantığında çalışır. Teknik mimari kararları `docs/adr/` altında tutulur.

## Amaç

Ürünün *neden bu şekilde tasarlandığını* tek bir yerde toplamak. Gelecekte üretilecek tüm CUR (curriculum) ve KUR (içerik) çalışmaları bu kararları referans alır.

## Her karar şu başlıklarla yazılır

- **Amaç** — kararın kapsamı
- **Problem** — hangi ihtiyaç veya sorun bu kararı gerektirdi
- **Alınan Karar** — net ifade
- **Gerekçe** — neden bu yönde karar verildi
- **Ürüne Etkisi** — kullanıcı deneyimine ve içerik üretimine yansıması
- **Gelecekte Gözden Geçirme Durumu** — kararın ne zaman/hangi koşulda yeniden değerlendirileceği

## Kurallar

- Her karar tek dosya: `DD-XXX-kisa-baslik.md`
- Numaralar sıralı ve tekildir.
- Bir kez yazılan karar silinmez; değişirse yeni bir DD ile güncellenir/süperseded edilir.

## Mevcut Kararlar

- **DD-001** — Görev Tabanlı Öğrenme
- **DD-002** — Gerçek GİB Belgelerine Dayalı Öğrenme
- **DD-003** — AI Yerine Dijital Mentor Yaklaşımı
- **DD-004** — XP Yerine Yetkinlik Odaklı İlerleme
- **DD-005** — Mevzuatın Olayın İçinde Öğretilmesi
