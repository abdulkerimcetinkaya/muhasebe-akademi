/**
 * Yalnız admin içerik denetiminde kullanılan hedef müfredat.
 *
 * KANONİK KAYNAK: Muhasebe2.docx — 3 kart · 10 bölüm · 39 ders.
 * Bkz. docs/adr/ADR-003-kanonik-temeller-mufredati.md
 *
 * Aşağıdaki `TEMELLER_V2_SEED_DERSLER` (19 ders) TARİHSELDİR; yalnız
 * 20260809000002 migration'ının sözleşme testi için durur. Denetim ekranı
 * `TEMELLER_HEDEF_DERSLER`i (39 ders) kullanır.
 */
export interface HedefDers {
  no: number;
  /** Kart slug'ı — bölüm adları kartlar arasında benzersiz olsa da izlenebilirlik için. */
  kart?: string;
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

/**
 * TARİHSEL — 20260809000002 seed'inin 19 derslik yapısı.
 * Ürün hedefi DEĞİLDİR; yalnız o migration'ın sözleşme testinde kullanılır.
 */
export const TEMELLER_V2_SEED_DERSLER: HedefDers[] = [
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

/**
 * KANONİK hedef müfredat — Muhasebe2.docx nihai yapısı.
 * 3 kart · 10 bölüm · 39 ders. 20260809000005 migration'ıyla birebir aynıdır.
 *
 * `eslesenAdlar` hem yeni hem eski ders adını kabul eder; böylece migration
 * uygulanmadan önce de denetim ekranı doğru ölçer.
 */
export const TEMELLER_HEDEF_DERSLER: HedefDers[] = [
  // ── Kart 1 — Muhasebenin Mantığı (13 ders) ──
  { no: 1, kart: 'muhasebe-baslangic', bolum: 'Muhasebe neden var?', ad: 'Muhasebe Neden Gereklidir?', eslesenAdlar: tek('Muhasebe Neden Gereklidir?') },
  { no: 2, kart: 'muhasebe-baslangic', bolum: 'Muhasebe neden var?', ad: 'Muhasebe Nedir?', eslesenAdlar: tek('Muhasebe Nedir?') },
  { no: 3, kart: 'muhasebe-baslangic', bolum: 'Muhasebe neden var?', ad: 'Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi', eslesenAdlar: tek('Muhasebenin Kaydetme, Sınıflandırma, Özetleme ve Raporlama İşlevi') },
  { no: 4, kart: 'muhasebe-baslangic', bolum: 'Muhasebe neden var?', ad: 'Muhasebe Bilgisini Kim, Neden Kullanır?', eslesenAdlar: tek('Muhasebe Bilgisini Kim, Neden Kullanır?', 'Muhasebe Bilgisini Kim Kullanır?') },
  { no: 5, kart: 'muhasebe-baslangic', bolum: 'İşletmede neyi muhasebeleştiriyoruz?', ad: 'İşletme ile Sahibinin İşlemlerini Ayırmak', eslesenAdlar: tek('İşletme ile Sahibinin İşlemlerini Ayırmak') },
  { no: 6, kart: 'muhasebe-baslangic', bolum: 'İşletmede neyi muhasebeleştiriyoruz?', ad: 'Mali Nitelikteki Olay', eslesenAdlar: tek('Mali Nitelikteki Olay') },
  { no: 7, kart: 'muhasebe-baslangic', bolum: 'İşletmede neyi muhasebeleştiriyoruz?', ad: 'Para Hareketi Her Zaman Gelir veya Gider midir?', eslesenAdlar: tek('Para Hareketi Her Zaman Gelir veya Gider midir?') },
  { no: 8, kart: 'muhasebe-baslangic', bolum: 'İşletmede neyi muhasebeleştiriyoruz?', ad: 'Belge: Ekonomik Olayın Kayıt Dayanağı', eslesenAdlar: tek('Belge: Ekonomik Olayın Kayıt Dayanağı', 'Belge Nedir?', 'Belge') },
  { no: 9, kart: 'muhasebe-baslangic', bolum: 'İşletmenin ekonomik yapısı', ad: 'İşletmenin Varlıkları', eslesenAdlar: tek('İşletmenin Varlıkları') },
  { no: 10, kart: 'muhasebe-baslangic', bolum: 'İşletmenin ekonomik yapısı', ad: 'Varlıklar Nereden Gelir? Borçlar ve Özkaynak', eslesenAdlar: tek('Varlıklar Nereden Gelir? Borçlar ve Özkaynak', 'Varlıkların Kaynakları') },
  { no: 11, kart: 'muhasebe-baslangic', bolum: 'İşletmenin ekonomik yapısı', ad: 'Temel Muhasebe Denklemi: Varlıklar = Borçlar + Özkaynak', eslesenAdlar: tek('Temel Muhasebe Denklemi: Varlıklar = Borçlar + Özkaynak', 'Temel Muhasebe Denklemi') },
  { no: 12, kart: 'muhasebe-baslangic', bolum: 'İşletmenin ekonomik yapısı', ad: 'İşlemlerin Muhasebe Denklemine Etkisi', eslesenAdlar: tek('İşlemlerin Muhasebe Denklemine Etkisi', 'İşlemlerin Denkleme Etkisi') },
  { no: 13, kart: 'muhasebe-baslangic', bolum: 'İşletmenin ekonomik yapısı', ad: 'Gelir, Gider ve Özkaynak İlişkisi', eslesenAdlar: tek('Gelir, Gider ve Özkaynak İlişkisi', 'Gelir, Gider ve Özkaynak') },

  // ── Kart 2 — Hesap ve Kayıt Mantığı (14 ders) ──
  { no: 14, kart: 'hesap-kayit-mantigi', bolum: 'Hesap', ad: 'Hesap Nedir ve Neden Hesaplara İhtiyaç Duyarız?', eslesenAdlar: tek('Hesap Nedir ve Neden Hesaplara İhtiyaç Duyarız?', 'Hesap Nedir?') },
  { no: 15, kart: 'hesap-kayit-mantigi', bolum: 'Hesap', ad: 'Hesabın İki Tarafı: Borç ve Alacak', eslesenAdlar: tek('Hesabın İki Tarafı: Borç ve Alacak', 'Hesaplar Neden İki Taraflıdır?') },
  { no: 16, kart: 'hesap-kayit-mantigi', bolum: 'Hesap', ad: 'Hesaplarda Artış ve Azalış Nasıl İzlenir?', eslesenAdlar: tek('Hesaplarda Artış ve Azalış Nasıl İzlenir?', 'Hesabın Artması ve Azalması') },
  { no: 17, kart: 'hesap-kayit-mantigi', bolum: 'Hesapların çalışma mantığı', ad: 'Varlık Hesapları', eslesenAdlar: tek('Varlık Hesapları') },
  { no: 18, kart: 'hesap-kayit-mantigi', bolum: 'Hesapların çalışma mantığı', ad: 'Kaynak Hesapları', eslesenAdlar: tek('Kaynak Hesapları') },
  { no: 19, kart: 'hesap-kayit-mantigi', bolum: 'Hesapların çalışma mantığı', ad: 'Gelir ve Gider Hesapları', eslesenAdlar: tek('Gelir ve Gider Hesapları') },
  { no: 20, kart: 'hesap-kayit-mantigi', bolum: 'Hesapların çalışma mantığı', ad: 'Hesabın Doğal Yönü: Normal Bakiye', eslesenAdlar: tek('Hesabın Doğal Yönü: Normal Bakiye', 'Normal Bakiye Mantığı') },
  { no: 21, kart: 'hesap-kayit-mantigi', bolum: 'Çift taraflı kayıt', ad: 'Bir İşlem Neden En Az İki Hesabı Etkiler?', eslesenAdlar: tek('Bir İşlem Neden En Az İki Hesabı Etkiler?') },
  { no: 22, kart: 'hesap-kayit-mantigi', bolum: 'Çift taraflı kayıt', ad: 'Çift Taraflı Kayıt', eslesenAdlar: tek('Çift Taraflı Kayıt') },
  { no: 23, kart: 'hesap-kayit-mantigi', bolum: 'Çift taraflı kayıt', ad: 'Borç = Alacak Kontrolü', eslesenAdlar: tek('Borç = Alacak Kontrolü') },
  { no: 24, kart: 'hesap-kayit-mantigi', bolum: 'Hesap Planı', ad: 'Tekdüzen Hesap Planı Neden Var?', eslesenAdlar: tek('Tekdüzen Hesap Planı Neden Var?', 'Tekdüzen Hesap Planı') },
  { no: 25, kart: 'hesap-kayit-mantigi', bolum: 'Hesap Planı', ad: 'Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap', eslesenAdlar: tek('Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap', 'Hesap Sınıfı') },
  { no: 26, kart: 'hesap-kayit-mantigi', bolum: 'Hesap Planı', ad: 'Alt Hesap ve Muhasebe Detayı', eslesenAdlar: tek('Alt Hesap ve Muhasebe Detayı', 'Alt Hesap') },
  { no: 27, kart: 'hesap-kayit-mantigi', bolum: 'Hesap Planı', ad: 'Hesabı Ezberlemek Yerine Bulmak', eslesenAdlar: tek('Hesabı Ezberlemek Yerine Bulmak') },

  // ── Kart 3 — Kayıttan Finansal Tabloya (12 ders) ──
  { no: 28, kart: 'kayittan-finansal-tabloya', bolum: 'Muhasebe Kaydı', ad: 'Yevmiye Kaydı Nedir?', eslesenAdlar: tek('Yevmiye Kaydı Nedir?', 'Yevmiye Kaydı') },
  { no: 29, kart: 'kayittan-finansal-tabloya', bolum: 'Muhasebe Kaydı', ad: 'Bir Yevmiye Kaydının Anatomisi', eslesenAdlar: tek('Bir Yevmiye Kaydının Anatomisi', 'Kayıt Tarihi ve Açıklama') },
  { no: 30, kart: 'kayittan-finansal-tabloya', bolum: 'Muhasebe Kaydı', ad: 'Basit Muhasebe Kaydı', eslesenAdlar: tek('Basit Muhasebe Kaydı') },
  { no: 31, kart: 'kayittan-finansal-tabloya', bolum: 'Muhasebe Kaydı', ad: 'Birden Fazla Hesaplı Kayıt', eslesenAdlar: tek('Birden Fazla Hesaplı Kayıt') },
  { no: 32, kart: 'kayittan-finansal-tabloya', bolum: 'Sınıflandırma ve Kontrol', ad: 'Büyük Defter: Kayıtları Hesaplara Göre Toplamak', eslesenAdlar: tek('Büyük Defter: Kayıtları Hesaplara Göre Toplamak', 'Büyük Defter', 'Büyük Defter (Defteri Kebir)') },
  { no: 33, kart: 'kayittan-finansal-tabloya', bolum: 'Sınıflandırma ve Kontrol', ad: 'Hesap Bakiyesi', eslesenAdlar: tek('Hesap Bakiyesi') },
  { no: 34, kart: 'kayittan-finansal-tabloya', bolum: 'Sınıflandırma ve Kontrol', ad: 'Mizan: Hesapları Tek Yerde Görmek', eslesenAdlar: tek('Mizan: Hesapları Tek Yerde Görmek', 'Mizan') },
  { no: 35, kart: 'kayittan-finansal-tabloya', bolum: 'Sınıflandırma ve Kontrol', ad: 'Mizan Neyi Kontrol Eder, Neyi Edemez?', eslesenAdlar: tek('Mizan Neyi Kontrol Eder, Neyi Edemez?', 'Mizan Ne Kontrol Eder?') },
  { no: 36, kart: 'kayittan-finansal-tabloya', bolum: 'Raporlama', ad: 'Bilanço / Finansal Durum Tablosu', eslesenAdlar: tek('Bilanço / Finansal Durum Tablosu', 'Bilanço') },
  { no: 37, kart: 'kayittan-finansal-tabloya', bolum: 'Raporlama', ad: 'Gelir Tablosu', eslesenAdlar: tek('Gelir Tablosu') },
  { no: 38, kart: 'kayittan-finansal-tabloya', bolum: 'Raporlama', ad: 'Kâr ile Nakit Neden Aynı Şey Değildir?', eslesenAdlar: tek('Kâr ile Nakit Neden Aynı Şey Değildir?', 'Kâr ile Nakit Aynı Şey Değildir') },
  { no: 39, kart: 'kayittan-finansal-tabloya', bolum: 'Raporlama', ad: 'Kayıttan Finansal Tabloya: Muhasebe Döngüsü', eslesenAdlar: tek('Kayıttan Finansal Tabloya: Muhasebe Döngüsü', 'Muhasebe Kaydının Finansal Tabloya Yolculuğu') },
];

export const hedefDersMevcutMu = (hedef: HedefDers, mevcutAdlar: Set<string>): boolean =>
  hedef.eslesenAdlar.some((grup) => grup.every((ad) => mevcutAdlar.has(ad)));

export const OGRENME_ZINCIRI = [
  ['Belge', ['belge', 'fatura', 'dekont', 'bordro', 'sözleşme']],
  ['Ekonomik olay', ['ekonomik olay', 'ne oldu']],
  ['Muhasebe mantığı', ['arttı', 'azaldı', 'etki']],
  ['Hesap seçimi', ['hesap', 'kod']],
  ['Borç/alacak', ['borç', 'alacak']],
  ['Kayıt', ['"type":"kayit"', '"type":"yevmiye"', 'yevmiye']],
  ['Kontrol', ['"type":"kontrol"', 'kontrol']],
  ['Tablo etkisi', ['bilanço', 'gelir tablosu', 'mizan']],
  ['Mevzuat', ['"term":', 'mevzuat']],
] as const;

export const dersZinciri = (icerik: unknown): string[] => {
  const metin = JSON.stringify(icerik ?? []).toLocaleLowerCase('tr');
  return OGRENME_ZINCIRI.filter(([, ipuclari]) => ipuclari.some((ipucu) => metin.includes(ipucu))).map(([ad]) => ad);
};
