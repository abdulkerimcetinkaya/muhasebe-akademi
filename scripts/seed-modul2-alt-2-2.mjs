// Modül 2, Alt Başlık 2.2 "Peşin Mal Alışı (Banka havalesi / EFT)"

let _idCounter = 0;
const blockId = () => `q${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Demirkol Tekstil Ltd. Şti., üretimde kullanmak üzere kumaş tedarikçisi Demir Kumaş’tan toptan kumaş alıyor. 14 Mart 2025’te 250.000 TL’lik kumaş satın alıyor; faturaya %20 KDV ekleniyor. Şirket, toplam tutarı Yapı Kredi’deki hesabından havale yoluyla ödüyor.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '14.03.2025',
    satirlar: [
      { tip: 'borc', kod: '153.001', ad: 'Ticari Mallar', tutar: '250000' },
      { tip: 'borc', kod: '191.003', ad: 'İndirilecek KDV %20', tutar: '50000' },
      { tip: 'alacak', kod: '102.001', ad: 'Yapı Kredi Bankası', tutar: '300000' },
    ],
    aciklama: 'Demirkol Tekstil Ltd. peşin mal alışı',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Bu kayıt, bir önceki konuda gördüğün nakit alışla neredeyse aynı. Mal yine 153 Ticari Mallar’a, KDV yine 191 İndirilecek KDV’ye yazılıyor. Tek bir fark var: ödemenin nasıl yapıldığı.',
  ),
  para(
    'Önceki örnekte para kasadan çıkmıştı, bu yüzden 100 Kasa alacaklanmıştı. Burada ise ödeme banka hesabından havale ile yapıldı; o yüzden bu kez ',
    b('102 Bankalar'),
    ' alacaklanır. Yani malı ve KDV’yi nereden ödediysen, o hesap azalır.',
  ),
  para(b('Mal (250.000 TL) → 153 Ticari Mallar')),
  para(b('KDV (50.000 TL) → 191 İndirilecek KDV %20')),
  para(
    b('Ödeme (300.000 TL) → 102 Bankalar'),
    ' (havaleyle çıktı)',
  ),
  para(
    'Burada bir de şuna dikkat et: bu alış büyük tutarlı olduğu için banka üzerinden ödendi. Bu tesadüf değil. Belirli bir tutarı aşan ödemelerin nakit yapılması yasak değildir ama mevzuat bunların banka gibi bir kurum üzerinden yapılmasını ister. Bu yüzden büyük alımlarda kasa yerine banka görmen normaldir. Küçük tutarlarda kasa, büyük tutarlarda banka diye düşünebilirsin.',
  ),
  para(
    'KDV oranına da dikkat et. Bu sefer kumaş alındı ve kumaş %20 orana tabi olduğu için KDV 50.000 TL çıktı (250.000’in %20’si). Önceki örnekte temel gıda %1’di; burada ise genel oran %20 devrede. Doğru oranı, doğru muavine (191.003 İndirilecek KDV %20) yazdığına dikkat et.',
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
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-2-2';`,
);
