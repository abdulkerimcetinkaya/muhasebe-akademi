// İşletme dönem simülasyonu — canlı defter motoru (bkz. ADR-001).
//
// Saf hesaplama: bir İşletme kartındaki tamamlanmış işlemlerin `kayit` bloklarındaki
// DOĞRU satırlarını biriktirir → hesap bakiyeleri → mizan / bilanço / gelir tablosu.
// Deterministik; öğrencinin hatalı denemesi değil, adımın doğru kaydı birikir.
// React bağımlılığı yok — istemci tarafında anlık hesaplanır.

import type { KesfetKart } from '../data/kesfet';
import type { KayitSatir } from './kayit-block';

export type DefterHesap = { kod: string; ad: string; borc: number; alacak: number };

export type MizanSatir = {
  kod: string;
  ad: string;
  borcToplam: number;
  alacakToplam: number;
  borcBakiye: number;
  alacakBakiye: number;
};

// ── Yardımcılar ──────────────────────────────────────────────────────────────

/** "1.234,56" / "1234.56" / number → sayı. Hatalıysa 0. */
export const tutarSayi = (s: string | number | null | undefined): number => {
  if (typeof s === 'number') return isFinite(s) ? s : 0;
  if (!s) return 0;
  // Türkçe biçim: binlik nokta, ondalık virgül. Önce noktaları at, virgülü noktaya çevir.
  const t = String(s).trim().replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
  const n = parseFloat(t);
  return isFinite(n) ? n : 0;
};

const sinif = (kod: string) => kod.charAt(0);
const ilkIki = (kod: string) => kod.slice(0, 2);

const aktifMi = (kod: string) => sinif(kod) === '1' || sinif(kod) === '2';
const pasifMi = (kod: string) => ['3', '4', '5'].includes(sinif(kod));
const gelirMi = (kod: string) => ['60', '64', '67'].includes(ilkIki(kod));
const giderMi = (kod: string) =>
  ['61', '62', '63', '65', '66', '68'].includes(ilkIki(kod)) || sinif(kod) === '7';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const satirlariParse = (props: any): KayitSatir[] => {
  const raw = props?.satirlar;
  if (Array.isArray(raw)) return raw as KayitSatir[];
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? (p as KayitSatir[]) : [];
    } catch {
      return [];
    }
  }
  return [];
};

// ── Motor ────────────────────────────────────────────────────────────────────

/**
 * Tamamlanmış işlemlerin `kayit` satırlarını hesap bazında biriktirir.
 * `tamamlanan` = tamamlanmış item id'leri. Sıra önemsiz (toplam birleşmeli).
 */
export const defterHesapla = (
  kart: KesfetKart,
  tamamlanan: Set<string>,
): Map<string, DefterHesap> => {
  const harita = new Map<string, DefterHesap>();
  for (const bolum of kart.bolumler) {
    for (const item of bolum.itemlar) {
      if (!tamamlanan.has(item.id)) continue;
      const bloklar = Array.isArray(item.icerik) ? (item.icerik as unknown[]) : [];
      for (const blok of bloklar) {
        const b = blok as { type?: string; props?: unknown };
        if (b?.type !== 'kayit') continue;
        for (const s of satirlariParse(b.props)) {
          const kod = String(s?.kod ?? '').trim();
          if (!kod) continue;
          const mevcut = harita.get(kod) ?? { kod, ad: s.ad ?? '', borc: 0, alacak: 0 };
          const tutar = tutarSayi(s.tutar);
          if (s.tip === 'borc') mevcut.borc += tutar;
          else mevcut.alacak += tutar;
          if (!mevcut.ad && s.ad) mevcut.ad = s.ad;
          harita.set(kod, mevcut);
        }
      }
    }
  }
  return harita;
};

/** Mizan: hesap bazında borç/alacak toplamı + bakiye. Koda göre sıralı. */
export const mizanUret = (hesaplar: Map<string, DefterHesap>): MizanSatir[] =>
  [...hesaplar.values()]
    .map((h) => {
      const net = h.borc - h.alacak;
      return {
        kod: h.kod,
        ad: h.ad,
        borcToplam: h.borc,
        alacakToplam: h.alacak,
        borcBakiye: net > 0 ? net : 0,
        alacakBakiye: net < 0 ? -net : 0,
      };
    })
    .filter((m) => m.borcToplam !== 0 || m.alacakToplam !== 0)
    .sort((a, b) => a.kod.localeCompare(b.kod, 'tr'));

/** Net bakiye: borç bakiyesi − alacak bakiyesi (kontra hesapları da doğru işler). */
const netBakiye = (m: MizanSatir) => m.borcBakiye - m.alacakBakiye;

export type GelirTablosu = {
  gelirler: MizanSatir[];
  giderler: MizanSatir[];
  gelirTop: number;
  giderTop: number;
  netKar: number;
};

/** Gelir tablosu: gelir (alacak bakiyeli) − gider (borç bakiyeli) = net kâr/zarar. */
export const gelirTablosuUret = (hesaplar: Map<string, DefterHesap>): GelirTablosu => {
  const mizan = mizanUret(hesaplar);
  const gelirler = mizan.filter((m) => gelirMi(m.kod));
  const giderler = mizan.filter((m) => giderMi(m.kod));
  const gelirTop = gelirler.reduce((t, m) => t - netBakiye(m), 0); // gelir alacak bakiyeli
  const giderTop = giderler.reduce((t, m) => t + netBakiye(m), 0); // gider borç bakiyeli
  return { gelirler, giderler, gelirTop, giderTop, netKar: gelirTop - giderTop };
};

export type Bilanco = {
  aktif: MizanSatir[];
  pasif: MizanSatir[];
  aktifTop: number;
  pasifTop: number; // dönem kârı dahil
  donemKari: number;
};

/**
 * Bilanço: aktif (1,2) vs pasif (3,4,5) + dönem net kârı (özkaynağa eklenir).
 * Çift taraflı kayıt gereği aktifTop === pasifTop (kâr dahil) her zaman denk gelir.
 */
export const bilancoUret = (hesaplar: Map<string, DefterHesap>): Bilanco => {
  const mizan = mizanUret(hesaplar);
  const aktif = mizan.filter((m) => aktifMi(m.kod));
  const pasif = mizan.filter((m) => pasifMi(m.kod));
  const aktifTop = aktif.reduce((t, m) => t + netBakiye(m), 0);
  const pasifHam = pasif.reduce((t, m) => t - netBakiye(m), 0); // pasif alacak bakiyeli
  const { netKar } = gelirTablosuUret(hesaplar);
  return { aktif, pasif, aktifTop, pasifTop: pasifHam + netKar, donemKari: netKar };
};
