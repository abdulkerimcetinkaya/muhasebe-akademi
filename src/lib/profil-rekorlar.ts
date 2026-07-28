// Kişisel rekorlar — profilde "şampiyon kupaları" vitrininde gösterilir.
import type { Ilerleme } from '../types';
import { gunAnahtari } from './format';

export interface KisiselRekorlar {
  enUzunStreak: number;
  enCokGun: { tarih: string | null; sayi: number };
  ilkSoruTarihi: string | null;
  toplamAktifGun: number;
}

export const kisiselRekorlar = (ilerleme: Ilerleme): KisiselRekorlar => {
  // Aktivite tarihlerini sıralı diziye çevir
  const tarihler = Object.entries(ilerleme.aktiviteTarihleri)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ tarih: k, sayi: v }))
    .sort((a, b) => (a.tarih < b.tarih ? -1 : 1));

  // En çok soru çözülen gün
  let enCok = { tarih: null as string | null, sayi: 0 };
  for (const t of tarihler) {
    if (t.sayi > enCok.sayi) enCok = { tarih: t.tarih, sayi: t.sayi };
  }

  // En uzun streak — ardışık günlerin maksimumu
  let enUzun = 0;
  let mevcut = 0;
  let oncekiTarih: Date | null = null;
  for (const t of tarihler) {
    const d = new Date(t.tarih);
    if (oncekiTarih) {
      const fark = Math.round((d.getTime() - oncekiTarih.getTime()) / 86400000);
      if (fark === 1) {
        mevcut += 1;
      } else {
        enUzun = Math.max(enUzun, mevcut);
        mevcut = 1;
      }
    } else {
      mevcut = 1;
    }
    oncekiTarih = d;
  }
  enUzun = Math.max(enUzun, mevcut, ilerleme.streak);

  return {
    enUzunStreak: enUzun,
    enCokGun: enCok,
    ilkSoruTarihi: tarihler.length > 0 ? tarihler[0].tarih : null,
    toplamAktifGun: tarihler.length,
  };
};

/**
 * 12 aylık aktivite haritası — bugünden 365 gün geriye, hafta hafta.
 * GitHub-style takvim için: dış dizi haftalar, iç dizi günler (pazartesi başı).
 * Eksik günler `sayi: 0` ile doldurulur.
 */
export interface YilGunu {
  tarih: string;
  sayi: number;
}

export const yillikAktivite = (
  ilerleme: Ilerleme,
): { haftalar: YilGunu[][]; toplam: number } => {
  const bugun = new Date();
  const baslangic = new Date(bugun.getTime() - 364 * 86400000);
  // Pazartesi başlangıçlı haftaya hizala
  const baslangicGun = baslangic.getDay(); // 0 (Pazar) - 6 (Cumartesi)
  const pazaresiOffset = baslangicGun === 0 ? 6 : baslangicGun - 1;
  baslangic.setDate(baslangic.getDate() - pazaresiOffset);

  const gunler: YilGunu[] = [];
  let toplam = 0;
  for (let d = new Date(baslangic); d <= bugun; d.setDate(d.getDate() + 1)) {
    const k = gunAnahtari(d);
    const sayi = ilerleme.aktiviteTarihleri[k] || 0;
    gunler.push({ tarih: k, sayi });
    toplam += sayi;
  }

  // 7'li gruplara böl (haftalar)
  const haftalar: YilGunu[][] = [];
  for (let i = 0; i < gunler.length; i += 7) {
    haftalar.push(gunler.slice(i, i + 7));
  }
  return { haftalar, toplam };
};
