# Yedekler

## kesfet-yedek-2026-08-11.json

Keşfet müfredatı sıfırdan kurulmadan önce alınan **yapı yedeği**.

| Bölüm | Kayıt |
|---|---|
| `kartlar` | 26 (tam satır) |
| `bolumler` | 18 (tam satır) |
| `itemler_meta` | 56 (metadata + içerik blok sayısı, bayt, md5 — **içerik metni hariç**) |
| `ilerleme` | 18 |
| `on_kosullar` | 39 |
| `item_sorulari` | 3 |

**İçerik metni neden yok:** 56 dersin 54'ü `20260809000005_temeller_39_ders.sql`
içindeki `pg_temp.ders_icerigi()` fonksiyonunun ürettiği jenerik şablondur
(9 blok, ders adı yerine konarak üretiliyor) — gerektiğinde o migration'dan
yeniden üretilebilir. `icerik_md5` alanı hangi dersin şablon olduğunu teyit eder.

Elle yazılmış 2 dersin tam metni ayrı dosyada:

## kesfet-yazili-dersler-2026-08-11.json

`Muhasebe Neden Gereklidir?` ve `Muhasebe Nedir?` — her biri 72 bloklu,
`20260809000006` / `20260809000007` migration'larıyla eklenmiş gerçek ders
içerikleri. Yeni müfredatta karşılığı olan ders çıkarsa metin buradan taşınabilir.

---

Yedekler, ürün sahibinin "eski kayıtlar gerçekten silinsin" kararının emniyet
kemeridir (repo geleneği normalde hard delete yerine `durum='gizli'` /
`yayin_durumu='arsiv'` kullanır — bkz. `20260811000001` başlığı).
