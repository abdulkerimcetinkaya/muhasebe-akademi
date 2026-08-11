/**
 * Keşfet müfredatının hedef yapısı — yalnız admin içerik denetiminde kullanılır.
 *
 * KANONİK KAYNAK: ADR-005 (V6) — 7 Temeller + 16 Yetkinlikler + 8 Uzmanlıklar.
 * `supabase/migrations/20260811000007_kesfet_31_kart.sql` ile birebir aynıdır.
 *
 * Bölüm ve ders kırılımı henüz yok; ürün sahibinden kart kart gelecek ve
 * buraya `bolumler` alanı olarak eklenecek. O zamana kadar denetim kart
 * seviyesinde çalışır: beklenen 31 kart canlıda duruyor mu?
 */

export interface HedefKart {
  slug: string;
  ad: string;
  kategori: 'Temeller' | 'Yetkinlikler' | 'Uzmanlıklar';
  sira: number;
}

export const KESFET_HEDEF_KARTLAR: HedefKart[] = [
  // ── Temeller (7) ──
  { slug: 'muhasebeyi-anlamak', ad: 'Muhasebeyi Anlamak', kategori: 'Temeller', sira: 0 },
  { slug: 'isletmenin-finansal-yapisi', ad: 'İşletmenin Finansal Yapısı', kategori: 'Temeller', sira: 1 },
  { slug: 'hesaplarin-mantigi', ad: 'Hesapların Mantığı', kategori: 'Temeller', sira: 2 },
  { slug: 'borc-alacak-cift-tarafli-kayit', ad: 'Borç, Alacak ve Çift Taraflı Kayıt', kategori: 'Temeller', sira: 3 },
  { slug: 'belgeden-muhasebe-kaydina', ad: 'Belgeden Muhasebe Kaydına', kategori: 'Temeller', sira: 4 },
  { slug: 'kayittan-mizana', ad: 'Kayıttan Mizana', kategori: 'Temeller', sira: 5 },
  { slug: 'finansal-tablolar-ve-dongu', ad: 'Finansal Tablolar ve Muhasebe Döngüsü', kategori: 'Temeller', sira: 6 },

  // ── Yetkinlikler (16) ──
  { slug: 'belge-okuma-islem-analizi', ad: 'Belge Okuma ve İşlem Analizi', kategori: 'Yetkinlikler', sira: 10 },
  { slug: 'hesap-secimi-muhasebe-kaydi', ad: 'Hesap Seçimi ve Muhasebe Kaydı', kategori: 'Yetkinlikler', sira: 11 },
  { slug: 'satin-alma-borc-yonetimi', ad: 'Satın Alma ve Borç Yönetimi', kategori: 'Yetkinlikler', sira: 12 },
  { slug: 'satis-alacak-yonetimi', ad: 'Satış ve Alacak Yönetimi', kategori: 'Yetkinlikler', sira: 13 },
  { slug: 'cari-hesap-mutabakat', ad: 'Cari Hesap ve Mutabakat', kategori: 'Yetkinlikler', sira: 14 },
  { slug: 'nakit-banka-odeme', ad: 'Nakit, Banka ve Ödeme İşlemleri', kategori: 'Yetkinlikler', sira: 15 },
  { slug: 'cek-senet-kart-pos', ad: 'Çek, Senet, Kart ve POS İşlemleri', kategori: 'Yetkinlikler', sira: 16 },
  { slug: 'kdv-islemleri', ad: 'KDV İşlemleri', kategori: 'Yetkinlikler', sira: 17 },
  { slug: 'e-belge-dijital-muhasebe', ad: 'e-Belge ve Dijital Muhasebe', kategori: 'Yetkinlikler', sira: 18 },
  { slug: 'stok-islemleri', ad: 'Stok İşlemleri', kategori: 'Yetkinlikler', sira: 19 },
  { slug: 'duran-varlik-islemleri', ad: 'Duran Varlık İşlemleri', kategori: 'Yetkinlikler', sira: 20 },
  { slug: 'personel-bordro-sgk', ad: 'Personel, Bordro ve SGK', kategori: 'Yetkinlikler', sira: 21 },
  { slug: 'finansman-yabanci-para', ad: 'Finansman ve Yabancı Para İşlemleri', kategori: 'Yetkinlikler', sira: 22 },
  { slug: 'donemsellik-tahakkuk-degerleme', ad: 'Dönemsellik, Tahakkuk ve Değerleme', kategori: 'Yetkinlikler', sira: 23 },
  { slug: 'donem-sonu-vergi-kapanis', ad: 'Dönem Sonu, Vergi ve Kapanış İşlemleri', kategori: 'Yetkinlikler', sira: 24 },
  { slug: 'muhasebe-kontrolu-raporlama', ad: 'Muhasebe Kontrolü, Mutabakat ve Raporlama', kategori: 'Yetkinlikler', sira: 25 },

  // ── Uzmanlıklar (8) ──
  { slug: 'vergi-uzmanligi', ad: 'Vergi', kategori: 'Uzmanlıklar', sira: 30 },
  { slug: 'maliyet-uretim-muhasebesi', ad: 'Maliyet ve Üretim Muhasebesi', kategori: 'Uzmanlıklar', sira: 31 },
  { slug: 'finansal-raporlama-tfrs', ad: 'Finansal Raporlama ve TMS/TFRS', kategori: 'Uzmanlıklar', sira: 32 },
  { slug: 'bordro-sgk-iscilik', ad: 'Bordro, SGK ve İşçilik', kategori: 'Uzmanlıklar', sira: 33 },
  { slug: 'arge-teknokent-tesvikler', ad: 'Ar-Ge, Teknokent ve Teşvikler', kategori: 'Uzmanlıklar', sira: 34 },
  { slug: 'dis-ticaret-muhasebesi', ad: 'Dış Ticaret Muhasebesi', kategori: 'Uzmanlıklar', sira: 35 },
  { slug: 'proje-muhasebesi', ad: 'Proje Muhasebesi', kategori: 'Uzmanlıklar', sira: 36 },
  { slug: 'finansal-analiz-yonetim-raporlama', ad: 'Finansal Analiz ve Yönetim Raporlama', kategori: 'Uzmanlıklar', sira: 37 },
];

/** Canlıdaki slug kümesine göre eksik hedef kartlar. */
export const eksikHedefKartlar = (mevcutSluglar: Set<string>): HedefKart[] =>
  KESFET_HEDEF_KARTLAR.filter((k) => !mevcutSluglar.has(k.slug));

/**
 * Temeller'in bölüm + ders kırılımı (ADR-005 · 20260811000008 ile birebir).
 * 7 kart · 21 bölüm · 47 ders · 7 kart finali.
 *
 * Chief Architect'in 134 derslik iskeleti "öğrenci bunu bitirince tek başına
 * yapabildiği yeni bir şey var mı?" ölçütüyle elendi. Elenen başlıklar ders içi
 * ekran/etkileşim olarak yaşayacak; eleme tablosu CUR-004 v4.0'da.
 *
 * Yetkinlik ve Uzmanlık kartlarının kırılımı henüz yok (ayrı tur).
 */
export interface HedefBolum {
  ad: string;
  dersler: string[];
  /** Kart finali bölümü — normal bölüm sayımına girmez. */
  final?: true;
}

export const TEMELLER_HEDEF_YAPI: Record<string, HedefBolum[]> = {
  'muhasebeyi-anlamak': [
    { ad: 'Muhasebe neden var?', dersler: ['Muhasebe Neden Gereklidir?', 'Muhasebe Kimin Sorusunu Cevaplar?'] },
    { ad: 'Muhasebenin konusu', dersler: ['Muhasebe Ne Yapar?', 'Mali Nitelikteki Olay'] },
    { ad: 'Belge', dersler: ['Belge: Kaydın Dayanağı', 'Belgeden Olayı Çıkarmak'] },
    { ad: 'Muhasebeyi Anlamak Finali', dersler: ['Olay mı, Değil mi?'], final: true },
  ],
  'isletmenin-finansal-yapisi': [
    { ad: 'İşletme ve Varlıkları', dersler: ['İşletme ile Sahibini Ayırmak', 'Varlık Nedir?', 'Dönen ve Duran Varlık Ayrımı'] },
    { ad: 'Kaynaklar ve Denklem', dersler: ['Varlıklar Nereden Gelir? Borç ve Özkaynak', 'Temel Muhasebe Denklemi', 'İşlemler Denklemi Nasıl Değiştirir?'] },
    { ad: 'Gelir ve Gider', dersler: ['Gelir, Gider ve Özkaynak İlişkisi'] },
    { ad: 'İşletmenin Finansal Yapısı Finali', dersler: ['Denklemi Bozmadan Çöz'], final: true },
  ],
  'hesaplarin-mantigi': [
    { ad: 'Hesap', dersler: ['Neden Hesaplara İhtiyaç Var?', 'Hesap Nasıl Çalışır?'] },
    { ad: 'Hesap Türleri', dersler: ['Bilanço Hesapları: Varlık, Borç, Özkaynak', 'Gelir Tablosu Hesapları: Gelir ve Gider'] },
    { ad: 'Hesap Planı', dersler: ['Tekdüzen Hesap Planı Neden Var?', 'Hesap Kodunu Okumak: Sınıf → Grup → Ana Hesap', 'Alt Hesap (Muavin) Nedir?', 'Hesabı Ezberlemek Yerine Bulmak'] },
    { ad: 'Hesapların Mantığı Finali', dersler: ['Doğru Hesabı Bul'], final: true },
  ],
  'borc-alacak-cift-tarafli-kayit': [
    { ad: 'Hesabın İki Tarafı', dersler: ['Hesabın İki Tarafı: Borç ve Alacak'] },
    { ad: 'Artış ve Azalış', dersler: ['Varlık ve Kaynak Hesaplarında Artış ve Azalış', 'Gelir ve Gider Hesaplarında Artış', 'Normal Bakiye'] },
    { ad: 'Çift Taraflı Kayıt ve Karar', dersler: ['Çift Taraflı Kayıt ve Borç = Alacak Dengesi', 'Borç mu Alacak mı? — 5 Adımlı Karar'] },
    { ad: 'Borç, Alacak ve Çift Taraflı Kayıt Finali', dersler: ['Borç mu, Alacak mı?'], final: true },
  ],
  'belgeden-muhasebe-kaydina': [
    { ad: 'İşlemi Çözümlemek', dersler: ['Belgeden İşlemi Çıkarmak', 'Ödeme Şekli ve Ek Unsurlar'] },
    { ad: 'Hesap Seçimi', dersler: ['Olaydan Hesaba Gitmek', 'Alt Hesabı (Muavini) Seçmek'] },
    { ad: 'Yevmiye Kaydı ve Kontrol', dersler: ['İlk Yevmiye Kaydın', 'Basit ve Çok Hesaplı Kayıtlar', 'Kaydı Kontrol Etmek — 5 Soru'] },
    { ad: 'Belgeden Muhasebe Kaydına Finali', dersler: ['Belgeden Kayda: Uçtan Uca'], final: true },
  ],
  'kayittan-mizana': [
    { ad: 'Defterler', dersler: ['Yevmiye Defteri', 'Büyük Defter ve Hesap Bakiyesi'] },
    { ad: 'Mizan', dersler: ['Mizan: Hesapları Tek Yerde Görmek', 'Mizanı Okumak: Ters ve Olağandışı Bakiyeler'] },
    { ad: 'Hata ve Kontrol', dersler: ['Sık Yapılan Kayıt Hataları', 'Mizan Neyi Bulur, Neyi Bulamaz?'] },
    { ad: 'Kayıttan Mizana Finali', dersler: ['Mizanı Denetle'], final: true },
  ],
  'finansal-tablolar-ve-dongu': [
    { ad: 'Finansal Tablolar', dersler: ['Finansal Tablolar Neden Hazırlanır?', 'Bilanço (Finansal Durum Tablosu)', 'Gelir Tablosu'] },
    { ad: 'İşlemlerin Tablo Etkisi', dersler: ['Bir İşlemin Tablolara Etkisi', 'Kâr ile Nakit Aynı Şey Değildir'] },
    { ad: 'Muhasebe Döngüsü', dersler: ['Muhasebe Döngüsü: Belgeden Finansal Tabloya', 'Dönem Kavramı ve Kapanış'] },
    { ad: 'Finansal Tablolar ve Döngü Finali', dersler: ['İlk 10 İşlem'], final: true },
  ],
};

/** Kırılımı tanımlı kartlarda, canlıda eksik olan ders adları. */
export const eksikHedefDersler = (
  kartSlug: string,
  mevcutDersAdlari: Set<string>,
): string[] => {
  const yapi = TEMELLER_HEDEF_YAPI[kartSlug];
  if (!yapi) return [];
  return yapi.flatMap((b) => b.dersler).filter((ad) => !mevcutDersAdlari.has(ad));
};

export const dersAdiNormalize = (deger: string): string =>
  deger
    .toLocaleLowerCase('tr')
    .replace(/[?.,:;()–—=]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Bir dersin içeriğinde öğrenme zincirinin hangi halkalarına değinildiği. */
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
