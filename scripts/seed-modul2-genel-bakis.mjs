// Modül 2 "Genel Bakış" — Ticari Mal Alış İşlemleri
// Modül 1 yapısıyla birebir uyumlu: Modülü Bitirdiğinde + Mali Müşavir Notu + İlgili Mevzuat.

let _idCounter = 0;
const blockId = () => `o${(++_idCounter).toString(36).padStart(7, '0')}`;

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

const icerik = [
  heading(2, 'Bu Modülde Ne Öğreneceksin?'),
  para(
    'Bu modülde bir işletmenin en sık yaptığı işi göreceksin: mal almak. Bir ticari işletme satmak için önce almak zorundadır, dolayısıyla mal alışı, ticari hayatın en çok tekrarlanan kaydıdır.',
  ),
  para(
    'Mal almanın tek bir yolu yoktur. Bazen peşin para verirsin, bazen banka havalesi yaparsın, bazen kredi kartı kullanırsın, bazen “sonra öderim” deyip veresiye alırsın, bazen de senet imzalarsın. Her ödeme şeklinin kendine göre bir kaydı vardır. Bu modülde hepsini tek tek öğreneceksin. Ayrıca malın maliyetine nelerin eklendiğini (nakliye, gümrük gibi), iskontoları, iadeleri ve en önemlisi ',
    b('KDV’yi'),
    ' ilk kez burada göreceksin.',
  ),

  heading(2, 'Bu Modülün Yıldızı: KDV'),
  para(
    'Bu modülde ilk kez ',
    b('KDV'),
    ' (Katma Değer Vergisi) ile tanışacaksın. Mal aldığında, satıcıya malın fiyatının üstüne bir de KDV ödersin. Ama bu KDV senin gerçek giderin değildir; devletten geri alacağın bir tutardır. İşte bu yüzden onu malın maliyetinden ayrı bir hesapta (',
    b('191 İndirilecek KDV'),
    ') izleriz. KDV ilk başta kafa karıştırıcı gelebilir, ama bu modülün sonunda mantığı tamamen oturacak.',
  ),

  heading(2, 'Modülün Hikayesi'),
  para('Bu modülde üç işletme de kendi sektöründe mal alıyor.'),
  para(
    b('Ahmet Yıldız'),
    ', bakkalına tedarikçisi Hasan Toptancı’dan gıda ürünleri alıyor. Kimi zaman peşin ödüyor, kimi zaman “sonra hallederiz” deyip veresiye.',
  ),
  para(
    b('Demirkol Tekstil'),
    ', kumaş tedarikçisinden toptan alım yapıyor. Bazı alımları senetle, bazılarını banka havalesiyle ödüyor.',
  ),
  para(
    b('Pendik Dayanıklı A.Ş.'),
    ' ise hem yurt içinden hem yurt dışından beyaz eşya getiriyor. İthalat yaptığında gümrük ve navlun gibi masraflar da çıkıyor, bunları da malın maliyetine ekliyor.',
  ),
  para('Her işletme, kendi ölçeğine uygun alım senaryolarıyla karşına gelecek.'),

  heading(2, 'Modül İçeriği'),
  bullet(b('2.1 — Peşin Mal Alışı (Nakit).'), ' Kasadan ödeyerek mal alma.'),
  bullet(b('2.2 — Peşin Mal Alışı (Banka).'), ' Havale veya EFT ile mal alma.'),
  bullet(b('2.3 — Kredi Kartı ile Mal Alışı.'), ' Kartla alımın ve kart borcunun kaydı.'),
  bullet(b('2.4 — Veresiye Mal Alışı.'), ' Sonra ödenecek alım, satıcılara borç.'),
  bullet(b('2.5 — Senet Karşılığı Mal Alışı.'), ' Borç senedi düzenleyerek alım.'),
  bullet(b('2.6 — Kısmen Peşin Kısmen Veresiye.'), ' Bir kısmı peşin, bir kısmı borç.'),
  bullet(b('2.7 — Alış İskontosu.'), ' Fatura üzerinde indirim alma.'),
  bullet(b('2.8 — Alış Giderlerinin Maliyete Eklenmesi.'), ' Nakliye, hamaliye, sigorta.'),
  bullet(b('2.9 — Alıştan İadeler.'), ' Satıcıya mal geri verme.'),
  bullet(b('2.10 — Alış Sonrası Kasa İskontosu.'), ' Erken ödeme indirimi.'),
  bullet(b('2.11 — İthalat Yoluyla Mal Alışı.'), ' Gümrük, navlun, sigorta dahil maliyet.'),
  bullet(b('2.12 — KDV’li Alış ve İndirilecek KDV.'), ' 191 hesabının ayrıntılı işleyişi.'),

  heading(2, 'Modülü Bitirdiğinde'),
  para(
    'Bu modülün sonunda eline gelen herhangi bir alış faturasını, ödeme şekline göre doğru hesaplara dağıtabileceksin. Malın maliyetine neyin girip neyin girmediğini ayırt edebilecek, KDV’yi ana maldan ayırıp 191 İndirilecek KDV hesabına yazabileceksin. İskonto, iade ve ithalat gibi özel durumlarda kaydı doğru kurabilecek, kısacası bir işletmenin alım tarafını baştan sona yönetebileceksin.',
  ),
  para(
    'Bu sırada arkanı kanunlar sağlamlaştırıyor: malın maliyetinin nasıl hesaplanacağı ',
    b('Vergi Usul Kanunu’nda'),
    ', KDV’nin nasıl indirileceği ise ',
    b('Katma Değer Vergisi Kanunu’nda'),
    ' düzenlenir. Maddeleri ezberlemen gerekmez; ilgili kuralları her konunun içinde, tam ihtiyaç anında göreceksin. Bir yerde takılırsan da yalnız değilsin: aklına takılan bir kavram olduğunda ',
    b('Üstada Sor'),
    ' butonuna dokun. Üstad cevabı senin yerine vermez, ama düğümü çözmene yardım eder. Modülün sonunda öğrendiklerini birleştiren bir sınav seni bekliyor; onu geçince bir sonraki modüle, malların satışına hazır olacaksın.',
  ),

  heading(2, 'Mali Müşavir Notu'),
  sahanotu({
    alinti:
      'Mal alışı muhasebenin mutfağıdır; en çok burada pişersin. KDV’yi ilk gördüğünde gözün korkmasın, iki gün sonra en sevdiğin hesap o olacak.',
    yazar: 'Kerim Çelik',
    unvan: 'SMMM',
  }),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('KDV Kanunu md. 29'), ' — İndirilecek KDV ve indirim hakkı'),
  bullet(b('KDV Kanunu md. 34'), ' — İndirimin fatura ile belgelendirilmesi'),
  bullet(b('VUK md. 262'), ' — Maliyet bedeli ve malın maliyetine girenler'),
  bullet(b('VUK md. 274'), ' — Emtianın (ticari malın) değerlemesi'),
  bullet(b('VUK md. 232'), ' — Fatura kullanma zorunluluğu'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update unite_modulleri set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-m2';`,
);
