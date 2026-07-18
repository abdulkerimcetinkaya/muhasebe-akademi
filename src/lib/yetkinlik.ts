// İşletme/zorluk bazlı yetkinlik (mastery) hesaplaması.
//
// Yetkinlik formülü — ağırlıklı puan / mevcut maksimum:
//   her çözülen soru zorluk puanı kadar katkı yapar (kolay 5, orta 10, zor 20)
//   payda: işletmedeki tüm soruların zorluk puanları toplamı
// Sonuç: 0–100 arası tam sayı. İşletmenin "kaç puanı vermeye hazır olduğu" yerine
// "öğrencinin o işletmeden kaç puan toplayabildiği" gösterir — yani fairer.
import { ZORLUK_PUAN } from '../data/sabitler';
import type { Ilerleme, Unite, Zorluk } from '../types';

export interface ZorlukDagilim {
  toplam: number;
  cozulen: number;
}

export interface UniteYetkinligi {
  uniteId: string;
  uniteAd: string;
  thiingsIcon: string;
  toplamSoru: number;
  cozulenSoru: number;
  yetkinlik: number; // 0..100
  dagilim: Record<Zorluk, ZorlukDagilim>;
}

/**
 * Tek bir modülün ilerleme bilgisi — karne tablosunda satır olarak gösterilir.
 * Modülün altındaki tüm alt başlıklara bağlı soruları topla, çözüleni say.
 */
export interface ModulYetkinligi {
  modulId: string;
  modulAd: string;
  uniteId: string;
  uniteAd: string;
  modulSira: number;
  uniteSira: number; // sıralama için (işletmenin yer aldığı grubun sırası)
  cozulen: number;
  toplam: number;
  yuzde: number; // 0..100
}

/**
 * Tüm işletmelerin modüllerini düzleştirir, her birinin ilerlemesini hesaplar.
 * Modülün soruları AltBaslik.sorular üzerinden gelir (yeni atölye yapısı).
 * Boş modüller (henüz soru yok) yuzde=0, toplam=0 olarak döner.
 *
 * Sıralama: işletme türü → modül.sira
 */
export const modulYetkinlikleri = (
  uniteler: Unite[],
  ilerleme: Ilerleme,
): ModulYetkinligi[] => {
  const sonuc: ModulYetkinligi[] = [];
  uniteler.forEach((u, uniteIdx) => {
    if (!u.moduller) return;
    for (const m of u.moduller) {
      const soruIds: string[] = [];
      m.altBasliklar.forEach((ab) => {
        if (ab.sorular) ab.sorular.forEach((s) => soruIds.push(s.id));
      });
      const cozulen = soruIds.filter((id) => !!ilerleme.cozulenler[id]).length;
      const toplam = soruIds.length;
      const yuzde = toplam > 0 ? Math.round((cozulen / toplam) * 100) : 0;
      sonuc.push({
        modulId: m.id,
        modulAd: m.baslik,
        uniteId: u.id,
        uniteAd: u.ad,
        modulSira: m.sira,
        uniteSira: uniteIdx,
        cozulen,
        toplam,
        yuzde,
      });
    }
  });
  return sonuc.sort((a, b) =>
    a.uniteSira !== b.uniteSira ? a.uniteSira - b.uniteSira : a.modulSira - b.modulSira,
  );
};

export const uniteYetkinlikleri = (
  uniteler: Unite[],
  ilerleme: Ilerleme,
): UniteYetkinligi[] =>
  uniteler.map((u) => {
    const dagilim: Record<Zorluk, ZorlukDagilim> = {
      kolay: { toplam: 0, cozulen: 0 },
      orta: { toplam: 0, cozulen: 0 },
      zor: { toplam: 0, cozulen: 0 },
    };
    let toplamPuan = 0;
    let kazanilanPuan = 0;
    for (const s of u.sorular) {
      dagilim[s.zorluk].toplam++;
      const puan = ZORLUK_PUAN[s.zorluk] ?? 10;
      toplamPuan += puan;
      if (ilerleme.cozulenler[s.id]) {
        dagilim[s.zorluk].cozulen++;
        kazanilanPuan += puan;
      }
    }
    const yetkinlik = toplamPuan > 0 ? Math.round((kazanilanPuan / toplamPuan) * 100) : 0;
    return {
      uniteId: u.id,
      uniteAd: u.ad,
      thiingsIcon: u.thiingsIcon,
      toplamSoru: u.sorular.length,
      cozulenSoru: u.sorular.filter((s) => ilerleme.cozulenler[s.id]).length,
      yetkinlik,
      dagilim,
    };
  });
