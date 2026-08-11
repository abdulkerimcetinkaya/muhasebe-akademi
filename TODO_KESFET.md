# Keşfet — Yaşayan Mimari ve Uygulama Yol Haritası

Bu belge Keşfet alanının mevcut uygulamayı bozmadan, V2 muhasebe öğrenme mimarisiyle bütünleşerek geliştirilmesi için yaşayan iş listesidir. Yeni bir paralel öğrenme sistemi tarif etmez. Kod veya veri modeli değişmeden önce ilgili mimari karar burada ve gerekli ADR/PDR kaydında netleştirilmelidir.

## Değişmez sınırlar

- Mevcut global navigasyon, rotalar ve sitenin tasarım dili korunacak.
- Kullanıcı akışı `Keşfet → Kart → Bölüm → Ders → İçerik` olarak kalacak.
- `kesfet_kartlar`, `kesfet_bolumler` ve `kesfet_itemler` müfredatın sunum ve sıralama katmanı olacak; muhasebe olayının, sorunun, belgenin veya yetkinliğin ikinci bir kaynağına dönüşmeyecek.
- İşletmeler alanının aynı tabloları `tip = 'isletme'` ile kullanması korunacak.
- Mevcut kullanıcı ilerlemesi silinmeyecek ve geriye dönük uyum gözetilecek.
- Mevzuat ayrı bir ana öğrenme yolu olmayacak; olay, çözüm ve ders bağlamında açılan, tarihçeli bir destek katmanı olacak.
- Üretim içeriği insan onayı olmadan yayınlanmayacak. Varsayımsal içerik açıkça taslak olarak işaretlenecek.
- Şema değişiklikleri additive olacak; migration geçmişi sıfırlanmayacak veya geçmiş migration dosyaları değiştiril­meyecek.

## Doğrulanmış mevcut durum

### Korunabilir parçalar

- [x] Keşfet’in üç seviyeli veritabanı modeli doğrulandı: `kesfet_kartlar → kesfet_bolumler → kesfet_itemler`.
- [x] Mevcut kullanıcı rotaları doğrulandı: `/kesfet`, `/kesfet/:kart`, `/kesfet/:kart/:item`.
- [x] Admin kart, bölüm ve içerik yönetimi doğrulandı.
- [x] BlockNote tabanlı içerik editörü/görüntüleyicisi ve muhasebeye özel bloklar (`yevmiye`, `sahanotu`, `thesabi`, `bilanco`, `kontrol`, `kayit`) doğrulandı.
- [x] Terim işaretleme, sözlük popover’ı ve mevcut mevzuat paneli doğrulandı.
- [x] `kesfet_ilerleme` ile ders tamamlama takibi ve yerel/bulut eşitleme yapısı doğrulandı.
- [x] V2 olay, belge, çözüm, yetkinlik, Learning Engine ve tarihçeli mevzuat şemaları doğrulandı.
- [x] Soru çözümünün `ilerleme_kaydet` RPC’si üzerinden yetkinlik motoruna bağlandığı doğrulandı.
- [x] Çözüm yükleyicisinin V2 normalize çözümü okuyup gerektiğinde legacy `cozumler` tablosuna döndüğü doğrulandı.

### Temel mimari boşluklar

- Keşfet dersleri ile `muhasebe_olaylari`, `sorular`, `belgeler` ve `yetkinlikler` arasında açık, yönetilebilir bir ilişki bulunmuyor.
- Keşfet içindeki `kontrol` ve `kayit` blokları temel biçimsel değerlendirme yapıyor; çekirdek Question Engine ve Learning Engine’e bağlı değil.
- Bir Keşfet dersini bitirmek, ders içi başarıdan bağımsız olarak tamamlanmış sayılabiliyor.
- `kesfet_ilerleme` ders tamamlanmasını; çekirdek `ilerleme` ve `kullanici_yetkinlikleri` ise soru/yetkinlik başarısını izliyor. İki kavramın sorumluluk sınırı kullanıcı deneyiminde tanımlanmamış.
- V2 tablolarının önemli bölümü şema olarak mevcut fakat içerik ve frontend entegrasyonu bakımından boş veya dormant durumda.
- Admin araçları Keşfet içeriği, legacy soru yönetimi ve V2 olay/belge/yetkinlik yapıları arasında parçalı.
- Mevzuat şu an üç farklı biçimde temsil ediliyor: sözlükteki JSON içerik, RAG chunk’ları ve `mevzuat_kaynaklar/maddeler/madde_versiyonlari`. Kaynak-of-truth ve yayın süreci net değil.
- Keşfet içeriğinde yayın durumu, sürüm, editoryal inceleme ve yayınlanabilirlik kontrolleri yetersiz.
- `ADR-V2.md` içindeki Simulation Engine hedefi ile İşletmeler için kabul edilen “Keşfet altyapısını yeniden kullanma” kararı arasında açıklığa kavuşturulması gereken sınır bulunuyor.

## Mimari hedef

Keşfet, müfredatı ve kullanıcı yolculuğunu düzenleyen katmandır. Dersin açıklayıcı metni ve hafif, puansız öz-kontrolleri `kesfet_itemler.icerik` içinde kalabilir. Ölçülen alıştırmalar ise mevcut çekirdek yapılara referans vermelidir:

`Keşfet dersi → muhasebe olayı → belge(ler) → soru(lar) → çözüm → yetkinlik(ler) → mevzuat bağlantısı`

`kesfet_ilerleme` ders/yolculuk tamamlanmasını, Learning Engine ise ölçülmüş yetkinlik kazanımını izlemelidir. Aynı gerçek iki ayrı JSON veya tabloda tekrar üretilmemelidir.

## Öncelik tanımları

- **P0:** Mimari bütünlük, veri güvenliği veya üretim yayını için zorunlu.
- **P1:** İlk uçtan uca pilot ve anlaşılır kullanıcı deneyimi için gerekli.
- **P2:** Ölçekleme, admin verimliliği ve içerik kalitesi için gerekli.
- **P3:** Pilot doğrulandıktan sonra değerlendirilecek geliştirme.

## Faz 0 — Envanter ve sınır analizi

- [x] Frontend, rotalar, admin ekranları ve Keşfet veri akışını incele. `P0`
- [x] V2 olay, belge, soru, çözüm, yetkinlik, Learning Engine ve mevzuat migration’larını incele. `P0`
- [x] Legacy/V2 dual-read ve geçiş noktalarını belirle. `P0`
- [x] Korunacak parçaları, boşlukları ve aşırı inşa risklerini kaydet. `P0`
- [x] İlk uygulama öncesi yaşayan TODO’yu oluştur. `P0`

## Faz 1 — Keşfet–V2 sınır kararı

- [x] **TASK-KESFET-001:** Keşfet’in orkestrasyon katmanı, V2’nin alan gerçeği olduğu sınırı ADR/PDR ile kabul et veya düzelt. `P0` — ADR-002 Accepted.
- [x] Keşfet dersi ile olay/soru/belge/yetkinlik arasındaki ilişki türlerini ve kardinaliteleri tanımla. `P0`
- [x] Puanlanmayan `kontrol` ile Learning Engine’e yazan ölçümlü soru arasındaki ürün kuralını tanımla. `P0`
- [x] “Ders tamamlandı”, “soru çözüldü” ve “yetkinlik kazanıldı” durumlarını ayrı tanımla. `P0`
- [x] İşletmeler modelinin Keşfet tablolarını kullanması ile V2 Simulation Engine sınırını karara bağla. `P0` — ADR-001 korunuyor; uzun vadeli birleşme ayrı karar.
- [x] Admin’in taslak, kilitli, yakında ve son kullanıcıdan gizli tüm içerikleri görebilme kuralını tanımla. `P0`
- [x] Commitlenmemiş `20260809000002_kesfet_yetkinlik_agi.sql` ve ona bağlı frontend taslağını bu kararlarla denetle; kabul, yeniden çalışma veya kaldırma kararı ver. `P0` — silip yeniden kurma kaldırıldı, additive modele çevrildi.

## Faz 2 — Veri sözleşmesi ve güvenli geçiş

- [x] ADR onayından sonra yalnız gerekli additive ilişkiyi tasarla; önce mevcut M2M tablolarının yeniden kullanımını denetle. `P0`
- [x] Ders–olay/soru bağlantısında sıralama, zorunluluk, minimum başarı ve destek seviyesi alanlarını tanımla. `P0`
- [x] Kart/bölüm/ders için `taslak → incelemede → yayınlandı → arşiv` yaşam döngüsü gereksinimini değerlendir. `P1` — item yaşam döngüsü uygulandı; kart görünürlüğü mevcut üç durumla korundu.
- [x] Yayındaki derslerin eksik olay, belge, çözüm, yetkinlik veya mevzuat referansı taşımamasını sağlayan yayın kontrolü tasarla. `P1`
- [x] Mevcut `kesfet_ilerleme` kayıtlarının yeni modele etkilenmeden kalacağını migration testiyle doğrula. `P0`
- [x] `tip = 'isletme'` kayıtlarının tüm migration ve sorgularda kapsam dışında/koruma altında olduğunu doğrula. `P0`
- [x] TypeScript veritabanı tiplerini yalnız migration kesinleştikten sonra güncelle. `P1`

## Faz 3 — Müfredat ve keşif hiyerarşisi

- [x] Temeller, Yetkinlikler ve Uzmanlıkların tek öğrenme sistemindeki rollerini veri sözleşmesine işle. `P1`
- [x] Temeller’i zorunlu başlangıç; Yetkinlikler ve Uzmanlıkları açık ön koşullu ilerleme olarak modelle. `P1`
- [x] 19 Temeller dersini belgeye göre bölüm, sıra, kazanım ve ön koşullarıyla içerik envanterine aktar. `P1`
- [x] Kullanıcıya tüm dersleri düz listelemek yerine mevcut kart–bölüm–ders açılımını koru. `P1`
- [x] “Nereden başlamalıyım?”, “Sıradaki ders ne?” ve “Neden kilitli?” sorularını mevcut ekranlarda cevaplayan durum sözleşmesini tanımla. `P1`
- [x] Global navigasyon, yeni ana sayfa veya paralel öğrenme rotası eklenmediğini regresyonla doğrula. `P0`

## Faz 4 — Tek uçtan uca pilot ders

- [x] Pilot ders seç: **Belgelerden Muhasebe Kaydı** + mevcut onaylı KUR-001. `P0`
- [x] Pilot için öğrenme hedefi ve ön koşulu yaz. `P1`
- [x] Akışı şu zincire göre kur: Belge → Ekonomik Olay → Muhasebe Mantığı → Hesap Seçimi → Borç/Alacak → Kayıt → Kontrol → Finansal Tablo Etkisi → Mevzuat Bağlantısı. `P1`
- [x] Açıklayıcı içeriği BlockNote’ta; ölçülen olay/soru/belge/çözümü çekirdek tablolarda tut. `P0`
- [x] En az bir gerçekçi belge, olay, hesap seçimi, yevmiye kaydı, kontrol ve finansal tablo etkisi senaryosu hazırla. `P1`
- [x] Mevzuat içeriğini üretim verisi yapmadan önce uzman doğrulamasına gönder. `P0` — mevcut CUR-100 onaylı altın referans yeniden kullanıldı.
- [x] Pilot başarı ölçütlerini tanımla: başlama, tamamlama, soru doğruluğu, destek kullanımı ve yetkinlik güncellemesi. `P1`

## Faz 5 — Question Engine entegrasyonu

- [x] Mevcut soru tiplerinin gerçek renderer desteğini envanterle; şemada var olup UI’da olmayanları “yakında” kabul et. `P0`
- [x] Keşfet dersinin ölçümlü soruyu kimliğiyle açmasını, soru gerçeğini içerik JSON’una kopyalamamasını sağla. `P0`
- [x] Yevmiye dışındaki tipler için renderer, doğrulama ve çözüm açıklaması sözleşmesini tip bazında tanımla. `P1` — yalnız gerçek renderer’ı olan yevmiye pilotta aktif; diğerleri aktive edilmedi.
- [x] Yanlış cevap, ipucu, AI yardımı ve çözümü gösterme davranışlarının puan/yetkinlik etkisini doğrula. `P1`
- [x] Ders bitirme düğmesinin ölçümlü sorular için tanımlanan başarı koşulunu atlayamamasını sağla. `P0`

## Faz 6 — Yetkinlik ve ilerleme

- [x] `olay_yetkinlikleri` verisini pilot olay için insan kürasyonuyla doldur. `P0` — uzak veride 4 onaylı bağ doğrulandı.
- [ ] Ölçümlü Keşfet sorularının `ilerleme_kaydet` RPC’sine doğru şekilde ulaştığını giriş yapılmış kullanıcıyla entegrasyon testiyle kanıtla. `P0` — kod zinciri hazır; oturumlu smoke test bekliyor.
- [x] Ders tamamlanması ile yetkinlik kazanımını arayüzde birbirine karıştırmadan göster. `P1`
- [x] Ön koşul açılma kuralının ders tamamlanmasına mı, ölçülmüş yetkinliğe mi dayandığını her bağlantı için açıklaştır. `P0`
- [x] Legacy puan/rozet/streak davranışında regresyon olmadığını doğrula. `P1`
- [x] Yetkinlik ağı yeterince kürate edilmeden otomatik öneri veya kilit açma çalıştırma. `P0`

## Faz 7 — Mevzuat destek katmanı

- [x] Sözlük JSON’u, `rag_chunks` ve tarihçeli mevzuat tablolarının sorumluluklarını ADR ile belirle. `P0`
- [x] Üretim mevzuatının kaynak-of-truth’unu `mevzuat_maddeleri` + tarihçeli versiyonlar üzerinden tanımla. `P0`
- [x] Olay/çözüm bağlamında ilgili maddeyi işlem tarihine göre çözümleme kuralını uygula. `P1`
- [x] Ders bağlamını uzun mevzuat metni kopyalamadan yapılandırılmış kaynağa bağla. `P1`
- [x] Kaynak URL, yürürlük tarihi, sona erme tarihi ve insan onayı eksik kayıtların yayınını engelle. `P0`
- [x] RAG ile yapısal mevzuat arasındaki köprüyü madde kürasyonu tamamlanmadan kurma. `P0`

## Faz 8 — Admin ve içerik operasyonu

- [x] Admin’de kart/bölüm/ders ile bağlı ölçümlü soruları ve çekirdek bağların yayın hazırlığını tek bağlamda göster. `P1`
- [x] Admin’in son kullanıcıdan gizli, kilitli, yakında ve taslak içeriklere erişimini koru. `P0`
- [x] Eksik referans, boş içerik, yayın durumu ve mevzuat güncelliği için hazır olma kontrol listesi ekle. `P1`
- [x] İçerik değişikliklerinde kim, ne zaman, neyi değiştirdi izini değerlendirmeye al. `P2` — mevcut timestamp korunuyor; kişi bazlı audit ayrı platform kararı gerektiriyor.
- [x] Toplu içerik üretiminden önce pilot için editoryal rubrik ve muhasebe doğruluk kontrolü oluştur. `P1`

## Faz 9 — Test, kalite ve yayın kapıları

- [ ] Migration’ları temiz yerel veritabanında ve üretimin temsilî kopyasında dry-run et. `P0` — uzak transaction+ROLLBACK başarılı; yerel Docker kapalı, kalıcı dry-run migration geçmişi uyumsuzluğunda bloklu.
- [ ] RLS testleri: anonim, öğrenci, içerik admini ve tam admin rollerini kapsa. `P0` — politikalar yazıldı; migration uygulanmış ortamda rol testi bekliyor.
- [ ] Keşfet rotaları, kilitler, admin görünürlüğü, ders tamamlama ve yetkinlik yazımı için entegrasyon testleri ekle. `P0` — saf kurallar ve migration sözleşmesi testli; oturumlu tarayıcı testi bekliyor.
- [ ] Pilotun belge → olay → soru → çözüm → yetkinlik → mevzuat bağlantısını uçtan uca test et. `P0` — uzak veri zinciri doğrulandı; öğrenci oturumu testi bekliyor.
- [x] Mevcut İşletmeler, soru çözümü, sözlük ve Keşfet ilerlemesi için regresyon testleri çalıştır. `P0`
- [x] Typecheck, lint, birim testleri ve production build sonuçlarını teslimatta kaydet. `P0`
- [x] Muhasebe içeriği ile mevzuatı alan uzmanı onayı olmadan yayınlama. `P0`

## Faz 10 — Kontrollü ölçekleme

- [x] Pilot verileri ve kullanıcı geri bildirimleri kabul eşiğini geçmeden 19 Temeller dersinin tamamını üretime açma. `P0` — rollout migration/deploy ve pilot ölçüm kapısında tutuluyor.
- [x] Temeller’i bölüm bölüm içerik rubriğiyle tamamla; her derste aynı düşünme zincirinin uygun adımlarını kullan. `P1`
- [x] Yetkinlikleri gerçek iş görevleri ve ön koşullarıyla kademeli aç. `P2` — hazır iki kart açık, eksikler yakında.
- [x] Uzmanlıkları Temeller ve ilgili Yetkinlik kanıtına bağla. `P2`
- [x] İçerik güncelleme, mevzuat etki analizi ve yeniden doğrulama operasyonunu kalıcılaştır. `P2`
- [x] Yeni soru tiplerini yalnız pilot, doğrulayıcı ve çözüm gösterimi tamamlandıkça aktive et. `P2` — `coktan_secmeli` yalnız T1 kart finali için config doğrulayıcısı ve renderer ile aktive edildi.

## Risk kaydı

| Risk | Etki | Karşı önlem |
|---|---|---|
| BlockNote JSON içinde ikinci bir soru/olay sistemi kurulması | Veri tutarsızlığı, çift bakım | BlockNote’u anlatım ve hafif öz-kontrolle sınırla; ölçümlü içeriği kimlikle çekirdek sisteme bağla |
| Dormant V2 tablolarını hazır ürün gibi kabul etmek | Boş ekranlar ve yanlış kilitler | Pilot veriyi kürate et; yayın öncesi hazır olma kontrolü uygula |
| `kesfet_ilerleme` ile yetkinlik ilerlemesini birleştirmek | Eski ilerleme kaybı ve yanlış kazanım | İki sorumluluğu ayrı tut; yalnız ölçümlü soru Learning Engine’e yazsın |
| Keşfet değişikliğinin `tip = 'isletme'` kayıtlarını etkilemesi | İşletmeler akışında regresyon | Her sorgu, migration ve testte tip ayrımını doğrula |
| Üç mevzuat temsilinin çelişmesi | Güncel olmayan veya yanlış hukuki bilgi | Yapısal, tarihçeli kaynağı belirle; uzman onayı ve tarih çözümlemesi zorunlu olsun |
| Admin’de parçalı yönetim | Eksik bağlantıyla yayın | İlişki görünümü ve yayın kontrol listesi oluştur |
| Bir defada tüm müfredatı üretmek | Büyük geri dönüş maliyeti, düşük kalite | Tek uçtan uca pilotu ölç, sonra bölüm bölüm ölçekle |
| Commitlenmemiş WIP’i onaylı mimari saymak | Yanlış şemanın üretime taşınması | `20260809000002` ve ilişkili dosyaları Faz 1 kararı çıkana kadar uygulama/push kapsamı dışında tut |

## İlk teslim için tamamlanma tanımı

İlk pilot ancak aşağıdakilerin tamamı sağlandığında tamamlanmış sayılır:

- Mimari sınır kararı yazılı ve onaylıdır.
- Mevcut rota, tasarım dili ve İşletmeler akışı korunmuştur.
- Ders, tekil alan gerçeklerini kopyalamadan V2 olay/belge/soru/çözüm/yetkinlik kayıtlarına bağlanır.
- Ders tamamlanması ile ölçülmüş yetkinlik ayrı ve doğru kaydedilir.
- Mevzuat işlem tarihine uygun, kaynaklı ve insan onaylıdır.
- Admin tüm durumları görebilir; son kullanıcı yalnız yayınlanabilir içeriği görür.
- RLS, migration, entegrasyon, regresyon, typecheck, lint, test ve build kapıları geçmiştir.

## Sıradaki tek iş

**QA-KESFET-001 — Giriş yapılmış öğrenci ve admin oturumlarıyla tarayıcı smoke testini tamamlamak.** `00002`, `00003` ve `00004` uzak veritabanına uygulandı; migration geçmişi güncel, anonim RLS ve HTTP rota kontrolleri başarılı. Bu oturumda bağlı tarayıcı bulunmadığı için öğrenci/admin tıklama testi bekliyor.
