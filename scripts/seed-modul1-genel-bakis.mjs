// Modül 1 "Genel Bakış" sayfasının BlockNote içeriğini üretir.
// Önceki seed'in modulIcerik kısmını yeni kısaltılmış+derli toplu versiyonla
// değiştirir. Alt başlıklara dokunmaz.
//
// Kullanım:
//   node scripts/seed-modul1-genel-bakis.mjs > /tmp/modul1-overview.sql

let _idCounter = 0;
const blockId = () => `b${(++_idCounter).toString(36).padStart(7, '0')}`;

const text = (str, styles = {}) => ({ type: 'text', text: str, styles });
const b = (str) => text(str, { bold: true });

const heading = (level, str) => ({
  id: blockId(),
  type: 'heading',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', level },
  content: [text(str)],
  children: [],
});

const para = (...parts) => ({
  id: blockId(),
  type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map((p) => (typeof p === 'string' ? text(p) : p)),
  children: [],
});

const bullet = (...parts) => ({
  id: blockId(),
  type: 'bulletListItem',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map((p) => (typeof p === 'string' ? text(p) : p)),
  children: [],
});

const sahanotu = ({ alinti, yazar, unvan }) => ({
  id: blockId(),
  type: 'sahanotu',
  props: { alinti, yazar, unvan },
  children: [],
});

const modulIcerik = [
  heading(2, 'Bu Modülde Ne Öğreneceksin?'),
  para(
    'Bu modülde mali müşavir gözünden bir işletmenin nasıl kurulduğunu göreceksin: ilk kayıtlar nasıl yapılır, sermaye deftere nasıl yerleşir, işletme sahibinin ya da ortakların tutmak zorunda olduğu defterler nelerdir ve yeni bir döneme nasıl başlanır?',
  ),
  para(
    'Şunu baştan bilmende fayda var: işe yeni başladığında muhtemelen kimse sana bir şirketin kuruluş kaydını yaptırmayacak; bu işlemler yılda bir kez yapılır ve genelde büro sahibinin ya da kıdemli birinin elinden geçer. Ama kuruluşu görmeden sonraki bütün kayıtların oturduğu zemini anlayamazsın. Yani bu modül, her gün kullanacağın bir rutini değil, ',
    b('işin temelini'),
    ' öğretiyor.',
  ),

  heading(2, 'Bu Modüldeki İşletmeler'),
  para(
    'Türkiye’de pek çok işletme türü var, ama muhasebe tutarken karşına çıkacak kayıt mantıkları birkaç temel kalıpta toplanıyor. Bu modülde en sık göreceğin üç türü öğreneceksin.',
  ),
  para(
    'İlki ',
    b('şahıs işletmesi'),
    '. En sadesidir: tek kişi vardır, ortak yoktur. Sahibi parasını ya da malını koyar, sen de bunu doğrudan sermaye olarak kaydedersin. Bu modülde Karabük’te bakkal açan ',
    b('Ahmet Yıldız'),
    ' bu türü temsil ediyor.',
  ),
  para(
    'İkincisi ',
    b('limited şirket'),
    '. Burada birden fazla ortak vardır. Ortaklar koyacakları sermayeyi baştan söz verir, ama zaman içinde parça parça ödeyebilirler; yani “söz verilen” ile “ödenen” sermaye diye iki aşama öğreneceksin. Bursa’da tekstil işi kuran ',
    b('Demirkol kardeşler'),
    ' bu türü temsil ediyor.',
  ),
  para(
    'Üçüncüsü ',
    b('anonim şirket'),
    '. Limited şirkete benzer, ama bir farkla: ortaklar söz verdikleri paranın en az dörtte birini, şirket kurulmadan önce bankaya yatırmak zorundadır. İstanbul’da beyaz eşya işi yapan ',
    b('Pendik Dayanıklı A.Ş.'),
    ' bu türü temsil ediyor.',
  ),
  para(
    'Kollektif, komandit ve kooperatif gibi türler bu modülde yok; bunlar ya günümüzde pek kurulmuyor ya da ayrı bir uzmanlık alanı. Merak edersen ayrı bir sayfadan inceleyebilirsin.',
  ),

  heading(2, 'Modülün Hikayesi'),
  para(
    'Bu modülde üç işletmenin kuruluş hikayesini birlikte takip edeceksin. Karabük’te ',
    b('Ahmet Yıldız'),
    ' kendi parasıyla bakkalını açıyor. Bursa’da ',
    b('Mehmet ve Selçuk Demirkol'),
    ' kardeşler tekstil işi için limited şirket kuruyor; sermayelerini söz verip zaman içinde ödüyorlar. İstanbul’da ',
    b('Ali Türker, Yasin Erdem ve Sevda Karaca'),
    ' beyaz eşya işi için anonim şirket kuruyor; sermayenin bir kısmını daha şirket kurulmadan bankaya yatırıyorlar. Üçü de kuruluş masraflarını ödüyor, sonra yeni yıla girerken geçen yıldan kalan hesaplarını yeni döneme taşıyor. Modül boyunca bu üç işletmeyi adım adım kuracaksın.',
  ),

  heading(2, 'Modül İçeriği'),
  bullet(b('1.1 — İşletme ve Şirket Türleri.'), ' Üç işletme türünün temel farkları.'),
  bullet(b('1.2 — Şahıs İşletmesi Kuruluşu (Nakit).'), ' Sahibin koyduğu nakit paranın kaydı.'),
  bullet(b('1.3 — Şahıs İşletmesi Kuruluşu (Ayni).'), ' Para yerine mal, demirbaş ya da taşıt konulması.'),
  bullet(b('1.4 — Limited Şirket Kuruluşu.'), ' Ortakların sermayeyi söz verme aşaması.'),
  bullet(b('1.5 — Limited Şirkette Sermayenin Ödenmesi.'), ' Söz verilen sermayenin ödenmesi.'),
  bullet(b('1.6 — Anonim Şirket Kuruluşu.'), ' Sermayenin bir kısmının önceden bankaya yatırılması.'),
  bullet(b('1.7 — Kuruluş Giderleri.'), ' Noter, sicil, danışmanlık gibi başlangıç masrafları.'),
  bullet(b('1.8 — Açılış Kaydı.'), ' Geçen yıldan kalan hesapların yeni yıla taşınması.'),

  heading(2, 'Modülü Bitirdiğinde'),
  para(
    'Bu modülün sonunda üç işletme türünü ayırt edebilecek, her birinin kuruluş kaydını yapabileceksin. Sermayenin “söz verilmesi” ile “ödenmesi” arasındaki farkı kavrayacak, kuruluş masraflarını ve geçmiş dönemden devreden hesapları doğru kaydedebileceksin. En önemlisi, bir işletmenin kuruluş şekline baktığında defterinin neden öyle tutulduğunu anlayacaksın; bu da seni sadece kayıt yapan değil, yaptığı işin nedenini bilen biri yapacak.',
  ),
  para(
    'Bu sırada arkanı kanunlar sağlamlaştırıyor: şirketlerin nasıl kurulacağı ',
    b('Türk Ticaret Kanunu’nda'),
    ', defter tutma ve kayıt kuralları ise ',
    b('Vergi Usul Kanunu’nda'),
    ' düzenlenir. Maddeleri ezberlemen gerekmez; ilgili kuralları her konunun içinde, tam ihtiyaç anında göreceksin. Bir yerde takılırsan da yalnız değilsin: aklına takılan bir kavram olduğunda ',
    b('Üstada Sor'),
    ' butonuna dokun. Üstad cevabı senin yerine vermez, ama düğümü çözmene yardım eder. Modülün sonunda öğrendiklerini birleştiren bir sınav seni bekliyor; onu geçince bir sonraki modüle, malların alınıp satılmasına hazır olacaksın.',
  ),

  heading(2, 'Mali Müşavir Notu'),
  sahanotu({
    alinti:
      'Acele etme. Kuruluş kaydını gerçekten anladığında, gerisi çorap söküğü gibi gelir. Çünkü bütün muhasebe, işte bu ilk kaydın üzerine kurulur.',
    yazar: 'Kerim Çelik',
    unvan: 'SMMM',
  }),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log('begin;\n');
console.log('-- unite_modulleri mal-alis-satis-m1 (Modül 1 Genel Bakış — yeni sürüm)');
console.log(
  `update unite_modulleri set icerik = ${sqlString(modulIcerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-m1';`,
);
console.log('\ncommit;');
