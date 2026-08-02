import { HESAP_PLANI } from '../data/hesap-plani';
import { paraFormat } from '../lib/format';

export interface TSatir {
  kod: string;
  borc: number;
  alacak: number;
}

// Muavin kodlarını da çöz: 153.01 → "Ticari Mallar" (ana hesabın adı)
export const hesapAdBul = (kod: string): string => {
  const tam = HESAP_PLANI.find((h) => h.kod === kod);
  if (tam) return tam.ad;
  const ana = kod.split('.')[0];
  const anaH = HESAP_PLANI.find((h) => h.kod === ana);
  return anaH ? anaH.ad : '';
};

/**
 * Yevmiye kaydını klasik "T hesabı" (büyük defter) görünümünde çizer.
 * Her hesap için: üstte kod+ad, ortada dikey çizgiyle bölünmüş borç/alacak.
 */
export const THesaplari = ({ satirlar }: { satirlar: TSatir[] }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-6">
      {satirlar.map((s, i) => {
        const ad = hesapAdBul(s.kod);
        return (
          <div key={i}>
            <div className="text-center mb-1.5 truncate">
              <span className="font-mono font-bold text-sm text-ink">{s.kod}</span>
              {ad && <span className="text-ink-mute text-xs ml-1.5">{ad}</span>}
            </div>
            <div className="border-t-2 border-ink">
              <div className="grid grid-cols-2 min-h-[56px]">
                <div className="border-r-2 border-ink px-3 py-2.5 text-right font-mono text-sm font-semibold text-ink">
                  {s.borc > 0 ? paraFormat(s.borc) : ''}
                </div>
                <div className="px-3 py-2.5 text-left font-mono text-sm font-semibold text-ink">
                  {s.alacak > 0 ? paraFormat(s.alacak) : ''}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 text-[9px] tracking-[0.2em] uppercase text-ink-mute font-bold mt-1">
              <span className="text-center">Borç</span>
              <span className="text-center">Alacak</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};
