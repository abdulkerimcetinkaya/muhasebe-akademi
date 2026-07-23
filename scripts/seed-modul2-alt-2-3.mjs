// Modül 2, Alt Başlık 2.3 "Kredi Kartı ile Mal Alışı"

let _idCounter = 0;
const blockId = () => `r${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Ahmet Yıldız, bakkalına acil ihtiyaç duyduğu bazı ürünleri almak için işletmenin kredi kartını kullanıyor. 20 Mart 2025’te Çağlar İçecek’ten 22.000 TL’lik içecek alıyor; faturaya %10 KDV ekleniyor. Ödemeyi işletmenin kredi kartıyla yapıyor, yani tutar o an kasadan ya da bankadan çıkmıyor; karta borç olarak yazılıyor.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '20.03.2025',
    satirlar: [
      { tip: 'borc', kod: '153.001', ad: 'Ticari Mallar', tutar: '22000' },
      { tip: 'borc', kod: '191.002', ad: 'İndirilecek KDV %10', tutar: '2200' },
      { tip: 'alacak', kod: '309.001', ad: 'Diğer Mali Borçlar', tutar: '24200' },
    ],
    aciklama: 'Ahmet Yıldız Bakkal kredi kartı ile mal alışı',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Kredi kartıyla mal almanın diğer ödeme şekillerinden tek bir farkı var: ödeme ',
    b('o anda yapılmaz'),
    '. Sen malı alırsın, ama para kasadan ya da bankadan hemen çıkmaz; kart borcun olarak birikir, sonra ödenir.',
  ),
  para(
    'Bu yüzden alış anında bir ',
    b('borç'),
    ' doğar. Mal ve KDV her zamanki gibi yerine yazılır, ama karşılarında bu kez bir varlık hesabı (kasa veya banka) değil, bir borç hesabı durur.',
  ),
  para(b('Mal (22.000 TL) → 153 Ticari Mallar')),
  para(b('KDV (2.200 TL) → 191 İndirilecek KDV %10')),
  para(b('Kart borcu (24.200 TL) → 309 Diğer Mali Borçlar')),
  para(
    'İşletmenin kredi kartı borçları ',
    b('309 Diğer Mali Borçlar'),
    ' hesabında izlenir. Bu hesap, “bu parayı henüz ödemedim, kart hesabıma borç olarak yazıldı” demektir. İleride kart borcu ödendiğinde, 309 Diğer Mali Borçlar kapanır ve para o zaman bankadan çıkar.',
  ),
  para(
    'Bir de şunu bil: gerçek hayatta şirketler mallarını genelde kredi kartıyla almaz; bu daha çok küçük işletmelerin, mesela bir bakkalın acil bir ihtiyacını karşılarken başvurduğu bir yoldur. Bu yüzden bu örnek Ahmet’in bakkalında geçiyor.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('KDV Kanunu md. 29'), ' — İndirilecek KDV ve indirim hakkı'),
  bullet(b('VUK md. 262'), ' — Maliyet bedeli ve malın maliyetine girenler'),
  bullet(b('VUK md. 232'), ' — Fatura kullanma ve alma zorunluluğu'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-2-3';`,
);
