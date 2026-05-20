// Modül 1, Alt Başlık 1.4 "Limited Şirket Kuruluşu — Sermaye Taahhüdü"
// Okunaklı sürüm: kısa paragraflar + hesap kodu satırları + ara vurgular.

let _idCounter = 0;
const blockId = () => `g${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Mehmet Demirkol ile kardeşi Selçuk Demirkol, Bursa’da tekstil toptancılığı yapmak için “Demirkol Tekstil Ltd. Şti.” adıyla bir limited şirket kuruyor. 10 Şubat 2025’te şirket ticaret siciline tescil ediliyor ve toplam 1.000.000 TL sermaye taahhüt ediliyor. Bu sermayenin 600.000 TL’lik kısmını Mehmet, 400.000 TL’lik kısmını Selçuk üstleniyor. Ortaklar bu parayı henüz ödemiyor; sadece ödeyeceklerine dair taahhütte bulunuyor.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '10.02.2025',
    satirlar: [
      { tip: 'borc', kod: '501.001', ad: 'Ödenmemiş Sermaye-Mehmet D.', tutar: '600000' },
      { tip: 'borc', kod: '501.002', ad: 'Ödenmemiş Sermaye-Selçuk D.', tutar: '400000' },
      { tip: 'alacak', kod: '500.001', ad: 'Sermaye-Mehmet D.', tutar: '600000' },
      { tip: 'alacak', kod: '500.002', ad: 'Sermaye-Selçuk D.', tutar: '400000' },
    ],
    aciklama: 'Demirkol Tekstil Ltd. kuruluş sermaye taahhüdü',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Şahıs işletmesinde sahibi parayı koyduğu anda iş bitiyordu: sermaye hem konulmuş hem ödenmiş sayılıyordu. Şirketlerde ise araya bir aşama giriyor.',
  ),
  para(
    'Bu aşamanın adı ',
    b('taahhüt'),
    ', yani söz verme. Ortaklar şirketi kurarken “ben şu kadar sermaye koyacağım” diye söz verir, ama parayı hemen ödemek zorunda değildir. Önce söz verilir, ödeme sonra yapılır.',
  ),
  para('Bu söz verme anında iki hesap birlikte çalışır:'),
  para(
    b('500 Sermaye'),
    ' → ortakların söz verdiği, tescil edilmiş resmi sermayeyi gösterir.',
  ),
  para(
    b('501 Ödenmemiş Sermaye'),
    ' → bu paranın henüz ödenmediğini, şirketin ortaklardan alacağı olduğunu gösterir.',
  ),
  para(
    'Yani taahhüt anında şirketin kasasında henüz para yoktur; elinde sadece ortaklardan tahsil edeceği bir söz vardır. 501 Ödenmemiş Sermaye’yi bir alacak gibi düşünebilirsin: “ortaklar bana şu kadar borçlu.”',
  ),
  para(
    'Her ortağın taahhüdü ',
    b('kendi adına ayrı muavinle'),
    ' izlenir. Çünkü ileride kim ödedi, kimin borcu kaldı, bunu tek tek takip etmek gerekir.',
  ),
  para(
    'Ödeme yapıldığında bu hesapların nasıl kapandığını bir sonraki adımda göreceksin. Şimdilik aklında kalsın: taahhüt tek başına bir kayıttır ve bu anda henüz hiçbir para el değiştirmemiştir.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('TTK md. 573–574'), ' — Limited şirketin kuruluşu ve esas sermaye'),
  bullet(b('TTK md. 580'), ' — Limited şirkette asgari sermaye tutarı'),
  bullet(b('TTK md. 585'), ' — Sermayenin ödenmesi ve taahhüt esası'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-4';`,
);
