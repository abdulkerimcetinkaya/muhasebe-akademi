# Keşfet V2 Veri Sözleşmesi

**Durum:** Uygulandı — 2026-08-09  
**Karar:** [ADR-002](adr/ADR-002-kesfet-v2-sorumluluk-siniri.md)

## Sorumluluklar

| Kavram | Kaynak-of-truth | Keşfet'in rolü |
|---|---|---|
| Müfredat sırası | `kesfet_kartlar`, `kesfet_bolumler`, `kesfet_itemler` | Sunar ve ilerletir |
| Kart ön koşulu | `kesfet_kart_on_kosullari` | Kilit nedenini gösterir |
| Ders–ölçümlü soru | `kesfet_item_sorulari` | Question Engine'e yönlendirir |
| Ekonomik olay | `muhasebe_olaylari` | Kopyalamaz |
| Belge | `belgeler`, `olay_belgeleri` | Olay üzerinden kullanır |
| Soru ve sonuç | `sorular`, `ilerleme` | Question Engine'e bırakır |
| Cevap anahtarı | `cozum_basliklari`, `cozum_satirlari` | Kopyalamaz |
| Yetkinlik | `yetkinlikler`, `olay_yetkinlikleri`, `kullanici_yetkinlikleri` | Ölçüm sonucunu gösterir; doğrudan yazmaz |
| Mevzuat | `mevzuat_*`, `cozum_mevzuat` | İşlem tarihinde geçerli sürümü bağlamda gösterir |
| Ders tamamlanması | `kesfet_ilerleme` | Yolculuk durumunu izler |

## Durum makineleri

Kart görünürlüğü:

- `acik`: yayınlanmış dersler kullanıcıya görünür; ön koşul sağlanmıyorsa kilitlidir.
- `yakinda`: katalogda görünür, içeriğe girilmez.
- `gizli`: yalnız admin görür.

Ders yayın durumu:

- `taslak → incelemede → yayinlandi → arsiv`
- Son kullanıcı yalnız `yayinlandi` kayıtlarını okur.
- Arşivleme kimliği ve eski `kesfet_ilerleme` kayıtlarını silmez.

Ölçüm:

- BlockNote `kontrol`/`kayit`: biçimlendirici öz-kontrol; yetkinlik yazmaz.
- `kesfet_item_sorulari`: ölçümlü görev; doğru/yanlış sonucu `ilerleme_kaydet` RPC'sine gider.
- Ders tamamlanması, tüm `zorunlu=true` görevlerin doğru çözümünü gerektirir.
- Yetkinlik yalnız soru → olay → `olay_yetkinlikleri` zincirinden güncellenir.

## İlişki kuralları

### `kesfet_kart_on_kosullari`

- Bir kart kendisinin ön koşulu olamaz.
- Döngü veritabanı trigger'ı ile reddedilir.
- `tur`: `zorunlu` veya `onerilen`.
- Zorunlu kartın bütün yayınlanmış dersleri tamamlanmadan hedef kart açılmaz.
- Önerilen ilişki erişimi kapatmaz.
- Slug dizileri yalnız migration geçiş girdisidir; runtime normalize tablodan okur.

### `kesfet_item_sorulari`

- Bir ders birden çok soruya sıralı bağlanabilir.
- `minimum_basari` yüzde sözleşmesidir; mevcut doğru/yanlış Question Engine'de zorunlu görev için 100 kullanılır.
- `destek_seviyesi`: `rehberli`, `standart`, `serbest`.
- Soru silinirse ders bağlantısının sessiz bozulmaması için FK `restrict` kullanır.

## Yayın kapısı

Açık bir kart için admin kontrolü şunları doğrular:

- en az bir yayınlanmış ders,
- her yayınlanmış derste içerik,
- her zorunlu ölçümlü soruda `onayli` durum,
- sorunun onaylı ve tarihli V2 olayı,
- olay belgesi,
- normalize çözüm,
- olay–yetkinlik bağlantısı,
- çözüm–mevzuat bağlantısı.

Eksiklerden biri varsa kart `acik` yapılamaz. Yeni kart önce `yakinda` veya `gizli` oluşturulur.

## Geçiş ve uyumluluk

- Migration additive upsert kullanır; Keşfet kartlarını ve ilerlemeyi silmez.
- Eski Temeller parçaları silinmez, `arsiv` durumuna alınır.
- `tip='isletme'` kayıtlarına içerik veya ilerleme dönüşümü uygulanmaz.
- Migration uygulanana kadar public loader yeni ilişki tabloları için legacy `soru_id` ve mevcut kart kolonlarına dual-read fallback yapar.
- Yeni admin yazımları normalize tabloları gerektirir; bu nedenle migration uygulama kodundan önce dağıtılmalıdır.

