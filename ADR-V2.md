# Muhasebe Akademisi v2 — Architecture Decision Records (ADR)

**Sürüm:** 1.0 · **Tarih:** 6 Temmuz 2026
**Bağlı dokümanlar:** [SDD-V2.md](SDD-V2.md) · [V2-VERI-MODELI.md](V2-VERI-MODELI.md)
**Statü:** Bu belge projenin mimari kararlarının resmi kaydıdır. Bundan sonraki tüm geliştirmeler bu ADR'lere referansla yapılır. Bir kararı değiştirmek yeni bir ADR açmayı ve eskisini `Yerini Aldı` olarak işaretlemeyi gerektirir; kod içinde sessizce sapılmaz.

## ADR nedir, nasıl okunur

Her ADR *tek* bir mimari kararı, alındığı bağlamla birlikte dondurur. Amaç "ne yaptık"tan çok **"neden böyle yaptık ve neyi feda ettik"** sorusunu 6 ay sonraki geliştiriciye (ve AI'a) anlatmaktır.

**Durum değerleri:** `Önerildi` · `Kabul Edildi` · `Yerini Aldı (ADR-XXX)` · `Reddedildi` · `Askıda`

**Bu projede ADR'ler neden kritik:** Kod tabanının migration geçmişi, yazılı karar kaydı olmadığında ne olduğunu gösteriyor — muavin stratejisi üç kez şekil değiştirdi (global tablo → kaldırıldı → soru-bazlı jsonb → cari-bağlı global), ünite yapısı iki kez yeniden kuruldu, `cozumler.kod` FK'si iki kez düştü/eklendi. Her salınım migration borcu ve içerik yeniden-yazımı üretti (213 soru bir kez üretilip sonra tamamı arşivlendi). ADR'ler bu salınımı durdurmak için vardır: karar bir kez, yazılı, gerekçeli.

---

## İçindekiler

| ADR | Başlık | Durum |
|---|---|---|
| [001](#adr-001) | Domain Driven Design kullanılması | Kabul Edildi |
| [002](#adr-002) | Muhasebe Olayı (Business Event) merkeze alınması | Kabul Edildi |
| [003](#adr-003) | Belge merkezli öğrenme modeli | Kabul Edildi |
| [004](#adr-004) | Muavin hesap zorunluluğu | Kabul Edildi |
| [005](#adr-005) | Ana hesaba doğrudan kayıt yasağı | Kabul Edildi |
| [006](#adr-006) | Büyük Defter ve Mizan'ın View olması | Kabul Edildi |
| [007](#adr-007) | İçerik merkezli sistem | Kabul Edildi |
| [008](#adr-008) | Question Engine tasarımı | Kabul Edildi |
| [009](#adr-009) | Learning Engine tasarımı | Kabul Edildi |
| [010](#adr-010) | Simulation Engine tasarımı | Kabul Edildi |
| [011](#adr-011) | Mevzuat versiyonlama | Kabul Edildi |
| [012](#adr-012) | AI Ready Architecture | Kabul Edildi |
| [013](#adr-013) | Video kullanılmaması | Kabul Edildi |
| [014](#adr-014) | Gerçek hayat senaryoları ile öğretim | Kabul Edildi |
| [015](#adr-015) | Yetkinlik (Skill) sistemi | Kabul Edildi |
| [016](#adr-016) | Çoktan çoğa ilişki mimarisi | Kabul Edildi |
| [017](#adr-017) | Yetkinlik/etiket bağının olay düzeyine taşınması | Kabul Edildi |
| [018](#adr-018) | Belge tiplerinin katalog tablosu olarak modellenmesi | Kabul Edildi |
| [019](#adr-019) | Cevap anahtarı ile kullanıcı cevabının ayrıştırılması | Kabul Edildi |
| [020](#adr-020) | Cevap anahtarı başlığının ayrı tablo olarak modellenmesi | Kabul Edildi |

---

<a name="adr-001"></a>
## ADR-001 — Domain Driven Design kullanılması

**Durum:** Kabul Edildi

**Problem:**
v1 kod tabanı teknik katmanlara göre örgütlendi (pages/, components/, lib/) ama muhasebe *domain'ine* göre örgütlenmedi. Sonuç: "soru", "senaryo", "atölye sorusu", "vaka" terimleri kodda ve UI'da iç içe geçti; aynı kavramın farklı yerlerde farklı anlamı oldu. Muhasebe gibi kuralları katı, terminolojisi hassas bir alanda bu belirsizlik hem kod hem içerik hatalarına yol açıyor. v2'de sistem dört platforma (bilgi, uygulama, simülasyon, mevzuat) büyüyecek; ortak bir dil ve net sınırlar olmadan bu büyüme yönetilemez.

**Alternatifler:**
1. **Teknik-katman mimarisi (mevcut):** MVC benzeri; domain kavramları koda dağılmış.
2. **Transaction Script:** Her işlem için prosedürel akış; kural motoru yok.
3. **Domain Driven Design:** Bounded context'ler, ubiquitous language, aggregate'ler.

**Neden Bu Karar Alındı:**
Muhasebe zaten olgun bir domain — hesap planı, yevmiye, muavin, mizan, beyanname *gerçek* kavramlar, biz icat etmiyoruz. DDD bu hazır domain'i modele birebir yansıtmayı sağlıyor. Beş bounded context tanımlandı (Katalog, İçerik, Öğrenme, Simülasyon, Kullanıcı) ve kritik gözlem şu: **bu sınırlar Supabase RLS politikalarıyla birebir örtüşüyor** — katalog = public read, öğrenme/simülasyon = own-data, içerik = admin write. DDD sınırı ile güvenlik sınırının çakışması bedava dayanıklılık demek. Ayrıca ubiquitous language (V2-VERI-MODELI §5.2) her terimin tek anlamı ve tek tablosu olmasını zorunlu kılıyor.

**Avantajları:**
- Kod, doküman, admin UI ve AI prompt'ları aynı terimleri kullanır → belirsizlik azalır.
- Bounded context = RLS sınırı → güvenlik modeli domain'den türer, ayrı tasarlanmaz.
- Aggregate (ADR-002) tutarlılık sınırını netleştirir; kısmi/bozuk içerik üretimi zorlaşır.
- Yeni geliştirici/AI, domain haritasından sistemi hızla kavrar.

**Dezavantajları:**
- Başlangıç maliyeti: context haritası, dil sözlüğü, aggregate tasarımı önden iş ister.
- Aşırı uygulanırsa (her küçük şey aggregate) gereksiz karmaşıklık riski — bu yüzden sadece 5 context ve 1 çekirdek aggregate ile sınırlı tutuldu.
- Türkçe domain dili ile İngilizce teknik terimler (repository, aggregate) arası çeviri sürtünmesi.

**Gelecekteki Etkileri:**
- Yeni her tablo beş context'ten birine girmek ve üç RLS şablonundan birini almak zorunda (V2-VERI-MODELI §6).
- Öğretmen paneli (v1.1+) yeni bir context değil, Simülasyon context'inin "kurum evreni" genişlemesi olarak modellenecek (ADR-010).
- Domain dili değişirse (örn. yeni muhasebe terimi) önce sözlük, sonra kod güncellenir.

---

<a name="adr-002"></a>
## ADR-002 — Muhasebe Olayı (Business Event) merkeze alınması

**Durum:** Kabul Edildi · **İlişkili:** ADR-007, ADR-008

**Problem:**
v1'de içeriğin atomu "soru"ydu: 1 senaryo = 1 soru = 1 çözüm. Aynı veresiye satış faturasından hem yevmiye sorusu hem belge analizi hem hata bulma üretmek için senaryoyu üç kez yazmak gerekiyordu. İçerik üretimi platformun en pahalı işi (213 soru elle/AI ile üretildi, sonra tamamı arşivlenip yeniden yazıldı — bu maliyet bir daha ödenmemeli). Soru-merkezli model içerik yeniden kullanımını yapısal olarak engelliyordu.

**Alternatifler:**
1. **Soru-merkezli (mevcut):** Her soru bağımsız; belge/çözüm soruya gömülü (jsonb).
2. **Şablon-merkezli:** Soru şablonları parametrelerle çoğaltılır ama yine "soru" atomu.
3. **Olay-merkezli (DDD aggregate):** `muhasebe_olaylari` çekirdek aggregate; soru, olayın bir soru tipiyle render edilmiş instance'ı.

**Neden Bu Karar Alındı:**
Muhasebede atom "soru" değil, gerçekleşen ekonomik olaydır (bir satış, bir tahsilat, bir tahakkuk). Bir olay bir kez tam kurulur (belge + cari + muavin + çözüm + mevzuat + yetkinlik) ve ondan N soru tipi türetilir. `muhasebe_olaylari` aggregate root olur; `sorular` tablosu **silinmez**, `olay_id` + `tip` kolonları alarak instance tablosuna dönüşür. Kritik uyumluluk kararı: `ilerleme`, `atolye_sorulari`, katkıcı sistemi, admin paneli, liderlik RPC'leri hepsi `sorular.id`'ye bağlı — yeni tablo açmak bu bağları koparır, kolon eklemek hiçbirini bozmaz.

**Avantajları:**
- 1 olay → N soru tipi × N destek seviyesi: içerik yeniden kullanımı yapısal.
- Cevap anahtarı tek kaynak (`cozum_satirlari`); çözüm düzeltilince tüm türev sorular otomatik güncel (ADR-008).
- Mevcut `sorular` bağları korunur — geçişte `olay_id=null` eski sorular çalışmaya devam eder.
- Simülasyon adımı da "tarihli bir olay" — ayrı içerik tipi icat edilmez (ADR-010).

**Dezavantajları:**
- Olay kurulum maliyeti artar (belge + cari + muavin + mevzuat aynı anda) — SDD'nin 1 numaralı ürünsel riski. Karşı önlem: şablon kütüphanesi + AI taslak (ADR-007, ADR-012).
- Aggregate tutarlılığı (olay onaylıysa çözümü de tam olmalı) uygulama/trigger disiplini ister.
- Geçiş dönemi: her mevcut soru → 1 olaya backfill (M5 migration).

**Gelecekteki Etkileri:**
- Yeni içerik her zaman olay olarak kurulur; "tekil soru" üretimi emekliye ayrılır (Olay Stüdyosu, S7).
- Şablon varlığının şemadaki yeri henüz kesinleşmedi (V2-VERI-MODELI B4) — S7 öncesi `olay_sablonlari` tablosu mu, `durum='sablon'` klonlanabilir olay mı kararı verilecek.
- İçerik versiyonlama (olay çözümü mevzuatla değişince) ileride gündeme gelecek; şu an admin yerinde düzenler.

---

<a name="adr-003"></a>
## ADR-003 — Belge merkezli öğrenme modeli

**Durum:** Kabul Edildi · **İlişkili:** ADR-013, ADR-014

**Problem:**
Muhasebe eğitimi klasik olarak teori-önce ilerler: önce "120 Alıcılar hesabı şudur" anlatılır, sonra soru çözülür. Ama gerçek muhasebecinin işi tersidir — eline belge gelir, ondan olayı *teşhis eder*, kaydı yazar. Teori-önce model "hesap ezberleyen" ama "belge okuyamayan" öğrenci üretiyor. Platformun vaadi "muhasebeci gibi düşünmeyi öğretmek"; bu ancak belgeyle karşılaşarak öğrenilir.

**Alternatifler:**
1. **Teori-önce:** Kavram anlatımı → örnek → soru. Klasik kurs modeli.
2. **Video-önce:** Anlatım videosu → alıştırma. (ADR-013 ile reddedildi.)
3. **Belge-önce:** Öğrenci önce belgeyi görür, olayı kendisi teşhis eder, kaydı yazar; teori minimal ve senaryoya gömülü.

**Neden Bu Karar Alındı:**
VUK md. 229 vd. gereği her muhasebe kaydı bir belgeye dayanır — eğitim de öyle olmalı. Kritik gözlem: bu felsefe v1 kodunda zaten filizlenmiş durumda. `src/types/index.ts`'teki `Belge` discriminated union'ı (fatura, perakende fişi, çek, senet, dekont) ETTN, tevkifat payı, valör, keşide yeri gibi *gerçek* e-belge alanlarını taşıyor. v2 bu birikimi jsonb'dan birinci sınıf domain nesnesine (`belgeler` tablosu) terfi ettirir; sıfırdan icat etmez. Öğrenme zinciri belgeyle başlar: Belge → Muhasebe Olayı → Analiz → Kayıt → Kontrol → Mantık → Mevzuat → Benzer Senaryolar.

**Avantajları:**
- Aktarılan beceri gerçek işe birebir uyar (belgeden olaya çıkarım).
- `Belge` tipleri zaten yazılı — v2 yeniden bağlama, yeniden yazım değil.
- Belge yeniden kullanılabilir (ADR-016): aynı fatura kayıt + analiz + KDV sorusunda.
- Hesap ezberi yan ürün olur, amaç değil — platformun farklılaşması.

**Dezavantajları:**
- Belgesiz olaylar (açılış, kapanış, amortisman, reeskont) felsefeyle gerilim yaratır. Model belgeyi opsiyonel tutarak (`olay_belgeleri` 0..N) çözüyor; ama bu olaylar için `belge_yon='ic'` (iç fiş) değeri henüz eklenmedi (V2-VERI-MODELI B3).
- Belge üretimi içerik maliyetine ekler (AI belge üretici `ai-belge-uret` bunu hafifletir).
- Global havuzda belgenin "kendi tarafı" (satıcı kimliği) modelde eksik (V2-VERI-MODELI B2) — çözülecek.

**Gelecekteki Etkileri:**
- e-Belge farkındalık modülü doğal genişleme (tipler ETTN zaten taşıyor).
- Dönem sonu üniteleri (10–15) için `belge_yon='ic'` eklenmesi şart olacak.
- Belge görsel şablonları (fatura/dekont render) UI yatırımı gerektirecek ama veri hazır.

---

<a name="adr-004"></a>
## ADR-004 — Muavin hesap zorunluluğu

**Durum:** Kabul Edildi (S0 kararı #1) · **İlişkili:** ADR-005, ADR-016

**Problem:**
Muavin (yardımcı) hesaplar gerçek muhasebenin bel kemiği: 120 Alıcılar'a değil, 120.01.001 "ABC A.Ş."ye kayıt yapılır. v1'de muavin üç kez şekil değiştirdi — global tablo, sonra kaldırıldı, sonra soru-bazlı jsonb (`sorular.muavinler`, FK'sız serbest text). Bu salınım hem migration borcu hem içerik tutarsızlığı üretti. ERP mantığında çalışacak bir platform için muavinin *stabil ve zorunlu* olması gerekiyordu; "bazen var bazen yok" hâli sürdürülemezdi.

**Alternatifler:**
1. **Muavin yok (sadece ana hesap):** En basit, ama ERP mantığını öğretmez, gerçekçi değil.
2. **Muavin opsiyonel:** Bazı hesaplarda zorunlu, bazılarında değil. (v1'in son hâli — belirsizlik kaynağı.)
3. **Muavin evrensel zorunlu:** Tüm yevmiye/çözüm satırları muavin düzeyinde; ana hesaba kayıt imkânsız.

**Neden Bu Karar Alındı:**
S0 anayasa kararıyla kesinleştirildi: muavin zorunludur, üçüncü/dördüncü salınım olmayacak. Kritik teknik sonuç: `cozum_satirlari.muavin_id` ve `yevmiye_satirlari.muavin_id` **NOT NULL FK** → `muavin_hesaplar(id)`. `muavin_hesaplar.kod` format check'i (`^[0-9]{3}(\.[0-9]+)+$`) 3 haneli ana kodun bu tabloya girmesini engellediğinden, ana hesaba kayıt *geçişli olarak imkânsız* — bu bir uygulama kuralı değil, veri tabanı garantisi. "Muavin bazı hesaplarda zorunlu" modeli geçersiz kılındı: muavin yapısal olarak evrensel. Sonuç: kullanılan her ana hesap için (600, 391, 191 dahil) en az bir muavin açılır.

**Avantajları:**
- Gerçek ERP mantığı öğretilir (Logo/Mikro/Luca deneyimi).
- Veri tabanı seviyesinde garanti — uygulama bug'ı muavin kuralını delemez.
- Muavin salınımı biter; stabil temel (S0 taahhüdü).
- Cari takibi (ADR-016) muavin üzerinden doğal kurulur.

**Dezavantajları:**
- Her ana hesap için muavin açma zorunluluğu içerik kurulumunu ağırlaştırır.
- Tek muavinli hesaplarda (191.01) "varsayılan seçim" mekanizması gerekli ama henüz tanımsız (V2-VERI-MODELI B1) — `muavin_hesaplar.varsayilan` bayrağı veya "en düşük sira" kuralı netleşecek.
- Başlangıç öğrencisi için muavin kavramı ek biliş yükü — scaffold (ADR-009, destek_seviyesi) ile hafifletilir.

**Gelecekteki Etkileri:**
- `muavin_hesaplar` uuid PK'ya geçer (tablo şu an boş — maliyetsiz); işletme/kullanıcı evrenine göre `unique (isletme_id, olusturan_user_id, kod)`.
- İleri seviyede (destek_seviyesi='serbest') öğrenci kendi muavinini açar (ADR-010).
- `muavin_hesaplar.tip` kolonu kaldırılır (TDHP grubu `ana_kod`'dan türetilir; üç kez semantik değiştirdiği için çelişki kaynağı).

---

<a name="adr-005"></a>
## ADR-005 — Ana hesaba doğrudan kayıt yasağı

**Durum:** Kabul Edildi (S0 kararı #2, #3) · **İlişkili:** ADR-004

**Problem:**
ADR-004 muavini zorunlu kıldı, ama "zorunlu" nasıl garanti edilir? v1'in `kontrol.ts`'i ana hesap girişini (120) muavin ebeveyni olarak *kabul ediyordu* (`kodEsler` prefix mantığı: beklenen 120.001 iken kullanıcı 120 yazarsa doğru sayılıyordu). Bu esneklik muavin zorunluluğuyla çelişir — "ana hesaba yazma" kuralı uygulama katmanına bırakılırsa bir gün bir kod yolu onu deler.

**Alternatifler:**
1. **Uygulama katmanı kontrolü:** `kontrol.ts` ana hesabı reddeder ama DB serbest.
2. **CHECK constraint:** Kod formatını satır içinde kısıtla — ama muavin geçerliliği başka tabloda, CHECK cross-table bakamaz.
3. **NOT NULL FK ile yapısal yasak:** Satır muavin_hesaplar'a bağlanmak *zorunda*; ana hesap o tabloda olmadığı için yazılamaz.

**Neden Bu Karar Alındı:**
S0 #3 "yevmiye satırları mutlaka muavin_id ile çalışır" kararının en güçlü yorumu seçildi: yasak veri tabanı seviyesinde, yapısal olmalı. `muavin_id NOT NULL FK` hem `cozum_satirlari`'nda (cevap anahtarı) hem `yevmiye_satirlari`'nda (kullanıcı defteri). Uygulama kontrolüne güvenilmez çünkü v1 deneyimi gösterdi ki esneklik zamanla kurala dönüşüyor. `kontrol.ts` davranışı da değişecek: ana hesap girişi artık `muavin_gerekli` hatası verecek, sessizce kabul etmeyecek.

**Avantajları:**
- Kural delinemezliği garanti — hiçbir kod yolu ana hesaba yazamaz.
- Öğretim netliği: öğrenci "ana hesaba yazılmaz" kuralını istisnasız öğrenir.
- Cevap anahtarı (`cozum_satirlari`) da bu garantiye tabi — tutarlı içerik.

**Dezavantajları:**
- `kontrol.ts` yeniden yazılır — M7'nin (cozumler dönüşümü) en riskli parçası. Eski/yeni davranış *bilinçli* farklılaşır; bu yüzden M7 doğrulaması "verdict eşitliği" değil "toplam/eşleme eşitliği" olmalı (V2-VERI-MODELI C5).
- Backfill'de eski `kod` (ana hesap) → muavin eşlemesi soru-kapsamlı yapılmalı; global dedupe çapraz-soru çakışması yaratabilir (V2-VERI-MODELI C6).
- Geçiş döneminde iki şema paralel yaşar (M7–M11).

**Gelecekteki Etkileri:**
- `cozum_satirlari` cevap anahtarı olduğundan denge (Σborç=Σalacak) + min-2-satır bütünlüğü de garanti edilmeli — şu an eksik, eklenecek (V2-VERI-MODELI C1). Dengesiz cevap anahtarı her öğrenciyi haksız "yanlış"a düşürür.
- Simülasyondaki hatalı kayıtlar silinmez, ters kayıtla düzeltilir (gerçek muhasebe pratiği; `yevmiye_kayitlari` append-only).

---

<a name="adr-006"></a>
## ADR-006 — Büyük Defter ve Mizan'ın View olması

**Durum:** Kabul Edildi (S0 kararı #5) · **İlişkili:** ADR-010

**Problem:**
Simülasyonda kullanıcının büyük defteri ve mizanı gösterilecek. Bunlar tablo olarak tutulursa, her yevmiye kaydında defter ve mizan satırları güncellenmeli — klasik senkronizasyon problemi. Yevmiye ile mizan bir an için tutarsız kalırsa (yarım güncelleme, race condition) öğrenciye yanlış mizan gösterilir, güven kaybolur.

**Alternatifler:**
1. **Tablo + trigger senkron:** Yevmiye insert'i defter/mizan tablolarını günceller. Senkronizasyon riski.
2. **Materialized view:** Periyodik/manuel refresh. Yine tazelik/senkron sorunu (bayat mizan).
3. **Normal view (türetilmiş):** Defter ve mizan her erişimde yevmiye satırlarından hesaplanır. Kaydedilen tek gerçek: yevmiye.

**Neden Bu Karar Alındı:**
S0 #5 ile kesinleşti. Kritik ilke: **türetilen veri saklanmaz.** Gerçek muhasebe de böyle çalışır — büyük defter yevmiyenin hesap bazlı dökümü, mizan defterin özetidir; ikisi de bağımsız kayıt değil, türev. `buyuk_defter` = `yevmiye_satirlari ⋈ muavin_hesaplar ⋈ hesap_plani`; `mizan` = defterin `group by ana_kod/muavin_id` agregasyonu. Kaydedilen tek gerçek yevmiye satırlarıdır. Bu, senkronizasyon hatası sınıfını tümüyle yok eder.

**Avantajları:**
- Senkronizasyon hatası imkânsız — mizan her zaman yevmiyeyle tutarlı (tanımı gereği).
- Gerçek muhasebe modeliyle birebir — öğrenci "mizan defterden çıkar" gerçeğini yaşar.
- Yanlış kayıt mizanı fiilen bozar ve öğrenci bunu *görür* — pedagojik olarak değerli.
- `normal_bakiye` alanıyla karşılaştırma → "ters bakiye" uyarısı bedava.

**Dezavantajları:**
- View her erişimde hesaplar — yüksek frekansta (her simülasyon adımında) maliyet. Ama tek kullanıcı için, `(user_id, sim)` indeksliyken ucuz.
- Çapraz-kullanıcı agregasyonu (öğretmen paneli "sınıfın mizan doğruluğu") pahalı olur — gelecekte materialized view veya özel sorgu gerekebilir.
- `yevmiye_satirlari` sınırsız büyür (10k kullanıcı × simülasyonlar × adımlar × satırlar ≈ 60M+); partition stratejisi ileride gerekli (V2-VERI-MODELI B6).

**Gelecekteki Etkileri:**
- View tanımları `(user_id, simulasyon_id)` composite index üzerine kurulacak (V2-VERI-MODELI §7).
- Öğretmen paneli çapraz-kullanıcı raporu, performans için ayrı ele alınacak — normal view yetmezse materialized/özet tablosu ama *asla* kullanıcının canlı mizanı için değil.
- Denge (Σborç=Σalacak) yevmiye yazımında deferred trigger + `yevmiye_kaydet()` RPC ile garanti edilecek (M10).

---

<a name="adr-007"></a>
## ADR-007 — İçerik merkezli sistem

**Durum:** Kabul Edildi · **İlişkili:** ADR-002, ADR-008, ADR-012

**Problem:**
ADR-002 olayı merkeze aldı, ama bu yalnız veri modeli kararı; bir de *üretim* boyutu var. Olay kurulumu (belge + cari + muavin + çözüm + mevzuat + yetkinlik) soru kurulumundan çok daha pahalı. İçerik üretim hızı v1'in ana temposuydu (haftada onlarca soru). Olay-merkezli modele geçince soru başına maliyet düşer (1 olay → 3+ soru) ama olay başına maliyet artar. Bu denklem yönetilmezse net üretim yavaşlar — SDD'nin açıkça işaretlediği 1 numaralı ürünsel risk.

**Alternatifler:**
1. **Her olayı elle tam kur:** En kaliteli ama en yavaş; katkıcı hunisini daraltır.
2. **Tamamen AI üretimi:** Hızlı ama kalitesiz/tutarsız; onaysız içerik riski.
3. **Şablon + AI taslak + insan onayı (Content Engine):** Olay bir kez şablonlaşır, parametrelerle çoğaltılır; AI taslak üretir, insan onaylar.

**Neden Bu Karar Alındı:**
İçerik maliyeti platformun asıl darboğazı olduğundan, "içerik merkezlilik" yalnız veri modeli değil, bir *üretim hattı* kararı olmalı. Content Engine (SDD §9) üç kaldıraç kurar: (a) AI destekli taslak (`ai-belge-uret`, `ai-asistan` mevcut), (b) şablon kütüphanesi ("veresiye satış" şablonu cari/tutar/tarih parametreleriyle çoğaltılır), (c) katkıcıların *tam olay kurmak yerine şablon doldurması*. Yeniden kullanılabilirlik matrisi (V2-VERI-MODELI §9.2): cari kart N olayda, belge N soruda, olay N soru tipinde, olay dizisi hem atölyede hem simülasyonda.

**Avantajları:**
- İçerik maliyeti darboğazına doğrudan yanıt — olay-merkezliliğin sürdürülebilir olmasını sağlar.
- Katkıcı hunisi genişler (şablon doldurmak, tam olay kurmaktan kolay) ama kalite moderasyonda korunur.
- Tanıdık cariler ("ABC A.Ş.", "Yıldız Ticaret") platform genelinde tekrar eder → süreklilik hissi.
- AI çıktısı her zaman `taslak` doğar, onaysız öğrenciye ulaşmaz (ADR-012 güvenlik kapısı).

**Dezavantajları:**
- Şablon varlığının şemadaki yeri henüz kararlaştırılmadı (V2-VERI-MODELI B4) — S7 öncesi netleşecek.
- Şablon soyutlaması yanlış kurulursa (fazla katı/gevşek) ya çeşitlilik ölür ya kalite düşer.
- Olay Stüdyosu (admin, S7) önemli UI yatırımı ister.

**Gelecekteki Etkileri:**
- `soru-uret.md` promptu olay şemasına evrilecek; `soru_tipleri.uretim_yontemi` (otomatik/yarı/manuel) hangi tipin türetilebileceğini işaretleyecek.
- İçerik pazarı / kurum içeriği (gelecek modül) aynı olay + kaynak + evren deseniyle kurulacak.
- Şablondan toplu olay örnekleme (CSV/AI parametre) admin toplu-ekleme akışını dönüştürecek.

---

<a name="adr-008"></a>
## ADR-008 — Question Engine tasarımı

**Durum:** Kabul Edildi · **İlişkili:** ADR-002, ADR-007

**Problem:**
Aynı olaydan 7 farklı soru tipi (yevmiye, hata bulma, çoktan seçmeli, belge analizi, mizan analizi, beyanname, ERP uygulama) üretilecek. Her tip için ayrı sayfa/kontrol mantığı yazmak 7× kod ve 7× bakım demek. Yeni tip eklemek her seferinde deploy gerektirirse sistem genişleyemez. Ayrıca her tipin kendi cevap anahtarını saklaması, çözüm değişince tüm türevlerin bayatlaması riski taşır.

**Alternatifler:**
1. **Tip başına sayfa/mantık:** 7 ayrı ekran, 7 ayrı kontrol. Kod tekrarı, bakım yükü.
2. **Tek dev switch/if-else motoru:** Tüm tipler tek fonksiyonda. Okunamaz, genişletilemez.
3. **Veri-tabanlı tip + plugin registry:** `soru_tipleri` katalog tablosu; her tip bir (renderer, validator) plugin çifti; tek `SoruEkrani` iskeletine tip bazlı yüzey takılır.

**Neden Bu Karar Alındı:**
"Tip = veri, motor = kod" ilkesi (ADR-007 hard-code yasağının uzantısı). `soru_tipleri` tablosu tipleri katalogda tutar (`aktif` bayrağı renderer hazır olmadan tipi açmayı engeller); frontend'de `Record<SoruTipi, {Renderer, validator}>` registry. Kritik gözlem: `kontrol.ts` zaten 8 hata tipli deterministik bir validator — yani motorun ilk plugin'i (`yevmiye`) fiilen yazılmış durumda. Tüm validator'lar **tek kaynaktan** beslenir: `cozum_satirlari`. Belge analizi belgeden, mizan analizi çözümlerden türetir — hiçbir tip ayrı cevap anahtarı saklamaz. İlk üç tip (yevmiye, hata bulma, çoktan seçmeli) mevcut çözüm verisinden *otomatik türetilebilir* — içerik üreticisine sıfır ek maliyet.

**Avantajları:**
- Yeni tip = yeni plugin + katalog satırı; mevcut ekranlara dokunulmaz.
- Cevap anahtarı tek kaynak → çözüm düzeltilince tüm türev sorular otomatik güncel.
- İlk 3 tip otomatik türetilir → içerik merkezliliğin ilk somut getirisi (S4'te görünür).
- Kontrol deterministik ve ücretsiz (AI değil) → güven + maliyet.

**Dezavantajları:**
- `config jsonb` tipe özel parametreleri tutar ama şeması kod içinde (tip başına) belgelenmeli — gevşeklik riski.
- Registry frontend'de; tip tanımı (DB) ile plugin (kod) senkron tutulmalı (`aktif` bayrağı bunu yönetir).
- Bazı tipler (ERP uygulama) simülasyona bağımlı — v2.2'ye ertelenir.

**Gelecekteki Etkileri:**
- Sınav modu (v1.1+) yeni tip değil, tiplerin zamanlı kompozisyonu — motor hazır.
- Registry React Native'e taşınabilir tasarlanacak (mobil, gelecek modül).
- `hata_bulma` tipi çeldiricileri `hata_kurallari`'ndan türetecek (katman-2 geri bildirimle aynı veri).

---

<a name="adr-009"></a>
## ADR-009 — Learning Engine tasarımı

**Durum:** Kabul Edildi · **İlişkili:** ADR-015

**Problem:**
v1 ilerlemeyi "soru çözüldü/çözülmedi" düzeyinde tutuyor (`ilerleme.dogru_mu`). Bu, "Elif KDV'de iyi ama tevkifatta zayıf" gibi bir çıkarım yapamaz — oysa kişiselleştirme, zayıf alan tekrarı ve "benzer senaryo" önerisi bunu gerektirir. Duolingo'nun skill-tree mantığının muhasebe karşılığı yok. Ayrıca seviye/zayıf-alan gibi türev bilgiler saklanırsa senkronizasyon borcu doğar.

**Alternatifler:**
1. **Soru bazlı ilerleme (mevcut):** Yalnız çözüldü/çözülmedi. Kişiselleştirme zayıf.
2. **Ünite bazlı ilerleme:** "Mal Alış %60". Ama aynı yetkinlik (KDV) birçok ünitede — ölçüm dağılır.
3. **Yetkinlik bazlı ilerleme:** Olaylar yetkinliklere ağırlıklı bağlı; XP yetkinlik başına dağıtılır; seviye/zayıf alan türetilir.

**Neden Bu Karar Alındı:**
Üniteler *navigasyon* eksenidir (nerede çalışıyorum), yetkinlikler *ölçüm* eksenidir (neyi ne kadar biliyorum) — ikisi ayrı. `kullanici_yetkinlikleri` (user_id + yetkinlik_id, xp, doğru/yanlış sayısı) mevcut `ilerleme`'nin *yanına* gelir, yerine değil. Doğru çözümde `ZORLUK_PUAN × olay_yetkinlikleri.agirlik` ilgili yetkinliklere dağıtılır. Kritik ilke (ADR-006 ile aynı): **türetilen saklanmaz** — seviye = XP eşik fonksiyonu, zayıf alan = başarı oranı + recency view'ı, toplam XP = sum. Mevcut puan/streak/rozet/liderlik korunur.

**Avantajları:**
- Kişiselleştirme mümkün: "tevkifatta 3 yanlış → şu 2 benzer olay".
- Seviye scaffold'u besler (ADR-004/010): yetkinlik arttıkça daha az destekli sorular.
- Mevcut motivasyon katmanı (puan/streak/rozet) sökülmez, üstüne eklenir — risk yok.
- Türev veri saklanmadığından senkron borcu yok.

**Dezavantajları:**
- Olay-yetkinlik ağırlıkları içerik üreticisinin ek işi (her olaya yetkinlik atama).
- XP dağıtımı çözüm anında trigger/uygulama işi — doğru kurulmazsa çift sayım riski.
- "Benzer senaryo" MVP'de deterministik SQL (yetkinlik kesişimi); embedding tabanlı benzerlik v2.2'ye ertelenir.

**Gelecekteki Etkileri:**
- Yetkinlik rozetleri ("KDV Ustası") mevcut rozet sistemini genişletir.
- Aralıklı tekrar (spaced repetition) v2.1'de yetkinlik bazlı kuyrukla gelir: aynı olay, farklı soru tipiyle 3–7–21 gün sonra → transfer ölçülür, ezber değil.
- Sertifika altyapısı = yetkinlik seviyeleri + sınav modu (gelecek modül).

---

<a name="adr-010"></a>
## ADR-010 — Simulation Engine tasarımı

**Durum:** Kabul Edildi · **İlişkili:** ADR-002, ADR-006

**Problem:**
Platform "uygulama platformu"ndan öteye "simülasyon platformu" olacak: öğrenci bir işletmenin dönemini kronolojik yaşayacak (kendi kasası, carileri, defteri, mizanı). Bu, tekil soru çözmekten yapısal olarak farklı — kalıcı bir işletme evreni, append-only defter, canlı mizan gerektirir. Sorun: bunu ayrı bir alt-sistem olarak kurmak içerik ve şemayı ikiye böler mi?

**Alternatifler:**
1. **Ayrı simülasyon içerik havuzu:** Simülasyon işlemleri sorulardan bağımsız. İçerik iki kez üretilir.
2. **Paralel simülasyon tabloları:** Cari/muavin/belge için ayrı "sim_" tabloları. Şema ikilenir.
3. **Evren deseni:** Cari/muavin/belge/olayda `isletme_id nullable`; null=global havuz, dolu=simülasyon. Simülasyon adımı = tarihli olay.

**Neden Bu Karar Alındı:**
İçerik merkezliliğin (ADR-002/007) doğal sonucu: simülasyon işlemi de "tarihli bir muhasebe olayı"dır — ayrı içerik tipi icat edilmez. `simulasyon_adimlari` (sıra + işlem tarihi + `olay_id`) aynı olay havuzunu kullanır. Evren deseni tek şemayı iki dünyaya hizmet ettirir: `isletme_id null` global havuz (bugünkü davranış), dolu ise o işletmenin özel evreni. `unique (isletme_id, olusturan_user_id, kod)` sayesinde her işletmenin kendi "100.01 Merkez Kasa"sı olur. Defter/mizan view (ADR-006). Tek işletme (Ticaret) ile çıkılır; motor beşine (ticaret/hizmet/üretim/e-ticaret/ihracat) göre tasarlanır ama tip `isletmeler.tip` verisidir, kod değil.

**Avantajları:**
- İçerik tek havuz, dört yüzey (bilgi/uygulama/simülasyon/mevzuat) — üretim maliyeti dörde katlanmaz.
- Evren deseni öğretmen panelinin "kurum evreni"ni bedavaya hazırlar (gelecek modül).
- İleri seviyede öğrenci kendi cari/muavinini açar (`olusturan_user_id`) — scaffold'un zirvesi.
- Hatalı kayıt mizanı bozar, ters kayıtla düzeltilir → gerçek muhasebe pratiği.

**Dezavantajları:**
- En büyük iş, en çok bağımlılık (evren + yevmiye + mizan + premium) — roadmap'te sona yakın (S8–S9); temeller oturmadan başlanırsa yeniden yazılır.
- `yevmiye_satirlari` ölçek/partition riski (ADR-006, V2-VERI-MODELI B6).
- Premium kapısı burada (ilk işletmenin ilk ayı ücretsiz, devamı Premium) — freemium dengesine bağlı.

**Gelecekteki Etkileri:**
- Beş işletme tipi yetkinlik içerikleri (bordro/üretim/ihracat) üretildikçe açılır.
- Sınav modu = dönem sonu toplu kontrol (adım bazlı anlık kontrolün alternatif modu).
- Kurum/sınıf evreni = `isletme_id` deseninin çok-kullanıcılı genişlemesi.

---

<a name="adr-011"></a>
## ADR-011 — Mevzuat versiyonlama

**Durum:** Kabul Edildi (S0 kararı #8) · **İlişkili:** ADR-012

**Problem:**
Muhasebe mevzuatı sürekli değişir (KDV oranları, tevkifat, istisna sınırları). "Güncel mevzuat" bir pazarlama vaadi değil, operasyonel bir süreç olmalı: bir oran değiştiğinde *hangi içeriğin eskidiğini* bilmek gerekir. v1'de bu soru hiç sorulamıyordu. Ayrıca her çözümün resmî bir dayanağı olmalı ("bu kayıt KDVK md.9'a dayanır") — ve bu dayanak halüsinasyona açık RAG değil, deterministik olmalı.

**Alternatifler:**
1. **Yalnız RAG (mevcut):** `mevzuat_chunklar` semantik arama. AI sohbeti için yeterli, çözüm dayanağı için "yaklaşık doğru" — halüsinasyon riski.
2. **Statik madde metni:** Çözüme madde metni gömülü. Değişiklik takibi imkânsız.
3. **Yapısal madde + versiyonlama:** `mevzuat_kaynaklar` + `mevzuat_maddeleri` (effective/expire_date, versiyon zinciri); RAG korunur, `madde_id` ile köprülenir.

**Neden Bu Karar Alındı:**
İki katman, tek köprü. RAG korunur (AI asistanın bağlamı, 3327 chunk, mevcut), yapısal katman eklenir (çözümlerin resmî referansı). `cozum_mevzuat` çözümü maddeye bağlar. Versiyonlama: madde değişince yeni satır + eskiye `expire_date` + `onceki_versiyon_id` zinciri; "T tarihinde geçerli madde" tek sorgu. **Gizli süper güç — etki analizi:** KDV oranı değişti → `cozum_mevzuat` üzerinden etkilenen tüm olaylar tek sorguyla admin'in "gözden geçir" kuyruğuna düşer. RAG "yaklaşık doğru bağlam" üretir (sohbete uygun); çözüm dayanağı deterministik FK ister (halüsinasyona yer yok).

**Avantajları:**
- Güncellik operasyonel süreç olur: "hangi içerik eskidi" tek sorgu.
- Her çözümün tıklanabilir, resmî mevzuat dayanağı (öğrenme zincirinin 7. halkası).
- RAG + yapısal katman birbirini tamamlar; mevcut RAG yatırımı korunur.
- Mevzuat tarayıcı sayfası SEO değeri (P1 #10) + "bu maddeyle ilgili senaryolar" ters bağlantısı.

**Dezavantajları:**
- Mevcut modelde madde *kimliği* ile *versiyonu* aynı tabloda karışık; `cozum_mevzuat.madde_id` belirli versiyon satırına pinliyor — güncelleme sonrası kırılgan (V2-VERI-MODELI C3). Düzeltme: kimlik/versiyon ayrımı, okuma anında tarihe göre çözümleme (S6/M8 öncesi).
- Madde CRUD + versiyon zinciri admin UI yatırımı ister.
- RAG chunk → yapısal madde eşlemesi (mevcut 3327 chunk) best-effort; eşleşmeyen null kalır.

**Gelecekteki Etkileri:**
- "Canlı ekonomi modu" mümkün: "2026 oranlarıyla" / "sınav yılı oranlarıyla" çözüm modları.
- TFRS/BOBİ FRS katmanı = mevzuat kaynak tipi genişlemesi + çözüm varyantı (VUK vs TFRS).
- Beyanname motoru (v2.2) mevzuat versiyonlamasıyla bağlanacak (oran değişimi → beyanname etkisi).

---

<a name="adr-012"></a>
## ADR-012 — AI Ready Architecture

**Durum:** Kabul Edildi · **İlişkili:** ADR-007, ADR-011

**Problem:**
Platform üç AI yüzeyi taşıyor (soru içi asistan, yanlış analizi, belge üretimi) ve "AI içerik önerisi" gelecekte gelecek. AI'ı yanlış katmana koymak iki felakete yol açar: (a) kontrolü/puanlamayı AI yaparsa öğrenci "haksız yanlış" hisseder ve her kontrolde LLM maliyeti sürdürülemez; (b) AI üretimi onaysız yayınlanırsa kalitesiz/yanlış içerik öğrenciye ulaşır.

**Alternatifler:**
1. **AI merkezli kontrol:** LLM cevabı değerlendirir. Güven + maliyet + tutarlılık felaketi.
2. **AI'sız sistem:** Hiç AI yok. Mevcut yatırım (3 Edge Function + RAG) çöpe gider, kişiselleştirme kaybolur.
3. **AI motorların müşterisi:** Kontrol deterministik (motor), AI açıklar ve üretir; puanlamayı asla AI yapmaz; üretim her zaman `taslak` doğar.

**Neden Bu Karar Alındı:**
İlke: **AI motorların müşterisidir, motor değildir.** Kontrol `kontrol.ts` + validator'larla deterministik (ADR-008); AI yalnız *açıklar* (yanlış analizi) ve *üretir* (belge/olay taslağı). Puanlamayı asla AI yapmaz — güven (öğrenci haksız yanlış hissetmemeli), maliyet (mevcut `ai_kullanim` kota tablosu bunun kanıtı), tutarlılık. Kritik yan getiri: v2'nin normalize modeli AI için *bedava* kazanım — olayın tüm bileşenleri (belge alanları, çözüm satırları, mevzuat metni, hata kuralları) ayrı ayrı adreslenebilir olduğundan prompt'lar kısa, tipli ve önbelleklenebilir (`ai_cevap_cache` deseni genişler). "AI-ready" ayrı iş paketi değil, veri modelinin yan ürünü.

**Avantajları:**
- Güven: kontrol deterministik, öğrenci puanına AI karışmaz.
- Maliyet: LLM yalnız açıklama/üretimde, her kontrolde değil.
- Yapısal veri → kısa/tipli/önbelleklenebilir prompt (mevcut RAG + cache deseni).
- Onay kapısı (`durum='taslak'`) AI içeriğini öğrenciden yalıtır.

**Dezavantajları:**
- Katman-2 hata kuralları (`hata_kurallari`) içerik üreticisinin ek işi (ama AI yanlış analizini isabetli/ucuz yapar).
- AI taslak üretimi insan onayına bağımlı — moderasyon iş yükü.
- Embedding tabanlı benzerlik (olay önerisi) v2.2'ye ertelendi (pgvector hazır ama kanıtlanmış ihtiyaca saklandı).

**Gelecekteki Etkileri:**
- Olay embedding'leri (v2.2) "benzer senaryo" ve AI içerik önerisini besleyecek.
- AI prompt'ları yapısal olay bağlamıyla (tablodan, serbest metinden değil) kurulacak.
- Yeni AI yüzeyleri hep aynı kuralı izleyecek: deterministik kontrol dokunulmaz, AI müşteri.

---

<a name="adr-013"></a>
## ADR-013 — Video kullanılmaması

**Durum:** Kabul Edildi (S0 kararı #7) · **İlişkili:** ADR-003

**Problem:**
Muhasebe eğitim pazarı video-kurs modeliyle dolu (Udemy, YouTube, dershane kayıtları). Platform bir video kütüphanesi mi olmalı, yoksa farklı bir şey mi? Video "kolay içerik" gibi görünür ama pasif izleme muhasebe becerisi kazandırmaz ve üretim/barındırma maliyeti yüksektir.

**Alternatifler:**
1. **Video merkezli:** Anlatım videoları + altında alıştırma. Pazarın standart modeli.
2. **Hibrit:** Video + interaktif. İki içerik hattı, iki maliyet.
3. **Video yok, belge/uygulama merkezli:** Öğrenme belgeyle karşılaşarak, yaparak olur.

**Neden Bu Karar Alındı:**
S0 #7 ile kesinleşti. Platformun tüm farklılaşması "yaparak düşünme"de (ADR-003, ADR-014). Video pasif tüketimdir; muhasebe becerisi (belgeden olaya çıkarım, kayıt yazma) aktif üretimle kazanılır. LeetCode video satmaz, problem çözdürür — muhasebe karşılığı bu. Ayrıca video üretimi/barındırması/güncellemesi (mevzuat değişince video yeniden çekilmeli!) sürdürülemez maliyet. Şemada video varlığı *yoktur*; içerik alanları BlockNote (teori), metin (senaryo), belge (uygulama).

**Avantajları:**
- Farklılaşma net: "izlenen" değil "çözülen" platform.
- Mevzuat değişince metin/veri güncellenir; video yeniden çekilmez (ADR-011 ile uyumlu).
- Üretim/barındırma maliyeti yok; içerik güncel tutulabilir.
- Pedagojik olarak üstün (aktif > pasif öğrenme).

**Dezavantajları:**
- Bazı kullanıcılar video bekler (pazar alışkanlığı) — konumlanmayla yönetilmeli.
- Görsel açıklama gereken konular (T hesabı, mizan akışı) için animasyon/interaktif görsel yatırımı gerekebilir (video değil).
- "Hızlı içerik" algısı yok — her içerik gerçek kurulum ister.

**Gelecekteki Etkileri:**
- Görsel öğretim ihtiyacı animasyon/interaktif bileşenle karşılanacak (T hesabı görselleştirmesi, P1 #8), video ile değil.
- Konu anlatım sayfaları (P1 #7) BlockNote metin + görsel, video değil.
- Bu ADR değişmedikçe hiçbir video altyapısı (player, storage, transcode) projeye girmez.

---

<a name="adr-014"></a>
## ADR-014 — Gerçek hayat senaryoları ile öğretim

**Durum:** Kabul Edildi (S0 kararı #8) · **İlişkili:** ADR-003, ADR-002

**Problem:**
Klasik muhasebe soruları soyut ve şablonlaşmıştır: "X malı 1000 TL'ye peşin alındı, kaydı yapınız." Bu, hesap ezberi test eder ama "muhasebeci gibi düşünme"yi öğretmez. Gerçek muhasebecinin karşısına soyut tutarlar değil, bağlamlı belgeler ve kararlar çıkar. Öğretim modeli soyut kalırsa öğrenci gerçek işe hazırlanmaz.

**Alternatifler:**
1. **Soyut/şablon sorular:** "X malı Y TL'ye alındı." Hızlı üretilir ama transfer değeri düşük.
2. **Yarı-gerçekçi:** Bağlam var, belge yok. Orta yol ama belge okuma öğretilmez.
3. **Tam gerçek hayat senaryosu + belge:** Bağlamlı anlatı ("ABC A.Ş.'den 3 ay vadeyle...") + gerçek belge.

**Neden Bu Karar Alındı:**
S0 #8 öğretim zincirini (belge → senaryo → uygulama → anlık kontrol → mantık → mevzuat) kesinleştirdi. `muhasebe_olaylari.senaryo` gerçek hayat anlatısıdır; belge (ADR-003) onu somutlaştırır. Öğrenci olayı *kendisi teşhis eder* ("bu veresiye satış") — soyut soruda bu çıkarım adımı yoktur. Tanıdık cariler (ABC A.Ş., Yıldız Ticaret) senaryolar arası süreklilik kurar; öğrenci bir "dünya" tanır. Bu, ADR-002'nin (olay merkezli) pedagojik yüzüdür.

**Avantajları:**
- Transfer değeri yüksek: öğrenilen beceri gerçek işe uyar.
- Belgeden olaya çıkarım adımı öğretilir (soyut soruda yok).
- Tanıdık cariler/işletmeler süreklilik ve aidiyet hissi yaratır.
- Simülasyona (ADR-010) doğal köprü — senaryolar zaten bir işletme dünyasında geçer.

**Dezavantajları:**
- Senaryo yazımı soyut sorudan pahalı (Content Engine + AI taslak dengeler).
- Gerçekçilik tutarlılığı ister (cari VKN, vergi dairesi, tutarlar mantıklı olmalı) — moderasyon yükü.
- Aşırı bağlam bazı öğrencide biliş yükü — scaffold (ADR-009) ile yönetilir.

**Gelecekteki Etkileri:**
- Cari kart kütüphanesi (ADR-016) platformun "tanıdık dünyası"nı besleyecek.
- Sektörel senaryolar (e-ticaret, ihracat) simülasyon tipleriyle (ADR-010) genişleyecek.
- Senaryo kalitesi ürün kalitesinin doğrudan göstergesi — moderasyon standartları buna göre.

---

<a name="adr-015"></a>
## ADR-015 — Yetkinlik (Skill) sistemi

**Durum:** Kabul Edildi · **İlişkili:** ADR-009, ADR-016

**Problem:**
Öğrenmeyi ölçmek için "hangi üniteyi bitirdi" yetmez — aynı yetkinlik (KDV) birçok üniteye dağılır (Mal Alış, Personel, İhracat hepsinde KDV var). Ünite bazlı ölçüm "Elif KDV'de zayıf" çıkarımını yapamaz. Ayrıca önkoşul mantığı (tevkifata girmeden KDV mahsubu otursun) ünitelerle kurulamaz. Kişiselleştirme, zayıf alan tekrarı ve seviye-bazlı scaffold bir ölçüm koordinat sistemi gerektirir.

**Alternatifler:**
1. **Ünite = yetkinlik:** Ölçüm ünite ilerlemesi. Aynı beceri birçok ünitede → ölçüm dağılır.
2. **Düz etiket:** Sorulara serbest etiket. Hiyerarşi/önkoşul yok, ölçüm zayıf.
3. **Hiyerarşik yetkinlik grafı:** `yetkinlikler` (self-FK hiyerarşi) + olaylara ağırlıklı M2M.

**Neden Bu Karar Alındı:**
Üniteler *navigasyon*, yetkinlikler *ölçüm* eksenidir (ADR-009). `yetkinlikler` hiyerarşiktir (kdv → kdv-mahsup → kdv-iade; kdv → tevkifat) — Duolingo skill-tree'sinin muhasebe karşılığı. Olaylara `olay_yetkinlikleri` ağırlıklı M2M ile bağlanır (bir olay: kdv 0.5, cari-hesap 0.5). Zayıf alan tespiti ve önkoşul mantığı ancak grafla mümkün. **Yetkinlik ≠ etiket:** yetkinlik ölçülen beceridir (XP taşır), etiket filtre/keşif aracıdır (`etiketler` ayrı tablo) — ikisi ayrıştırıldı çünkü v1'de `sorular.etiketler` her ikisini karıştırıyordu.

**Avantajları:**
- Ölçüm becerinin kendisinde toplanır, ünitelere dağılmaz.
- Hiyerarşi önkoşul + zayıf-alan-kök-neden analizini mümkün kılar.
- Scaffold seviyesini besler (ADR-004/010): yetkinlik seviyesi → destek düzeyi.
- "Benzer senaryo" önerisi yetkinlik kesişimiyle deterministik kurulur (ADR-009).

**Dezavantajları:**
- Her olaya yetkinlik ağırlığı atama içerik üreticisinin ek işi.
- Yetkinlik grafının doğru tasarımı domain uzmanlığı ister (yanlış hiyerarşi yanlış önkoşul).
- Yetkinlik ekseni navigasyona da açılırsa (SMMM adayı "tevkifat"tan girer) UI karmaşıklığı artar.

**Gelecekteki Etkileri:**
- Yetkinlik ekseni ikincil navigasyon olacak (üniteden değil beceriden giriş).
- Yetkinlik rozetleri + sertifika (gelecek modül) bu ölçüm altyapısına dayanacak.
- Aralıklı tekrar kuyruğu (v2.1) yetkinlik başarı oranıyla sürülecek (ADR-009).

---

<a name="adr-016"></a>
## ADR-016 — Çoktan çoğa ilişki mimarisi

**Durum:** Kabul Edildi · **İlişkili:** ADR-002, ADR-007

**Problem:**
İçerik yeniden kullanımı (ADR-007) ancak varlıklar bağımsız yaşayıp çok yönlü bağlanabilirse mümkün. v1'de belge ve muavin soruya *gömülüydü* (`sorular.belgeler`/`muavinler` jsonb) — bir belge yalnız bir soruda yaşardı, yeniden kullanılamazdı. Aynı fatura hem kayıt hem KDV sorusunda kullanılamıyor, aynı cari onlarca olayda tekrar tanımlanıyordu. jsonb hız kazandırdı ama yeniden kullanımı yapısal olarak imkânsız kıldı.

**Alternatifler:**
1. **jsonb gömme (mevcut):** Belge/muavin soruya gömülü. Hızlı ama yeniden kullanım yok, FK bütünlüğü yok.
2. **Kopyalama:** Her kullanımda belge/cari kopyalanır. Veri şişer, tutarsızlık (bir kopyayı düzeltmek diğerlerini düzeltmez).
3. **Normalize + M2M:** Varlıklar bir kez tanımlanır, junction tablolarıyla çok yönlü bağlanır.

**Neden Bu Karar Alındı:**
İçerik merkezliliğin (ADR-007) yeniden kullanılabilirlik matrisi ancak M2M ile kurulur: `olay_belgeleri` (bir belge N olayda, bir olay N belgede — SGK tahakkukunda tek olay bordro + tahakkuk fişi taşır), `olay_yetkinlikleri` (ağırlıklı, XP dağıtımı), `olay_etiketleri`, `olay_muavinleri` (dropdown evreni — eski `sorular.muavinler` jsonb'un normalize hali), `cozum_mevzuat`. Kritik ilke (V2-VERI-MODELI §6.1): **gösterim verisi jsonb, ilişkisel veri tablo.** Belge kalemleri, bordro detayı → jsonb (JOIN yapılmaz); cari/muavin/yetkinlik/mevzuat bağı → tablo+FK (bütünlük ve sorgu gerekir). v1'in iki aşırılığı da (her şey jsonb / her şey kopyalanmış) reddedildi.

**Avantajları:**
- Yeniden kullanım yapısal: cari N olayda, belge N soruda, muavin N olayda.
- FK bütünlüğü: cari silinmeden muavini silinemez (restrict); tutarsız içerik zorlaşır.
- Kullanım sayaçları sorgulanabilir ("bu cari kaç olayda").
- Etki analizi (ADR-011): `cozum_mevzuat` üzerinden "bu madde hangi çözümleri etkiler".

**Dezavantajları:**
- jsonb'a göre daha çok tablo + daha çok RLS politikası + daha çok index.
- M7 geçişinde jsonb → M2M backfill riski: soru-yerel muavin dedupe'unda çapraz-soru çakışması (aynı kod farklı cari) — soru-kapsamlı çözümle önlenir (ADR-005, V2-VERI-MODELI C6).
- Aşırı normalizasyon tuzağı: bu bir eğitim platformu, muhasebe yazılımı değil — belge kalemleri ve beyanname etkisi bilinçli jsonb'da tutuldu.

**Gelecekteki Etkileri:**
- Her yeni ilişki "gömülü mü, M2M mi" kararında §6.1 kuralına tabi (gösterim=jsonb, ilişki=tablo).
- Cari/muavin kütüphanesi (admin) kullanım sayaçlarıyla yönetilecek.
- `beyanname_etkileri` ve `hata_kurallari` jsonb'ları, motor olgunlaşınca (v2.2) tabloya terfi edebilir — ihtiyaç kanıtlanınca.

---

<a name="adr-017"></a>
## ADR-017 — Yetkinlik/etiket bağının olay düzeyine taşınması

**Durum:** Kabul Edildi (7 Temmuz 2026) · **İlişkili:** ADR-002, ADR-009, ADR-015, ADR-016

**Problem:**
Yetkinlik (ölçüm ekseni, ADR-015) ve etiket (keşif ekseni) içerikle çoktan çoğa bağlanır. M2 migration'ı (`katalog_yetkinlik_etiket_sorutipi`, 6 Tem 2026) bu M2M'leri — `soru_yetkinlikleri`, `soru_etiketleri` — pragmatik olarak **`sorular`** tablosuna bağladı; çünkü aggregate root `muhasebe_olaylari` henüz yoktu (M5). M2 kendi başlık yorumunda bunu açıkça geçici işaretledi: *"M2M'ler şimdilik `sorular`'a bağlı (olay tablosu M5'te gelecek). M5'te yetkinlik/etiket bağının olay düzeyine taşınması değerlendirilecek."* M5'e gelindiğinde bu değerlendirme kararı zorunlu hale geldi: bağ soru düzeyinde mi kalmalı, olay düzeyine mi taşınmalı? ADR-015 hedefi (olaylara ağırlıklı `olay_yetkinlikleri`) ile M2'nin geçici uygulaması arasındaki gerilim çözülmeliydi.

**Alternatifler:**
1. **Soru düzeyinde kal (`soru_yetkinlikleri`/`soru_etiketleri`):** Bağ instance'ta. Ama 1 olay → N soru olduğundan aynı yetkinlik profili N kez kopyalanır.
2. **Çift düzey (hem soru hem olay):** Olay varsayılan, soru override. MVP'de kanıtlanmamış ihtiyaç; iki kaynak senkron borcu.
3. **Olay düzeyine taşı (`olay_yetkinlikleri`/`olay_etiketleri`), boş soru M2M'lerini düşür:** Tek kaynak, sapma yok.

**Neden Bu Karar Alındı:**
Yetkinlik *olayın* öğrettiği beceridir, sorunun değil — "veresiye satış" olayı kdv + cari-hesap öğretir; ondan türeyen `yevmiye_kaydi`, `hata_bulma`, `coktan_secmeli` soruları **aynı** profili paylaşır. Ağırlık soru düzeyinde tutulursa: (a) profil N kez kopyalanır ve sapabilir (bir soruda kdv 0.5, kardeşinde 0.4 → tutarsız XP), (b) "benzer senaryo" önerisi kardeş soruları "benzer" gösterip gürültü üretir, (c) XP dağıtımı (ADR-009) çift kaynaktan hesaplanır. Karar anında `soru_yetkinlikleri` ve `soru_etiketleri` **0 satır** taşıyordu ve hiçbir kod bunları okumuyordu — taşıma **sıfır backfill maliyeti** ve **sıfır regresyon** demekti. Bu yüzden boş tablolar M5'te düşürüldü, `olay_yetkinlikleri`/`olay_etiketleri` kuruldu. **Sınır:** `sorular.tip`'in ima ettiği yetkinlik (örn. `hata_bulma` → `hata-bulma`) per-soru saklanmaz; `soru_tipleri`→yetkinlik türevi olarak katalog/kod düzeyinde çözülür. Per-soru override yolu (Alternatif 2) kapatılmaz — ihtiyaç kanıtlanırsa v2.2'de `soru_yetkinlik_override` olarak açılır (ADR-016 "ihtiyaç kanıtlanınca" ilkesi).

**Avantajları:**
- Ölçüm tek kaynakta (olay); N kardeş soru arası sapma imkânsız.
- XP dağıtımı (ADR-009) olay-yetkinlik ağırlığından tek hesap — çift sayım riski azalır.
- "Benzer senaryo" olay kesişiminde anlamlı (kardeş soru gürültüsü yok).
- Yeni soru tipi eklemek ağırlığı etkilemez (tip = render, yetkinlik = olay özelliği).
- Karar boş tablolarda alındığı için maliyetsiz ve geri dönüşü ucuz.

**Dezavantajları:**
- `sorular`'ı doğrudan yetkinliğe bağlayan sorgular artık `sorular ⋈ muhasebe_olaylari ⋈ olay_yetkinlikleri` join'i ister (bir seviye derinlik).
- Bir M2M bağının yönünü değiştirmek — proje anayasa disiplini gereği bir ADR gerektirdi (bu belge). M2'nin geçici uygulaması "salınım" gibi görünebilir; gerçekte planlı netleşmedir (M2 yorumu öngörmüştü).
- Per-soru override gerçekten gerekirse v2.2'de eklenecek — ertelenmiş karar.

**Gelecekteki Etkileri:**
- Learning Engine (ADR-009, M9) XP'yi `olay_yetkinlikleri` üzerinden dağıtacak; `kullanici_yetkinlikleri` bu kaynaktan beslenir.
- İçerik geçişinde her olaya yetkinlik ağırlığı atanması içerik üreticisinin işi olacak (M5'te tablo boş bırakıldı; otomatik türetme riskli bulundu).
- `soru_yetkinlikleri`/`soru_etiketleri` tabloları bir daha kurulmayacak; bu isimler emekliye ayrıldı. Yetkinlik/etiket her zaman olay düzeyinde.
- Per-soru override (v2.2, kanıtlanırsa) bu ADR'ye ek olarak ayrı bir ADR ile gelir.

---

<a name="adr-018"></a>
## ADR-018 — Belge tiplerinin katalog tablosu olarak modellenmesi

**Durum:** Kabul Edildi (7 Temmuz 2026) · **İlişkili:** ADR-003, ADR-008, ADR-016 · **Yerini aldığı karar:** V2-VERI-MODELI §5 (`belge_tip` enum)

**Problem:**
Belge tipi (satış faturası, alış faturası, dekont, bordro…) modelde nasıl temsil edilmeli? V2-VERI-MODELI §5 bunu bir **enum** (`belge_tip`) olarak öngörmüş, gerekçesi "her belge tipi bir render şablonu gerektirir, yani kod değişikliği zaten şart" idi ve §5'in kendi karar kuralı belge tipini "sınırda" işaretlemişti. M6 (Belgeler Modülü) tasarımına gelindiğinde bu sınır kararı netleştirilmeliydi: enum mü, `soru_tipleri` gibi bir katalog tablosu mu?

**Alternatifler:**
1. **`belge_tip` enum (V2-VERI-MODELI §5):** Sabit değer kümesi. Yeni tip = `ALTER TYPE` migration. Metadata taşıyamaz.
2. **`belge_tipleri` katalog tablosu:** id (text PK) + ad + kategori + varsayilan_yon + gerekli_alanlar + thiings_icon + aktif + sira. Yeni tip = satır ekleme.

**Neden Bu Karar Alındı:**
Belge tipi, `soru_tipleri` (ADR-008) ile *aynı doğaya* sahiptir: her tip bir render-plugin çiftine (görsel şablon + alan doğrulama) karşılık gelir ve renderer hazır olmadan tipin açılmaması gerekir — bu tam olarak `soru_tipleri.aktif` bayrağının çözdüğü problemdir. Ayrıca belge tipi **yapısal metadata** taşır: `kategori` (ticari/mali/resmi/bordro — gruplama, ikon), `varsayilan_yon` (satış→giden, bordro→ic), `gerekli_alanlar` (render + doğrulama ipucu) — enum bunların hiçbirini taşıyamaz. Son olarak belge tipleri **ürün kararıyla çoğaldı**: v1'de 5 (`fatura/perakende-fis/cek/senet/dekont`), V2 hedefinde 10+, M6'da ~13 (irsaliye, SMM makbuzu, gider pusulası, bordro, tahakkuk fişi, beyanname, amortisman listesi eklendi). Enum bu büyümeyi her seferinde migration'la öderken tablo satır ekler. `soru_tipleri`'nde aynı gerekçeyle tablo seçildiğinden, tutarlılık da tabloyu gerektirir.

**Avantajları:**
- `soru_tipleri` ile birebir tutarlı katalog mantığı (tek zihinsel model, tek RLS şablonu — Katalog).
- `aktif` bayrağı: renderer hazır olmadan tip içerikte açılmaz (belge render şablonu = frontend plugin).
- Tip başına metadata (kategori/ikon/varsayılan yön/gerekli alanlar) veride yaşar, kodda dağılmaz.
- Yeni belge tipi eklemek migration değil seed satırıdır → içerik/katalog disipliniyle yönetilir.

**Dezavantajları:**
- Belge insert'inde `belge_tipi` FK lookup (enum sabitine göre mikro maliyet) — ihmal edilebilir.
- Tip listesi artık veridir; katalog seed'i güncel tutulmalı (soru_tipleri ile aynı disiplin).
- V2-VERI-MODELI §5'in "enum" kararı güncellenmeli (bu ADR ile yapıldı).

**Gelecekteki Etkileri:**
- `belge_tipleri` M6a'da kurulur ve seed'lenir; belge render şablonları (fatura/dekont/bordro görselleri) `aktif` bayrağıyla kademeli açılır.
- OCR / AI belge analizi (gelecek) belge tipini bu katalogdan çözer; tip başına `gerekli_alanlar` OCR alan çıkarımını ve AI prompt şablonunu besler.
- `belge_yon` **enum** olarak kalır (gelen/giden/ic) — o *domain doğası gereği* sabittir (§5 karar kuralı); yalnız *belge tipi* tabloya taşınır. `ic` değerinin eklenmesi ADR-003'ün "belge_yon='ic'" açık kararının kapanışıdır.

**Ek karar (kapsam):**
Belge verisinin normalize modele geçişi (mevcut `sorular.belgeler` jsonb → `belgeler` + `olay_belgeleri`) **M6a'da yapılmayacaktır.** M6a yalnız *yapıyı* kurar (`belge_tipleri`, `belgeler`, `olay_belgeleri`, RLS, index, belge tipi seed'i); mevcut jsonb veri kaybı olmadan yerinde kalır. Normalize geçiş **ayrı ve kontrollü bir migration'da (M6b)** yapılır: 28 sorudaki jsonb incelenir, normalize belgeye çevrilir, `olay_belgeleri` bağlanır, `cari_id` eşlemesi best-effort değil **raporlu** yürütülür. Gerekçe: M5'in etiket-backfill dersi — otomatik/kör taşıma yanıltıcıdır; yapı ile geçiş ayrıştırılır.

**Netleştirme (`belgeler.satirlar` ≠ muhasebe fişi):** `belgeler.satirlar` jsonb'u belgenin **kalemleridir** (ürün/hizmet satırları: ad, miktar, birim fiyat, iskonto) — yalnız gösterim, JOIN yapılmaz (ADR-016 §6.1). Bu **muhasebe fişi satırı DEĞİLDİR.** Yevmiye kaydının borç/alacak satırları `cozum_satirlari`'dır (M7) ve `muavin_id` NOT NULL FK ile ana hesaba kayıt yasağına tabidir (ADR-005). İki kavram farklı katmanlardır ve karıştırılmamalıdır: belge satırı = *ne alındı/satıldı* (fatura kalemi); fiş satırı = *hangi hesaba borç/alacak yazıldı* (muhasebe kaydı).

---

<a name="adr-019"></a>
## ADR-019 — Cevap anahtarı ile kullanıcı cevabının ayrıştırılması

**Durum:** Kabul Edildi (7 Temmuz 2026) · **İlişkili:** ADR-002, ADR-004, ADR-005, ADR-008, ADR-009

**Problem:**
M7 (Çözümler) tasarımında `cozumler`/`cozum_satirlari` tablolarının *ne olduğu* iki farklı kavramı barındıracak biçimde belirsizdi: (a) sistemin **cevap anahtarı** (bir olayın doğru yevmiye kaydı) mı, yoksa (b) **kullanıcının denemesi** (öğrencinin yazdığı kayıt) mi? Bu ikisi karışırsa üç ciddi hata doğar: kullanıcı-başına çözüm satırı → ölçek patlaması (10k kullanıcı × sorular × satırlar); `ilerleme` ile çift kayıt (aynı sonuç iki yerde); ve puanın yanlış katmanda (cevap anahtarında) tutulması. Bu, ileride sistemin en çok karışacak sınırıdır.

**Alternatifler:**
1. **Tek tablo, iki rol:** `cozumler` hem cevap anahtarını hem kullanıcı denemesini tutar (bir `user_id` bayrağıyla). Ölçek + çift kayıt felaketi.
2. **Cevap anahtarı = `cozumler`; kullanıcı cevabı ayrı katman** (`ilerleme` soru modu, `yevmiye_*` simülasyon).

**Neden Bu Karar Alındı:**
`cozumler`/`cozum_satirlari` **yalnız cevap anahtarıdır** — olay aggregate'inin (ADR-002) parçası, içerik üreticisi tarafından yazılır, kullanıcı denemesi **asla** burada saklanmaz. Kullanıcının cevabı katmana göre ayrışır: **soru modu → `ilerleme`** (mevcut tablo: dogru_mu, süre), **simülasyon → `yevmiye_kayitlari`/`yevmiye_satirlari`** (M10, append-only). Kontrol (`kontrol.ts`) kullanıcının cevabını cevap anahtarına karşı **deterministik** doğrular (ADR-012, AI değil); sonuç `ilerleme`ye yazılır. Puan/XP **türetilir** (ADR-009: `ZORLUK_PUAN × olay_yetkinlikleri.agirlik`), cevap anahtarında saklanmaz. Bu ayrım ADR-008'in ("validator'lar tek kaynak `cozum_satirlari`'ndan beslenir") ve ADR-009'un ("türetilen saklanmaz") M7'deki doğrudan sonucudur.

**Avantajları:**
- Ölçek doğru yerde: cevap anahtarı **içerikle** büyür (küçük); kullanıcı verisi `ilerleme`/`yevmiye` katmanında (M10 partition stratejisi orada).
- Çift kayıt yok: sonuç tek yerde (`ilerleme`); cevap anahtarı salt-okunur referans.
- Aynı cevap anahtarı N tüketiciye hizmet eder: soru modu, simülasyon, çok kullanıcılı atölye, eğitmen değerlendirmesi, AI yanlış analizi.
- M10 simülasyonu ve sınav modu bedavaya doğru modelde: aynı anahtar, ayrı kullanıcı-store.

**Dezavantajları:**
- İki kavramı ayrı tutmak disiplin ister; "kullanıcının çözümü" ifadesi kodda/dokümanda dikkatli kullanılmalı (hangi katman?).
- Kullanıcı cevabı iki yerde (soru→ilerleme, sim→yevmiye) — birleşik "tüm denemelerim" görünümü join ister.

**Gelecekteki Etkileri:**
- M10 `yevmiye_satirlari` kullanıcı cevabını tutar ve `cozum_satirlari`'na karşı doğrulanır — ayrım burada kritik kazanç.
- Eğitmen paneli / çok kullanıcılı atölye: öğrenci `ilerleme`/`yevmiye`'si cevap anahtarına karşı okunur; anahtar paylaşılan salt-okunur içerik.
- AI çözüm analizi (`ai-yanlis-analizi`) girdisi = (kullanıcı cevabı, `cozum_satirlari`, `hata_kurallari`); AI müşteridir, anahtarı üretmez (ADR-012).
- ADR-005'in açık kararı (`cozum_satirlari` denge + min-2-satır bütünlüğü) M7'de trigger'larla kapatılır — cevap anahtarı dengesiz olamaz (yoksa her öğrenci haksız "yanlış"a düşer).

---

<a name="adr-020"></a>
## ADR-020 — Cevap anahtarı başlığının ayrı tablo olarak modellenmesi

**Durum:** Kabul Edildi (7 Temmuz 2026) · **İlişkili:** ADR-002, ADR-019 · **Yerini aldığı yaklaşım:** V2-VERI-MODELI §2.2 (`cozumler` repurpose)

**Problem:**
Cevap anahtarı iki grain'den oluşur: **başlık** (bir çözüm/varyant — olay_id, varyant, muhasebe mantığı, beyanname_etkileri, hata_kurallari) ve **satır** (muavin_id + borç/alacak). Satırların bağlanacağı başlık nereye konmalı? V2-VERI-MODELI §2.2 mevcut `cozumler` tablosunu *başlık grain*'ine "yeniden yapılandırmayı" (repurpose) öngörüyordu. Ancak `cozumler` bugün *satır grain*'inde (256 satır; `soru_id/sira/kod` NOT NULL) ve `kontrol.ts` bu şekli okuyor. Aynı tabloya başlık satırları eklemek, legacy NOT NULL kısıtlarının gevşetilmesini ve tek tabloda iki grain'in (legacy satır + yeni başlık) yaşamasını gerektiriyordu.

**Alternatifler:**
1. **`cozumler`'i repurpose et (§2.2):** Başlık kolonlarını `cozumler`'e ekle, `soru_id/sira/kod` NOT NULL'ı gevşet. → mixed-grain + legacy semantik değişimi.
2. **Başlıksız, satır doğrudan olaya bağlı:** varyant/mantık/beyanname/hata metadata'sı kaybolur (olaya konamaz — çok varyant; satıra konamaz — çözüm düzeyi). Reddedildi.
3. **Ayrı başlık tablosu (`cozum_basliklari`):** Yeni temiz tablo; `cozumler`'e hiç dokunulmaz.

**Neden Bu Karar Alındı:**
Alternatif 3 seçildi. `cozum_basliklari` (yeni: olay_id NOT NULL, varyant, varyant_adi, aciklama, beyanname_etkileri, hata_kurallari) başlık grain'ini temiz tutar; `cozum_satirlari.baslik_id` buraya bağlanır. **Legacy `cozumler` tablosuna hiç dokunulmaz** — kolon eklenmez, NOT NULL gevşetilmez, semantik değişmez; `kontrol.ts` bozulmadan dual-read'e devam eder (M11'de drop). Alternatif 1'in bedeli (mixed-grain, NOT NULL gevşetme, legacy semantik kirliliği) alternatif 3'te tümüyle ortadan kalkar; karşılığında geçiş döneminde üç tablo (`cozumler` legacy + `cozum_basliklari` + `cozum_satirlari`) yaşar, M11'de legacy düşünce temiz `başlık + satır` ikilisi kalır.

**Avantajları:**
- Legacy `cozumler` **hiç değişmez** → `kontrol.ts` + 70 mevcut soru sıfır risk.
- Mixed-grain yok; her tablo tek grain (temiz semantik, temiz kısıtlar).
- `unique(olay_id, varyant)` düz constraint (partial index hackine gerek yok).
- Başlık metadata'sı (varyant/mantık/beyanname/hata) doğru düzeyde, tek yerde.

**Dezavantajları:**
- Geçiş döneminde üç tablo (kavramsal yük); M11'e kadar legacy `cozumler` + yeni ikili birlikte.
- V2-VERI-MODELI §2.2 güncellenmeli (bu ADR ile).
- İsimlendirme: kalıcı `cozum_basliklari`; istenirse M11 sonrası `cozumler`'e rename edilebilir (zorunlu değil).

**Gelecekteki Etkileri:**
- M7b (karar/rapor) ve ileriye-dönük içerik `cozum_basliklari`/`cozum_satirlari`'na yazar; legacy `cozumler` yeni içerik almaz.
- M11: legacy `cozumler` drop; opsiyonel `cozum_basliklari→cozumler` rename kararı orada verilir.
- Bütünlük (denge + min-2-satır) `cozum_satirlari` üzerinde deferred constraint trigger ile (ADR-005 açık kararının kapanışı).

---

## Ek: ADR bağımlılık haritası

```
ADR-001 (DDD)
  ├── ADR-002 (Olay merkezli) ──┬── ADR-007 (İçerik merkezli) ── ADR-012 (AI Ready)
  │                             ├── ADR-008 (Question Engine)
  │                             └── ADR-016 (M2M mimarisi)
  ├── ADR-003 (Belge merkezli) ─┬── ADR-013 (Video yok)
  │                             ├── ADR-014 (Gerçek senaryo)
  │                             └── ADR-018 (Belge tipleri katalog) ── ADR-008 (Question Engine kataloğu deseni)
  ├── ADR-004 (Muavin zorunlu) ─── ADR-005 (Ana hesap yasağı)
  ├── ADR-006 (Defter/Mizan view) ─ ADR-010 (Simulation Engine)
  ├── ADR-009 (Learning Engine) ─── ADR-015 (Yetkinlik sistemi) ─── ADR-017 (Yetkinlik/etiket olay düzeyinde)
  ├── ADR-011 (Mevzuat versiyonlama)
  └── ADR-019 (Cevap anahtarı ≠ kullanıcı cevabı) ─── ADR-020 (Cevap anahtarı başlığı ayrı tablo)
```

## Ek: Açık kararlar (ADR'lere bağlı, henüz kesinleşmemiş)

Bu noktalar ilgili ADR'lerde "Dezavantajlar/Gelecek Etkiler" olarak işaretlendi; migration öncesi veya ilgili sprint'te kesinleşecek:

| Konu | Bağlı ADR | Ne zaman |
|---|---|---|
| Varsayılan muavin seçim mekanizması (`varsayilan` bayrağı mı, sira mı) | ADR-004 | M1 seed öncesi |
| `belge_yon='ic'` (iç fişler: açılış/kapanış/amortisman) | ADR-003 | M6/enum finalize |
| Global havuzda belgenin "kendi tarafı" | ADR-003 | M6 öncesi |
| Şablon (template) varlığının şemadaki yeri | ADR-007 | S7 öncesi |
| Cari tip ↔ ana_kod uyum lint'i | ADR-016 | ilgili sprint |
| Mevzuat kimlik/versiyon ayrımı | ADR-011 | M8 öncesi |
| `cozum_satirlari` denge + min-2-satır bütünlüğü | ADR-005 | M7 |
| `yevmiye_satirlari` partition stratejisi | ADR-006/010 | v2.1 ölçek |

---

**Bu belge dondurulmuştur.** Herhangi bir ADR'den sapma, yeni bir ADR (ADR-021+) açmayı ve ilgili kararı `Yerini Aldı` olarak işaretlemeyi gerektirir. Kod, migration ve içerik üretimi bundan sonra bu 20 karara referansla ilerler.
