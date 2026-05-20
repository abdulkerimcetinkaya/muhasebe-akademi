// Modül 1, Alt Başlık 1.7 "Kuruluş ve Örgütlenme Giderleri"

let _idCounter = 0;
const blockId = () => `k${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Demirkol Tekstil Ltd. Şti., kuruluş sürecinde çeşitli ödemeler yapıyor. 12 Şubat 2025’te şu masrafları Yapı Kredi’deki şirket hesabından ödüyor: noter onayı için 8.500 TL, ticaret sicili tescil ücreti için 13.000 TL, ticaret odası kayıt harcı için 14.000 TL ve mali müşavirlik danışmanlık ücreti için 12.000 TL. Ödemelerin toplamı 47.500 TL’dir.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '12.02.2025',
    satirlar: [
      { tip: 'borc', kod: '770.001', ad: 'Noter Giderleri', tutar: '8500' },
      { tip: 'borc', kod: '770.002', ad: 'Tescil Harçları', tutar: '13000' },
      { tip: 'borc', kod: '770.003', ad: 'Oda Kayıt Harçları', tutar: '14000' },
      { tip: 'borc', kod: '770.004', ad: 'Müşavirlik Giderleri', tutar: '12000' },
      { tip: 'alacak', kod: '102.001', ad: 'Yapı Kredi Bankası', tutar: '47500' },
    ],
    aciklama: 'Demirkol Tekstil Ltd. kuruluş ve örgütlenme giderlerinin ödenmesi',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Bir şirket kurulurken sadece sermaye konmaz; kuruluşun kendisi de para ister. Noter ücreti, ticaret sicili harcı, ticaret odası kaydı, mali müşavirlik ücreti gibi masraflar çıkar. Bunlara ',
    b('kuruluş ve örgütlenme giderleri'),
    ' denir.',
  ),
  para('Buradaki en önemli soru şu: bu masraflar nereye yazılır?'),
  para(
    'Cevap: ',
    b('doğrudan gider olarak yazılır'),
    '. Yani ',
    b('770 Genel Yönetim Giderleri'),
    ' hesabına. Karşısında da parayı nereden ödediysen o hesap (kasa ya da banka) alacaklanır.',
  ),
  para(
    'Burada bir incelik var: her masrafı ayrı muavinde izledik. Noter gideri 770.001’e, tescil harcı 770.002’ye, oda harcı 770.003’e, müşavirlik 770.004’e yazıldı. Hepsi 770 Genel Yönetim Giderleri ana hesabının altında, ama tür tür ayrılmış durumda. Böylece şirketin hangi kaleme ne kadar harcadığı tek tek görülebilir. İstersen hepsini tek bir 770 satırında da toplayabilirdin; ama ayrı izlemek, gideri daha okunaklı kılar.',
  ),
  para('Dikkat etmen gereken iki nokta var:'),
  para(
    b('Bu giderler sermayeyle karıştırılmaz.'),
    ' Kuruluş masrafı, sermayenin bir parçası değildir. Sermaye ortakların koyduğu paradır; kuruluş gideri ise şirketi kurmak için harcanan paradır. İkisi ayrı şeylerdir, 500 Sermaye hesabına dokunulmaz.',
  ),
  para(
    b('Bu giderler bir varlık değil, giderdir.'),
    ' Eskiden bu masraflar “262 Kuruluş ve Örgütlenme Giderleri” diye bir varlık hesabına yazılıp yıllara yayılırdı. Ama güncel uygulamada doğrudan o yılın gideri olarak 770 Genel Yönetim Giderleri’ne yazılır. Yani harcadığın anda gider olur, biriktirilmez.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('VUK md. 282'), ' — Kuruluş ve örgütlenme giderlerinin gider yazılması'),
  bullet(b('KVK md. 8'), ' — Kurum kazancından indirilebilecek giderler'),
  bullet(b('TTK md. 343'), ' — Kuruluş giderlerinin esas sözleşmede gösterilmesi'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-7';`,
);
