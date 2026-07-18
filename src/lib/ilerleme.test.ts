import { describe, it, expect, beforeEach } from 'vitest';
import { varsayilanIlerleme, ilerlemeYukle, ilerlemeKaydet, istatistikHesapla } from './ilerleme';
import { STORAGE_KEY } from '../data/sabitler';
import type { Ilerleme, Soru, SoruWithUnite, Unite } from '../types';

const soru = (id: string, zorluk: Soru['zorluk'] = 'kolay'): SoruWithUnite => ({
  id,
  baslik: id,
  zorluk,
  senaryo: '',
  ipucu: '',
  aciklama: '',
  cozum: [],
  uniteId: 'u1',
  uniteAd: 'U1',
  uniteIcon: 'i',
});

describe('varsayilanIlerleme', () => {
  it('sıfırlanmış alanlarla ilerleme döner', () => {
    const i = varsayilanIlerleme();
    expect(i.puan).toBe(0);
    expect(i.streak).toBe(0);
    expect(i.cozulenler).toEqual({});
    expect(i.yanlislar).toEqual({});
    expect(i.sonCozumTarihi).toBeNull();
    expect(i.onboardingTamam).toBe(false);
    expect(i.tema).toBe('light');
  });
});

describe('ilerlemeYukle / ilerlemeKaydet', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('kayıt yoksa varsayılan döner', () => {
    const i = ilerlemeYukle();
    expect(i).toEqual(varsayilanIlerleme());
  });

  it('kaydedilmişi geri okur', () => {
    const data = { ...varsayilanIlerleme(), puan: 150, streak: 3 };
    ilerlemeKaydet(data);
    const i = ilerlemeYukle();
    expect(i.puan).toBe(150);
    expect(i.streak).toBe(3);
  });

  it('bozuk JSON varsa varsayılanı döner', () => {
    localStorage.setItem(STORAGE_KEY, '{bozuk');
    const i = ilerlemeYukle();
    expect(i).toEqual(varsayilanIlerleme());
  });

  it('çözümü olan mevcut kullanıcıyı onboardingTamam=true olarak işaretler', () => {
    const eski: Partial<Ilerleme> = {
      kullaniciAdi: 'Öğrenci',
      cozulenler: { s1: { tarih: '2026-01-01', zorluk: 'kolay' } },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eski));
    const i = ilerlemeYukle();
    expect(i.onboardingTamam).toBe(true);
  });

  it('özel ad girmiş kullanıcıyı onboardingTamam=true yapar', () => {
    const eski: Partial<Ilerleme> = { kullaniciAdi: 'Ahmet', cozulenler: {} };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eski));
    const i = ilerlemeYukle();
    expect(i.onboardingTamam).toBe(true);
  });

  it('varsayılan ad + çözüm yoksa onboardingTamam=false kalır', () => {
    const eski: Partial<Ilerleme> = { kullaniciAdi: 'Öğrenci', cozulenler: {} };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(eski));
    const i = ilerlemeYukle();
    expect(i.onboardingTamam).toBe(false);
  });
});

describe('istatistikHesapla', () => {
  const uniteler: Unite[] = [
    {
      id: 'u1',
      ad: 'U1',
      thiingsIcon: 'i',
      aciklama: '',
      aktif: true,
      sorular: [
        { id: 's1', baslik: 's1', zorluk: 'kolay', senaryo: '', ipucu: '', aciklama: '', cozum: [] },
        { id: 's2', baslik: 's2', zorluk: 'orta', senaryo: '', ipucu: '', aciklama: '', cozum: [] },
      ],
    },
    {
      id: 'u2',
      ad: 'U2',
      thiingsIcon: 'i',
      aciklama: '',
      aktif: true,
      sorular: [{ id: 's3', baslik: 's3', zorluk: 'zor', senaryo: '', ipucu: '', aciklama: '', cozum: [] }],
    },
  ];
  const tumSorular: SoruWithUnite[] = [soru('s1', 'kolay'), soru('s2', 'orta'), soru('s3', 'zor')];

  it('boş ilerlemede sayımlar sıfırdır', () => {
    const s = istatistikHesapla(varsayilanIlerleme(), uniteler, tumSorular);
    expect(s.cozulenSayi).toBe(0);
    expect(s.toplamSoru).toBe(3);
    expect(s.kolayCozum).toBe(0);
    expect(s.ortaCozum).toBe(0);
    expect(s.zorCozum).toBe(0);
    expect(s.uniteTamamlanmis).toEqual({ u1: false, u2: false });
  });

  it('zorluğa göre çözümleri ayırır', () => {
    const i: Ilerleme = {
      ...varsayilanIlerleme(),
      cozulenler: {
        s1: { tarih: '2026-01-01', zorluk: 'kolay' },
        s2: { tarih: '2026-01-02', zorluk: 'orta' },
      },
      puan: 15,
    };
    const s = istatistikHesapla(i, uniteler, tumSorular);
    expect(s.cozulenSayi).toBe(2);
    expect(s.kolayCozum).toBe(1);
    expect(s.ortaCozum).toBe(1);
    expect(s.zorCozum).toBe(0);
    expect(s.puan).toBe(15);
  });

  it('tüm soruları çözülen işletmeyi tamamlanmış işaretler', () => {
    const i: Ilerleme = {
      ...varsayilanIlerleme(),
      cozulenler: {
        s1: { tarih: '2026-01-01', zorluk: 'kolay' },
        s2: { tarih: '2026-01-02', zorluk: 'orta' },
        s3: { tarih: '2026-01-03', zorluk: 'zor' },
      },
    };
    const s = istatistikHesapla(i, uniteler, tumSorular);
    expect(s.uniteTamamlanmis).toEqual({ u1: true, u2: true });
  });

  it('sorusu olmayan işletmeyi tamamlanmış saymaz', () => {
    const bosUniteler: Unite[] = [{ id: 'u3', ad: 'U3', thiingsIcon: 'i', aciklama: '', aktif: true, sorular: [] }];
    const s = istatistikHesapla(varsayilanIlerleme(), bosUniteler, []);
    expect(s.uniteTamamlanmis).toEqual({ u3: false });
  });
});
