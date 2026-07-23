// Modül 2, Alt Başlık 2.1 "Peşin Mal Alışı (Nakit)"

let _idCounter = 0;
const blockId = () => `p${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Ahmet Yıldız, bakkalı için tedarikçisi İlkay Toptan’dan temel gıda ürünleri alıyor. 5 Mart 2025’te 18.000 TL’lik mal satın alıyor; bu ürünler temel gıda olduğu için faturaya %1 KDV ekleniyor. Ahmet, toplam tutarı işletme kasasından nakit olarak ödüyor.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '05.03.2025',
    satirlar: [
      { tip: 'borc', kod: '153.001', ad: 'Ticari Mallar', tutar: '18000' },
      { tip: 'borc', kod: '191.001', ad: 'İndirilecek KDV %1', tutar: '180' },
      { tip: 'alacak', kod: '100.001', ad: 'Merkez Kasa', tutar: '18180' },
    ],
    aciklama: 'Ahmet Yıldız Bakkal peşin mal alışı',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Bu kayıtta ilk kez yeni bir kavramla karşılaştın: ',
    b('KDV'),
    '. Biraz duralım, çünkü bunu iyi anlaman gerekiyor; KDV bundan sonra neredeyse her kayıtta karşına çıkacak.',
  ),
  para(
    'Mal aldığında satıcıya iki şey ödersin: malın kendi fiyatı ve onun üstüne eklenen KDV. Bu örnekte malın fiyatı 18.000 TL, KDV ise 180 TL. Toplam 18.180 TL kasadan çıktı. Ama dikkat: bu iki tutar ',
    b('aynı yere yazılmaz'),
    '.',
  ),
  para(
    b('Malın fiyatı (18.000 TL) → 153 Ticari Mallar.'),
    ' Çünkü senin gerçek maliyetin budur, satacağın mal budur.',
  ),
  para(
    b('KDV (180 TL) → 191 İndirilecek KDV.'),
    ' Çünkü bu senin gerçek giderin değildir.',
  ),
  para(
    'Peki KDV neden senin giderin değil? İşte işin püf noktası burada. Sen bu 180 TL’yi satıcıya ödedin, ama daha sonra kendi malını sattığında müşteriden de KDV alacaksın. Ay sonunda devletle hesaplaşırken, ',
    b('ödediğin KDV ile aldığın KDV’yi karşılaştırırsın'),
    '. Ödediğin KDV, ödeyeceğin vergiden düşülür. Yani 191 İndirilecek KDV, “ben bunu zaten ödedim, devletten düşeceğim” demektir. Adındaki “indirilecek” kelimesi de tam bunu anlatır.',
  ),
  para(
    'Bu yüzden KDV’yi asla malın maliyetine katmazsın. Eğer 180 TL’yi de 153 Ticari Mallar’a yazsaydın, malının maliyetini olduğundan yüksek göstermiş olurdun; oysa o para sana geri dönecek.',
  ),
  para(
    'Son olarak orana dikkat et. Türkiye’de üç KDV oranı vardır: temel gıdada %1, bazı ürünlerde %10, çoğu üründe %20. Bu örnekte temel gıda alındığı için %1 kullanıldı ve KDV 180 TL çıktı (18.000’in %1’i). Hangi ürünün hangi orana girdiği, faturada zaten yazılı gelir; senin işin doğru oranı doğru muavine (191.001, 191.002 veya 191.003) yazmaktır.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('KDV Kanunu md. 29'), ' — İndirilecek KDV ve indirim hakkı'),
  bullet(b('KDV Kanunu md. 34'), ' — İndirimin fatura ile belgelendirilmesi'),
  bullet(b('VUK md. 262'), ' — Maliyet bedeli (KDV’nin maliyete girmemesi)'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-2-1';`,
);
