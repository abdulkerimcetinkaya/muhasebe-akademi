# Muhasebe Akademisi v2 — Software Design Document (SDD)

**Sürüm:** 1.0 · **Tarih:** 6 Temmuz 2026 · **Durum:** Taslak — onay bekliyor
**Kapsam:** Ürün mimarisi. Kod geliştirme bu doküman onaylanmadan başlamaz.

---

## İçindekiler

1. [Product Vision](#1-product-vision)
2. [Product Philosophy](#2-product-philosophy)
3. [Instructional Design — Öğretim Modeli](#3-instructional-design)
4. [Learning Architecture](#4-learning-architecture)
5. [Domain Architecture](#5-domain-architecture)
6. [Database Philosophy](#6-database-philosophy)
7. [Question Engine](#7-question-engine)
8. [Learning Engine](#8-learning-engine)
9. [Content Engine](#9-content-engine)
10. [ERP Simulation Engine](#10-erp-simulation-engine)
11. [Mevzuat Engine](#11-mevzuat-engine)
12. [Admin CMS Architecture](#12-admin-cms-architecture)
13. [User Journey](#13-user-journey)
14. [AI Ready Architecture](#14-ai-ready-architecture)
15. [Sprint Roadmap](#15-sprint-roadmap)
16. [Gelecek Modüller](#16-gelecek-modüller)

---

## 1. Product Vision

### 1.1 Tek cümlelik vizyon

> **Muhasebe Akademisi, öğrencinin eline belge tutuşturan ve "muhasebeci gibi düşün" diyen ilk Türkçe platform.**

Dört dünyanın kesişimi:

| Kaynak | Alınan | Alınmayan |
|---|---|---|
| **LeetCode** | Problem havuzu, anında kontrol, zorluk kademesi, "çöz-öğren" döngüsü | Yarışma odaklılık, soğuk arayüz |
| **Duolingo** | Streak, XP, seviye, yetkinlik ağacı, zayıf alan tekrarı | Çocuksu oyunlaştırma |
| **ERP (Logo/Mikro/Luca)** | Cari kart, muavin hesap, belge→kayıt akışı, mizan | Karmaşık kurulum, dönem yükü |
| **Mevzuat (GİB/mevzuat.gov.tr)** | Her çözümün dayanağı, güncellik | Madde ezberciliği |

### 1.2 Ne DEĞİL

- **Video kursu değil.** Platform belge merkezlidir; video hiçbir sürümde çekirdek format olmayacak.
- **Test bankası değil.** Çoktan seçmeli, tek soru tipi motorunun 7 çıktısından yalnız biridir.
- **Gerçek muhasebe yazılımı değil.** ERP *mantığı* öğretilir; e-fatura entegrasyonu, resmî defter basımı kapsam dışıdır.

### 1.3 Konumlanma (PAZAR-ANALIZI.md ile uyumlu)

Hedef kitle önceliği: üniversite İşletme/Muhasebe öğrencileri → SMMM staja başlama adayları → meslek lisesi. Dağıtım kanalı v1.1'de öğretmen paneliyle güçlenir; v2 mimarisi sınıf/kurum tier'ını baştan engellemeyecek şekilde tasarlanır (bkz. §16).

### 1.4 Başarı ölçütleri

| Ölçüt | v1 (bugün) | v2 hedefi |
|---|---|---|
| İçerik birimi | 1 soru = 1 kullanım | 1 muhasebe olayı ≥ 3 soru tipi |
| Kayıt derinliği | Ana hesap (muavin soru-bazlı jsonb) | Muavin zorunlu, cari bağlı |
| Öğrenme çıktısı | "Soruyu çözdü" | "Yetkinliği X seviyesine getirdi" |
| Mevzuat | RAG chunk (AI asistan içi) | Her çözümde tıklanabilir madde referansı |
| Uygulama | Tekil soru | 1 yıllık işletme simülasyonu |

---

## 2. Product Philosophy

### 2.1 Belge merkezlilik

Muhasebede her kayıt bir belgeye dayanır (VUK md. 229 vd.). Eğitim de öyle olmalıdır.

**Karar:** Her içeriğin giriş noktası bir belgedir — senaryo metni belgeyi *bağlama oturtur*, belge veriyi *taşır*.
**Neden:** Mevcut kodda bu felsefe zaten filizlenmiş durumda: `src/types/index.ts`'teki `Belge` discriminated union'ı (fatura, perakende fişi, çek, senet, dekont) ETTN, tevkifat payı, valör gibi gerçek e-belge alanlarını taşıyor. v2 bu birikimi jsonb'dan birinci sınıf domain nesnesine terfi ettirir; sıfırdan icat etmez.

### 2.2 Öğrenme zinciri — ürünün omurgası

```
Belge → Muhasebe Olayı → Kullanıcının Analizi → Muhasebe Kaydı
     → Kontrol → Muhasebe Mantığı → Mevzuat → Benzer Senaryolar
```

Bu zincir bir UI akışı değil, **veri modelinin kendisidir**. Her halka bir domain nesnesine karşılık gelir:

| Zincir halkası | Domain nesnesi | Durum |
|---|---|---|
| Belge | `belgeler` | jsonb'dan tabloya terfi (v2) |
| Muhasebe olayı | `muhasebe_olaylari` | **yeni — v2'nin çekirdek aggregate'i** |
| Kullanıcının analizi | Soru instance'ı + kullanıcı cevabı | `sorular` evrimleşir |
| Muhasebe kaydı | `cozum_satirlari` / `yevmiye_satirlari` | v2 |
| Kontrol | Question Engine validator'ları | `kontrol.ts` çekirdeği mevcut |
| Muhasebe mantığı | `cozumler.aciklama` + hata kuralları | mevcut, yapılandırılır |
| Mevzuat | `mevzuat_maddeleri` + `cozum_mevzuat` | yeni yapısal katman |
| Benzer senaryolar | Yetkinlik + etiket grafı üzerinden öneri | Learning Engine |

### 2.3 İçerik merkezlilik (soru merkezliliğin sonu)

**Karar:** İçeriğin atomu "soru" değil, "muhasebe olayı"dır. Soru, bir olayın belirli bir soru tipiyle *render edilmiş* halidir.
**Neden:** Bugün 1 senaryo = 1 soru = 1 çözüm. Aynı veresiye satış faturasından hem yevmiye sorusu hem belge analizi hem hata bulma üretmek için senaryoyu üç kez yazmak gerekiyor. İçerik üretimi platformun en pahalı işi (213 soru elle/AI ile üretildi, sonra tamamı arşivlenip yeniden yazıldı — bu maliyet bir daha ödenmemeli). Olay bir kez kurulur, soru tipleri ondan türetilir.

### 2.4 Veriye dayalı sistem, hard-code yok

**Karar:** Soru tipleri, yetkinlikler, hata kuralları, belge tipleri, işletme şablonları — hepsi veri. Kodda yalnız *motorlar* (renderer, validator, öneri) yaşar.
**Neden:** Projenin migration tarihi bunun ders kitabı: muavin stratejisi üç kez şekil değiştirdi (global tablo → kaldırıldı → soru-bazlı jsonb), ünite yapısı iki kez yeniden kuruldu (11→15→modül/atölye). Kural koda gömüldükçe her ürün kararı migration + kod değişikliği istiyor. v2'de ürün kararı = veri değişikliği olmalı.

### 2.5 Scaffolding — desteği kademeli çek

**Karar:** Başlangıç seviyesinde her şey hazır verilir (muavin listesi, cari kartlar, ipucu); seviye ilerledikçe destek çekilir (ipucu yok → muavin listesi yok → kullanıcı kendi cari kartını/muavinini açar).
**Neden:** Gerçek muhasebecinin işi budur: stajyer hazır hesap planıyla başlar, kıdemlendikçe hesap açar. Mevcut muavin stratejisi hafızadaki kararla uyumlu (kolay: yok / orta: hazır liste / zor: açık uçlu) — v2 bunu soru bazından *kullanıcı seviyesi* bazına genişletir.

---

## 3. Instructional Design

### 3.1 Pedagojik model: "Yaparak düşünme"

Platform bilgiyi üç halkada verir; hepsi mevcut yapının evrimidir:

1. **Bilgi (minimal teori)** — Modül/alt başlık `icerik` alanları (BlockNote, mevcut). Kural: teori bir ekrandan uzun olamaz; uzuyorsa senaryoya bölünmelidir.
2. **Uygulama (çekirdek)** — Belge önce gelir. Öğrenci belgeyi okur, olayı *kendisi* teşhis eder ("bu bir veresiye satış"), kaydı yazar.
3. **Pekiştirme** — Kontrol sonrası: muhasebe mantığı açıklaması → mevzuat dayanağı → benzer senaryo önerisi.

**Karar:** Teori-önce değil, belge-önce.
**Neden:** "Sistem hesap öğretmeyecek, muhasebeci gibi düşünmeyi öğretecek." Hesap ezberi (120 = Alıcılar) yan üründür; asıl beceri belgeden olaya, olaydan kayda giden çıkarımdır. Bu çıkarım ancak belgeyle karşılaşarak öğrenilir.

### 3.2 Geri bildirim anatomisi (kontrol halkası)

Mevcut `kontrol.ts` zaten 8 hata tipi ayırt ediyor (`taraf_ters`, `tutar_yanlis`, `muavin_gerekli`, `fazla`, `kod_gecersiz`…) ve deterministik, ücretsiz geri bildirim veriyor. v2 bunu üç katmana oturtur:

| Katman | Kaynak | Maliyet | Örnek |
|---|---|---|---|
| 1. Deterministik satır analizi | `kontrol.ts` motoru (mevcut) | Ücretsiz | "191 borç tarafına yazılmalı, sen alacak yazmışsın" |
| 2. Olaya özel hata kuralları | `cozumler.hata_kurallari` (veri) | Ücretsiz | "Satışta *hesaplanan* KDV kullanılır; 191 alışa aittir" |
| 3. AI yanlış analizi | `ai-yanlis-analizi` Edge Function (mevcut) | Kotalı/Premium | Serbest dille kavramsal açıklama |

**Karar:** Katman 2 yeni ve veri-tabanlıdır; içerik üreticisi "en sık yapılan yanlış"ı olaya iliştirir.
**Neden:** En değerli geri bildirim, o olaya özgü kavram yanılgısını yakalayandır. Bunu AI'a bırakmak pahalı ve tutarsız; koda gömmek ölçeklenmez. Veri olarak olayın yanında durmalı.

### 3.3 Zorluk mimarisi

İki eksen ayrışır (mevcut yapı korunur):

- **Modül seviyesi** (`baslangic/orta/ileri/sinav`) — müfredat ilerleyişi
- **Soru zorluğu** (`kolay/orta/zor`) — puanlama (5/10/20)

v2 üçüncü ekseni ekler: **destek seviyesi** (scaffold). Aynı olay, farklı destek seviyeleriyle farklı zorlukta sorulara dönüşür — içerik çoğaltmadan zorluk üretilir.

### 3.4 Tekrar ve kalıcılık

- **Yanlış tekrarı** — mevcut `oneriler.ts` ("tekrar et") korunur, yetkinlik bazlısına evrilir: "KDV mahsuplaşmada 3 yanlışın var → şu 2 benzer olay"
- **Aralıklı tekrar (spaced repetition)** — v2.1'de yetkinlik bazlı kuyruk: çözülen olay, yetkinlik başarı oranına göre 3–7–21 gün sonra farklı soru tipiyle geri gelir. *Aynı olay, farklı tip* — içerik merkezliliğin pedagojik karşılığı: ezber değil transfer ölçülür.
- **Karma vakalar** — mevcut `karma` alt başlıklar korunur; simülasyon bunların doğal devamıdır.

---

## 4. Learning Architecture

### 4.1 Dört platform katmanı

```
┌────────────────────────────────────────────────────────────┐
│ 4. SİMÜLASYON  — işletme evreninde kronolojik dönem        │  v2.1
│    "Bir yıl boyunca Yıldız Ticaret'in muhasebecisisin"     │
├────────────────────────────────────────────────────────────┤
│ 3. UYGULAMA    — atölyeler, patron vakaları, soru tipleri  │  mevcut→v2
│    Modül → Alt başlık → Sorular (Question Engine)          │
├────────────────────────────────────────────────────────────┤
│ 2. BİLGİ       — konu anlatımları, sözlük, hesap planı     │  mevcut
│    BlockNote içerik + sozluk + hesap_plani hiyerarşisi     │
├────────────────────────────────────────────────────────────┤
│ 1. MEVZUAT     — madde referansları, RAG, güncellik        │  v2
│    Her çözümün altında; ayrıca SEO sayfaları (P1 #10)      │
└────────────────────────────────────────────────────────────┘
```

**Karar:** Katmanlar ayrı ürünler değil, aynı içerik çekirdeğinin (muhasebe olayı) farklı sunum yüzeyleridir.
**Neden:** "Bilgi + uygulama + simülasyon + mevzuat platformu" dört ayrı içerik havuzu demek değildir; dört havuz üretim maliyetini dörde katlar. Tek olay havuzu, dört yüzey.

### 4.2 Yetkinlik grafı — öğrenmenin koordinat sistemi

Üniteler *navigasyon* eksenidir (nerede çalışıyorum); yetkinlikler *ölçüm* eksenidir (neyi ne kadar biliyorum). Bir "KDV tevkifatı" olayı Mal Alış ünitesinde de Personel ünitesinde de yaşayabilir — yetkinliği aynıdır.

```
muhasebe-temeli
├── cari-hesap ── muavin-hesap
├── kdv ── kdv-mahsup ── kdv-iade
│      └── tevkifat
├── stok ── envanter-yontemleri
├── bordro
├── duran-varlik ── amortisman
├── dis-ticaret ── ihracat / ithalat
└── donem-sonu ── reeskont / karsilik / kapanis
```

**Karar:** Yetkinlikler hiyerarşik (self-FK) ve olaylara ağırlıklı M2M ile bağlı.
**Neden:** Zayıf alan tespiti ("KDV iade zayıf") ve önkoşul mantığı ("tevkifata girmeden KDV mahsubu otur") ancak grafla mümkün. Duolingo'nun skill tree'sinin muhasebe karşılığı budur.

### 4.3 İlerleme modeli

| Sinyal | Kaynak | Kullanım |
|---|---|---|
| XP (yetkinlik başına) | Çözüm → olay yetkinlik ağırlıkları | Seviye, zayıf alan |
| Streak | mevcut `aktivite` | Günlük alışkanlık |
| Rozet | mevcut `rozetler_katalog` | Kilometre taşları |
| Yetkinlik seviyesi | XP eşik fonksiyonu (türetilir, saklanmaz) | Scaffold seviyesi, öneri |
| Puan/liderlik | mevcut sistem korunur | Sosyal motivasyon |

**Karar:** Kullanıcı seviyesi scaffold'u belirler: yetkinlik seviyesi arttıkça aynı olaylar daha az destekle gelir.
**Neden:** "Başlangıçta hazır muavin, ileri seviyede kendi cari kartını açar" ürün kararının motorlaşmış hali. Seviye sadece rozet değil, deneyimi fiilen değiştiren bir parametre olmalı.

---

## 5. Domain Architecture

### 5.1 Bounded context haritası (DDD)

```
┌───────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   KATALOG     │   │     İÇERİK        │   │    ÖĞRENME       │
│ (paylaşılan   │◄──│ muhasebe_olaylari │──►│ sorular(instance)│
│  çekirdek)    │   │ belgeler          │   │ ilerleme         │
│ hesap_plani   │   │ cozumler+satirlar │   │ kullanici_yetkin.│
│ yetkinlikler  │   │ cari_kartlar      │   │ rozetler, streak │
│ etiketler     │   │ muavin_hesaplar   │   │ oneriler         │
│ mevzuat_*     │   │ (evren: global)   │   └──────────────────┘
└───────────────┘   └──────────────────┘   ┌──────────────────┐
        ▲                    │              │   SİMÜLASYON     │
        │                    ▼              │ isletmeler       │
┌───────────────┐   ┌──────────────────┐   │ simulasyon_adim. │
│  KULLANICI    │   │   ADMIN / CMS    │   │ yevmiye_kayitlari│
│ auth, premium │   │ içerik stüdyosu  │   │ defter/mizan VIEW│
│ odemeler      │   │ moderasyon       │   │ (evren: işletme) │
│ bildirimler   │   │ katkıcı sistemi  │   └──────────────────┘
└───────────────┘   └──────────────────┘
```

**Karar:** Beş bağlam: Katalog (değişmez referans), İçerik (üretilen ders malzemesi), Öğrenme (kullanıcı-olay etkileşimi), Simülasyon (işletme evreni), Kullanıcı (kimlik/ticaret). Admin hepsine yazan yüzeydir, ayrı domain değildir.
**Neden:** Sınırlar RLS politikalarıyla birebir örtüşür (katalog = public read; öğrenme/simülasyon = own-data; içerik = admin write). DDD sınırı ile güvenlik sınırının çakışması Supabase mimarisinde bedava dayanıklılık demektir.

### 5.2 Ubiquitous language (ortak dil sözlüğü)

| Terim | Tanım | Tablo |
|---|---|---|
| **Muhasebe Olayı** | Belge + senaryo + çözüm + mevzuat + yetkinlik paketinden oluşan içerik atomu | `muhasebe_olaylari` |
| **Soru** | Bir olayın belirli bir *soru tipiyle* somutlaşmış instance'ı | `sorular` (evrim) |
| **Belge** | Olayı kanıtlayan tekil evrak (fatura, dekont…) | `belgeler` |
| **Cari Kart** | İşlem yapılan gerçek/tüzel kişi | `cari_kartlar` |
| **Muavin** | Ana hesabın altındaki yardımcı hesap; kayıt bu düzeyde yapılır | `muavin_hesaplar` |
| **İşletme (Evren)** | Cari, muavin, belge ve defterin ait olduğu bağlam; `null` = global havuz | `isletmeler` |
| **Yetkinlik** | Ölçülen muhasebe becerisi | `yetkinlikler` |
| **Atölye** | Alt başlık altında sıralı soru dizisi (mevcut) | `atolye_sorulari` |
| **Simülasyon** | Bir işletmenin kronolojik dönem akışı | `simulasyonlar` |

**Neden bu sözlük:** v1'de "soru", "senaryo", "atölye sorusu", "vaka" terimleri kod ve UI'da iç içe geçti. v2'de her terimin tek anlamı ve tek tablosu var; kod, doküman ve admin UI bu adları kullanır.

### 5.3 Çekirdek aggregate: MuhasebeOlayi

```
muhasebe_olaylari (aggregate root)
├── senaryo metni, başlık, islem_tarihi, durum (taslak→onaylı)
├── olay_belgeleri    ──► belgeler (1..N)
├── olay_yetkinlikleri──► yetkinlikler (ağırlıklı M2M)
├── olay_etiketleri   ──► etiketler
├── olay_muavinleri   ──► muavin_hesaplar (dropdown evreni)
├── cozumler (1..N varyant)
│   ├── cozum_satirlari ──► muavin_hesaplar ──► hesap_plani
│   ├── beyanname_etkileri (jsonb, MVP)
│   ├── hata_kurallari (jsonb, MVP)
│   └── cozum_mevzuat ──► mevzuat_maddeleri
└── sorular (türetilen instance'lar; tip: yevmiye/analiz/hata-bulma/…)
```

**Karar:** `sorular` tablosu silinmez; `olay_id` FK + `tip` kolonu alır ve instance tablosuna dönüşür.
**Neden:** `ilerleme`, `atolye_sorulari`, katkıcı sistemi, admin paneli, liderlik RPC'leri — hepsi `sorular.id`'ye bağlı. Yeni tablo açmak tüm bu bağları koparır; kolon eklemek hiçbirini bozmaz. Geçiş döneminde `olay_id=null` olan eski sorular çalışmaya devam eder.

### 5.4 Tam tablo kataloğu

Alan düzeyinde şema bir önceki tasarım turunda çıkarıldı ve bu SDD'nin eki sayılır (bkz. konuşma kaydı / gelecek `V2-VERI-MODELI.md`). Özet:

- **Katalog:** `hesap_plani`(+normal_bakiye, muavin_zorunlu, cari_gerektirir), `yetkinlikler`, `etiketler`, `mevzuat_kaynaklar`, `mevzuat_maddeleri`, `soru_tipleri`
- **İçerik:** `muhasebe_olaylari`, `belgeler`, `cari_kartlar`, `muavin_hesaplar`(uuid PK + cari_id + isletme_id), `cozumler`, `cozum_satirlari`, M2M'ler (`olay_belgeleri`, `olay_yetkinlikleri`, `olay_etiketleri`, `olay_muavinleri`, `cozum_mevzuat`)
- **Öğrenme:** `sorular`(+olay_id, +tip), `ilerleme`(korunur), `kullanici_yetkinlikleri`
- **Simülasyon:** `isletmeler`, `simulasyonlar`, `simulasyon_adimlari`, `kullanici_simulasyonlari`, `yevmiye_kayitlari`, `yevmiye_satirlari`, `buyuk_defter`/`mizan` (VIEW)

---

## 6. Database Philosophy

### 6.1 İlkeler

1. **Türetilen veri saklanmaz.** Büyük defter, mizan, seviye, zayıf alanlar, toplam XP — hepsi view/sorgu. Kaydedilen tek gerçek: yevmiye satırları ve olay çözümleri.
   *Neden:* Senkronizasyon hatası sınıfını yok eder; gerçek muhasebe de böyle çalışır (defter, yevmiyenin dökümüdür).

2. **jsonb sınırı: gösterim verisi jsonb, ilişkisel veri tablo.** Belge kalemleri, bordro detayı, beyanname etkisi → jsonb (üzerinden sorgu/JOIN yapılmaz). Cari, muavin, yetkinlik, mevzuat bağı → tablo+FK (bütünlük ve sorgu gerekir).
   *Neden:* v1'in dersi iki yönlü: `sorular.belgeler` jsonb'ı hızlı geliştirme sağladı ama belge yeniden kullanımını imkânsız kıldı; `cozumler.kod`'un FK'sız text'e düşmesi ise veri bütünlüğünü uygulama katmanına terk etti. İkisi de aşırılık.

3. **Additive-first migration.** Her migration önce ekler; drop ancak dual-read dönemi kapanınca ayrı migration'la gelir. Kırıcı adım tek: `cozumler` yeniden yapılanması.

4. **RLS = domain sınırı.** Üç politika şablonu: katalog (public read + admin all), kullanıcı verisi (own-data), içerik (public read *onaylı* + admin all). Yeni tablo bu üçünden birine girmek zorundadır.

5. **Türkçe adlandırma sürer.** Mevcut şemayla tutarlılık, tek dil.

6. **Veri-tabanlı konfigürasyon.** `soru_tipleri`, yetkinlik ağacı, işletme şablonları tabloda yaşar; yeni tip eklemek deploy değil satır eklemektir (renderer'ı hazırsa).

### 6.2 Evren (scope) deseni

`cari_kartlar`, `muavin_hesaplar`, `belgeler` üçlüsünde `isletme_id nullable`:
- `null` → global soru havuzu evreni (bugünkü davranış)
- dolu → o işletme simülasyonunun özel evreni

**Neden:** Tek şema iki dünyaya hizmet eder; simülasyon için paralel tablo seti açılmaz. `unique(isletme_id, kod)` sayesinde her işletmenin kendi "100.01 Merkez Kasa"sı olur.

### 6.3 Kritik geçiş kararları

| Karar | Neden |
|---|---|
| `muavin_hesaplar` PK'sı `kod`→`uuid` **şimdi** değişir | Tablo şu an boş (20260518000008 ile temizlendi) — PK değişiminin maliyeti sıfırken yapılır |
| `muavin_hesaplar.tip` kaldırılır | TDHP grubu `ana_kod`'dan türetilir; kolon üç kez semantik değiştirdi, çelişki kaynağı |
| `sorular.muavinler`/`belgeler` jsonb'ları dual-read ile taşınır | `kontrol.ts`, `HesapKoduInput`, admin formları bu alanlara bağlı; big-bang kırılım yasak |
| `ilerleme` korunur, `yevmiye_kayitlari` ondan ayrıdır | `ilerleme` = istatistik logu (hafif), yevmiye = satır düzeyi defter (simülasyonda zorunlu). Aynı tabloda birleştirmek soru çözümünü ağırlaştırır |

---

## 7. Question Engine

### 7.1 Mimari: tip = veri, motor = kod

```
muhasebe_olaylari ──► sorular (olay_id, tip, scaffold, config jsonb)
                            │
                   ┌────────┴────────┐
                   ▼                 ▼
              RENDERER          VALIDATOR
           (tip'e göre UI)   (tip'e göre kontrol)
           kayıt yüzeyi      deterministik sonuç
```

`soru_tipleri` katalog tablosu: `id`, `ad`, `aciklama`, `gerekli_bilesenler` (olayın hangi parçalarını ister: belge? çözüm? mizan?), `aktif`, `min_seviye`.

**Karar:** Her soru tipi bir (renderer, validator) çifti olarak kayıtlı plugin'dir; frontend'de `Record<SoruTipi, {Renderer, validator}>` registry.
**Neden:** 7 tip için 7 sayfa yazmak yerine tek `SoruEkrani` iskeletine (senaryo paneli + belge paneli + cevap yüzeyi + kontrol + pekiştirme) tip bazlı yüzey takılır. Yeni tip = yeni plugin + katalog satırı; mevcut ekranlara dokunulmaz.

### 7.2 Soru tipi kataloğu

| Tip | Cevap yüzeyi | Validator stratejisi | Faz |
|---|---|---|---|
| `yevmiye` | Borç/alacak satır tablosu (mevcut) | `kontrol.ts` — **zaten yazılmış, v2'de muavin_id'ye bağlanır** | v2.0 |
| `hata_bulma` | Hatalı hazır kayıt + satır işaretleme | Doğru çözümle diff; hata satırı = beklenen fark | v2.0 |
| `coktan_secmeli` | 4 seçenek | Anahtar karşılaştırma; çeldiriciler `hata_kurallari`ndan türetilir | v2.0 |
| `belge_analizi` | Belge üstünde alan soruları (matrah? KDV? taraf?) | Belge alanlarıyla eşleştirme — cevap anahtarı belgenin kendisi | v2.1 |
| `mizan_analizi` | Mini mizan + soru | Olay(lar)ın çözüm satırlarından türetilen mizanla karşılaştırma | v2.1 |
| `beyanname` | KDV beyannamesi satır doldurma | `beyanname_etkileri` toplamıyla karşılaştırma | v2.2 |
| `erp_uygulama` | Simülasyon içinde serbest kayıt (cari/muavin açma dahil) | Yevmiye validator + evren bütünlük kontrolleri | v2.2 |

**Karar:** İlk üç tip v2.0'da; hepsi *mevcut çözüm verisinden* otomatik türetilebilenlerdir.
**Neden:** `hata_bulma` = doğru çözümün bilinçli bozulmuş hali (hata_kurallari'ndan bozma reçetesi), `coktan_secmeli` = çözümün satırlarından soru + çeldiriciler. İçerik üreticisine sıfır ek maliyet — içerik merkezliliğin ilk somut getirisi.

### 7.3 Cevap anahtarının tek kaynağı

Tüm validator'lar `cozum_satirlari`'ndan beslenir. Belge analizi belgeden, mizan analizi çözümlerden türetir — hiçbir tip kendi ayrı cevap anahtarını saklamaz.
**Neden:** Çözüm değişirse (hata düzeltme) tüm türetilmiş sorular otomatik güncel kalır. v1'de bir tutar düzeltmesi tek soruyu düzeltirdi; v2'de olayın tüm türevlerini düzeltir.

---

## 8. Learning Engine

### 8.1 Sorumluluklar

1. **XP dağıtımı** — doğru çözümde `ZORLUK_PUAN × olay_yetkinlikleri.agirlik` → `kullanici_yetkinlikleri`
2. **Seviye** — XP eşik fonksiyonu (türetilir): yetkinlik başına Çırak → Kalfa → Usta → Uzman
3. **Zayıf alan tespiti** — başarı oranı + recency ağırlıklı skor (view)
4. **Öneri motoru** — mevcut `oneriler.ts` üç sinyalle beslenir: devam (yarım atölye), tekrar (zayıf yetkinlik + benzer olaylar), keşif (önkoşulu tamam yeni yetkinlik)
5. **Scaffold seviyesi** — yetkinlik seviyesi → soru instance'ının destek düzeyi

### 8.2 "Benzer senaryolar" — zincirin son halkası

Çözüm sonrası ekranda: aynı yetkinlikleri paylaşan, kullanıcının görmediği 2–3 olay. Sorgu: `olay_yetkinlikleri` kesişimi, etiket benzerliği, zorluk komşuluğu.
**Karar:** MVP'de deterministik sorgu; embedding tabanlı benzerlik v2.2+ (RAG altyapısı zaten var, gerekirse olay metinleri de embed edilir).
**Neden:** Yetkinlik grafı doğru kurulursa SQL benzerliği yeterince iyidir; embedding maliyeti kanıtlanmış ihtiyaca saklanır.

### 8.3 Mevcut sistemle bütünleşme

Puan, streak, rozet, aktivite ısı haritası, liderlik — hepsi korunur. `kullanici_yetkinlikleri` bunların *yanına* gelir, yerine değil. Rozet sistemi yetkinlik rozetleriyle genişler ("KDV Ustası").
**Neden:** Çalışan motivasyon katmanını sökmek risk, üstüne katman eklemek kazançtır.

---

## 9. Content Engine

### 9.1 İçerik üretim hattı

```
1. OLAY KURULUMU (admin/AI/katkıcı)
   senaryo + cari kart seç/oluştur + muavin bağla + belge üret
   + çözüm satırları + mevzuat referansı + yetkinlik ağırlıkları
   + hata kuralları + beyanname etkisi
        ▼
2. SORU TÜRETME (motor + insan onayı)
   yevmiye otomatik · hata_bulma yarı-otomatik · coktan_secmeli yarı-otomatik
        ▼
3. MODERASYON (mevcut akış: taslak → inceleme → onaylı → arşiv)
        ▼
4. YERLEŞTİRME — atolye_sorulari ile atölyelere, simulasyon_adimlari ile dönem akışına
```

**Karar:** Olay kurulumunun ağırlaşan maliyeti (cari+belge+muavin+mevzuat) iki araçla dengelenir: (a) AI destekli taslak üretimi (`ai-belge-uret` mevcut; `soru-uret.md` promptu olay şemasına evrilir), (b) **şablon kütüphanesi** — "veresiye satış" şablonu cari/tutar/tarih parametreleriyle çoğaltılır.
**Neden:** İçerik üretim hızı v1'in ana temposuydu (haftada onlarca soru). v2 yapısı soru başına maliyeti düşürür (1 olay → 3+ soru) ama olay başına maliyeti artırır; şablon + AI olmadan bu net kayıp olur. Bu, v2'nin en büyük ürünsel riskidir ve Content Engine bu riskin cevabıdır.

### 9.2 Yeniden kullanılabilirlik matrisi

| Varlık | Yeniden kullanım |
|---|---|
| Cari kart | N olay + N belge ("ABC A.Ş." platformun tanıdık müşterisi olur — mevcut "Yıldız Ticaret" işletme adı kararının genelleşmesi) |
| Belge | N soru (aynı fatura: kayıt + analiz + KDV sorusu) |
| Olay | N soru tipi × N scaffold seviyesi |
| Olay dizisi | Atölye ↔ simülasyon adımları (aynı olaylar iki bağlamda) |
| Mevzuat maddesi | N çözüm referansı + SEO sayfası |

### 9.3 Katkıcı sistemi

Mevcut katkıcı akışı (başvuru + 5 onayda Premium + YMM zorunlu alanları) olay üretimine taşınır. Katkıcı tam olay kurmaz; **şablondan olay örnekler** (parametreleri doldurur), moderasyon onaylar.
**Neden:** Tam olay kurulumu uzmanlık ister; şablon doldurmak istemez. Katkı hunisi genişler, kalite moderasyonda korunur.

---

## 10. ERP Simulation Engine

### 10.1 Kavram

> "Yıldız Ticaret A.Ş.'nin muhasebecisisin. Ocak'ta işe başladın. Belgeler masana geliyor."

Kullanıcı bir işletmenin dönemini kronolojik yaşar: her adım tarihli bir muhasebe olayı; kaydettiği her yevmiye kalıcı defterine işlenir; mizan her an canlıdır; dönem sonunda kapanış yapılır.

### 10.2 Beş işletme şablonu

| İşletme | Öne çıkan yetkinlikler | Faz |
|---|---|---|
| Ticaret | Alış-satış, KDV, cari, envanter | v2.1 (ilk) |
| Hizmet | SMM makbuzu, stopaj, tahakkuk | v2.2 |
| Üretim | 7/A maliyet, mamul akışı | v2.3 |
| E-ticaret | POS/sanal pos, kargo, iade, platform komisyonu | v2.3 |
| İhracat | KDV istisnası, kur farkı, KDV iade | v2.3 |

**Karar:** Tek işletmeyle (ticaret) çıkılır; motor beşine göre tasarlanır (işletme tipi = `isletmeler.tip` verisi, kod değil).
**Neden:** Ticaret işletmesi mevcut içerik havuzunun (Mal Hareketleri modülleri) doğal devamı — içerik hazır. Diğerleri yetkinlik içerikleri (bordro, üretim, ihracat) üretildikçe açılır.

### 10.3 Motor bileşenleri

1. **Evren yöneticisi** — işletmenin cari/muavin/kasa/banka seti (`isletme_id` scope). Başlangıç seti şablondan kopyalanır; ileri seviyede kullanıcı kendi carisini/muavinini açar (**öğrenci evreni**: `isletme_id + user_id` scope'lu satırlar).
2. **Dönem akışı** — `simulasyon_adimlari` (sıra + işlem tarihi + olay). Adımlar kilitli ilerler; "ay sonu" adımları (KDV mahsubu, amortisman) otomatik senaryo üretmez, kullanıcıya yaptırır.
3. **Defter servisi** — kullanıcının `yevmiye_satirlari` → `buyuk_defter` ve `mizan` view'ları. Mizan ekranı her adımda güncel; yanlış kayıt mizanı fiilen bozar ve kullanıcı bunu *görür*.
4. **Kontrol stratejisi** — adım bazlı anında kontrol (öğrenme modu) veya dönem sonu toplu kontrol (sınav modu, v2.2). Mizan denge kontrolü her iki modda canlı.

**Karar:** Simülasyondaki kayıt hataları düzeltme kaydıyla giderilir (gerçek muhasebe pratiği: ters kayıt), sessizce silinmez.
**Neden:** "Muhasebeci gibi düşünmek" hatayı yönetmeyi de kapsar; ayrıca defter bütünlüğü (append-only yevmiye) veri modelini basit tutar.

---

## 11. Mevzuat Engine

### 11.1 İki katman, tek köprü

```
YAPISAL KATMAN (yeni)                    SEMANTİK KATMAN (mevcut)
mevzuat_kaynaklar (kanun/tebliğ/özelge)  mevzuat_chunklar (RAG, 3327 chunk,
└─ mevzuat_maddeleri                     OpenAI 1536-dim embedding)
   effective_date / expire_date               │
   versiyon zinciri (self-FK)                 │ madde_id FK (köprü)
        ▲                                     ▼
   cozum_mevzuat (çözüm dayanağı)        ai-asistan (semantik arama)
```

**Karar:** RAG korunur (AI asistanın bağlamı), yapısal katman eklenir (çözümlerin resmî referansı). İkisi `madde_id` ile köprülenir.
**Neden:** RAG "yaklaşık doğru bağlam" üretir — AI sohbeti için yeterli, çözüm dayanağı için yetersiz. "Bu kayıt KDVK md. 29'a dayanır" iddiası deterministik FK ister; halüsinasyona yer yok.

### 11.2 Versiyonlama ve etki analizi

- Madde değişince: yeni satır + eskiye `expire_date` + `onceki_versiyon_id` zinciri. "T tarihinde geçerli madde" tek sorgudur.
- **Etki analizi (v2'nin gizli süper gücü):** KDV oranı değişti → `cozum_mevzuat` üzerinden etkilenen tüm olaylar tek sorguyla listelenir → admin'e "gözden geçir" kuyruğu düşer.
**Neden:** Mevzuat güncelliği pazarlama vaadi değil, operasyonel süreç olmalı. FK olmadan "hangi içerik eskidi?" sorusu cevapsızdır; v1'de bu soru hiç sorulamıyordu.

### 11.3 Mevzuat yüzeyleri

1. Çözüm ekranında madde kartı (başlık + ilgili fıkra + kaynak linki) — öğrenme zincirinin 7. halkası
2. AI asistan RAG bağlamı (mevcut)
3. Mevzuat tarayıcı sayfası — SEO değeri (P1 #10 ile birleşir), madde → "bu maddeyle ilgili senaryolar" ters bağlantısı

---

## 12. Admin CMS Architecture

### 12.1 Evrim: soru formundan içerik stüdyosuna

Mevcut 6 admin sayfası korunur; merkeze **Olay Stüdyosu** gelir:

```
OLAY STÜDYOSU (yeni, tek akış)
1. Senaryo yaz (AI taslak butonu — ai-asistan altyapısı)
2. Cari seç/oluştur → muavinler otomatik önerilir (cari_gerektirir kuralı)
3. Belge kur (ai-belge-uret mevcut; tip'e göre form)
4. Çözüm satırları — muavin dropdown, canlı denge kontrolü
5. Mevzuat bağla — madde arama (RAG destekli öneri)
6. Yetkinlik ağırlıkları + etiketler
7. Hata kuralları ("en sık yapılan yanlış")
8. Soru türet — tip seç, önizle, onaya gönder
```

**Karar:** Stüdyo sihirbaz (wizard) değil, tek sayfa canlı önizlemeli editördür; sağ panelde öğrencinin göreceği ekran render edilir.
**Neden:** İçerik kalitesi = üreticinin öğrenci deneyimini *görmesi*. Mevcut YeniSoru sayfası bu yönde zaten; stüdyo onun olay-kapsamına büyümüş hali.

### 12.2 Diğer CMS modülleri

| Modül | Durum | v2 değişimi |
|---|---|---|
| Soru listesi/düzenleme | mevcut | Olay bazlı gruplama; türev soruları olayın altında göster |
| Toplu ekleme | mevcut | Şablondan toplu olay örnekleme (parametre CSV/AI) |
| Hata moderasyonu | mevcut | Hata → olay bağlantısı (tüm türevleri etkiler uyarısı) |
| Katkıcı yönetimi | mevcut | Şablon-doldurma akışı (§9.3) |
| Mevzuat yönetimi | RAG yükleme var | Madde CRUD + versiyon + etki analizi kuyruğu |
| Cari/Muavin kütüphanesi | yok | Global evren yönetimi; kullanım sayaçları |
| Simülasyon kurgusu | yok (v2.1) | Adım sıralama takvimi; olay havuzundan sürükle |

### 12.3 Yetki modeli

Mevcut `adminler` + rol sistemi (20260507000005) korunur. Yeni yüzeyler aynı `is_admin()` RLS düzenine girer; katkıcılar yalnız kendi taslak olaylarını görür (mevcut katkıcı RLS deseni genişletilir).

---

## 13. User Journey

### 13.1 Ana yolculuk — "Elif, işletme 2. sınıf"

```
KEŞİF      Google "yevmiye kaydı örnek" → mevzuat/senaryo SEO sayfası
           → 1 soruyu anonim GÖRÜR (mevcut erişim modeli), çözmek için kayıt
KAYIT      Onboarding (mevcut persona akışı) → hedef seçimi
           → yetkinlik grafında başlangıç noktası belirlenir
İLK 10 DK  "İlk Kaydın" atölyesi: basit belge → guided yevmiye
           → ilk XP + streak + rozet (aha: "belgeden kayıt çıkardım")
GÜNLÜK     Günün sorusu (mevcut) + devam önerisi + zayıf alan tekrarı
DÖNGÜ      Belge → analiz → kayıt → kontrol → mantık → mevzuat → benzer senaryo
HAFTALIK   Modül ilerleyişi → karma vaka → yetkinlik seviye atlama
AY 2+      Patron vakaları → SİMÜLASYON: "Yıldız Ticaret'in muhasebecisi ol"
           → kendi cari kartını açar (scaffold kalkmış — usta seviyesi)
PREMIUM    Simülasyon 2. işletme, AI asistan sınırsız, beyanname modülü
           → mevcut hibrit freemium: soru limiti YOK, değer katan özellik kilitli
```

### 13.2 Dönüşüm noktaları

| Nokta | Tetik | Tasarım kararı |
|---|---|---|
| Ziyaretçi→Kayıt | Çözme isteği | Anonim görüntüleme kalır (SEO + friksiyon dengesi, mevcut karar) |
| Kayıt→Alışkanlık | İlk hafta 3 gün streak | İlk atölye 10 dakikada rozetle biter; onboarding sonu doğrudan ilk soruya |
| Ücretsiz→Premium | Simülasyona geçiş anı | 1. işletmenin ilk ayı ücretsiz — "defterim büyüyor" hissi paywall'dan önce oluşur |

**Neden simülasyon = premium çapası:** Freemium stratejisi (hafıza: soru limiti yok) gereği kilit, *sınırlamada* değil *değerde* olmalı. Simülasyon platformun en yüksek algılanan değerli özelliği; ilk tadım ücretsiz, devamı Premium.

### 13.3 İkincil personalar

- **SMMM staj adayı:** Yetkinlik bazlı çalışır (üniteden değil "tevkifat"tan girer) → yetkinlik ekseni navigasyona da açılır
- **Öğretmen (v1.1+):** Sınıf paneli bu mimaride "kurum evreni"dir — simülasyon evren deseni öğretmen senaryosunu bedavaya hazırlar

---

## 14. AI Ready Architecture

### 14.1 İlke: AI motorların müşterisidir, motor değildir

Kontrol deterministiktir (`kontrol.ts` + validator'lar), AI *açıklar ve üretir*. Puanlamayı asla AI yapmaz.
**Neden:** Güven (öğrenci "haksız yanlış" hissetmemeli), maliyet (her kontrolde LLM çağrısı sürdürülemez — mevcut `ai_kullanim` kota tablosu bunun kanıtı), tutarlılık.

### 14.2 AI yüzeyleri ve veri hazırlığı

| Yüzey | Durum | v2'de beslenme |
|---|---|---|
| Soru içi asistan | mevcut (`ai-asistan` + RAG) | Bağlam artık yapısal: olay + belge + çözüm + mevzuat maddeleri prompt'a *tablodan* girer, serbest metinden değil |
| Yanlış analizi | mevcut | Katman-2 hata kuralları + `SatirAnaliz` çıktısı prompt'a eklenir → daha isabetli, daha kısa (ucuz) yanıt |
| Belge üretimi | mevcut (`ai-belge-uret`) | Olay stüdyosunda taslak üretici; çıktı `belgeler` şemasına valide edilir |
| Olay taslağı üretimi | yeni | Şablon + parametre → tam olay taslağı (durum: taslak, insan onayı şart) |
| Benzer senaryo | v2.2 | Olay embedding'leri (mevcut pgvector altyapısı yeniden kullanılır) |

**Karar:** AI üretimi her zaman `taslak` durumunda doğar; onaysız içerik öğrenciye asla ulaşmaz. Mevcut `durum` akışı bu güvenlik kapısıdır.

### 14.3 Yapısal verinin AI getirisi

v2'nin normalize modeli AI için ücretsiz kazanımdır: olayın tüm bileşenleri (belge alanları, çözüm satırları, mevzuat metni, hata kuralları) ayrı ayrı adreslenebilir olduğundan prompt'lar kısa, tipli ve önbelleklenebilir olur (mevcut `ai_cevap_cache` deseni genişler). "AI-ready" ayrı bir iş paketi değil, veri modelinin yan ürünüdür.

---

## 15. Sprint Roadmap

### 15.0 İki paralel hat

**Hat A — v1 lansmanı (dokunulmaz):** Mevcut P0 (tam test → İyzico → landing) bu SDD'den bağımsız yürür. v2 migration'ları lansman hattını kıracak hiçbir drop içermez (additive-first ilkesi).
**Hat B — v2 inşası:** Aşağıdaki sprintler. Her sprint tek başına deploy edilebilir ve geri alınabilir.

### 15.1 Sprint planı (sprint ≈ 1 hafta, tek geliştirici + Claude temposuna göre)

| Sprint | Kapsam | Çıktı / kabul ölçütü |
|---|---|---|
| **S0** | SDD onayı + ürün kararları: muavin zorunluluğu kesinleşir (üçüncü salınım olmayacak), soru tipi öncelikleri, simülasyon premium çizgisi | Bu doküman onaylı; `V2-VERI-MODELI.md` alan düzeyinde yazılı |
| **S1** | Katalog temeli: `hesap_plani` genişletme, `yetkinlikler`+`etiketler`+M2M, `soru_tipleri`, seed'ler | Migration'lar uygulanmış; UI'da değişiklik yok (görünmez sprint) |
| **S2** | İçerik çekirdeği: `muhasebe_olaylari`, `cari_kartlar`, `muavin_hesaplar` v2 (uuid PK — tablo boşken), `belgeler`+backfill | Mevcut sorular olaylara bağlanmış (`olay_id`); jsonb dual-read çalışıyor |
| **S3** | **Kırıcı adım:** `cozumler` v2 (başlık/satır + muavin_id), `kontrol.ts` yeni şemaya bağlanır, seed scriptleri güncellenir | Tüm mevcut sorular yeni şemadan çözülüyor; eski kolonlar henüz durur (güvenlik) |
| **S4** | Question Engine çekirdeği: renderer/validator registry, `hata_bulma` + `coktan_secmeli` tipleri (otomatik türetme) | 1 olaydan 3 soru tipi canlıda |
| **S5** | Learning Engine: `kullanici_yetkinlikleri`, XP dağıtımı, zayıf alan view'ı, öneri motoru yetkinlik sinyali, "benzer senaryolar" bloğu | Profilde yetkinlik grafiği; çözüm sonrası benzer öneri |
| **S6** | Mevzuat Engine: `mevzuat_kaynaklar`+`mevzuat_maddeleri`+`cozum_mevzuat`, chunk köprüsü, çözüm ekranı madde kartı | ≥50 olayda tıklanabilir mevzuat referansı |
| **S7** | Olay Stüdyosu (admin): tek sayfa editör + canlı önizleme + AI taslak; şablon kütüphanesi v1 | Yeni olay uçtan uca stüdyodan kuruluyor; eski form emekliye ayrılır |
| **S8–S9** | Simülasyon MVP: `isletmeler`+adımlar+`yevmiye_*`+mizan view; Ticaret işletmesi 1 ay (≈25 adım); premium kapısı | Bir kullanıcı Yıldız Ticaret'in Ocak ayını kapatıyor; mizan canlı |
| **S10** | Temizlik + sertleştirme: jsonb drop'ları, RLS denetimi, performans (mizan indeksleri), dokümantasyon güncelleme | Dual-read dönemleri kapalı; CLAUDE.md/DOKUMANTASYON güncel |

### 15.2 Sıralamanın gerekçesi

- **S1–S2 görünmezdir** — lansman dönemine denk gelse bile risk taşımaz (additive).
- **S3 tek kırıcı adımdır ve erkendir** — tüm üst katmanlar (engine'ler) bu şemaya oturur; geç kalırsa her sprint iki şemaya kod yazar.
- **S4 hızlı değer kanıtıdır** — "1 içerik → 3 soru" vaadi 4. haftada görünür olur; vizyonun ilk somut meyvesi.
- **Simülasyon sona yakındır** — en büyük iş, en çok bağımlılık (evren + yevmiye + mizan + premium); temeller oturmadan başlanırsa yeniden yazılır.

### 15.3 Riskler ve önlemler

| Risk | Önlem |
|---|---|
| S3 regresyonu (kontrol.ts + admin + seed aynı anda) | Eski kolonlar S10'a kadar durur; feature flag ile eski/yeni kontrol karşılaştırmalı çalıştırılır |
| İçerik üretim hızı düşer | S7 stüdyo + şablonlar; o zamana kadar mevcut form olay-uyumlu minimum değişiklikle yaşar |
| Muavin kararı yine değişir | S0'da yazılı ürün kararı — bu SDD'nin onay şartı |
| Lansman ile çakışma | Hat A önceliklidir; v2 sprintleri lansman haftalarında duraklatılabilir (her sprint kapanabilir durumda biter) |

---

## 16. Gelecek Modüller

Mimarinin bugünden yer ayırdığı, kod yazılmayacak genişlemeler:

| Modül | Mimari hazırlık |
|---|---|
| **Sınav modu** (P1 #4) | Soru tipi motoru + `sinav` modül seviyesi zaten var; sınav = zamanlı soru seti kompozisyonu |
| **Öğretmen/sınıf paneli** (P1 #5) | Evren deseni (`isletme_id`) → "kurum evreni"; sınıf = öğrenci grubu + atanmış simülasyon |
| **Beyanname motoru (tam)** | `beyanname_etkileri` jsonb → yapısal `beyannameler` tabloları; KDV1'den kurumlar geçicisine |
| **7/A–7/B maliyet modülü** | Çözüm varyant sistemi (`cozumler.varyant`) baştan bunun için tasarlandı |
| **e-Belge farkındalık modülü** | `Belge` tipleri zaten ETTN taşıyor; e-fatura görsel şablonları eklenir |
| **TFRS/BOBİ FRS katmanı** | Mevzuat kaynak tipi genişler; çözüm varyantı "VUK vs TFRS" ikiliğini taşıyabilir |
| **Sertifika** | Yetkinlik seviyeleri ölçüm altyapısıdır; sertifika = eşik + sınav modu bileşimi |
| **Mobil uygulama** | Supabase API-first; Question Engine registry'si React Native'e taşınabilir tasarlanır |
| **İçerik pazarı / kurum içeriği** | Olay `kaynak` alanı + katkıcı akışı; kurumlara özel olay havuzu = evren deseni |
| **Canlı ekonomi modu** | Mevzuat versiyonlama sayesinde "2026 oranlarıyla" / "sınav yılı oranlarıyla" çözüm modları |

---

## Kapanış

Bu doküman üç iddiada bulunur:

1. **Vizyon veri modelidir.** "Belge merkezli, muhasebeci gibi düşündüren platform" pazarlama cümlesi değil; `muhasebe_olaylari` aggregate'inin ve öğrenme zincirinin şemasıdır.
2. **v1 israf değildi.** Belge tipleri, kontrol motoru, modül yapısı, RAG, admin akışları — v2'nin yarısı zaten yazılmış durumda. v2 yeniden yazım değil, yeniden *bağlamadır*.
3. **En büyük risk teknik değil ürünseldir:** olay kurulum maliyeti ve muavin kararının istikrarı. İkisinin de cevabı bu dokümanda (Content Engine şablonları, S0 yazılı kararı) — onay öncesi en çok tartışılması gereken bölümler §9 ve §15'tir.

**Sonraki adım:** S0 — bu dokümanın gözden geçirilip onaylanması ve `V2-VERI-MODELI.md`'nin alan düzeyinde yazılması.
