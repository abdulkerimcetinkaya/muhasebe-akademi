# ADR-002 — Keşfet ile V2 öğrenme çekirdeğinin sorumluluk sınırı

## Durum

Accepted — 2026-08-09

Ürün sahibi 2026-08-09 tarihinde TODO listesinin sonuna kadar uygulanması talimatıyla bu sınırı onayladı.

## Bağlam

Keşfet bugün kullanıcıya içerik sunan çalışan bir yapıdır:

- `kesfet_kartlar → kesfet_bolumler → kesfet_itemler` müfredat hiyerarşisini taşır.
- `/kesfet`, `/kesfet/:kart` ve `/kesfet/:kart/:item` rotaları ilerlemeli açılımı sağlar.
- `kesfet_itemler.icerik`, BlockNote JSON olarak anlatımı ve `kontrol`/`kayit` gibi etkileşimleri saklar.
- `kesfet_ilerleme`, kullanıcının bir dersi tamamladığını izler.
- Aynı altyapı ADR-001 uyarınca `tip = 'isletme'` kayıtları için İşletmeler dönem simülasyonunda da kullanılır.

V2 mimarisi ise muhasebe alanının tekil gerçeklerini ayrı, normalize yapılarla tanımlar:

- `muhasebe_olaylari`: ekonomik olay aggregate root'u,
- `belgeler` ve `olay_belgeleri`: olaya bağlı kanıtlar,
- `sorular`: olayın ölçümlü soru örnekleri,
- `cozum_basliklari` ve `cozum_satirlari`: cevap anahtarı,
- `yetkinlikler` ve `olay_yetkinlikleri`: ölçülen mesleki kazanımlar,
- `ilerleme_kaydet` ve `kullanici_yetkinlikleri`: Learning Engine,
- `mevzuat_kaynaklar`, `mevzuat_maddeleri`, `mevzuat_madde_versiyonlari` ve `cozum_mevzuat`: tarihçeli mevzuat bağlantısı.

Bu iki yapı açık bir sınır olmadan genişletilirse olay, soru, çözüm, yetkinlik ve mevzuat bilgileri BlockNote JSON ile V2 tablolarında iki kez tutulabilir. Böyle bir paralellik içerik tutarsızlığına, iki farklı ilerleme anlamına ve parçalı admin yönetimine yol açar.

İlgili kabul edilmiş kararlar:

- `ADR-V2.md` ADR-002: Muhasebe olayı merkezdedir.
- `ADR-V2.md` ADR-003: Öğrenme belge merkezlidir.
- `ADR-V2.md` ADR-008: Ölçümlü sorular Question Engine tarafından yönetilir.
- `ADR-V2.md` ADR-009 ve ADR-015: Başarı Learning Engine ve yetkinliklerle ölçülür.
- `ADR-V2.md` ADR-011 ve ADR-021: Mevzuat tarihçeli ve yapısaldır.
- `DD-001`: Öğrenme gerçek işletme olayları üzerinden görev tabanlıdır.
- `DD-004`: Temel başarı ölçütü mesleki yetkinliktir.
- `DD-005`: Mevzuat ayrı yol değil, olayın parçasıdır.

## Karar

### 1. Keşfet müfredat orkestrasyon ve sunum katmanıdır

Keşfet aşağıdakilerden sorumludur:

- Temeller, Yetkinlikler ve Uzmanlıklar hiyerarşisi,
- kart, bölüm ve ders sırası,
- dersler ve yollar arasındaki eğitimsel ön koşullar,
- kullanıcıya başlangıç, mevcut konum, sıradaki ders ve kilit nedenini gösterme,
- dersin editoryal anlatımı, kısa örnekleri ve ölçüm amacı taşımayan öz-kontrolleri,
- ders düzeyindeki tamamlanma ve yolculuk durumu.

Keşfet; muhasebe olayının, belgenin, ölçümlü sorunun, cevap anahtarının, mesleki yetkinliğin veya mevzuat maddesinin kaynak-of-truth'u değildir.

### 2. V2 çekirdeği alan gerçeği ve ölçüm katmanıdır

Aşağıdaki veriler kendi V2 tablolarında tekil olarak tutulur:

- ekonomik olay ve senaryosu,
- gerçek veya temsili muhasebe belgesi,
- puanlanan soru ve soru tipi yapılandırması,
- doğru çözüm ve yevmiye satırları,
- olay–yetkinlik ilişkisi,
- kullanıcı cevapları ve ölçülmüş yetkinlik ilerlemesi,
- mevzuat maddesi, sürümü, yürürlük tarihi ve çözüm bağlantısı.

Keşfet dersi bu varlıklara kimlikle referans verir; aynı veriyi kendi içerik JSON'una kopyalamaz.

### 3. Ders içeriği ile ölçümlü etkileşim ayrılır

`kesfet_itemler.icerik` içinde kalabilecek içerikler:

- başlıklar, metinler, tablolar ve görsel anlatım,
- açıklayıcı yevmiye/T-hesabı/bilanço örnekleri,
- puanlanmayan, yetkinlik güncellemeyen kısa öz-kontroller,
- yapılandırılmış mevzuat kaynağına açılan bağlamsal işaretler.

Question Engine'e taşınması veya oraya referans vermesi gereken içerikler:

- doğru/yanlış sonucu kalıcı kaydedilen sorular,
- geçme koşuluna etki eden alıştırmalar,
- yetkinlik veya zayıf alan güncelleyen denemeler,
- gerçek belge, olay ve normalize cevap anahtarı gerektiren kayıt görevleri.

Bir BlockNote etkileşimi Learning Engine'e yazmıyorsa arayüzde ölçümlü sınav veya kazanılmış yetkinlik izlenimi vermemelidir.

### 4. İlerleme iki ayrı anlamla korunur

- `kesfet_ilerleme`: dersin/yolculuk adımının tamamlanmasıdır.
- Çekirdek `ilerleme` + `kullanici_yetkinlikleri`: ölçümlü soru sonucu ve mesleki yetkinlik kanıtıdır.

Bu kayıtlar birleştirilmez ve mevcut veriler taşınarak yeniden yorumlanmaz. Bir ders, tanımlı ölçümlü sorular içeriyorsa ders tamamlama kuralı bu soruların açık başarı koşulunu kontrol edebilir; ancak yetkinlik yalnız `ilerleme_kaydet` üzerinden güncellenir.

Ön koşulun “ders tamamlandı” veya “yetkinlik kanıtlandı” olacağı her ilişki için açıkça tanımlanır. Sessiz varsayım yapılmaz.

### 5. Mevzuat bağlamsal ve tarihçeli destek katmanıdır

Mevzuat ayrı bir Keşfet ana alanı veya paralel müfredat değildir. Üretimde kullanılacak mevzuat gerçeği yapılandırılmış, tarihçeli V2 mevzuat tablolarındadır. Sözlük ve RAG gösterim/arama yardımcılarıdır; mevzuat maddesinin ikinci kaynağı sayılmaz.

Ders, olay veya çözüm mevzuata bağlanırken:

- madde kimliği ve işlem tarihinde geçerli sürüm kullanılır,
- kaynak URL ve yürürlük bilgisi gösterilebilir,
- uzun mevzuat metni ders JSON'una kopyalanmaz,
- insan onayı bulunmayan mevzuat üretim içeriği olarak yayınlanmaz.

### 6. İşletmeler ayrımı korunur

ADR-001 ile kabul edilen `tip = 'isletme'` kullanımı bu kararla kaldırılmaz. Ancak Keşfet tablolarının yeniden kullanılması, V2 alan gerçeklerinin İşletmeler içerik JSON'unda çoğaltılmasına izin vermez.

İşletmeler için mevcut deterministik istemci tarafı defter yaklaşımı çalışmaya devam eder. Bunun uzun vadede `ADR-V2.md` ADR-010 Simulation Engine ile birleşip birleşmeyeceği bu ADR'nin konusu değildir ve ayrı bir karar gerektirir.

### 7. Geçiş additive ve pilot odaklıdır

- Mevcut Keşfet rotaları, tasarım dili, içerik ve ilerleme kayıtları korunur.
- Yeni ilişki modeli ancak ayrı migration incelemesinden sonra additive olarak eklenir.
- Önce tek bir uçtan uca pilot ders bağlanır; pilot doğrulanmadan tüm müfredat dönüştürülmez.
- Admin, son kullanıcıdan gizli olanlar dahil tüm durum ve bağlantıları görebilir.
- Yayın kontrolü eksik olay, belge, çözüm, yetkinlik veya mevzuat bağını görünür kılar.

## Veri sözleşmesi ilkeleri

Bu ADR belirli bir tablo/kolon tasarımını kabul etmez; uygulama migration'ından önce aşağıdaki sözleşmenin ayrı teknik tasarımda netleştirilmesini zorunlu kılar:

1. Bir ders sıralı olarak sıfır veya daha çok ölçümlü soruya bağlanabilmelidir.
2. Ölçümlü soru zaten `sorular.olay_id` ile olaya bağlı olduğundan ders–olay ilişkisi gereksiz yere ikinci kez tutulmamalıdır; doğrudan olay bağlantısı yalnız soru olmadan olay anlatımı gereken kullanım kanıtlanırsa eklenmelidir.
3. İlişki; sıra, zorunluluk, minimum başarı ve destek seviyesi gibi öğrenme bağlamını taşıyabilmelidir.
4. Ön koşullar kart, bölüm, ders veya yetkinlik hedefini açık türle belirtmelidir; serbest metin ya da belirsiz slug dizileri kalıcı sözleşme sayılmaz.
5. Silme davranışı kullanıcı ilerlemesini veya çekirdek içeriği zincirleme yok etmemelidir.
6. RLS; yayınlanmış içeriği öğrenciye, tüm durumları içerik adminine göstermelidir.
7. Aynı ilişki `tip = 'isletme'` kayıtlarına otomatik uygulanmamalıdır.

## Değerlendirilen alternatifler

### Alternatif A — Her şeyi BlockNote/Keşfet içinde tutmak

Reddedildi. Kısa vadede hızlıdır fakat V2 olay, soru, çözüm, yetkinlik ve mevzuat sistemlerini atlayarak ikinci bir alan modeli üretir. Ölçüm ve içerik doğruluğu iki farklı yerde yönetilir.

### Alternatif B — Keşfet tablolarını kaldırıp tüm navigasyonu V2 olaylarından üretmek

Reddedildi. Olay modeli müfredat sırasını, pedagojik bölümleri, anlatı içeriğini ve kullanıcıya kademeli açılımı tek başına temsil etmez. Çalışan rota/admin/ilerleme sistemi gereksiz yere bozulur.

### Alternatif C — Keşfet orkestrasyonu + V2 alan gerçeği

Kabul edilen yön. Mevcut ürün akışını korur, V2'nin tekil gerçeklerini yeniden kullanır ve geçişi tek derslik pilotla güvenli kılar.

## Sonuçlar

### Olumlu

- Çalışan Keşfet topolojisi ve kullanıcı ilerlemesi korunur.
- Olay, belge, soru, çözüm, yetkinlik ve mevzuat için tek kaynak oluşur.
- Ders tamamlama ile mesleki yeterlilik birbirine karıştırılmaz.
- Admin ve yayın kontrolleri için açık bir hedef sözleşme ortaya çıkar.
- İçerik bir kez düzeltilerek bağlı tüm öğrenme deneyimlerine yansıtılabilir.

### Maliyet ve kısıtlar

- Mevcut gömülü `kontrol`/`kayit` blokları ölçümlü içerik açısından sınıflandırılmalıdır.
- Keşfet–Question Engine bağlantısı için küçük fakat açık bir ilişki modeli gerekir.
- V2 içerik tabloları kürate edilmeden otomatik kilit ve yetkinlik akışı güvenilir değildir.
- Admin tarafında ilişkileri birlikte gösteren ek görünüm gerekecektir.
- Geçiş boyunca legacy ve V2 dual-read davranışı test edilmelidir.

## Mevcut WIP'e etkisi

Commitlenmemiş `supabase/migrations/20260809000002_kesfet_yetkinlik_agi.sql` ve ona bağlı frontend değişiklikleri bu ADR kabul edilmeden uygulanmamalıdır.

Mevcut taslak özellikle şu açılardan yeniden incelenmelidir:

- ön koşulların serbest dizi yerine açık ve doğrulanabilir ilişki olması,
- `kontrol`/`kayit` JSON bloklarının ölçümlü soru yerine geçmemesi,
- yetkinlik kazanımının yalnız Learning Engine üzerinden yapılması,
- mevcut ilerleme eşlemesinin ad/slug değişikliklerinden etkilenmemesi,
- `tip = 'isletme'` kayıtlarının korunması,
- toplu içerik üretiminden önce tek pilot dersin tamamlanması.

## Kabul kriterleri

Bu ADR `Accepted` yapılmadan önce:

- ürün sahibi Keşfet’in orkestrasyon, V2'nin alan gerçeği olduğu sınırı onaylamalı,
- ders tamamlama ile yetkinlik kazanımının ayrı tutulmasını onaylamalı,
- BlockNote öz-kontrolü ile ölçümlü Question Engine sorusu ayrımını onaylamalı,
- İşletmeler için ADR-001'in bu aşamada korunacağını onaylamalı,
- ilk pilot ders ve pilot başarı koşulu seçilmelidir.

## İzleyen işler

1. Veri sözleşmesi taslağı: ders–soru bağlantısı ve türlendirilmiş ön koşullar.
2. Commitlenmemiş `20260809000002` migration'ının bu sözleşmeye göre satır satır denetimi.
3. Tek pilot ders için içerik ve entegrasyon planı.
4. ADR kabulünden sonra additive migration, RLS ve test tasarımı.
