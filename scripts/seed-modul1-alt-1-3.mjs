// Modül 1, Alt Başlık 1.3 "Şahıs İşletmesi Kuruluşu — Ayni Sermaye"

let _idCounter = 0;
const blockId = () => `e${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Ahmet Yıldız, bakkalını açarken işletmeye sadece para değil, elindeki bazı varlıkları da koyuyor. 20 Ocak 2025’te “Ahmet Yıldız Bakkal” adına şunları sermaye olarak getiriyor: raflara dizilecek 60.000 TL değerinde ticari mal, 25.000 TL değerinde bir buzdolabı ve teraziler, bir de dağıtım için kullanacağı 180.000 TL değerindeki kamyoneti. Bu varlıkların değerleri, işletmeye konulmadan önce yetkili bir değerleme ile belirleniyor.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '20.01.2025',
    satirlar: [
      { tip: 'borc', kod: '153.001', ad: 'Ticari Mallar', tutar: 60000 },
      { tip: 'borc', kod: '255.001', ad: 'Demirbaşlar', tutar: 25000 },
      { tip: 'borc', kod: '254.001', ad: 'Taşıtlar', tutar: 180000 },
      { tip: 'alacak', kod: '500.001', ad: 'Ahmet Yıldız', tutar: 265000 },
    ],
    aciklama: 'Ahmet Yıldız Bakkal ayni sermaye konulması',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Ayni sermaye, işletmeye para yerine ',
    b('varlık'),
    ' olarak konulan sermayedir. Ahmet bu sefer kasaya nakit koymadı; bunun yerine ticari malını, demirbaşını ve taşıtını işletmeye getirdi. Mantık nakit sermayeyle aynı: gelen değerler bir tarafa, sahibinin sermayesi öbür tarafa yazılır. Tek fark, bu kez tek bir kasa hesabı değil, gelen her varlık ',
    b('kendi hesabına'),
    ' kaydedilir. Ticari mal 153 Ticari Mallar’a, buzdolabı ve teraziler 255 Demirbaşlar’a, kamyonet ise 254 Taşıtlar’a gider. Üçünün toplamı (265.000 TL) sahibinin sermayesi olarak 500 hesabına yazılır.',
  ),
  para(
    'Burada en kritik nokta, varlıkların ',
    b('değerinin nasıl belirlendiğidir'),
    '. Ahmet’in “bu kamyonet 180.000 TL eder” demesi tek başına yeterli değildir. Ayni sermaye, sahibinin sözüyle değil, yetkili bir değerleme ile kayda alınır; çünkü değer şişirilirse işletmenin sermayesi olduğundan büyük görünür ve bu hem yanıltıcı olur hem de hukuken sorun yaratır. Bu yüzden senaryoda da değerlerin “yetkili bir değerleme ile belirlendiği” söylendi. Bir de şunu aklında tut: taşıt gibi varlıklarda KDV tarafında özel kurallar da vardır; bunları ilerleyen modüllerde, tam yeri geldiğinde göreceksin. Şimdilik senin işin, hangi varlığın hangi hesaba gittiğini görmek ve toplam sermayeyi doğru hesaplamak.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('TTK md. 127'), ' — Sermaye olarak konulabilecek değerler'),
  bullet(b('TTK md. 128'), ' — Ayni sermayenin değerlemesi ve konulması'),
  bullet(b('VUK md. 269–273'), ' — Gayrimenkul, demirbaş ve taşıtların değerlemesi'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-3';`,
);
