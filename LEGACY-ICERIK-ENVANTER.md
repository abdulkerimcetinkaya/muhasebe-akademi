# Legacy İçerik Envanteri — V2 Uyumluluk Analizi

**Sürüm:** 1.0 · **Tarih:** 9 Temmuz 2026
**Bağlı dokümanlar:** [ICERIK-OPERASYON-MODELI.md](ICERIK-OPERASYON-MODELI.md) · [M7B-GECIS-KARARI.md](M7B-GECIS-KARARI.md) · [KURASYON-001-MIMARI-ANALIZ.md](KURASYON-001-MIMARI-ANALIZ.md) · ADR-002/017/019/020
**Kapsam:** Mevcut soru/içerik envanterinin V2 normalize yapıya uyumluluğunun analizi + sınıflandırma önerisi. **Silme / migration / apply / commit içermez** — yalnız analiz.

---

## 0. Ölçülen envanter (canlı, 9 Tem 2026)

| Metrik | Değer |
|---|---|
| Toplam soru | **71** (70 legacy + 1 KUR-001) |
| `olay_id` olan / olmayan | **71 / 0** (M5 hepsini backfill'ledi) |
| **Tam V2** (olayında `cozum_basliklari`) | **1** (yalnız KUR-001) |
| Legacy cevap anahtarı (`cozumler` eski tablo) olan | **70** (256 satır) |
| Yeni belge (`olay_belgeleri`) olan / legacy `sorular.belgeler` jsonb dolu | **1 / 28** |
| Eski M2M tabloları (`soru_yetkinlikleri`/`soru_etiketleri`) | **yok** (M5'te düşürüldü) |
| Olay-düzeyi yetkinlik / etiket olan soru | **1 / 1** (yalnız KUR-001) |
| Legacy `sorular.etiketler` / `sorular.muavinler` jsonb dolu | **70 / 70** |
| Olay toplam | **71** (70 mekanik M5-wrapper + 1 KUR-001 küratörlü) |
| Küratörlü olay (yetkinlik+cevap anahtarı+belge+mevzuat) | **1** |
| Legacy soru dağılımı | ünite `mal-alis-satis`: **70**, durum `onayli`: **70** |
| Legacy cevap anahtarsız soru | **0** (70'inin hepsinde legacy cozumler var) |
| Atölyeye bağlı soru (`atolye_sorulari`) | **21** |
| İlerleme kaydı olan soru | **1** (2 satır, test) |

**Temel bulgu:** İçerik **temiz iki kümeye** ayrışıyor — **70 legacy** (eski cevap anahtarı `cozumler`'de, belge/muavin/etiket eski jsonb'da, olayı M5 mekanik-wrapper) + **1 tam V2** (KUR-001: yeni normalize yapının tamamı). Kesişim yok.

---

## 1. Kaç soru V2 yapıya uyumlu?

**Yalnızca 1/71 (KUR-001) tam V2 uyumlu.** V2-uyumluluk ölçütü: olayın **küratörlü katmanları** olması — `cozum_basliklari` (yeni cevap anahtarı) + `olay_yetkinlikleri` + (belge/mevzuat). 70 legacy sorunun olayı var ama bu olaylar **M5'in mekanik 1:1 wrapper'ıdır** (başlık/senaryo kopyalanmış; hiç küratörlü katman yok). Yani "olay_id var" ≠ "V2 uyumlu".

---

## 2. Kaç soruda olay_id var/yok?

**71 var, 0 yok.** M5 backfill tüm soruları `olay-<soruid>` wrapper'ına bağladı. **Ama 70'i wrapper (içi boş), 1'i küratörlü (KUR-001).** `olay_id` varlığı yanıltıcı bir "uyumluluk" göstergesidir; asıl ölçüt küratörlü katmanlardır (§1).

---

## 3. Kaç soruda cozum_basliklari/cozum_satirlari bağlantısı var/yok?

- **Yeni cevap anahtarı (`cozum_basliklari`/`cozum_satirlari`): 1 var / 70 yok.**
- **Legacy cevap anahtarı (`cozumler` eski tablo): 70 var / 1 yok** (KUR-001'in legacy cozumler'i yok).
- **Tam ters/ayrık partition:** 70 legacy yalnız eski `cozumler`'de; KUR-001 yalnız yeni `cozum_satirlari`'nda. `kontrol.ts` şu an eski `cozumler`'i okur → 70 legacy çalışır, **KUR-001 çalışmaz** (§7 kritik).

---

## 4. Kaç soruda belge bağlantısı var/yok?

- **Yeni belge (`belgeler`+`olay_belgeleri`): 1** (KUR-001).
- **Legacy belge (`sorular.belgeler` jsonb): 28 dolu**, 42 boş.
- 28 legacy soru belgeli ama **normalize edilmemiş** (jsonb, M6b kararıyla taşınmadı — gürültülü Modül-1 verisi).

---

## 5. Yetkinlik/etiket bağlantısı — eski M2M mi, olay düzeyinde mi?

- **Eski M2M (`soru_yetkinlikleri`/`soru_etiketleri`): YOK** — M5'te düşürüldü (ADR-017, boştular). Hiçbir soru eski M2M kullanmıyor.
- **Olay düzeyi (`olay_yetkinlikleri`/`olay_etiketleri`): 1 soru** (KUR-001).
- **Legacy jsonb (`sorular.etiketler`): 70 dolu** — granüler folksonomi (M6b/M5'te belirtilen: hesap kodu + kavram etiketleri), küratörlü taksonomiyle uyumsuz.
- **Legacy `sorular.muavinler` jsonb: 70 dolu** — soru-yerel muavinler (M7b kararıyla global tabloya terfi edilmedi; ad-çakışması + cari-blok).

Yani yetkinlik/etiket ekseninde: **70 legacy hiçbir ölçülebilir yetkinlik bağına sahip değil** (jsonb etiketler ölçüm değil, filtre-artığı); yalnız KUR-001 gerçek `olay_yetkinlikleri` taşıyor → M9 XP yalnız KUR-001'de akar.

---

## 6. Legacy sorular için sınıflandırma önerisi

70 legacy soru **hepsi `mal-alis-satis` ünitesinde, hepsi onaylı, hepsi çalışır durumda** (legacy cozumler ile). Bunlar platformun **şu anki tek gerçek içeriği** — körlemesine arşiv/silme platformu içeriksiz bırakır. Sınıflandırma bir *yaşam döngüsü*dür:

| Sınıf | Kapsam | Eylem | Not |
|---|---|---|---|
| **MIGRATE (yeniden-yazım)** | Curriculum değeri olan legacy sorular; **öncelikle 21 atölye-bağlı** olan | KUR-XXX olarak **yeniden kurulur** (KUR-001 gibi) — mekanik değil (M7b kararı) | Soru-yerel muavin + gürültülü belge → mekanik taşınamaz; kürasyonla yeniden |
| **ARCHIVE** | Yeniden-yazılan legacy sorunun **eski sürümü**; düşük değerli/tekrar eden | `durum='arsiv'` (silme değil) | V2 sürümü onaylanınca legacy sürüm arşive |
| **DELETE CANDIDATE** | 70 mekanik **wrapper olay** (`olay-<soruid>`, ör. olay-s12-02) — küratörsüz, bağımsız değeri yok | Soru re-point/arşiv **sonrası** silinebilir | `sorular.olay_id` FK (restrict) engelliyor → önce soru çözülmeli. Legacy sorunun kendisi **delete candidate DEĞİL** (atölye/ilerleme FK) |

**İlkeler:**
- **Silme son çare, önce arşiv.** `sorular` silmek `atolye_sorulari` (21) + `ilerleme` FK'sını etkiler → arşiv (durum) tercih.
- **Yeniden-yazım > mekanik migrate** (M7b/M6b dersi): soru-yerel muavin, gürültülü belge, ad-çakışması otomatik taşınamaz.
- **Wrapper olaylar** (70) küratörlü olaylarla değiştirilecek geçici yapılardır; asıl "delete candidate" bunlardır (soru re-point sonrası).

**Öncelik sırası (öneri):** 21 atölye-bağlı soru → yeniden-yazım (aktif kullanımda); kalan 49 → curriculum önceliğine göre yeniden-yazım/arşiv.

---

## 7. Frontend'de eski ve yeni içerik nasıl ayrıştırılmalı?

### Kritik bulgu — KUR-001 şu an frontend'de KIRIK
`kontrol.ts` **eski `cozumler`** tablosunu okur. KUR-001 sorusunun eski cozumler'i **yok** (cevap anahtarı yeni `cozum_satirlari`'nda). Yani KUR-001 sorusu `durum='onayli'` ama **mevcut frontend onu kontrol edemez** → kullanıcıya açılırsa bozuk deneyim. **Frontend dual-read yönlendirmesi, herhangi bir V2 içeriğini kullanıcıya açmanın ÖN KOŞULUdur.**

### Ayrıştırma stratejisi (dual-read)
Ayırt edici: **soru V2 mi?** = `exists(cozum_basliklari where olay_id = soru.olay_id)`.

| | Legacy yol (70 soru) | V2 yol (KUR-001 + gelecek) |
|---|---|---|
| Cevap anahtarı | eski `cozumler` (kod/borc/alacak) | `cozum_basliklari`+`cozum_satirlari` (muavin_id) |
| Belge | `sorular.belgeler` jsonb | `belgeler`+`olay_belgeleri` |
| Muavin dropdown | `sorular.muavinler` jsonb | `olay_muavinleri` (şu an boş → fallback gerek) |
| Etiket | `sorular.etiketler` jsonb | `olay_etiketleri` |
| Çözüm sonrası | doğrudan `ilerleme` insert | `ilerleme_kaydet()` RPC (XP akar) |

**Uygulama önerisi:**
- `uniteler-loader.ts` her soruyu yüklerken V2-ayırt-ediciye göre **dallanır** (V2 ise yeni tablolardan map, değilse legacy jsonb'dan — mevcut `Belge`/`CozumSatir` tiplerine).
- Alternatif: bir `sorular.v2_hazir` boolean *view/computed* (şema eklemeden `exists` ile türetilebilir).
- **KUR-001 kapısı:** Frontend routing hazır olana kadar KUR-001 sorusu ya kullanıcıya **açılmamalı** (ör. geçici `durum` değişikliği — ayrı karar) ya da routing bu içerikten *önce* yazılmalı.

**Sonuç:** Frontend, V2 içeriğin darboğazıdır. Yeni içerik (KUR-001, KUR-002…) canlıda *var* ama **frontend dual-read olmadan kullanıcıya güvenle açılamaz**.

---

## 8. Özet + öneri

| Soru | Yanıt |
|---|---|
| 1. V2 uyumlu | **1/71** (KUR-001) |
| 2. olay_id | **71 var** (ama 70'i boş wrapper) |
| 3. yeni cevap anahtarı | **1 var / 70 legacy cozumler** |
| 4. belge | **1 yeni / 28 legacy jsonb** |
| 5. yetkinlik/etiket | eski M2M yok; **1 olay-düzeyi** (KUR-001); 70 legacy jsonb (ölçüm değil) |
| 6. sınıflandırma | 70 legacy = **migrate(yeniden-yazım)**; eski sürümler → **archive**; 70 wrapper olay → **delete candidate** (soru re-point sonrası) |
| 7. frontend | **dual-read yönlendirme** (`cozum_basliklari` varlığı ayırt-edici); **KUR-001 şu an kırık — frontend ön koşul** |

### Önerilen sıradaki adımlar
1. **Frontend dual-read yönlendirmesi** — V2 içeriği kullanıcıya açmanın ön koşulu (KUR-001 dahil). *Bu, birikmiş frontend işinin bir parçası.*
2. **Yeniden-yazım kuyruğu** — 21 atölye-bağlı legacy soru önce (aktif kullanım); KUR-002 (satış faturası) bu kuyruğun parçası olabilir.
3. **Arşiv politikası** — bir legacy sorunun V2 sürümü onaylanınca legacy sürümü `arsiv`; wrapper olayı delete candidate listesine.
4. **Silme yok** — bu fazda hiçbir şey silinmez; envanter + sınıflandırma dokümante edilir, eylem sonraki fazda onayla.

---

## Kapanış

Legacy içerik varsayımın doğrulandı: **70 sorunun hiçbiri gerçek V2 değil** — hepsi M5'in mekanik wrapper'ıyla `olay_id` taşıyor ama küratörlü katmanları (cevap anahtarı/yetkinlik/belge/mevzuat) yok; cevap anahtarları eski `cozumler`'de, belge/muavin/etiket eski jsonb'da. Yalnız KUR-001 tam V2. İçerik iki temiz kümeye ayrışıyor (70 legacy + 1 V2, kesişimsiz). **En kritik operasyonel gerçek:** frontend hâlâ legacy `cozumler` okuduğundan V2 içerik (KUR-001) canlıda var ama kullanıcıya açılamaz — **frontend dual-read yönlendirmesi, V2 içeriğin görünür olmasının ön koşuludur.** Legacy sorular mekanik değil, kürasyonla (KUR-XXX) yeniden yazılır (M7b/M6b dersi); silme yerine arşiv; wrapper olaylar re-point sonrası delete candidate.
