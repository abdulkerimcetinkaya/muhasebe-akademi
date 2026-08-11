# Araştırma Raporu — Muavin Hesap Sistemi (Türkiye Resmi Düzenleme + Pratik)

**Tarih:** 2026-05-04
**Soru:** TÜRMOB ve Maliye Bakanlığı'nın muavin hesap konusunda resmi açıklaması var mı? TDHP'de muavin formatı, derinliği, zorunluluğu nasıl düzenlenmiş? Sınavlar muavini nasıl ele alıyor?

---

## Özet (TL;DR)

**1. Muavin için bağlayıcı standart YOK.** Maliye Bakanlığı'nın MSUGT'unda (1992) ana hesap planı zorunlu kılınmış ama **muavin formatı/derinliği serbest bırakılmıştır**. "İşletme ihtiyacına göre tanımlanır" denir.

**2. Muavin defter VUK'ta zorunlu değil.** TTK + VUK sadece **3 ana defteri** (yevmiye, envanter, kebir) zorunlu kılar. Muavin defter pratikte tutulur ama yasal mecburiyet yok.

**3. Sınavlar (KPSS, SMMM Stajer) ana hesap üzerinden çözüm bekler.** Muavin sorusu sınavlarda **çıkmaz**. Cevap kağıdında 3 haneli kod (örn. `120 Alıcılar`) yeterli.

**4. Yazılımlar farklı standartlar kullanır:** Logo 3 seviye (`120.01.001`), Mikro 4 seviye, ETA 2 seviye, akademik kullanım tek seviye (`120.01`). **Sektör standardı yok.**

**5. Sonuç ürün için:** Muavin platforma eklemek için yasal zorunluluk yok, eğitim hedefi (KPSS/SMMM) için de gerek yok. Ekleme kararı **ürün diferansiyasyonu** (gerçek hayat hazırlığı) için olur, eğitsel zorunluluk değil.

---

## 1. MSUGT (Muhasebe Sistemi Uygulama Genel Tebliği)

### Yasal çerçeve
- **1 sıra numaralı MSUGT**: Resmi Gazete, **26 Aralık 1992**'de yayımlandı, **1 Ocak 1994** itibariyle tüm işletmeler için zorunlu hale geldi
- **Yetki kaynağı:** Maliye Bakanlığı (şu an Hazine ve Maliye Bakanlığı / Muhasebat Genel Müdürlüğü)
- **2 sıra numaralı MSUGT**: 1. tebliğdeki belirsizlikleri açıklığa kavuşturmak için yayımlandı

### Muavin hakkında ne diyor?

MSUGT ana hesap planı (3 haneli) ve grup başlıklarını **mecburi** kılar. Muavin/yardımcı hesap için:

> "İşletmeler, muhasebe sistemlerini tekdüzen hesap çerçevesi ve hesap planı doğrultusunda kurmak zorundadır. Hesapların çalışması hesap planı açıklamalarında belirtildiği gibi gerçekleşir."

**"Ana-Yardımcı-İkincil"** seviyeli yapı kabul ediliyor ama **format standardı dayatılmıyor**. Tebliğdeki ifade:

> "Açılacak yardımcı hesaplar işletmenin faaliyetlerine, örgüt yapısına, ilerideki ortaya çıkabilecek gelişmelere ve rapor ihtiyaçlarına uygun olmalıdır."

Numaralandırma için tek tavsiye: **aralık bırakma** (örn. 100'den sonra 101 yerine 105).

**Sonuç:** Maliye, muavinin **varlığını** kabul ediyor ama **formatını** işletmeye bırakıyor.

[Kaynak — MSUGT 1. Sıra Tebliği (Resmi Gazete)](https://www.resmigazete.gov.tr/arsiv/21447_1.pdf)
[Kaynak — Muhasebe Sistemi Uygulama Genel Tebliğleri (GİB)](https://www.gib.gov.tr/muhasebe-sistemi-uygulama-genel-tebligleri-0)

---

## 2. VUK / TTK ve Muavin Defter

### Zorunlu defterler (VUK madde 182, TTK madde 64)
1. **Yevmiye defteri** (günlük defter)
2. **Envanter defteri** (yıllık)
3. **Defter-i Kebir** (büyük defter — ana hesap bakiyeleri)

### Muavin defter
- **Yasal zorunluluk YOK**
- Muavin defter, kebir defterinin "alt detayı". Cari hesap takibi (müşteri-tedarikçi-banka-kasa) için pratik gereklilik
- TTK 6102 sonrası dijital tutulabilir (e-defter)

### Pratik gerçek
- Vergi denetiminde muavin defter ibrazı zorunlu **değil** (sadece tasdikli defterler)
- Ama işletmenin kendi yönetimi için olmadan iş yapılamaz (alıcılar/satıcılar bakiye takibi)
- Muhasebe yazılımları (Logo, Mikro, ETA) muavin defterleri otomatik üretir

[Kaynak — VUK 213 (Alomaliye)](https://www.alomaliye.com/2015/01/02/vergi-usul-kanunu-vuk-213-sayili-kanun/)
[Kaynak — Tutulması Zorunlu Defterler (BAKIŞ YMM)](https://www.bakis.com.tr/6102-sayili-turk-ticaret-kanununa-gore-tutulmasi-zorunlu-defterler/)
[Kaynak — Muavin Defter Açıklaması (YMM AHB)](https://ymmahb.com/muavin-defter-nedir/)

---

## 3. Yazılım Standartları (sektör pratiği)

| Yazılım | Format | Seviye | Örnek |
|---|---|---|---|
| **Logo** | Nokta ayrımlı | 3 seviye | `120.01.001` (alıcı → kategori → cari kimlik) |
| **Mikro** | Nokta ayrımlı | 4 seviye | `120.0001.00001.000001` |
| **ETA** | Nokta ayrımlı | 2 seviye | `120.01` |
| **Luca** | Nokta ayrımlı | 3 seviye (esnek) | `120.01.001` |
| **Akademik** | Nokta ayrımlı | 1 seviye | `120.01` veya `120.MRKZ` |

**Sektör standardı yok** — her yazılımın kendi konvansiyonu var. Bir işletme yazılım değiştirdiğinde muavin yapısı yeniden kurulmak zorunda.

[Kaynak — Logo Muhasebe Modülü](https://www.furkanpezek.com.tr/2018/04/logo-muhasebe-modulu/)
[Kaynak — Logo Muavin Defter (resmi docs)](https://docs.logo.com.tr/display/GO3KD/Muavin+Defter)
[Kaynak — Mikro Yazılım Muhasebe](https://www.mikro.com.tr/muhasebe-programi/)

---

## 4. Sınavlar — KPSS ve SMMM Stajer

### Soru formatı
SMMM Staj Başlatma Sınavı (Staja Giriş — SGS) ve KPSS muhasebe soruları:

- **Yevmiye kayıtları, dönem sonu işlemleri, stok değerleme, reeskont, amortisman** — sınavlarda yer alan ana konular
- Cevaplar **3 haneli ana hesap kodu** ile yazılır (örn. `120 Alıcılar 50.000 / 600 Yurtiçi Satışlar 50.000`)
- **Muavin hesap soru tipi sınavlarda çıkmaz** (araştırılan örnek soru havuzlarında muavin gerektiren tek bir kayıt sorusu bulunamadı)

### Niye?
- Sınav, kavramsal anlayışı ölçer (hangi hesap borçlanır/alacaklanır, hangi yöne yazılır)
- Muavin = işletmeye özel detay, sınava girilebilecek standart sorulardan değil
- Muavin sorulsa "MERKEZ TEKSTİL" ile "ABC LİMİTED" cevabı eşit kabul edilir, ayırt edici sorgu olmaz

### Pratik (staj sonrası)
SMMM stajına başlayan aday, ofiste Logo/Mikro önünde otururken muavinle çalışır. Staj sınavını verene kadar gerek yok, sonra zorunlu.

[Kaynak — SMMM Staj Başlatma Sınavı 2026 Rehberi](https://muhasebeustasi.com/smmm-staj-baslatma-sinavi)
[Kaynak — Staja Giriş Sınavı Soru Örnekleri](https://www.muhasebetr.com/stajyerlerkosesi/deneme02/)
[Kaynak — SMMM Staja Giriş Sınav Soruları PDF](https://aktifonline.net/smmm_staja_giris_sinav_sorulari.asp)

---

## 5. Muavin Yapısı — Hangi Hesaplar Pratikte Zorunlu?

| Sınıf / Hesap | Muavin Yaygınlığı | Neden? |
|---|---|---|
| **120 Alıcılar** | %100 zorunlu | Her müşteri ayrı bakiye |
| **320 Satıcılar** | %100 zorunlu | Her tedarikçi ayrı bakiye |
| **100 Kasa** | %95 yaygın | TL / döviz / şube ayrımı |
| **102 Bankalar** | %100 zorunlu | Banka + hesap bazında |
| **153 Ticari Mallar** | %90 yaygın | Mal kategori/marka |
| **254 Taşıtlar** | %100 (birden fazla araç varsa) | Her araç ayrı amortisman |
| **252 Binalar** | %80 yaygın | Bina bazında |
| **121 Alacak Senetleri** | %100 yaygın | Senet bazında |
| **600 Yurtiçi Satışlar** | %50 (mağaza varsa) | Mal grubu / şube |
| **770 Genel Yönetim Gid.** | %70 yaygın | Gider türü (kira/elektrik/personel) |
| **500 Sermaye** | %50 (ortak çoksa) | Ortak bazında |

[Kaynak — 120 Alıcılar Hesabı](https://www.muhasebedersleri.com/hesaplar/120-alicilar.html)
[Kaynak — 320 Satıcılar Hesabı](https://www.muhasebedersleri.com/hesaplar/320-saticilar.html)
[Kaynak — Muhasebe Hesap Kodları (İşbaşı)](https://isbasi.com/blog/muhasebe-hesap-kodlari-nelerdir-ne-ise-yarar)

---

## 6. Önemli Bulgular ve Çıkarımlar

### A. Muavin standardının olmaması bir fırsat
Resmi standart yok demek, MuhasebeLab kendi konvansiyonunu seçebilir. **Akademik kullanım** için tek seviye (`120.01`) en yaygın — sınavlarla uyumlu, anlaşılması basit.

### B. KPSS/SMMM hedefi varsa muavin GEREK YOK
Hedef kullanıcı kitlesi (~600K-800K muhasebe öğrencisi) sınava hazırlanıyor. Sınav muavin sormuyor. Muavin = "iyi hoş ama sınavda işine yaramaz" özellik.

### C. Muavin "Pro Mod" olarak diferansiyasyon olabilir
Ürünün tezi: "Sadece sınav değil, gerçek hayata hazırlar". Muavin modu = bu tezin somut göstergesi. Premium teşviki için işe yarar:
- Free: Ana hesap (sınav modu)
- Premium: Muavin desteği (uygulama modu) — staj başlayanlara hediye

### D. Yazılım standartları farklı, "tek doğru" yok
Logo, Mikro, ETA arasında format tutarsız. Eğer ileride staja başlayan kullanıcılar gelirse "hangi yazılıma göre çalışıyoruz" sorusu çıkacak. **Önerilen:** Tek seviye, nokta ayrımlı, akademik standart (`120.01`) — herhangi bir yazılıma uyarlanabilir.

### E. Cari hesap muavinleri "soru başına özel"
120 Alıcılar / 320 Satıcılar muavinleri her senaryonun kendi karakteri (`MERKEZ TEKSTİL`, `ABC LİMİTED`). Bunları **sistem-tanımlı** yapamazsın — admin her soruda muavinleri tasarlar.

---

## 7. Tasarım için Öneriler (insan kararı için)

Ürün kararı kullanıcıdaysa, araştırma şunu söylüyor:

### Seçenek A — Muavin yok (mevcut)
- Sınav hedefli kullanıcı için yeterli
- Maliye/TÜRMOB zorunlu kılmıyor
- En az iş yükü

### Seçenek B — Tek seviye opsiyonel muavin (önerilen)
- Format: `120.01` — akademik standart
- Cari hesap muavinleri admin tarafından soru bazlı tanımlanır
- Free kullanıcı atlayabilir, Premium "muavin modu" ile zorunlu
- Sınav öncesi kullanıcılar etkilenmez, staj öncesi kullanıcılar değer alır

### Seçenek C — Çok seviyeli (Logo benzeri)
- Format: `120.01.001`
- Sektör simülasyonu daha güçlü
- Karmaşıklık öğretici eşiğini yükseltir
- 213 mevcut sorunun yeniden yazılması büyük iş

---

## 8. Riskler ve Belirsizlikler

- **MSUGT 1992 tarihli, sonraki düzenlemeler:** TFRS uyum tebliğleri (2018-) muavin için ekleme yapmadı. 2026 itibariyle hâlâ MSUGT geçerli. Muhtemelen **2-3 yıl** içinde TFRS Tam Set zorunluluğu gelirse muavin yapısı değişebilir — ama küçük işletmelere etki etmez.

- **TÜRMOB'un resmi muavin standardı arşivde bulunamadı.** ISMMMO ve oda yayınlarında muavin "uygulama bilgisi" olarak geçer, "standart kuralı" yok. TÜRMOB direkt bu konuda tebliğ yayımlamıyor.

- **Logo/Mikro/ETA arasındaki farkın tam karşılaştırması** (kaç hane, nokta sayısı vs) için tek bir karşılaştırmalı kaynak bulunamadı. Yukarıdaki tablo dağınık kaynaklardan derlendi, %5-10 hata payı olabilir.

---

## Sonuç

**Muavin hesap için bağlayıcı bir resmi standart yok.** TÜRMOB ve Maliye Bakanlığı muavinin **varlığını** kabul ediyor, **formatını** işletmeye bırakıyor. Sınavlar muavin sormuyor. Yazılımlar arasında konsensus yok.

Bu MuhasebeLab için **özgürlük**: kendi convention'ınızı seçebilirsiniz. Akademik standart (`120.01`, tek seviye) en uyumlu ve en anlaşılır seçenek. Muavin'i ürünün **eğitsel zorunluluğu** olarak değil, **diferansiyasyon özelliği** (Premium / Pro Mod) olarak konumlandırmak araştırmanın işaret ettiği yön.

Karar — kullanıcının. Sıradaki adım: tasarım kararı (`/sc:design`) veya direkt implementasyon (`/sc:implement`).

---

**Kaynaklar (toplu):**
- [MSUGT 1. Sıra (Resmi Gazete)](https://www.resmigazete.gov.tr/arsiv/21447_1.pdf)
- [Muhasebe Sistemi Uygulama Genel Tebliğleri (GİB)](https://www.gib.gov.tr/muhasebe-sistemi-uygulama-genel-tebligleri-0)
- [VUK 213 Sayılı Kanun (Alomaliye)](https://www.alomaliye.com/2015/01/02/vergi-usul-kanunu-vuk-213-sayili-kanun/)
- [Tutulması Zorunlu Defterler (BAKIŞ YMM)](https://www.bakis.com.tr/6102-sayili-turk-ticaret-kanununa-gore-tutulmasi-zorunlu-defterler/)
- [Muavin Defter Açıklaması (YMM AHB)](https://ymmahb.com/muavin-defter-nedir/)
- [Logo Muavin Defter Docs](https://docs.logo.com.tr/display/GO3KD/Muavin+Defter)
- [Mikro Yazılım Muhasebe](https://www.mikro.com.tr/muhasebe-programi/)
- [120 Alıcılar Hesabı](https://www.muhasebedersleri.com/hesaplar/120-alicilar.html)
- [320 Satıcılar Hesabı](https://www.muhasebedersleri.com/hesaplar/320-saticilar.html)
- [SMMM Staj Başlatma Sınavı Rehberi](https://muhasebeustasi.com/smmm-staj-baslatma-sinavi)
- [Staja Giriş Sınavı Soru Örnekleri](https://www.muhasebetr.com/stajyerlerkosesi/deneme02/)
- [Tek Düzen Hesap Planı (İSMMMO PDF)](https://ismmmo.org.tr/dosya/415/Mevzuat-Dosya/tekduzhesapplani.pdf)
- [Muhasebe Hesap Kodları (İşbaşı)](https://isbasi.com/blog/muhasebe-hesap-kodlari-nelerdir-ne-ise-yarar)
