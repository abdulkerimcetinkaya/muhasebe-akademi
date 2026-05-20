// Modül 1 (İşletmenin Kuruluşu ve Açılış Kayıtları) + 8 alt başlık için
// BlockNote JSON içeriğini üretir, stdout'a SQL UPDATE'leri yazar.
//
// Kullanım:
//   node scripts/seed-modul1-icerik.mjs > /tmp/modul1.sql
//   sonra /tmp/modul1.sql'i Supabase SQL editor'da veya MCP ile uygula.

// ──────────────────── BlockNote block builders ────────────────────

let _idCounter = 0;
const blockId = () => `b${(++_idCounter).toString(36).padStart(7, '0')}`;

const text = (str, styles = {}) => ({ type: 'text', text: str, styles });

const heading = (level, str) => ({
  id: blockId(),
  type: 'heading',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', level },
  content: [text(str)],
  children: [],
});

// Paragraph with mixed inline content. Pass strings OR text objects.
const para = (...parts) => ({
  id: blockId(),
  type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map(p => typeof p === 'string' ? text(p) : p),
  children: [],
});

const bullet = (...parts) => ({
  id: blockId(),
  type: 'bulletListItem',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map(p => typeof p === 'string' ? text(p) : p),
  children: [],
});

const quote = (...parts) => ({
  id: blockId(),
  type: 'quote',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map(p => typeof p === 'string' ? text(p) : p),
  children: [],
});

// Bold text helper
const b = (str) => text(str, { bold: true });
// Italic text helper
const i = (str) => text(str, { italic: true });

// ──────────────────── Module brief ────────────────────

const modulIcerik = [
  heading(2, 'Bu modülde ne yapacaksın?'),
  para(
    'Bir işletmenin doğuş anına tanıklık edeceksin. Şahıs işletmesinden anonim şirkete kadar farklı işletme tiplerinin kuruluş kayıtlarını, sermaye taahhütlerini, kuruluş giderlerini ve açılış bilançosunu yevmiyeye aktaracaksın.',
  ),
  para(
    b('Kullanacağın hesaplar: '),
    '100 Kasa · 102 Bankalar · 153 Ticari Mallar · 254 Taşıtlar · 255 Demirbaşlar · 252 Binalar · 500 Sermaye · 501 Ödenmemiş Sermaye (-)',
  ),
  heading(2, 'Sık yapılan hatalar'),
  bullet('Şahıs işletmesi ile sermaye şirketinin (limited/anonim) kuruluş mantığı farklıdır.'),
  bullet('Anonim şirkette taahhüt edilen sermayenin dörtte biri tescilden önce ödenmek zorundadır.'),
  bullet('Ayni sermaye (mal, araç, demirbaş sermaye) konulurken değerleme şarttır.'),
  para(i('💬 Modülün herhangi bir konusunda takıldığında üstadına sorabilirsin.')),
];

// ──────────────────── Alt başlık builder ────────────────────

/**
 * Tek bir alt başlık için BlockNote blokları üretir.
 *   senaryo: string — durum anlatımı paragrafı
 *   hesaplar: [{ kod, tip, tutar }] — yevmiye satırları
 *   bilmen: [string, ...] — paragraflar (her biri ayrı para)
 *   sahaNotu: { metin, yazar } | null
 *   mevzuat: string — "VUK 175 · ..." gibi
 *   ustad: [string, ...] — örnek sorular
 */
function altBaslik({ senaryo, hesaplar, bilmen, sahaNotu, mevzuat, ustad }) {
  const blocks = [];

  blocks.push(heading(2, 'Senaryo'));
  blocks.push(para(senaryo));

  blocks.push(heading(2, 'Hesaplar'));
  for (const h of hesaplar) {
    blocks.push(
      bullet(
        b(`${h.kod}`),
        ` → ${h.tip} (${h.tutar})`,
      ),
    );
  }

  blocks.push(heading(2, 'Bilmen Gerekenler'));
  for (const p of bilmen) {
    blocks.push(para(p));
  }

  if (sahaNotu) {
    blocks.push(heading(2, 'Saha Notu'));
    blocks.push(quote(i('"' + sahaNotu.metin + '"')));
    blocks.push(para(b('— ' + sahaNotu.yazar)));
  }

  blocks.push(heading(2, 'Mevzuat'));
  blocks.push(para(b('Devrede olan mevzuat: '), mevzuat));

  blocks.push(heading(2, 'Üstadına sorabilecekleri örnek konular'));
  for (const s of ustad) {
    blocks.push(bullet(s));
  }

  return blocks;
}

// ──────────────────── Alt başlık içerikleri ────────────────────

const ab11 = altBaslik({
  senaryo:
    'Ahmet Bey, mahallesinde bakkal açmak için 15 Ocak\'ta vergi dairesine işe başlama bildirgesi veriyor. Aynı gün işletme kasasına 50.000 TL nakit koyuyor. Defterin ilk yevmiye maddesini sen yazacaksın.',
  hesaplar: [
    { kod: '100 Kasa', tip: 'Borç', tutar: '50.000 TL' },
    { kod: '500 Sermaye', tip: 'Alacak', tutar: '50.000 TL' },
  ],
  bilmen: [
    'Şahıs işletmesinde taahhüt aşaması yoktur. Çünkü kişi ile işletme hukuken aynı varlıktır; Ahmet Bey kendine "şu kadar para koyacağım" diye söz veremez. Para konulduğu an sermaye doğar, kayıt tek satırda biter. Limited ve anonim şirketlerin aksine, 501 Ödenmemiş Sermaye hesabı bu senaryoda hiç çalışmaz.',
    'İşletmenin defteri bu kayıtla doğar. VUK 183\'e göre yevmiye defterinin 1 numaralı maddesi açılış kaydıdır, sonraki tüm kayıtların referans noktasıdır.',
  ],
  sahaNotu: {
    metin:
      'Stajyer kardeşlerimin en çok karıştırdığı yer açılış tarihidir. Vergi dairesine işe başlama bildirgesi verdiğin tarih esastır, bankada hesap açtığın gün değil. Bu tarihi yanlış yazarsan yıl sonunda dönem başı bilançon komple kayar, sonra düzeltmek üç katı emek ister.',
    yazar: 'Hasan Yıldız, SMMM',
  },
  mevzuat:
    'VUK 175 (defter tutma zorunluluğu) · VUK 183 (yevmiye düzeni) · GVK 37 (ticari kazanç)',
  ustad: [
    'Şahıs işletmesinde neden 501 hesabı kullanılmıyor?',
    'İşe başlama bildirgesi vermeden defter tutarsam ne olur?',
    'Ahmet Bey sermaye olarak koyduğu parayı sonradan çekerse nasıl kaydederim?',
  ],
});

const ab12 = altBaslik({
  senaryo:
    'Mehmet Usta marangoz dükkânı açıyor. İşletmesine 80.000 TL değerinde marangoz makinesi, 30.000 TL değerinde bir kamyonet ve 15.000 TL değerinde ahşap stoğu koyuyor. Hepsinin değeri rayiç bedel üzerinden tespit edilmiş.',
  hesaplar: [
    { kod: '255 Demirbaşlar', tip: 'Borç', tutar: '80.000 TL' },
    { kod: '254 Taşıtlar', tip: 'Borç', tutar: '30.000 TL' },
    { kod: '153 Ticari Mallar', tip: 'Borç', tutar: '15.000 TL' },
    { kod: '500 Sermaye', tip: 'Alacak', tutar: '125.000 TL' },
  ],
  bilmen: [
    'Ayni sermaye (para yerine mal, araç, demirbaş koyma) rayiç bedel (varlığın piyasada o anki gerçek satış değeri) üzerinden kayda alınır. İşletme sahibinin "bunu 5 yıl önce 50.000\'e almıştım" demesi kayıt değerini belirlemez, bugünkü piyasa değeri esastır.',
    'Birden fazla varlık konulduğunda her biri ayrı satırda borçlandırılır, toplamları 500 Sermaye\'ye alacak yazılır. Buna karma yevmiye maddesi (tek kayıt içinde birden fazla borç, tek alacak) denir.',
  ],
  sahaNotu: null,
  mevzuat:
    'VUK 267 (emsal bedel) · VUK 269 (gayrimenkullerde değerleme) · GVK 38 (bilanço esasında ticari kazanç)',
  ustad: [
    'Rayiç bedeli kim belirler, nasıl ispatlanır?',
    'VUK 267 emsal bedel ne demek, ne zaman devreye girer?',
    'Ayni sermaye olarak koyduğum taşıt için sonradan amortisman ayırabilir miyim?',
  ],
});

const ab13 = altBaslik({
  senaryo:
    'İki ortak, "Yıldız Tekstil Ltd. Şti." adıyla limited şirket kuruyor. Sözleşmede toplam 250.000 TL sermaye taahhüt ediyorlar. Şirket 1 Şubat\'ta ticaret siciline tescil ediliyor; ortaklar henüz hiçbir ödeme yapmamış.',
  hesaplar: [
    { kod: '501 Ödenmemiş Sermaye (-)', tip: 'Borç', tutar: '250.000 TL' },
    { kod: '500 Sermaye', tip: 'Alacak', tutar: '250.000 TL' },
  ],
  bilmen: [
    'Sermaye taahhüt edildiği an kayda alınır, ödendiği an değil. 501 Ödenmemiş Sermaye hesabı aktif düzenleyici bir hesaptır; bilançoda 500 Sermaye\'nin altında eksi olarak gösterilir, sermayeyi azaltır.',
    'Kayıt limited şirketin ticaret siciline tescil tarihinde yapılır, noter sözleşme tarihinde değil. Limited şirket hukuken tescil ile doğar. Sermayenin tamamı tescilden önce ödenmek zorunda değildir; 24 ay içinde ödenmesi yeterlidir.',
  ],
  sahaNotu: {
    metin:
      'Sözleşme tarihiyle tescil tarihini karıştırmayın. Sözleşme noterden 25 Ocak\'ta çıkmış olabilir ama şirket 1 Şubat\'ta tescil olmuşsa, yevmiye kaydının tarihi 1 Şubat\'tır. Aksi halde noterdeki imzayla tescil arasındaki günlerde "olmayan bir şirketin" kaydını tutmuş olursunuz.',
    yazar: 'Ayşe Demir, YMM',
  },
  mevzuat:
    'TTK 580 (asgari sermaye) · TTK 583 (sermaye ödenmesi) · TTK 585 (kuruluş anı) · VUK 175 (defter tutma)',
  ustad: [
    'Limited şirkette sermayenin tamamı ne zamana kadar ödenmeli?',
    'Limited ile anonim şirket sermaye ödemesi açısından nasıl farklı?',
    '501 Ödenmemiş Sermaye neden eksi düzenleyici hesaptır?',
  ],
});

const ab14 = altBaslik({
  senaryo:
    'Yıldız Tekstil Ltd. Şti.\'nin ortakları 15 Şubat\'ta taahhüt ettikleri sermayeyi ödüyorlar: bir ortak 100.000 TL\'yi şirket banka hesabına yatırıyor, diğeri 150.000 TL\'yi nakit olarak kasaya teslim ediyor.',
  hesaplar: [
    { kod: '102 Bankalar', tip: 'Borç', tutar: '100.000 TL' },
    { kod: '100 Kasa', tip: 'Borç', tutar: '150.000 TL' },
    { kod: '501 Ödenmemiş Sermaye (-)', tip: 'Alacak', tutar: '250.000 TL' },
  ],
  bilmen: [
    'Sermaye ödendiğinde 500 Sermaye hesabına dokunulmaz; çünkü sermaye zaten taahhüt anında 500\'e kaydedilmişti. Ödeme yapıldığında 501 Ödenmemiş Sermaye hesabı kapatılır; yani bu eksi düzenleyici hesap azaltılır, sermayenin "ödenmemiş" kısmı silinir.',
    'Karşılığında ödeme nereye yapıldıysa o varlık hesabı borçlanır (kasaya nakit geldiyse 100 Kasa, bankaya yatırıldıysa 102 Bankalar). Tek bir kayıtta hem banka hem kasa kullanılabilir, bu da karma yevmiye maddesidir.',
  ],
  sahaNotu: null,
  mevzuat: 'TTK 583 (sermaye ödemesi) · VUK 215 (kayıt zamanı)',
  ustad: [
    'Sermaye ödenirken neden 500 Sermaye değil de 501 hesabı kapatılır?',
    'Ortak sermayeyi taksitlerle öderse her ödeme için ayrı kayıt mı yapılır?',
    'Ortak sermayeyi süresinde ödemezse ne olur?',
  ],
});

const ab15 = altBaslik({
  senaryo:
    'Üç ortak, "Mavi Deniz A.Ş." adıyla anonim şirket kuruyor. Sözleşmede 800.000 TL sermaye taahhüt ediyorlar. Şirket 5 Mart\'ta tescil ediliyor; tescilden önce ortaklar yasal zorunluluk gereği taahhüdün dörtte birini (200.000 TL) şirket banka hesabına yatırmış durumdalar.',
  hesaplar: [
    { kod: '102 Bankalar', tip: 'Borç', tutar: '200.000 TL' },
    { kod: '501 Ödenmemiş Sermaye (-)', tip: 'Borç', tutar: '600.000 TL' },
    { kod: '500 Sermaye', tip: 'Alacak', tutar: '800.000 TL' },
  ],
  bilmen: [
    'Anonim şirket, limited şirketten en kritik noktada ayrılır: taahhüt edilen sermayenin dörtte biri (yüzde 25\'i) tescilden önce ödenmek zorundadır. Bu TTK 344\'ün mutlak hükmüdür, ihlal edilirse şirket tescil edilmez.',
    'Kayıtta bu yüzden üç hesap birden çalışır: ödenen kısım 102 Bankalar borç, ödenmemiş kısım 501 borç, toplam sermaye 500 alacak. Tek bir yevmiye maddesinde hem ödenmiş hem taahhüt edilmiş kısımları aynı anda yansıtmış olursun.',
  ],
  sahaNotu: {
    metin:
      'Anonim şirket kuruluşlarında en sık yapılan hata, dörtte bir ödemeyi "tescilden sonra yaparız" diye ertelemektir. Ticaret sicili memuru blokaj dekontunu görmeden tescili yapmaz. Yani teorik olarak yapılması gereken bu kayıt, pratikte zaten dekont olmadan yapılamaz. Stajyere ilk öğretilen şey budur.',
    yazar: 'Mehmet Çelik, YMM',
  },
  mevzuat:
    'TTK 332 (asgari sermaye) · TTK 344 (1/4 ödeme zorunluluğu) · TTK 354 (tescil) · VUK 175 (defter tutma)',
  ustad: [
    'Anonim şirkette 1/4 ödeme zorunluluğu neden var, limited\'de neden yok?',
    'Kalan dörtte üç ne zamana kadar ödenmeli?',
    'Halka açık anonim şirketlerde sermaye ödemesi nasıl farklı?',
  ],
});

const ab16 = altBaslik({
  senaryo:
    'Mavi Deniz A.Ş. kuruluş aşamasında şu giderleri yapıyor: noter masrafları 8.000 TL, ticaret sicil harçları 3.500 TL, ruhsat ve izin bedelleri 2.000 TL, kuruluş danışmanlığı (mali müşavir) 6.500 TL. Tüm ödemeler şirket banka hesabından yapılıyor; toplam 20.000 TL.',
  hesaplar: [
    { kod: '770 Genel Yönetim Giderleri', tip: 'Borç', tutar: '20.000 TL' },
    { kod: '102 Bankalar', tip: 'Alacak', tutar: '20.000 TL' },
  ],
  bilmen: [
    'Eski uygulamada kuruluş giderleri 262 Kuruluş ve Örgütlenme Giderleri hesabında aktifleştirilir ve 5 yılda itfa edilirdi. Ancak güncel TMS ve VUK uygulamasında bu giderler doğrudan dönem gideri olarak yazılır; 262 hesabı artık yeni kuruluşlarda nadiren kullanılır.',
    'Bu yüzden kuruluş giderleri 770 Genel Yönetim Giderleri hesabına atılır ve dönem sonunda gelir tablosuna yansır. Yani kuruluş yılı, bu giderler kadar zararlı başlar; ama bu hukuki ve muhasebesel olarak doğru sonuçtur.',
  ],
  sahaNotu: null,
  mevzuat:
    'VUK 282 (ilk tesis ve taazzuv giderleri) · TMS 38 (maddi olmayan duran varlıklar) · KVK 8 (indirilebilir giderler)',
  ustad: [
    '262 Kuruluş ve Örgütlenme Giderleri hesabı tamamen kalktı mı?',
    'Kuruluş giderlerini aktifleştirmek ne zaman mantıklı olur?',
    'Mali müşavir ücreti hangi durumda gider, hangi durumda sermayeye eklenir?',
  ],
});

const ab17 = altBaslik({
  senaryo:
    'Geçen yıldan devreden "Kaya Ticaret" işletmesi yeni yıla şu açılış bilançosuyla giriyor: Aktifler — Kasa 25.000 TL, Bankalar 180.000 TL, Ticari Mallar 320.000 TL, Demirbaşlar 95.000 TL. Pasifler — Satıcılar 150.000 TL, Banka Kredileri 120.000 TL, Sermaye 350.000 TL. 1 Ocak günü yılın 1 numaralı yevmiye maddesi olarak açılış kaydını yapacaksın.',
  hesaplar: [
    { kod: '100 Kasa', tip: 'Borç', tutar: '25.000 TL' },
    { kod: '102 Bankalar', tip: 'Borç', tutar: '180.000 TL' },
    { kod: '153 Ticari Mallar', tip: 'Borç', tutar: '320.000 TL' },
    { kod: '255 Demirbaşlar', tip: 'Borç', tutar: '95.000 TL' },
    { kod: '320 Satıcılar', tip: 'Alacak', tutar: '150.000 TL' },
    { kod: '300 Banka Kredileri', tip: 'Alacak', tutar: '120.000 TL' },
    { kod: '500 Sermaye', tip: 'Alacak', tutar: '350.000 TL' },
  ],
  bilmen: [
    'Devreden işletmelerde her yeni yıl, geçen yılın kapanış bilançosu = yeni yılın açılış bilançosu ilkesine göre başlar. Yani 31 Aralık\'taki bilançonun aktif kalemleri 1 Ocak\'ta borç, pasif kalemleri alacak olarak yevmiyeye işlenir.',
    'Bu işletmenin sürekliliği ilkesinin kayıt karşılığıdır; işletme yıl sonunda kapanmaz, ertesi yıla aynı bakiyelerle devam eder. Açılış kaydı yapılmadan yeni yılın hiçbir kaydı yapılamaz; bu kayıt yılın muhasebe defterinin doğum belgesidir.',
  ],
  sahaNotu: {
    metin:
      'Açılış kaydında en çok atlanan kalemler banka kredileri ve şüpheli alacak karşılıklarıdır. Sırf "aktif tarafı yazdım" diye pasif tarafı yarım bırakırsanız, bilanço dengelenmez ve yıl boyunca rakamlar tutmaz. Açılış kaydını yaparken aktif ve pasif toplamı kuruşu kuruşuna eşit olmalı, en küçük fark bile alarm.',
    yazar: 'Hasan Yıldız, SMMM',
  },
  mevzuat:
    'VUK 185 (envanter defteri) · VUK 192 (bilanço ilkesi) · TMS Kavramsal Çerçeve (işletmenin sürekliliği)',
  ustad: [
    'Açılış kaydında aktif ve pasif toplamı tutmazsa ne yaparım?',
    'Geçen yıl ayrılan amortismanlar açılış kaydında nasıl yer alır?',
    'Açılış bilançosunu kim onaylar, nereye verilir?',
  ],
});

const ab18 = altBaslik({
  senaryo:
    'Kaya Ticaret\'in mali müşaviri 31 Aralık\'ta fiili sayım yapıyor. Defterde 320.000 TL ticari mal görünüyor ama sayımda 315.000 TL bulunuyor. Yani 5.000 TL\'lik bir noksanlık var. Sorumlusu tespit edilememiş.',
  hesaplar: [
    { kod: '197 Sayım ve Tesellüm Noksanları', tip: 'Borç', tutar: '5.000 TL' },
    { kod: '153 Ticari Mallar', tip: 'Alacak', tutar: '5.000 TL' },
  ],
  bilmen: [
    'Envanter demek, işletmenin tüm varlıklarının ve borçlarının fiilen sayılması, ölçülmesi, tartılması demektir. Defterdeki rakam ile sahadaki gerçek miktarın aynı olması beklenir; fark çıkarsa kayda alınır.',
    'Noksanlık (defterdeki miktarın sahadaki miktardan fazla olması) 197 Sayım ve Tesellüm Noksanları hesabında izlenir. Bu geçici bir hesaptır; sorumlusu bulunursa 135 Personelden Alacaklar veya ilgili hesaba aktarılır, bulunmazsa dönem sonunda kanunen kabul edilmeyen gider (KKEG) olarak gelir tablosuna atılır. Fazlalık durumunda ise 397 Sayım ve Tesellüm Fazlaları hesabı çalışır, tam tersi mantıkla.',
  ],
  sahaNotu: null,
  mevzuat: 'VUK 186 (envanter çıkarma) · VUK 274 (emtia değerlemesi) · VUK 278 (kıymeti düşen mallar)',
  ustad: [
    '197 hesabı ne kadar süre açık kalabilir?',
    'Sayım noksanlığının sorumlusu bulunamazsa neden KKEG olur?',
    'Fiziki sayım ile defter sayımı uyumlu olmazsa hangisi esastır?',
  ],
});

// ──────────────────── SQL output ────────────────────

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

const updates = [
  ['unite_modulleri', 'mal-alis-satis-m1', modulIcerik],
  ['modul_alt_basliklari', 'mal-alis-satis-1-1', ab11],
  ['modul_alt_basliklari', 'mal-alis-satis-1-2', ab12],
  ['modul_alt_basliklari', 'mal-alis-satis-1-3', ab13],
  ['modul_alt_basliklari', 'mal-alis-satis-1-4', ab14],
  ['modul_alt_basliklari', 'mal-alis-satis-1-5', ab15],
  ['modul_alt_basliklari', 'mal-alis-satis-1-6', ab16],
  ['modul_alt_basliklari', 'mal-alis-satis-1-7', ab17],
  ['modul_alt_basliklari', 'mal-alis-satis-1-8', ab18],
];

console.log('begin;\n');
for (const [tablo, id, icerik] of updates) {
  console.log(`-- ${tablo} ${id}`);
  console.log(`update ${tablo} set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = '${id}';`);
  console.log();
}
console.log('commit;');
