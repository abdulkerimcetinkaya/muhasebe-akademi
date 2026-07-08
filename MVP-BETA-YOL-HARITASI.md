# MVP / Beta Yol Haritası — Muhasebe Akademisi

**Sürüm:** 1.0 · **Tarih:** 9 Temmuz 2026
**Bağlı dokümanlar:** [ICERIK-OPERASYON-MODELI.md](ICERIK-OPERASYON-MODELI.md) · [KURASYON-001-MIMARI-ANALIZ.md](KURASYON-001-MIMARI-ANALIZ.md) · [FRONTEND-DUAL-READ-ANALIZ.md](FRONTEND-DUAL-READ-ANALIZ.md) · [LEGACY-ICERIK-ENVANTER.md](LEGACY-ICERIK-ENVANTER.md)
**Statü:** Aktif yol haritası.

---

## 0. Karar + ilke

**Öncelik artık mükemmel mimari değil, beta'ya çıkacak MİNİMUM KULLANILABİLİR ÜRÜN.** Mimari faz (M1-M9) tamamlandı; bundan sonra her iş "beta'yı yaklaştırıyor mu?" filtresinden geçer. Altın kaplama yok; "yeterince iyi + çalışıyor" yeterli.

**Beta vaadi (bir cümle):** Kayıtlı kullanıcı, gerçek belgeli senaryolarla **yevmiye kaydı çözer**, anında doğru/yanlış geri bildirim + puan alır, **yetkinlik bazlı ilerlemesini** görür.

---

## 1. Mevcut durum (9 Tem 2026)

| Alan | Durum |
|---|---|
| Şema M1-M9 | ✅ canlı (M6b/M7b ertelendi karar, M10 tasarım donduruldu) |
| İçerik operasyon standardı | ✅ (ICERIK-OPERASYON-MODELI) |
| KUR-001 (ilk V2 olay) | ✅ canlıda; uçtan uca DB testleri geçti |
| Frontend Katman 1 (loader dual-read) | ✅ commit `b197ea1` (tsc temiz) |
| Frontend Katman 3 (ilerleme_kaydet RPC) | ✅ commit `8e202d7` (XP akışı) |
| Legacy içerik | 70 yevmiye sorusu çalışır (legacy cozumler) |
| Frontend Katman 2 (belge dual-read) | ⏳ bekliyor (opsiyonel) |
| **Tarayıcı runtime doğrulaması** | ❌ **hiç yapılmadı** (kritik boşluk) |

**Kritik boşluk:** Tüm frontend değişiklikleri `tsc` + DB-veri düzeyinde doğrulandı; **canlı tarayıcıda hiç çalıştırılmadı.** Beta'nın ilk işi bu.

---

## 2. Öncelik sırası (P1–P6)

### P1 — KUR-001 frontend'de sorunsuz çözülmesi
- **Mevcut:** Katman 1 loader V2 cevap anahtarını dolduruyor (DB-doğrulandı). Belge Katman 2'de (senaryo metni tutarları taşıdığından çözüm bloklanmaz).
- **Kalan:** **Dev-server smoke** — `npm run dev`, KUR-001'i tarayıcıda aç, muavin dropdown'dan (153.01/191.01/320.001) kaydı gir, kontrol et, doğru/yanlış geri bildirimi gör.
- **Kabul:** KUR-001 tarayıcıda çözülüyor, kontrol doğru sonuç veriyor, hata yok.
- **Not:** V2 muavin dropdown evreni (`olay_muavinleri`) boş → global muavin fallback (çalışır). Beta için yeterli.

### P2 — M9 `ilerleme_kaydet()` RPC entegrasyonu
- **Durum:** ✅ **TAMAM** (Katman 3, commit `8e202d7`). Doğru→XP, yanlış→yanlis_sayisi, legacy→no-op.
- **Kalan:** Yalnız dev-server doğrulaması (P1 ile birlikte): çöz → XP `kullanici_yetkinlikleri`'ne aktı mı, profilde/puanda göründü mü.
- **Kabul:** Gerçek kullanıcı KUR-001'i çözünce XP akıyor + puan artıyor.

### P3 — En az 10 kaliteli kürasyon olayı
- **Mevcut:** 1 (KUR-001). Şablon + standart hazır.
- **Kalan:** KUR-002…KUR-010+ — KUR-001 desenini izleyen 9+ olay. Öncelik en sık senaryolar: satış faturası, tahsilat/tediye (dekont), KDV tahakkuku, ücret/bordro, mal iade, çek/senet.
- **Kabul:** ≥10 olay, her biri §10 checklist'ten geçmiş, DB'ye seed'lenmiş, uçtan uca test edilmiş.
- **Yöntem:** Elle seed (KUR-001 akışı: tasarım → seed → dry-run → apply → test). AI taslak hızlandırır, insan onaylar.

### P4 — Bu olaylardan 30–50 soru
- **Karar noktası:** Şu an **yalnız `yevmiye_kaydi` soru tipi renderer'ı hazır** (SoruEkrani). Diğer tipler (hata_bulma, coktan_secmeli) renderer istiyor.
  - **(a) ÖNERİLEN — yevmiye-only:** 30-50 soru = ~30-50 yevmiye olayı/instance (yeni renderer yok, hızlı beta). Legacy 70 yevmiye sorusu da havuzda (çalışır).
  - **(b) Çok-tip:** ~10-15 olay × türev tipler — `hata_bulma`/`coktan_secmeli` renderer yatırımı → beta'yı geciktirir. **Ertelenir.**
- **Kabul:** ≥30 çözülebilir yevmiye sorusu (V2 + legacy karışık kabul), hepsi kontrol'den geçiyor.

### P5 — Temel ilerleme / zayıf alan ekranları
- **Mevcut:** `kullanici_yetkinlik_durum` + `kullanici_zayif_alan` view'ları (M9) hazır, RLS güvenli. Mevcut puan/streak/rozet ekranları çalışıyor.
- **Kalan:** Profil/ilerleme ekranına **yetkinlik bazlı görünüm** ekle — view'lardan oku (seviye, başarı oranı, zayıf alanlar). Basit tut (liste/bar).
- **Kabul:** Kullanıcı hangi yetkinlikte ne kadar XP/seviye + zayıf alanlarını görüyor.

### P6 — Beta öncesi hata temizliği
- **Kalan:** Uçtan uca QA turu (kayıt → onboarding → soru çöz → XP → profil), çoklu cihaz, edge case'ler (boş cevap, dengesiz giriş, ana hesap girişi → muavin_gerekli), console hata taraması.
- **Kabul:** Kritik akışta bilinen bug yok; yasal sorumluluk gerektiren ödeme **beta'da kapalı** (PAZAR-ANALIZI P0 kuralı).

---

## 3. Ertelenenler (beta-dışı)

| Ertelenen | Neden |
|---|---|
| **M10 Simülasyon Engine** | En büyük iş; beta yevmiye-çözme ile ayakta (tasarım donduruldu) |
| **Olay Stüdyosu** (admin içerik UI) | Seed disiplini beta içeriğini üretir; UI sonra |
| **Geniş admin panel** | Mevcut admin yeter; genişleme lansman sonrası |
| **Büyük legacy migration** | 70 legacy zaten çalışıyor (dual-read); yeniden-yazım kademeli |
| **Mükemmel mevzuat/RAG köprüsü** | `cozum_mevzuat` yapısal bağ yeter; RAG↔madde köprüsü sonra |
| **1000+ soru hedefi** | Beta ~30-50 ile çıkar; ölçek sonra |
| **Çok-tip soru renderer'ları** (hata_bulma/coktan_secmeli) | Beta yevmiye-only; tip çeşitliliği v1.1 |

---

## 4. Beta "Done" tanımı

- [ ] Kayıt → onboarding → soru çözme → XP → profil akışı canlı tarayıcıda çalışıyor
- [ ] ≥10 V2 kürasyon olayı + ≥30 çözülebilir yevmiye sorusu (V2+legacy)
- [ ] Yetkinlik bazlı ilerleme ekranı çalışıyor
- [ ] Doğru/yanlış kontrolü + puan + streak doğru
- [ ] Kritik bug yok, console temiz
- [ ] Ödeme kapalı (yasal), premium-gate içerik görünür-çözüm-kısıtlı hibrit

---

## 5. Kritik yol + sıra

```
1. Dev-server smoke (P1+P2)  ← ŞİMDİ: hiç tarayıcı testi yok, en riskli boşluk
      ↓ (çalışıyor mu?)
2. Katman 2 belge dual-read (P1 tamamlama, belge-merkezli deneyim) — opsiyonel/hızlı
      ↓
3. İçerik üretimi (P3+P4): KUR-002..010, yevmiye soruları  ← en çok emek
      ↓ (paralel)
4. Yetkinlik ekranı (P5)
      ↓
5. QA + hata temizliği (P6)
      ↓
   BETA
```

**En riskli ilk adım:** Dev-server smoke — tüm frontend işi (Katman 1+3) tarayıcıda hiç koşmadı. İçerik üretmeden (P3) önce mevcut tek olayın (KUR-001) gerçekten çözülebildiğini görmek şart; yoksa 10 olay üretip hepsinin kırık olduğunu keşfetme riski.

---

## 6. Riskler

| # | Risk | Önlem |
|---|---|---|
| R1 | Frontend tarayıcıda hiç test edilmedi → gizli runtime bug | İlk iş dev-server smoke (KUR-001) |
| R2 | İçerik üretimi darboğaz (ADR-007) | Şablon + AI taslak; yevmiye-only sadeliği |
| R3 | 30-50 soru yalnız yevmiye tipiyle → çeşitlilik az | Legacy 70 + V2 karışık; çok-tip v1.1 |
| R4 | Belge dual-read atlanırsa V2 soruda belge görünmez | Senaryo metni tutar taşır; Katman 2 hızlı ekle |
| R5 | Yetkinlik ekranı olmadan XP "görünmez" | P5 basit tut (view'lar hazır) |
| R6 | KUR-001'de `olay_muavinleri` boş → dropdown scoped değil | Global fallback çalışır; beta için yeter |

---

## Kapanış

Mimari bitti; beta bir **içerik + doğrulama + görünürlük** işi. En kritik boşluk: **hiçbir frontend değişikliği tarayıcıda koşmadı** — yol haritasının ilk adımı bu (dev-server smoke, KUR-001). Sonra içerik (10 olay / 30-50 yevmiye sorusu), yetkinlik ekranı ve QA. M10/Olay Stüdyosu/büyük migration/1000 soru bilinçle ertelendi. Beta = "çalışan çekirdek döngü + yeterli içerik", mükemmellik değil.

**Sıradaki somut adım:** Dev-server smoke — `npm run dev` ile KUR-001'i tarayıcıda çözüp Katman 1+3'ün gerçekten çalıştığını doğrulamak.
