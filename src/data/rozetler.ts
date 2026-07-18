import type { Rozet } from '../types';

export const ROZETLER: Rozet[] = [
  {
    id: 'ilk-adim',
    ad: 'İlk Adım',
    aciklama: 'İlk soruyu çöz',
    icon: 'Footprints',
    kontrol: (s) => s.cozulenSayi >= 1,
    ilerleme: (s) => ({ mevcut: Math.min(s.cozulenSayi, 1), hedef: 1 }),
  },
  {
    id: 'besinci',
    ad: 'Yol Alıyor',
    aciklama: '5 soru çöz',
    icon: 'Milestone',
    kontrol: (s) => s.cozulenSayi >= 5,
    ilerleme: (s) => ({ mevcut: Math.min(s.cozulenSayi, 5), hedef: 5 }),
  },
  {
    id: 'onuncu',
    ad: 'Onuncu Kayıt',
    aciklama: '10 soru çöz',
    icon: 'Award',
    kontrol: (s) => s.cozulenSayi >= 10,
    ilerleme: (s) => ({ mevcut: Math.min(s.cozulenSayi, 10), hedef: 10 }),
  },
  {
    id: 'hepsi',
    ad: 'İleri Düzey',
    aciklama: "Soruların %80'ini çöz",
    icon: 'Trophy',
    kontrol: (s) => s.toplamSoru > 0 && s.cozulenSayi >= Math.ceil(s.toplamSoru * 0.8),
    ilerleme: (s) => {
      const hedef = Math.max(1, Math.ceil(s.toplamSoru * 0.8));
      return { mevcut: Math.min(s.cozulenSayi, hedef), hedef };
    },
  },
  {
    id: 'kasa-usta',
    ad: 'Kasa Ustası',
    aciklama: 'Kasa İşlemleri işletmesini bitir',
    icon: 'Banknote',
    kontrol: (s) => !!s.uniteTamamlanmis['kasa'],
  },
  {
    id: 'mal-usta',
    ad: 'Ticaret Ustası',
    aciklama: 'Ticari Mal işletmesini bitir',
    icon: 'Package',
    kontrol: (s) => !!s.uniteTamamlanmis['mal'],
  },
  {
    id: 'kdv-usta',
    ad: 'KDV Ustası',
    aciklama: 'KDV işletmesini bitir',
    icon: 'Receipt',
    kontrol: (s) => !!s.uniteTamamlanmis['kdv'],
  },
  {
    id: 'zor-aslani',
    ad: 'Zor Aslanı',
    aciklama: '3 zor soruyu çöz',
    icon: 'Flame',
    kontrol: (s) => s.zorCozum >= 3,
    ilerleme: (s) => ({ mevcut: Math.min(s.zorCozum, 3), hedef: 3 }),
  },
  {
    id: 'seri-3',
    ad: 'Üç Günlük Seri',
    aciklama: '3 gün üst üste çözüm',
    icon: 'Calendar',
    kontrol: (s) => s.streak >= 3,
    ilerleme: (s) => ({ mevcut: Math.min(s.streak, 3), hedef: 3 }),
  },
  {
    id: 'seri-7',
    ad: 'Haftalık Ateş',
    aciklama: '7 gün üst üste çözüm',
    icon: 'Zap',
    kontrol: (s) => s.streak >= 7,
    ilerleme: (s) => ({ mevcut: Math.min(s.streak, 7), hedef: 7 }),
  },
  {
    id: 'puan-100',
    ad: 'Yüzlük',
    aciklama: '100 puana ulaş',
    icon: 'Star',
    kontrol: (s) => s.puan >= 100,
    ilerleme: (s) => ({ mevcut: Math.min(s.puan, 100), hedef: 100 }),
  },
  {
    id: 'puan-500',
    ad: 'Beş Yüz',
    aciklama: '500 puana ulaş',
    icon: 'Sparkles',
    kontrol: (s) => s.puan >= 500,
    ilerleme: (s) => ({ mevcut: Math.min(s.puan, 500), hedef: 500 }),
  },
];

/**
 * Tüm rozetlerin ilerlemesini hesapla, "yaklaşan rozet" widget'ı için
 * yüzdesi en yüksek olan henüz kazanılmamış rozeti döndür.
 */
export const yaklasanRozet = (
  kazanilanIds: Record<string, string>,
  hesapla: (r: Rozet) => { mevcut: number; hedef: number } | null,
): { rozet: Rozet; mevcut: number; hedef: number; yuzde: number } | null => {
  let enYakin: { rozet: Rozet; mevcut: number; hedef: number; yuzde: number } | null = null;
  for (const r of ROZETLER) {
    if (kazanilanIds[r.id]) continue;
    const ilerleme = hesapla(r);
    if (!ilerleme || ilerleme.hedef === 0) continue;
    const yuzde = Math.min(100, Math.round((ilerleme.mevcut / ilerleme.hedef) * 100));
    if (yuzde === 0) continue;
    if (!enYakin || yuzde > enYakin.yuzde) {
      enYakin = { rozet: r, mevcut: ilerleme.mevcut, hedef: ilerleme.hedef, yuzde };
    }
  }
  return enYakin;
};
