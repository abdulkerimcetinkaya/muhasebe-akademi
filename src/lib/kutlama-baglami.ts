// Doğru cevap kutlama bağlamı — editorial refined, context-driven.
// Kontrolör SoruEkrani'nde, soru doğru cevaplandığında bu fn'yi çağırır.
// Hangi mesaj/milestone gösterileceğine "şu an nerede" bağlamına göre karar verir.

import type { Ilerleme, Rozet, SoruWithUnite, Unite } from '../types';
import { bugununTarihi } from './format';
import { streakHesapla } from './ilerleme-supabase';
import { yaklasanRozet } from '../data/rozetler';
import { istatistikHesapla } from './ilerleme';

export type MilestoneTipi = 'streak' | 'combo' | 'zor' | 'ilk-modul';

export interface MilestoneBilgisi {
  tip: MilestoneTipi;
  baslik: string;
  altMetin: string;
  /** Görsel ağırlık: 'altin' = ink-bg + premium accent (RozetToast tonu), 'normal' = bg + copper border */
  rozetTipi: 'normal' | 'altin';
}

export interface YakinRozet {
  ad: string;
  mevcut: number;
  hedef: number;
}

export interface KutlamaBaglami {
  /** Başlık satırı — örn. "Mal Hareketleri · 1.6 Satıştan İade · 4/10" */
  baslik: string;
  /** Alt satır — örn. "Bu modülün üçte birini bitirdin" */
  altMetin: string;
  /** Hangi rozete kaç kaldı — yalnızca anlamlı yaklaşma varsa */
  yakinRozet?: YakinRozet;
  /** En yüksek öncelikli milestone — yoksa undefined */
  milestone?: MilestoneBilgisi;
}

interface UretInput {
  soru: SoruWithUnite;
  ilerlemeOnce: Ilerleme;
  uniteler: Unite[];
  tumSorular: SoruWithUnite[];
  /** Bu çözümle birlikte oturum içi ardışık doğru sayısı */
  sessionCombo: number;
}

const STREAK_MILESTONES = [7, 14, 30, 50, 100, 365];
const COMBO_BUYUK = [5, 10, 25, 50];
const COMBO_KUCUK = 3;

/**
 * Doğru cevap anında çağrılır — context-aware mesaj + en üst öncelikli milestone üretir.
 *
 * Priority (yüksek → düşük): streak > combo (büyük) > zor > ilk-modul > combo (küçük)
 */
export const kutlamaBaglamiUret = ({
  soru,
  ilerlemeOnce,
  uniteler,
  tumSorular,
  sessionCombo,
}: UretInput): KutlamaBaglami => {
  // Aynı soru daha önce çözüldü mü
  const eskidenCozulmus = !!ilerlemeOnce.cozulenler[soru.id];

  // Modül ilerlemesi
  const modulProgress = modulIlerlemesi(soru, ilerlemeOnce, uniteler, eskidenCozulmus);

  // Streak milestone hesapla (post-solve simülasyonu)
  const streakDelta = streakDegisimi(ilerlemeOnce);

  // ============================================================
  // Priority chain
  // ============================================================

  let milestone: MilestoneBilgisi | undefined;

  // 1. Streak milestone — yeni streak bir eşiği yeni geçtiyse
  if (
    !milestone &&
    streakDelta.streakSonra > streakDelta.streakOnce &&
    STREAK_MILESTONES.includes(streakDelta.streakSonra)
  ) {
    milestone = {
      tip: 'streak',
      baslik: `${streakDelta.streakSonra} gün üst üste`,
      altMetin:
        streakDelta.streakSonra === 7
          ? 'Bir haftadır bu işin başındasın.'
          : streakDelta.streakSonra === 14
            ? 'İki haftalık disiplini yakaladın.'
            : streakDelta.streakSonra === 30
              ? 'Bir ay boyunca her gün çalıştın.'
              : streakDelta.streakSonra === 50
                ? '50 gün — ciddi bir yatırım.'
                : streakDelta.streakSonra === 100
                  ? '100 gün. Bu artık alışkanlık.'
                  : 'Bir yıllık serini koruyorsun.',
      rozetTipi: 'altin',
    };
  }

  // 2. Combo büyük (5, 10, 25, 50)
  if (!milestone && !eskidenCozulmus && COMBO_BUYUK.includes(sessionCombo)) {
    milestone = {
      tip: 'combo',
      baslik: `${sessionCombo} üst üste doğru`,
      altMetin:
        sessionCombo === 5
          ? 'Bu modülün ritmini yakaladın.'
          : sessionCombo === 10
            ? 'On hatasız çözüm. Form artıyor.'
            : sessionCombo === 25
              ? '25 üst üste — bu sıradan bir gün değil.'
              : 'Elli soru hatasız. Etkileyici.',
      rozetTipi: sessionCombo >= 10 ? 'altin' : 'normal',
    };
  }

  // 3. Zor soru
  if (!milestone && !eskidenCozulmus && soru.zorluk === 'zor') {
    milestone = {
      tip: 'zor',
      baslik: 'Zor soru çözüldü',
      altMetin: 'Zorluk seviyesinden +20 puan.',
      rozetTipi: 'normal',
    };
  }

  // 4. İlk-modül — bu çözümle birlikte modülün ilk doğru çözümü
  if (!milestone && !eskidenCozulmus && modulProgress.bumoduldeIlkCozum) {
    milestone = {
      tip: 'ilk-modul',
      baslik: `${modulProgress.modulAd ?? soru.uniteAd}'ne giriş yaptın`,
      altMetin:
        modulProgress.toplam > 0
          ? `Bu modülde ${modulProgress.toplam} soru var.`
          : 'İlk soruyu çözdün, devam et.',
      rozetTipi: 'normal',
    };
  }

  // 5. Combo küçük (3) — milestone alanında ama daha sönük
  if (!milestone && !eskidenCozulmus && sessionCombo === COMBO_KUCUK) {
    milestone = {
      tip: 'combo',
      baslik: '3 üst üste — formdasın',
      altMetin: 'Akışı yakalamak güzel.',
      rozetTipi: 'normal',
    };
  }

  // ============================================================
  // Birincil mesaj (her zaman dolu)
  // ============================================================

  let baslik: string;
  let altMetin: string;

  if (modulProgress.modulAd && modulProgress.toplam > 0) {
    const cozulen = modulProgress.cozulenSonra;
    const toplam = modulProgress.toplam;
    baslik = `${modulProgress.modulAd} · ${cozulen}/${toplam}`;
    altMetin = oranAciklamasi(cozulen, toplam);
  } else if (modulProgress.toplam > 0) {
    // Modül adı yok (eski yapı) — sadece işletme + sayı
    const cozulen = modulProgress.cozulenSonra;
    const toplam = modulProgress.toplam;
    baslik = `${soru.uniteAd} · ${cozulen}/${toplam}`;
    altMetin = oranAciklamasi(cozulen, toplam);
  } else {
    // Fallback — modül/işletme ilerleme verisi yok
    baslik = soru.uniteAd;
    altMetin = eskidenCozulmus ? 'Tekrar doğru çözdün.' : 'Doğru kaydedildi.';
  }

  // ============================================================
  // Yakın rozet (henüz kazanılmamış, %30+ ilerlemiş)
  // ============================================================

  const yakinRozetSonuc = yakinRozetHesapla(ilerlemeOnce, soru, uniteler, tumSorular);

  return {
    baslik,
    altMetin,
    yakinRozet: yakinRozetSonuc,
    milestone,
  };
};

// ============================================================
// Yardımcılar
// ============================================================

interface ModulIlerlemesi {
  modulAd: string | null;
  cozulenSonra: number;
  toplam: number;
  bumoduldeIlkCozum: boolean;
}

/**
 * Sorunun bağlı olduğu modülün ilerlemesini hesaplar.
 * Yeni yapıda soru → altBaslikId → AltBaslik → modulId → Modul.
 * Eski yapıda soru direkt işletme altında → modul null döner.
 */
function modulIlerlemesi(
  soru: SoruWithUnite,
  ilerleme: Ilerleme,
  uniteler: Unite[],
  eskidenCozulmus: boolean,
): ModulIlerlemesi {
  const unite = uniteler.find((u) => u.id === soru.uniteId);
  if (!unite) {
    return { modulAd: null, cozulenSonra: 0, toplam: 0, bumoduldeIlkCozum: false };
  }

  // Modül bul — alt başlık üzerinden
  let bulunanModul = null;
  if (soru.altBaslikId && unite.moduller) {
    for (const m of unite.moduller) {
      if (m.altBasliklar.some((ab) => ab.id === soru.altBaslikId)) {
        bulunanModul = m;
        break;
      }
    }
  }

  if (bulunanModul) {
    // Modüldeki tüm soruları topla (tüm alt başlıkları)
    const modulSoruIds: string[] = [];
    bulunanModul.altBasliklar.forEach((ab) => {
      if (ab.sorular) ab.sorular.forEach((s) => modulSoruIds.push(s.id));
    });
    const cozulenOnce = modulSoruIds.filter((id) => !!ilerleme.cozulenler[id]).length;
    const cozulenSonra = eskidenCozulmus ? cozulenOnce : cozulenOnce + 1;
    return {
      modulAd: bulunanModul.baslik,
      cozulenSonra,
      toplam: modulSoruIds.length,
      bumoduldeIlkCozum: !eskidenCozulmus && cozulenOnce === 0,
    };
  }

  // Eski yapı fallback — işletme seviyesinde
  const uniteSoruIds = unite.sorular.map((s) => s.id);
  const cozulenOnce = uniteSoruIds.filter((id) => !!ilerleme.cozulenler[id]).length;
  const cozulenSonra = eskidenCozulmus ? cozulenOnce : cozulenOnce + 1;
  return {
    modulAd: null,
    cozulenSonra,
    toplam: uniteSoruIds.length,
    bumoduldeIlkCozum: false, // eski yapıda modül kavramı yok
  };
}

/**
 * Bu çözümün streak'i nasıl etkilediğini hesaplar.
 * - İlk solve today + dün de aktivite varsa: streak += 1
 * - İlk solve today + dün yoksa: streak = 1
 * - Bugün zaten çözmüş: streak değişmez
 */
function streakDegisimi(ilerleme: Ilerleme): { streakOnce: number; streakSonra: number } {
  const bugun = bugununTarihi();
  const ilkSolveBugun = !ilerleme.aktiviteTarihleri[bugun];

  if (!ilkSolveBugun) {
    return { streakOnce: ilerleme.streak, streakSonra: ilerleme.streak };
  }

  // Simüle et: bugüne 1 ekle, streakHesapla'yı tekrar çalıştır
  const yeniAktivite = { ...ilerleme.aktiviteTarihleri, [bugun]: 1 };
  const { streak: streakSonra } = streakHesapla(yeniAktivite);
  return { streakOnce: ilerleme.streak, streakSonra };
}

/**
 * Çözülen/toplam oranına göre kısa, akademik tonda alt metin döndürür.
 */
function oranAciklamasi(cozulen: number, toplam: number): string {
  if (toplam === 0) return '';
  if (cozulen === toplam) return 'Tüm sorular tamamlandı.';
  const oran = cozulen / toplam;
  if (cozulen === 1) return 'İlk soruyu çözdün.';
  if (oran >= 0.75) return 'Modülün son çeyreğindesin.';
  if (oran >= 0.5) return 'Yarıyı geçtin.';
  if (oran >= 0.33) return 'Modülün üçte birini bitirdin.';
  if (oran >= 0.25) return 'Modülün çeyreğini bitirdin.';
  return 'İlerliyorsun.';
}

/**
 * Yaklaşan rozet (kazanılmamış, en yakın hedefte) — %30 ve üstü ilerleme varsa döner.
 * %30 altı çok erken — kullanıcıya "X-Y kaldı" demek anlamsız olur.
 */
function yakinRozetHesapla(
  ilerlemeOnce: Ilerleme,
  soru: SoruWithUnite,
  uniteler: Unite[],
  tumSorular: SoruWithUnite[],
): YakinRozet | undefined {
  // İlerlemeyi "bu çözüm sonrası" simüle et (kabaca — istatistikHesapla ile)
  // İlk solve değilse istatistik değişmez, atla
  const eskidenCozulmus = !!ilerlemeOnce.cozulenler[soru.id];
  if (eskidenCozulmus) return undefined;

  // Bu çözümü cozulenler'a ekleyerek simüle et
  const ilerlemeSonraSimulasyon: Ilerleme = {
    ...ilerlemeOnce,
    cozulenler: {
      ...ilerlemeOnce.cozulenler,
      [soru.id]: {
        tarih: bugununTarihi(),
        zorluk: soru.zorluk,
        puan: 0, // puan hesaplamasına dahil değil; rozet hedeflerine yetiyor
      },
    },
  };
  const stat = istatistikHesapla(ilerlemeSonraSimulasyon, uniteler, tumSorular);

  // yaklasanRozet helper'ı en yüksek %'li rozeti bulur — biz %30+ kabul ediyoruz
  const enYakin = yaklasanRozet(ilerlemeOnce.kazanilanRozetler, (r: Rozet) =>
    r.ilerleme ? r.ilerleme(stat) : null,
  );

  if (!enYakin || enYakin.yuzde < 30) return undefined;

  return {
    ad: enYakin.rozet.ad,
    mevcut: enYakin.mevcut,
    hedef: enYakin.hedef,
  };
}
