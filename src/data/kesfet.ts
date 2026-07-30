/**
 * Keşfet içerik tipleri + saf yardımcılar (LeetCode Explore modeli: Kart → Bölüm → Item).
 * Veri DB'den yüklenir (src/lib/kesfet.ts); burada yalnızca tipler ve saf fonksiyonlar.
 */

export type ItemTip = 'ders' | 'alistirma';

export interface KesfetItem {
  id: string;
  ad: string;
  tip: ItemTip;
  soru_id?: string | null;
  /** Ders içeriği — BlockNote blok dizisi (özel yevmiye/sahanotu blokları dahil). */
  icerik?: unknown | null;
}

export interface KesfetBolum {
  id: string;
  ad: string;
  sira: number;
  itemlar: KesfetItem[];
}

export type KartTip = 'kesfet' | 'isletme';

export interface KesfetKart {
  id: string;
  slug: string;
  ad: string;
  aciklama: string;
  ikon: string;
  kategori: string;
  /** Kart türü: 'kesfet' (kavram dersi) veya 'isletme' (dönem simülasyonu). */
  tip: KartTip;
  durum: 'acik' | 'yakinda';
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
  katalogBaslik: string;
  katalogAlt: string;
  bosBaslik: string;
  bosAciklama: string;
  kategoriSira: string[];
}

export const KESFET_TRACK: TrackAyar = {
  tip: 'kesfet',
  taban: '/kesfet',
  etiket: 'Keşfet',
  katalogUst: 'Keşfet',
  katalogBaslik: 'Nereden başlayacağını seç.',
  katalogAlt:
    'Önce temelleri kavra, sonra uzmanlık alanlarında kendi patikanı ilerlet. Her kart, sıralı ders ve alıştırmalardan oluşur.',
  bosBaslik: 'Henüz içerik yok',
  bosAciklama: 'Keşfet kartları yakında burada olacak. İlk kart eklendiğinde görünecek.',
  kategoriSira: ['Temeller', 'Uzmanlık Alanları', 'Uzmanlık'],
};

export const ISLETME_TRACK: TrackAyar = {
  tip: 'isletme',
  taban: '/isletmeler',
  etiket: 'İşletmeler',
  katalogUst: 'İşletmeler',
  katalogBaslik: 'Bir işletmeyi baştan sona çalıştır.',
  katalogAlt:
    'Bir işletme türü seç; açılıştan dönem sonuna kadar tüm işlemleri gerçek bir muhasebeci gibi kaydet. Her adımda şirketin güncel durumunu gör.',
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
