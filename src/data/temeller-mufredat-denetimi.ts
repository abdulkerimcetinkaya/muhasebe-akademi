/** Yalnız admin içerik denetiminde kullanılan hedef müfredat. */
export interface HedefDers {
  no: number;
  bolum: string;
  ad: string;
  /** Tek ders veya birden fazla mevcut ders birlikte hedefi karşılayabilir. */
  eslesenAdlar: string[][];
}

export const dersAdiNormalize = (deger: string): string =>
  deger
    .toLocaleLowerCase('tr')
    .replace(/[?.,:;()–—=]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const tek = (ad: string, ...alternatifler: string[]): string[][] =>
  [ad, ...alternatifler].map((x) => [dersAdiNormalize(x)]);

export const TEMELLER_HEDEF_DERSLER: HedefDers[] = [
  { no: 1, bolum: 'Muhasebeyi Anlamak', ad: 'Muhasebe Neden Gereklidir?', eslesenAdlar: tek('Muhasebe Neden Gereklidir?') },
  { no: 2, bolum: 'Muhasebeyi Anlamak', ad: 'Muhasebe Nedir?', eslesenAdlar: tek('Muhasebe Nedir?') },
  { no: 3, bolum: 'Muhasebeyi Anlamak', ad: 'Mali Nitelikteki Olay', eslesenAdlar: tek('Mali Nitelikteki Olay') },
  { no: 4, bolum: 'Muhasebeyi Anlamak', ad: 'Belge', eslesenAdlar: tek('Belge', 'Belge Nedir?') },
  { no: 5, bolum: 'İşletmenin Finansal Yapısı', ad: 'İşletmenin Varlıkları', eslesenAdlar: tek('İşletmenin Varlıkları') },
  { no: 6, bolum: 'İşletmenin Finansal Yapısı', ad: 'Varlıkların Kaynakları', eslesenAdlar: tek('Varlıkların Kaynakları') },
  { no: 7, bolum: 'İşletmenin Finansal Yapısı', ad: 'Varlıklar = Kaynaklar', eslesenAdlar: tek('Varlıklar = Kaynaklar') },
  { no: 8, bolum: 'İşletmenin Finansal Yapısı', ad: 'Temel Muhasebe Denklemi', eslesenAdlar: tek('Temel Muhasebe Denklemi') },
  { no: 9, bolum: 'İşletmenin Finansal Yapısı', ad: 'İşlemlerin Muhasebe Denklemine Etkisi', eslesenAdlar: tek('İşlemlerin Muhasebe Denklemine Etkisi') },
  { no: 10, bolum: 'İşletmenin Finansal Yapısı', ad: 'Gelir, Gider ve Özkaynak', eslesenAdlar: tek('Gelir, Gider ve Özkaynak', 'Gelir, Gider ve Özkaynak İlişkisi') },
  { no: 11, bolum: 'Muhasebe Dili', ad: 'Hesap Nedir?', eslesenAdlar: tek('Hesap Nedir?') },
  { no: 12, bolum: 'Muhasebe Dili', ad: 'Hesaplar Neden İki Taraflıdır?', eslesenAdlar: tek('Hesaplar Neden İki Taraflıdır?') },
  { no: 13, bolum: 'Muhasebe Dili', ad: 'Borç ve Alacak', eslesenAdlar: tek('Borç ve Alacak') },
  { no: 14, bolum: 'Muhasebe Dili', ad: 'Çift Taraflı Kayıt', eslesenAdlar: tek('Çift Taraflı Kayıt') },
  { no: 15, bolum: 'Muhasebe Dili', ad: 'Tekdüzen Hesap Planı', eslesenAdlar: tek('Tekdüzen Hesap Planı') },
  { no: 16, bolum: 'Muhasebe Kaydı', ad: 'Yevmiye Kaydı', eslesenAdlar: tek('Yevmiye Kaydı') },
  { no: 17, bolum: 'Muhasebe Kaydı', ad: 'Belgelerden Muhasebe Kaydı', eslesenAdlar: tek('Belgelerden Muhasebe Kaydı') },
  {
    no: 18,
    bolum: 'Kayıttan Finansal Tabloya',
    ad: 'Büyük Defter ve Mizan',
    eslesenAdlar: [[dersAdiNormalize('Büyük Defter (Defteri Kebir)'), dersAdiNormalize('Mizan')]],
  },
  {
    no: 19,
    bolum: 'Kayıttan Finansal Tabloya',
    ad: 'Bilanço ve Gelir Tablosu',
    eslesenAdlar: [[dersAdiNormalize('Bilanço'), dersAdiNormalize('Gelir Tablosu')]],
  },
];

export const hedefDersMevcutMu = (hedef: HedefDers, mevcutAdlar: Set<string>): boolean =>
  hedef.eslesenAdlar.some((grup) => grup.every((ad) => mevcutAdlar.has(ad)));
