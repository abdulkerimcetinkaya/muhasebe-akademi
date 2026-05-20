// Modül 1, Alt Başlık 1.8 "Açılış Bilançosu ve Açılış Kaydı"

let _idCounter = 0;
const blockId = () => `l${(++_idCounter).toString(36).padStart(7, '0')}`;

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

const yevmiye = ({ tarih, satirlar, aciklama }) => ({
  id: blockId(),
  type: 'yevmiye',
  props: { tarih, satirlar: JSON.stringify(satirlar), aciklama },
  children: [],
});

const icerik = [
  heading(2, 'Senaryo'),
  para(
    'Pendik Dayanıklı Tüketim A.Ş., 2024 yılı boyunca beyaz eşya distribütörlüğü yaptı ve yılı kapattı. Şimdi 2025’e giriyor. Şirketin 31 Aralık 2024 tarihli bilançosundaki değerler, 1 Ocak 2025’te açılış kaydıyla yeni döneme taşınıyor.',
  ),
  para(
    'Bilançoya göre şirketin durumu şöyle: Kasada 360.000 TL, Akbank’taki hesapta 290.000 TL, müşterilerden olan alacaklarda (alıcılar) 410.000 TL, depodaki ticari mallarda 1.150.000 TL, demirbaşlarda 400.000 TL var. Demirbaşlar için bugüne kadar 160.000 TL amortisman ayrılmış durumda. Borç tarafında ise satıcılara 380.000 TL, ödenecek vergi ve fonlara 95.000 TL borç bulunuyor. Ortaklardan Sevda Karaca, kuruluşta taahhüt ettiği sermayenin 125.000 TL’lik kısmını henüz ödememiştir. Şirketin sermayesi 2.000.000 TL’dir (Ali 800.000, Yasin 700.000, Sevda 500.000). Geçen yıldan devreden 100.000 TL kâr da bilançoda yer almaktadır.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '01.01.2025',
    satirlar: [
      { tip: 'borc', kod: '100.001', ad: 'Merkez Kasa', tutar: '360000' },
      { tip: 'borc', kod: '102.001', ad: 'Akbank', tutar: '290000' },
      { tip: 'borc', kod: '120.001', ad: 'Alıcılar', tutar: '410000' },
      { tip: 'borc', kod: '153.001', ad: 'Ticari Mallar', tutar: '1150000' },
      { tip: 'borc', kod: '255.001', ad: 'Demirbaşlar', tutar: '400000' },
      { tip: 'borc', kod: '501.003', ad: 'Ödenmemiş Sermaye-Sevda K.', tutar: '125000' },
      { tip: 'alacak', kod: '257.001', ad: 'Birikmiş Amortismanlar', tutar: '160000' },
      { tip: 'alacak', kod: '320.001', ad: 'Satıcılar', tutar: '380000' },
      { tip: 'alacak', kod: '360.001', ad: 'Ödenecek Vergi ve Fonlar', tutar: '95000' },
      { tip: 'alacak', kod: '500.001', ad: 'Sermaye-Ali T.', tutar: '800000' },
      { tip: 'alacak', kod: '500.002', ad: 'Sermaye-Yasin E.', tutar: '700000' },
      { tip: 'alacak', kod: '500.003', ad: 'Sermaye-Sevda K.', tutar: '500000' },
      { tip: 'alacak', kod: '570.001', ad: 'Geçmiş Yıllar Kârları', tutar: '100000' },
    ],
    aciklama: 'Pendik Dayanıklı A.Ş. dönem başı açılış kaydı',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Bir işletme her yıl sıfırdan başlamaz. Geçen yıldan devreden parası, malı, borcu ne varsa, bunlar yeni yıla taşınır. İşte bu taşıma işlemine ',
    b('açılış kaydı'),
    ' denir ve yılın ilk kaydıdır.',
  ),
  para(
    'Önce şunu netleştirelim, çünkü kafa karıştırabilir: bu kayıt ',
    b('yeni bir şirket kurmak değildir.'),
    ' Pendik Dayanıklı A.Ş. 2024’te zaten faaliyetteydi. Burada yaptığımız şey, geçen yılın sonunda elde kalan değerleri yeni deftere aktarmaktır. Bu işlem her yılın 1 Ocak’ında tekrarlanır; kuruluş ise şirketin hayatında yalnızca bir kez olur.',
  ),
  para(
    'Açılış kaydının mantığı tek bir cümleyle özetlenir: ',
    b('geçen yılın kapanış bilançosu, olduğu gibi yeni deftere yazılır.'),
    ' Bunun için bilmen gereken tek kural şu:',
  ),
  para(
    b('Varlıklar borç tarafına yazılır'),
    ' → Kasa, banka, alıcılar, ticari mal, demirbaş gibi şirketin sahip olduğu şeyler. Bunlar 100 Kasa, 102 Bankalar, 120 Alıcılar, 153 Ticari Mallar, 255 Demirbaşlar olarak borçta açılır.',
  ),
  para(
    b('Borçlar ve kaynaklar alacak tarafına yazılır'),
    ' → Satıcılara borç (320 Satıcılar), vergi borcu (360 Ödenecek Vergi ve Fonlar) ve sermaye (500 Sermaye) alacakta açılır.',
  ),
  para(
    'Burada bir kalem tanıdık gelmeli: ',
    b('501 Ödenmemiş Sermaye.'),
    ' Bunu daha önce gördün. Sevda kuruluşta söz verdiği sermayenin 125.000 TL’sini hâlâ ödememiş. Bu, şirketin Sevda’dan olan alacağıdır; yani bir varlık gibi davranır ve borç tarafına yazılır. Sermayenin tamamı (500 Sermaye) alacakta tescillidir, ödenmemiş kısım (501 Ödenmemiş Sermaye) ise borçta durarak “bu para daha gelmedi” der.',
  ),
  para(
    'Bu kayıtta bir de henüz görmediğin kalemler var: 257 Birikmiş Amortismanlar ve 570 Geçmiş Yıllar Kârları. Bunların ne olduğunu ilerleyen modüllerde tek tek öğreneceksin. Şimdilik tek bilmen gereken, bunların da bilançodaki yerlerine göre doğru tarafa yazıldığıdır; gerçek bir şirket bilançosunda bu tür kalemlerin de bulunabileceğini görmen yeterli.',
  ),
  para(
    'Son olarak en önemli kontrol: ',
    b('borç tarafının toplamı, alacak tarafının toplamına eşit olmak zorundadır.'),
    ' Bu kayıtta her iki taraf da 2.735.000 TL. İki taraf tutuyorsa kayıt doğrudur; tutmuyorsa bir yerde hata var demektir. Bu denklik, açılış kaydının kalbidir.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('VUK md. 175 ve 219'), ' — Defter tutma ve dönem başı kayıtları'),
  bullet(b('TTK md. 64'), ' — Tacirin defter tutma yükümlülüğü'),
  bullet(b('TTK md. 68'), ' — Bilançonun düzenlenmesi ve denklik ilkesi'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-8';`,
);
