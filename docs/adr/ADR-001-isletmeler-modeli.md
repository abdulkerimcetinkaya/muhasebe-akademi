# ADR-001 — İşletmeler modeli (dönem simülasyonu)

## Durum

Accepted — 2026-07-30

## Bağlam

Keşfet "kavram öğret" katmanı (oku + mini test). Bunun yanına, öğrencinin bir
örnek şirketi **bir dönem boyu** çalıştırdığı bir uygulama katmanı isteniyor:
**Açılış → Dönem İçi → Dönem Sonu → Mali Tablolar**. Keşfet'ten farkı adımların
**sıralı ve bağlı** olması (aynı şirket, süregelen hikâye).

Navbar kararı (Faz 1): `Keşfet · İşletmeler · Problemler · Sözlük`. İşletmeler
tamamen bu yeni simülasyon için ayrıldı; eski konu-üniteleri (/uniteler) emekliye
ayrılacak (Faz 3).

## Karar

**1. Veri modeli — Keşfet altyapısı yeniden kullanılır (tip ayrımı).**
- `kesfet_kartlar`'a `tip` kolonu eklenir: `'kesfet' | 'isletme'` (default `'kesfet'`).
- İşletme = `tip='isletme'` kart. Bölüm = dönem aşaması (Açılış / Dönem İçi /
  Dönem Sonu / Mali Tablolar). Item = tek bir işlem senaryosu (belge + `kayit`
  bloğu).
- Böylece ilerleme takibi, anonim kayıt duvarı, admin editörü, `kayit`/`kontrol`
  blokları ve test modeli **bedavaya** çalışır.
- `kategori` alanı işletme türü grubu için kullanılır (Ticaret / Üretim / Hizmet).
- Rota `/isletmeler` (+ `/isletmeler/:slug`, `/isletmeler/:slug/:item`) mevcut
  Keşfet bileşenlerini "track" parametresiyle yeniden kullanır — URL/marka ayrı.

**2. Kapsam — canlı süregelen mizan/bilanço.**
- `kayit` bloğu doğru kaydı yapısal tutar: `satirlar: [{ kod, ad, tutar,
  tip:'borc'|'alacak' }]`. Motor sıfırdan hesaplamaz; işlemlerin **önceden bilinen
  doğru satırlarını** sırayla biriktirir → hesap bazında bakiye → mizan.
- Hesap sınıflandırması (aktif/pasif/gelir/gider) için mevcut `hesap_plani` (272
  hesap, sınıf/tür) kullanılır. Motor tamamen **deterministik ve istemci
  tarafında** hesaplanabilir (ağır backend yok).
- MVP birikim kuralı: bir adım tamamlanınca **doğru kayıt** birikime eklenir
  (öğrencinin hatalı denemesi defteri bozmaz — kademeli hata yok). "Öğrencinin
  gerçek kayıtlarıyla" birikim (challenge modu) sonraki fazda değerlendirilir.
- Dönem sonunda öğrencinin geçtiği kayıtlardan otomatik **mizan + bilanço + gelir
  tablosu** üretilir.

## Sonuçlar

- Hızlı başlangıç: şema değişikliği tek kolon; UI ve bloklar hazır.
- Canlı motor ek iş: birikim util/hook + "Güncel Durum" paneli + dönem sonu tablo
  görünümleri. Deterministik olduğu için risk düşük.
- Birkaç sorguya `tip` filtresi eklenir (Keşfet index, sitemap üretimi, admin).
- İlk İşletme: **Ticaret İşletmesi**, uçtan uca şablon.
- Eski `/uniteler` Faz 3'te emekliye ayrılır; kavramlar Keşfet Temeller'e,
  sorular Problemler'de kalır.

## Uygulama fazları

- 2.1 Şema: `kesfet_kartlar.tip` kolonu (migration).
- 2.2 `/isletmeler` rotaları + katalog (bileşen yeniden kullanımı) + navbar yönü.
- 2.3 Canlı defter motoru (util/hook): `kayit` satırları → mizan/bilanço/gelir tablosu.
- 2.4 Defter arayüzü: "Güncel Durum" paneli + dönem sonu tablo görünümleri.
- 2.5 İlk İşletme içeriği (Ticaret) uçtan uca.
