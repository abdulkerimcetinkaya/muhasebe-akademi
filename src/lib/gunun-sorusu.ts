import { bugununTarihi } from './format';
import type { Ilerleme, SoruWithUnite } from '../types';

const tarihHash = (tarih: string): number => {
  let h = 2166136261;
  for (let i = 0; i < tarih.length; i++) {
    h ^= tarih.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

/**
 * Günün sorusu — öğrenciye özel seçim mantığı:
 *
 * 1. Eğer kullanıcı **yanlış yaptığı** sorular varsa, en çok yanlış yapılan
 *    sorunun **konu/alt başlığından** henüz çözülmemiş bir soru seç (zayıflık
 *    bazlı revizyon).
 * 2. Yoksa, çözülmemiş sorulardan tarih-hash ile deterministik bir seçim
 *    (aynı gün içinde sayfa yenilense aynı soru gelir).
 * 3. Tüm sorular çözülmüşse, herhangi bir soruyu tarih-hash ile döner (revizyon).
 * 4. İlerleme verisi yoksa (ziyaretçi), eski deterministik davranış.
 */
export const gununSorusu = (
  tumSorular: SoruWithUnite[],
  ilerleme?: Ilerleme,
): SoruWithUnite | null => {
  if (tumSorular.length === 0) return null;
  const tarih = bugununTarihi();
  const hash = tarihHash(tarih);

  if (!ilerleme) {
    return tumSorular[hash % tumSorular.length];
  }

  const cozulenler = ilerleme.cozulenler;
  const yanlislar = ilerleme.yanlislar;

  const cozulmemis = tumSorular.filter((s) => !cozulenler[s.id]);

  // 1) Zayıflık bazlı seçim: en çok yanlış yapılan sorunun konusundan çözülmemiş
  const yanlisIdler = Object.entries(yanlislar)
    .filter(([id]) => !cozulenler[id])
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => id);

  for (const yanlisId of yanlisIdler) {
    const yanlisSoru = tumSorular.find((s) => s.id === yanlisId);
    if (!yanlisSoru) continue;
    const konuId = yanlisSoru.konuId ?? null;
    const altBaslikId = yanlisSoru.altBaslikId ?? null;
    if (!konuId && !altBaslikId) continue;

    const ayniKonudan = cozulmemis.filter((s) => {
      // Yanlış yapılan sorunun kendisi değil, aynı konudan FARKLI bir soru
      if (s.id === yanlisId) return false;
      if (altBaslikId && s.altBaslikId === altBaslikId) return true;
      if (konuId && s.konuId === konuId) return true;
      return false;
    });
    if (ayniKonudan.length > 0) {
      return ayniKonudan[hash % ayniKonudan.length];
    }
  }

  // 2) Çözülmemişlerden tarih-hash ile
  if (cozulmemis.length > 0) {
    return cozulmemis[hash % cozulmemis.length];
  }

  // 3) Hepsi çözülmüş — revizyon olarak rastgele bir tane
  return tumSorular[hash % tumSorular.length];
};
