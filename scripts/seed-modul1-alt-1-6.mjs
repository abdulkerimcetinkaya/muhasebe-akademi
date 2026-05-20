// Modül 1, Alt Başlık 1.6 "Anonim Şirket Kuruluşu — Taahhüt ve 1/4 Ödeme"
// İki ayrı yevmiye kaydı: önce sermaye taahhüdü, sonra dörtte birlik ödeme.

let _idCounter = 0;
const blockId = () => `j${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Ali Türker, Yasin Erdem ve Sevda Karaca, İstanbul’da beyaz eşya ve elektronik distribütörlüğü yapmak için “Pendik Dayanıklı Tüketim A.Ş.” adıyla bir anonim şirket kuruyor. 10 Mart 2025’te toplam 2.000.000 TL sermaye taahhüt ediyorlar. Bu sermayenin 800.000 TL’lik kısmını Ali, 700.000 TL’lik kısmını Yasin, 500.000 TL’lik kısmını Sevda üstleniyor. Kanun gereği, taahhüt edilen sermayenin dörtte birini şirket tescil edilmeden önce bankaya yatırmaları gerekiyor; bu yüzden 500.000 TL’yi Akbank’taki şirket hesabına bloke ediyorlar.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  para(
    'Anonim şirket kuruluşu iki ayrı kayıtla işlenir. Önce sermaye taahhüdü tescil edilir, sonra dörtte birlik ödeme kaydedilir.',
  ),
  para(b('1. Sermaye taahhüdü kaydı:')),
  yevmiye({
    tarih: '10.03.2025',
    satirlar: [
      { tip: 'borc', kod: '501.001', ad: 'Ödenmemiş Sermaye-Ali T.', tutar: '800000' },
      { tip: 'borc', kod: '501.002', ad: 'Ödenmemiş Sermaye-Yasin E.', tutar: '700000' },
      { tip: 'borc', kod: '501.003', ad: 'Ödenmemiş Sermaye-Sevda K.', tutar: '500000' },
      { tip: 'alacak', kod: '500.001', ad: 'Sermaye-Ali T.', tutar: '800000' },
      { tip: 'alacak', kod: '500.002', ad: 'Sermaye-Yasin E.', tutar: '700000' },
      { tip: 'alacak', kod: '500.003', ad: 'Sermaye-Sevda K.', tutar: '500000' },
    ],
    aciklama: 'Pendik Dayanıklı A.Ş. kuruluş sermaye taahhüdü',
  }),
  para(b('2. Dörtte birlik ödemenin kaydı:')),
  yevmiye({
    tarih: '10.03.2025',
    satirlar: [
      { tip: 'borc', kod: '102.001', ad: 'Akbank', tutar: '500000' },
      { tip: 'alacak', kod: '501.001', ad: 'Ödenmemiş Sermaye-Ali T.', tutar: '200000' },
      { tip: 'alacak', kod: '501.002', ad: 'Ödenmemiş Sermaye-Yasin E.', tutar: '175000' },
      { tip: 'alacak', kod: '501.003', ad: 'Ödenmemiş Sermaye-Sevda K.', tutar: '125000' },
    ],
    aciklama: 'Pendik Dayanıklı A.Ş. taahhüt edilen sermayenin dörtte birinin bankaya ödenmesi',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Anonim şirketin kuruluşu, limited şirkete çok benzer ama bir farkı vardır. Limited şirkette ortaklar parayı istedikleri zaman ödeyebiliyordu. Anonim şirkette ise kanun bir şart koyar.',
  ),
  para(
    'Bu şart şudur: ',
    b(
      'taahhüt edilen sermayenin dörtte biri, şirket tescil edilmeden önce bankaya yatırılmak zorundadır.',
    ),
    ' Yani ortaklar “söz veriyorum” deyip eli boş gidemez; sözünün dörtte birini peşin göstermek zorundadır. Bu para bankaya bloke edilir, şirket resmen kurulana kadar çekilemez.',
  ),
  para('Bu yüzden kuruluş iki ayrı kayıtla yürür:'),
  para(
    b('Önce taahhüt kaydı'),
    ' → ortakların söz verdiği toplam sermaye (2.000.000 TL) tescil edilir. 500 Sermaye alacaklanır, 501 Ödenmemiş Sermaye borçlanır. Tıpkı limited şirkette gördüğün gibi.',
  ),
  para(
    b('Sonra ödeme kaydı'),
    ' → dörtte birlik kısım (500.000 TL) bankaya yatırıldığı için 102 Bankalar borçlanır, ödenen kadar 501 Ödenmemiş Sermaye alacaklanıp kapanır.',
  ),
  para(
    'Burada dikkat: dörtte birlik ödeme, her ortağın ',
    b('kendi payı oranında'),
    ' hesaplanır.',
  ),
  para(
    b('Ali'),
    ' → 800.000’in dörtte biri = 200.000 öder, kalan 600.000 borçta durur.',
  ),
  para(
    b('Yasin'),
    ' → 700.000’in dörtte biri = 175.000 öder, kalan 525.000 borçta durur.',
  ),
  para(
    b('Sevda'),
    ' → 500.000’in dörtte biri = 125.000 öder, kalan 375.000 borçta durur.',
  ),
  para(
    'Kalan dörtte üçlük kısım, kanunun verdiği süre içinde ileride ödenir. O ödemeler yapıldıkça, tıpkı limited şirkette gördüğün gibi, 501 Ödenmemiş Sermaye kapanmaya devam eder.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('TTK md. 332'), ' — Anonim şirkette asgari sermaye tutarı'),
  bullet(b('TTK md. 344'), ' — Sermayenin dörtte birinin tescilden önce ödenmesi'),
  bullet(b('TTK md. 345'), ' — Bankaya yatırılan paranın bloke edilmesi ve çözülmesi'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-6';`,
);
