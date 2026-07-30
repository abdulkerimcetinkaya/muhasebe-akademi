import { describe, it, expect } from 'vitest';
import {
  bilancoUret,
  defterHesapla,
  gelirTablosuUret,
  mizanUret,
  tutarSayi,
} from './isletme-defter';
import type { KesfetKart } from '../data/kesfet';

// Bir kayit bloğu (içerik satirlar'ı DB'de JSON string olarak tutulur).
const kayitBlok = (satirlar: { kod: string; ad: string; tutar: string; tip: 'borc' | 'alacak' }[]) => ({
  type: 'kayit',
  props: { satirlar: JSON.stringify(satirlar) },
});

// Sentetik Ticaret İşletmesi: açılış → mal alış → peşin satış.
const kart: KesfetKart = {
  id: 'k1',
  slug: 'ticaret',
  ad: 'Ticaret İşletmesi',
  aciklama: '',
  ikon: 'Store',
  kategori: 'Ticaret',
  tip: 'isletme',
  durum: 'acik',
  sira: 0,
  bolumler: [
    {
      id: 'b1',
      ad: 'Açılış',
      sira: 0,
      itemlar: [
        {
          id: 'a1',
          ad: 'Kuruluş',
          tip: 'alistirma',
          icerik: [
            kayitBlok([
              { kod: '100', ad: 'Kasa', tutar: '100.000,00', tip: 'borc' },
              { kod: '500', ad: 'Sermaye', tutar: '100.000,00', tip: 'alacak' },
            ]),
          ],
        },
      ],
    },
    {
      id: 'b2',
      ad: 'Dönem İçi',
      sira: 1,
      itemlar: [
        {
          id: 'a2',
          ad: 'Mal alışı',
          tip: 'alistirma',
          icerik: [
            kayitBlok([
              { kod: '153', ad: 'Ticari Mallar', tutar: '20000', tip: 'borc' },
              { kod: '191', ad: 'İndirilecek KDV', tutar: '4000', tip: 'borc' },
              { kod: '100', ad: 'Kasa', tutar: '24000', tip: 'alacak' },
            ]),
          ],
        },
        {
          id: 'a3',
          ad: 'Peşin satış',
          tip: 'alistirma',
          icerik: [
            kayitBlok([
              { kod: '100', ad: 'Kasa', tutar: '36000', tip: 'borc' },
              { kod: '600', ad: 'Yurtiçi Satışlar', tutar: '30000', tip: 'alacak' },
              { kod: '391', ad: 'Hesaplanan KDV', tutar: '6000', tip: 'alacak' },
            ]),
          ],
        },
      ],
    },
  ],
};

const hepsi = new Set(['a1', 'a2', 'a3']);

describe('tutarSayi', () => {
  it('Türkçe ve düz biçimleri, geçersizleri işler', () => {
    expect(tutarSayi('100.000,00')).toBe(100000);
    expect(tutarSayi('24000')).toBe(24000);
    expect(tutarSayi(36000)).toBe(36000);
    expect(tutarSayi('abc')).toBe(0);
    expect(tutarSayi(null)).toBe(0);
  });
});

describe('defterHesapla', () => {
  it('hesap bazında borç/alacak biriktirir', () => {
    const h = defterHesapla(kart, hepsi);
    expect(h.get('100')).toMatchObject({ borc: 136000, alacak: 24000 });
    expect(h.get('153')).toMatchObject({ borc: 20000, alacak: 0 });
    expect(h.get('500')).toMatchObject({ borc: 0, alacak: 100000 });
  });

  it('yalnızca tamamlanmış işlemleri sayar', () => {
    const h = defterHesapla(kart, new Set(['a1'])); // sadece açılış
    expect(h.get('100')).toMatchObject({ borc: 100000, alacak: 0 });
    expect(h.has('600')).toBe(false);
  });
});

describe('mizan', () => {
  it('borç bakiye toplamı = alacak bakiye toplamı (denk)', () => {
    const m = mizanUret(defterHesapla(kart, hepsi));
    const borc = m.reduce((t, s) => t + s.borcBakiye, 0);
    const alacak = m.reduce((t, s) => t + s.alacakBakiye, 0);
    expect(borc).toBe(alacak);
  });
});

describe('gelir tablosu', () => {
  it('net kâr = gelir − gider', () => {
    const g = gelirTablosuUret(defterHesapla(kart, hepsi));
    expect(g.gelirTop).toBe(30000);
    expect(g.giderTop).toBe(0);
    expect(g.netKar).toBe(30000);
  });
});

describe('bilanço', () => {
  it('aktif toplamı = pasif toplamı (dönem kârı dahil)', () => {
    const b = bilancoUret(defterHesapla(kart, hepsi));
    expect(b.aktifTop).toBe(136000);
    expect(b.pasifTop).toBe(136000);
    expect(b.donemKari).toBe(30000);
    expect(b.aktifTop).toBe(b.pasifTop);
  });
});
