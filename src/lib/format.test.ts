import { describe, it, expect } from 'vitest';
import { paraFormat, bugununTarihi } from './format';

describe('paraFormat', () => {
  it('null/undefined/0/boş string için boş döner', () => {
    expect(paraFormat(null)).toBe('');
    expect(paraFormat(undefined)).toBe('');
    expect(paraFormat(0)).toBe('');
    expect(paraFormat('')).toBe('');
  });

  it('NaN ya da geçersiz sayıda boş döner', () => {
    expect(paraFormat('abc')).toBe('');
    expect(paraFormat(NaN)).toBe('');
  });

  it('sayıyı iki ondalık basamak ve binlik ayraç ile formatlar', () => {
    expect(paraFormat(1234.5)).toBe('1.234,50');
    expect(paraFormat(1000000)).toBe('1.000.000,00');
  });

  it('sayı string ise dönüştürüp formatlar', () => {
    expect(paraFormat('1234.56')).toBe('1.234,56');
  });

  it('negatif değerleri formatlar', () => {
    expect(paraFormat(-50)).toBe('-50,00');
  });
});

describe('bugununTarihi', () => {
  it('YYYY-MM-DD formatında döner', () => {
    const t = bugununTarihi();
    expect(t).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('bugünün YEREL tarihiyle eşleşir', () => {
    const t = bugununTarihi();
    const d = new Date();
    const beklenen = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`;
    expect(t).toBe(beklenen);
  });
});
