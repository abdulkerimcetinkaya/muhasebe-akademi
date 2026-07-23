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

export interface KesfetKart {
  id: string;
  slug: string;
  ad: string;
  aciklama: string;
  ikon: string;
  kategori: string;
  durum: 'acik' | 'yakinda';
  sira: number;
  bolumler: KesfetBolum[];
}

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
