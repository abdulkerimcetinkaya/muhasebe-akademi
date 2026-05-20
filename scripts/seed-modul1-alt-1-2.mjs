// Modül 1, Alt Başlık 1.2 "Şahıs İşletmesi Kuruluşu — Nakit Sermaye"
// BlockNote içeriğini üretir.

let _idCounter = 0;
const blockId = () => `d${(++_idCounter).toString(36).padStart(7, '0')}`;

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
  props: {
    tarih,
    satirlar: JSON.stringify(satirlar),
    aciklama,
  },
  children: [],
});

const icerik = [
  heading(2, 'Senaryo'),
  para(
    'Ahmet Yıldız, uzun yıllar başkasının yanında çalıştıktan sonra Karabük’te kendi bakkalını açıyor. İşletmesini “Ahmet Yıldız Bakkal” unvanıyla kuruyor ve 15 Ocak 2025’te biriktirdiği 75.000 TL’yi işletmenin kasasına koyuyor. Bu para, işletmenin ilk sermayesi oluyor.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '15.01.2025',
    satirlar: [
      { tip: 'borc', kod: '100.001', ad: 'Merkez Kasa', tutar: 75000 },
      { tip: 'alacak', kod: '500.001', ad: 'Ahmet Yıldız', tutar: 75000 },
    ],
    aciklama: 'Ahmet Yıldız Bakkal nakit sermaye konulması',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Şahıs işletmesinde sahibin koyduğu para, doğrudan ',
    b('sermaye'),
    ' olarak kaydedilir. Burada işin can alıcı noktası şu: şahıs işletmesinde sahibi ile işletme aynı kişi sayıldığı için, “söz verme” ya da “taahhüt” diye bir aşama yoktur. Sahibi parayı koyduğu anda sermaye hem konulmuş hem ödenmiş olur. Bu yüzden kayıt tek adımda biter: kasaya giren para bir tarafa, sahibinin sermayesi öbür tarafa yazılır.',
  ),
  para(
    'Sermaye hesabı her zaman sahibinin ',
    b('kendi adıyla'),
    ' açılır. Burada “500.001 Ahmet Yıldız” dedik; çünkü bu para işletmeye Ahmet Yıldız tarafından konuldu ve ona ait. İleride şirketleri işlerken göreceksin ki orada işler farklı yürüyor: ortaklar önce söz veriyor, sonra ödüyor, arada başka bir hesap devreye giriyor. Ama şahıs işletmesinde böyle bir ara aşama olmadığı için kayıt en sade haliyle kalıyor. Senin de aklında tutman gereken şey, paranın hangi yoldan girdiğine bakıp (kasa mı, banka mı) doğru hesabı seçmek ve karşısına sahibinin sermayesini yazmak.',
  ),

  heading(2, 'Muavin Hesap Nedir?'),
  para(
    'Muhasebede her ana hesabın altında daha ayrıntılı alt hesaplar açılır. Bunlara ',
    b('muavin hesap'),
    ' denir. Örneğin 100 Kasa bir ana hesaptır; ama sen kayıt yaparken doğrudan “100” yazmazsın, onun altındaki “100.001 Merkez Kasa” gibi bir muavine yazarsın. Aynı şekilde 500 Sermaye ana hesabının altına “500.001 Ahmet Yıldız” muavinini açarsın.',
  ),
  para(
    'Kural nettir: ',
    b('Hiçbir zaman doğrudan ana hesaba kayıt yapılmaz, her zaman bir muavin hesap açılır.'),
    ' Bunun sebebi, işletmenin detayları tek tek görebilmesidir. Tek bir kasa varsa bile, bir gün ikinci bir kasa ya da banka hesabı eklendiğinde sistem hazır olsun diye baştan muavinle çalışılır. Para nereye girdi, kim ne kadar koydu, hangi banka kullanıldı; bunların hepsi muavin hesaplarda izlenir.',
  ),
  para(
    'Şahıs işletmesinde tek sahip ve çoğu zaman tek kasa olduğu için muavin kullanmak sana şu an gereksiz görünebilir. Zaten bu sadelik yüzünden şahıs işletmelerine daha basit bir defter yöntemi (işletme hesabı) de tanınmıştır. Ama biz bu uygulamada baştan sona ',
    b('bilanço esasıyla'),
    ' çalışıyoruz ve elin muavin kullanmaya alışsın istiyoruz. Çünkü ileride şirketlere geçtiğinde, onlarca kasa, banka ve ortak hesabını ayrı ayrı izlemek zorunda kalacaksın. O gün zorlanmaman için, alışkanlığı en sade örnekte, yani şimdi kazanıyorsun.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('TTK md. 11–12'), ' — Tacir ve ticari işletme tanımı'),
  bullet(b('VUK md. 176–177'), ' — Bilanço esası ve işletme hesabı esası ayrımı'),
  bullet(b('VUK md. 153'), ' — İşe başlamanın vergi dairesine bildirilmesi'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-2';`,
);
