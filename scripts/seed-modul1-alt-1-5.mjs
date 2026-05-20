// Modül 1, Alt Başlık 1.5 "Limited Şirket — Sermayenin Ödenmesi"

let _idCounter = 0;
const blockId = () => `h${(++_idCounter).toString(36).padStart(7, '0')}`;

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
    'Demirkol Tekstil Ltd. Şti., 10 Şubat 2025’te 1.000.000 TL sermaye taahhüdüyle kurulmuştu. Mehmet 600.000 TL, Selçuk 400.000 TL ödeme sözü vermişti. 18 Şubat 2025’te ortaklar sermayelerini ödemeye başlıyor. Mehmet, taahhüt ettiği 600.000 TL’nin tamamını Yapı Kredi’deki şirket hesabına yatırıyor. Selçuk ise 400.000 TL’lik payının 100.000 TL’lik kısmını şirket kasasına nakit olarak getiriyor.',
  ),

  heading(2, 'Yevmiye Kaydı'),
  yevmiye({
    tarih: '18.02.2025',
    satirlar: [
      { tip: 'borc', kod: '102.001', ad: 'Yapı Kredi Bankası', tutar: '600000' },
      { tip: 'borc', kod: '100.001', ad: 'Merkez Kasa', tutar: '100000' },
      { tip: 'alacak', kod: '501.001', ad: 'Ödenmemiş Sermaye-Mehmet D.', tutar: '600000' },
      { tip: 'alacak', kod: '501.002', ad: 'Ödenmemiş Sermaye-Selçuk D.', tutar: '100000' },
    ],
    aciklama: 'Demirkol Tekstil Ltd. taahhüt edilen sermayenin kısmen ödenmesi',
  }),

  heading(2, 'Bilmen Gerekenler'),
  para(
    'Bir önceki adımda ortaklar sermaye koymaya söz vermişti. Şimdi o sözü tutuyorlar, yani parayı gerçekten ödüyorlar.',
  ),
  para(
    'Burada işin mantığı şu: ',
    b('ödeme, bir alacağın tahsili gibidir'),
    '. Şirketin ortaklardan alacağı vardı (501 Ödenmemiş Sermaye). Ortak parayı ödediğinde, bu alacak kapanır.',
  ),
  para('Kayıt iki tarafta da net çalışır:'),
  para(
    b('Para nereye girdiyse o hesap borçlanır'),
    ' → banka hesabına yatırıldıysa 102 Bankalar, kasaya nakit geldiyse 100 Kasa artar.',
  ),
  para(
    b('Ödeyen ortağın 501 Ödenmemiş Sermaye’si alacaklanır'),
    ' → o ortağın borcu, ödediği kadar azalır.',
  ),
  para(
    'Dikkat etmen gereken en önemli nokta: ',
    b('500 Sermaye hesabına dokunulmaz'),
    '. Çünkü sermaye zaten taahhüt anında tescil edilmişti. Şimdi yaptığın şey yeni sermaye eklemek değil, sadece sözü tutulan parayı içeri almak. “Para geldi, 500 Sermaye’yi artırayım” dersen sermayeyi iki kez kaydetmiş olursun.',
  ),
  para(
    'Ödeme parça parça olabilir. Bu örnekte Mehmet borcunun tamamını ödedi, Selçuk ise bir kısmını ödedi. Selçuk’un kalan borcu 501 Ödenmemiş Sermaye’sinde durmaya devam eder; ileride ödedikçe kapanır. Bu yüzden ',
    b('her ortağı ayrı muavinle izlemek'),
    ' önemlidir.',
  ),

  heading(2, 'İlgili Mevzuat'),
  para(
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet(b('TTK md. 585'), ' — Sermayenin ödenmesi ve 24 aylık ödeme süresi'),
  bullet(b('TTK md. 588'), ' — Sermaye borcunu ödemeyen ortağın durumu (temerrüt)'),
  bullet(b('VUK md. 219'), ' — Kayıtların gerçek tutarla ve zamanında yapılması'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log(
  `update modul_alt_basliklari set icerik = ${sqlString(icerik)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-5';`,
);
