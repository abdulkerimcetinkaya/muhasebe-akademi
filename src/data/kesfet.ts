/**
 * Keşfet içerik tipleri + saf yardımcılar (LeetCode Explore modeli: Kart → Bölüm → Item).
 * Veri DB'den yüklenir (src/lib/kesfet.ts); burada yalnızca tipler ve saf fonksiyonlar.
 */

export type ItemTip = 'ders' | 'alistirma';

export interface KesfetItem {
  id: string;
  ad: string;
  tip: ItemTip;
  yayin_durumu?: 'taslak' | 'incelemede' | 'yayinlandi' | 'arsiv';
  soru_id?: string | null;
  sorular?: KesfetSoruBaglantisi[];
  /** Ders içeriği — BlockNote blok dizisi (özel yevmiye/sahanotu blokları dahil). */
  icerik?: unknown | null;
}

export interface KesfetSoruBaglantisi {
  soru_id: string;
  sira: number;
  zorunlu: boolean;
  minimum_basari: number;
  destek_seviyesi: 'rehberli' | 'standart' | 'serbest';
}

export interface KesfetBolum {
  id: string;
  ad: string;
  sira: number;
  tur: 'normal' | 'kart_finali';
  itemlar: KesfetItem[];
}

export type KartTip = 'kesfet' | 'isletme';
export type KartYayinDurumu = 'acik' | 'yakinda' | 'gizli';
export type UzmanlikTuru = 'fonksiyonel' | 'sektorel' | null;

export interface KesfetKart {
  id: string;
  slug: string;
  ad: string;
  aciklama: string;
  ikon: string;
  kategori: string;
  /** Kart türü: 'kesfet' (kavram dersi) veya 'isletme' (dönem simülasyonu). */
  tip: KartTip;
  durum: KartYayinDurumu;
  uzmanlik_turu?: UzmanlikTuru;
  on_kosul_sluglari?: string[];
  onerilen_on_kosul_sluglari?: string[];
  sira: number;
  bolumler: KesfetBolum[];
}

// ── Track ayarı: Keşfet ve İşletmeler aynı bileşenleri kullanır; tüm farklar
//    (rota tabanı, etiketler, katalog metinleri, kategori sırası) burada. ────
export interface TrackAyar {
  tip: KartTip;
  taban: string; // '/kesfet' | '/isletmeler'
  etiket: string; // breadcrumb / rozet
  katalogUst: string;
  // Başlık üç parça: düz öncesi + italik (Fraunces) vurgu + düz sonrası.
  katalogBaslikOnce: string;
  katalogBaslikVurgu: string;
  katalogBaslikSonra: string;
  katalogAlt: string;
  bosBaslik: string;
  bosAciklama: string;
  kategoriSira: string[];
}

export const KESFET_TRACK: TrackAyar = {
  tip: 'kesfet',
  taban: '/kesfet',
  etiket: 'Keşfet',
  katalogUst: 'Öğrenme patikası',
  katalogBaslikOnce: 'Nereden ',
  katalogBaslikVurgu: 'başlamak',
  katalogBaslikSonra: ' istersin?',
  katalogAlt:
    'Temeller ile başla, günlük yetkinliklerini geliştir, ardından uzmanlık yolunu seç. Her kart sıralı ders ve uygulamalardan oluşur.',
  bosBaslik: 'Henüz içerik yok',
  bosAciklama: 'Keşfet kartları yakında burada olacak. İlk kart eklendiğinde görünecek.',
  kategoriSira: ['Temeller', 'Yetkinlikler', 'Uzmanlıklar'],
};

export const ISLETME_TRACK: TrackAyar = {
  tip: 'isletme',
  taban: '/isletmeler',
  etiket: 'İşletmeler',
  katalogUst: 'İşletme türü seç',
  katalogBaslikOnce: 'Hangi ',
  katalogBaslikVurgu: 'işletmeyle',
  katalogBaslikSonra: ' başlamak istersin?',
  katalogAlt:
    'Bir işletme türü seç; açılıştan dönem sonuna dek her işlemi gerçek bir muhasebeci gibi kaydet, şirketin canlı durumunu izle.',
  bosBaslik: 'İşletmeler yakında',
  bosAciklama:
    'İlk işletme hazırlanıyor. Yakında burada bir dönemi baştan sona çalıştırabileceksin.',
  kategoriSira: ['Ticaret', 'Üretim', 'Hizmet'],
};

export const trackAyar = (pathname: string): TrackAyar =>
  pathname.startsWith('/isletmeler') ? ISLETME_TRACK : KESFET_TRACK;

// ── Saf yardımcılar ────────────────────────────────────────────────────────

export const kartBul = (
  kartlar: KesfetKart[],
  slug: string | undefined,
): KesfetKart | undefined => kartlar.find((k) => k.slug === slug);

/** Kartın tüm item'larını bölüm bilgisiyle, sıralı düz liste olarak verir. */
export const kartItemlari = (
  kart: KesfetKart,
): { bolum: KesfetBolum; item: KesfetItem; sira: number }[] =>
  kart.bolumler
    .flatMap((bolum) => bolum.itemlar.map((item) => ({ bolum, item })))
    .map((x, i) => ({ ...x, sira: i }));

export const itemBul = (
  kart: KesfetKart,
  itemId: string | undefined,
): { bolum: KesfetBolum; item: KesfetItem; sira: number } | undefined =>
  kartItemlari(kart).find((x) => x.item.id === itemId);

/** Kaba tahmini süre (dk): ders 3, alıştırma 6. */
export const kartSureDk = (kart: KesfetKart): number =>
  kart.bolumler
    .flatMap((b) => b.itemlar)
    .reduce((n, it) => n + (it.tip === 'ders' ? 3 : 6), 0);

export const kartDersSayisi = (kart: KesfetKart): number =>
  kart.bolumler.flatMap((b) => b.itemlar).length;

export const normalBolumler = (kart: KesfetKart): KesfetBolum[] =>
  kart.bolumler.filter((bolum) => bolum.tur !== 'kart_finali');

export const kartFinalBolumleri = (kart: KesfetKart): KesfetBolum[] =>
  kart.bolumler.filter((bolum) => bolum.tur === 'kart_finali');

export const yayinlanabilirItemlar = (kart: KesfetKart): KesfetItem[] =>
  kart.bolumler
    .flatMap((b) => b.itemlar)
    .filter((item) => Array.isArray(item.icerik) && item.icerik.length > 0);

export const kartTamamlandiMi = (kart: KesfetKart, tamamlanan: Set<string>): boolean => {
  const itemlar = yayinlanabilirItemlar(kart);
  return itemlar.length > 0 && itemlar.every((item) => tamamlanan.has(item.id));
};

export type KartErisim = {
  durum: 'acik' | 'kilitli' | 'yakinda' | 'gizli';
  eksikZorunlular: KesfetKart[];
};

export const kartErisimi = (
  kart: KesfetKart,
  kartlar: KesfetKart[],
  tamamlanan: Set<string>,
): KartErisim => {
  if (kart.durum === 'gizli') return { durum: 'gizli', eksikZorunlular: [] };
  if (kart.durum === 'yakinda') return { durum: 'yakinda', eksikZorunlular: [] };
  const eksikZorunlular = (kart.on_kosul_sluglari ?? [])
    .map((slug) => kartlar.find((aday) => aday.slug === slug))
    .filter((aday): aday is KesfetKart => Boolean(aday))
    .filter((aday) => !kartTamamlandiMi(aday, tamamlanan));
  return { durum: eksikZorunlular.length ? 'kilitli' : 'acik', eksikZorunlular };
};

export const olcumTamamlandiMi = (
  sorular: KesfetSoruBaglantisi[],
  dogruCozulenler: Set<string>,
): boolean => sorular.filter((soru) => soru.zorunlu).every((soru) => dogruCozulenler.has(soru.soru_id));
