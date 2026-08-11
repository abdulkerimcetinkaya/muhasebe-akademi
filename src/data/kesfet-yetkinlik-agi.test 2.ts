import { describe, expect, it } from 'vitest';
import { kartErisimi, kartFinalBolumleri, kartTamamlandiMi, normalBolumler, olcumTamamlandiMi, type KesfetKart } from './kesfet';

const kart = (slug: string, onKosullar: string[] = [], itemlar: string[] = ['ders']): KesfetKart => ({
  id: slug,
  slug,
  ad: slug,
  aciklama: '',
  ikon: 'BookOpen',
  kategori: 'Temeller',
  tip: 'kesfet',
  durum: 'acik',
  uzmanlik_turu: null,
  on_kosul_sluglari: onKosullar,
  onerilen_on_kosul_sluglari: [],
  sira: 0,
  bolumler: [{ id: `${slug}-b`, ad: 'Bölüm', sira: 0, tur: 'normal', itemlar: itemlar.map((id) => ({ id, ad: id, tip: 'ders', yayin_durumu: 'yayinlandi', icerik: [{ type: 'paragraph' }] })) }],
});

describe('Keşfet yetkinlik ağı', () => {
  it('yalnız bütün yayınlanabilir itemlar bitince kartı tamamlar', () => {
    const temel = kart('temel', [], ['a', 'b']);
    expect(kartTamamlandiMi(temel, new Set(['a']))).toBe(false);
    expect(kartTamamlandiMi(temel, new Set(['a', 'b']))).toBe(true);
  });

  it('kart finalini bölüm sayısından ayırır fakat tamamlanmaya dahil eder', () => {
    const temel = kart('temel', [], ['ders']);
    temel.bolumler.push({ id: 'final-b', ad: 'Final', sira: 99, tur: 'kart_finali', itemlar: [{ id: 'final', ad: 'Final', tip: 'alistirma', yayin_durumu: 'yayinlandi', icerik: [{ type: 'paragraph' }] }] });
    expect(normalBolumler(temel)).toHaveLength(1);
    expect(kartFinalBolumleri(temel)).toHaveLength(1);
    expect(kartTamamlandiMi(temel, new Set(['ders']))).toBe(false);
    expect(kartTamamlandiMi(temel, new Set(['ders', 'final']))).toBe(true);
  });

  it('zorunlu ön koşul tamamlanmadan kartı kilitler', () => {
    const temel = kart('temel');
    const yetkinlik = kart('yetkinlik', ['temel']);
    expect(kartErisimi(yetkinlik, [temel, yetkinlik], new Set()).durum).toBe('kilitli');
    expect(kartErisimi(yetkinlik, [temel, yetkinlik], new Set(['ders'])).durum).toBe('acik');
  });

  it('önerilen ön koşulu erişim kapısı yapmaz', () => {
    const hedef = { ...kart('hedef'), onerilen_on_kosul_sluglari: ['onerilen'] };
    expect(kartErisimi(hedef, [hedef, kart('onerilen')], new Set()).durum).toBe('acik');
  });

  it('yakında ve gizli kartları erişime açmaz', () => {
    expect(kartErisimi({ ...kart('yakinda'), durum: 'yakinda' }, [], new Set()).durum).toBe('yakinda');
    expect(kartErisimi({ ...kart('gizli'), durum: 'gizli' }, [], new Set()).durum).toBe('gizli');
  });

  it('içeriksiz kartı tamamlanmış saymaz', () => {
    expect(kartTamamlandiMi(kart('bos', [], []), new Set())).toBe(false);
  });

  it('yalnız zorunlu ölçümlü sorular doğru çözülünce ölçümü tamamlar', () => {
    const sorular = [
      { soru_id: 'zorunlu', sira: 0, zorunlu: true, minimum_basari: 100, destek_seviyesi: 'standart' as const },
      { soru_id: 'opsiyonel', sira: 1, zorunlu: false, minimum_basari: 100, destek_seviyesi: 'standart' as const },
    ];
    expect(olcumTamamlandiMi(sorular, new Set())).toBe(false);
    expect(olcumTamamlandiMi(sorular, new Set(['zorunlu']))).toBe(true);
  });
});
