import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Thiings } from '../Thiings';
import { yillikAktivite } from '../../lib/profil-rekorlar';
import { uniteYetkinlikleri } from '../../lib/yetkinlik';
import type { Ilerleme, Unite } from '../../types';

interface Props {
  ilerleme: Ilerleme;
  uniteler: Unite[];
}

/**
 * Akademik karne — işletme × zorluk yetkinlik haritası ve 12 aylık aktivite.
 */
export const YetkinlikView = ({ ilerleme, uniteler }: Props) => {
  const nav = useNavigate();

  const yetkinlikler = useMemo(
    () => uniteYetkinlikleri(uniteler, ilerleme),
    [uniteler, ilerleme],
  );

  const yil = useMemo(() => yillikAktivite(ilerleme), [ilerleme]);
  const maxYilAkt = Math.max(1, ...yil.haftalar.flat().map((g) => g.sayi));

  // Ay etiketleri — GitHub-style. Her ayın ilk haftasının indeksini bul.
  const ayEtiketleri = useMemo(() => {
    const aylar = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const etiketler: { haftaIndex: number; ad: string }[] = [];
    let oncekiAy = -1;
    yil.haftalar.forEach((hafta, i) => {
      // Haftanın ilk gününe (Pazartesi) göre ay belirle
      const ilkGun = hafta[0];
      if (!ilkGun) return;
      const d = new Date(ilkGun.tarih);
      const ay = d.getMonth();
      if (ay !== oncekiAy) {
        etiketler.push({ haftaIndex: i, ad: aylar[ay] });
        oncekiAy = ay;
      }
    });
    return etiketler;
  }, [yil.haftalar]);

  return (
    <div className="space-y-12">
      {/* Yetkinlik haritası — divide-y kompakt liste */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-xl md:text-2xl tracking-tight font-bold">
            Yetkinlik Haritası
          </h2>
          <span className="text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
            İşletme × Zorluk
          </span>
        </div>

        <ul className="divide-y divide-stone-200">
          {yetkinlikler.map((y) => (
            <li key={y.uniteId}>
              <button
                onClick={() => nav(`/uniteler/${y.uniteId}`)}
                className="w-full text-left py-4 group hover:bg-bg-tint/60 transition active:scale-[0.998] -mx-2 px-2 rounded-lg"
              >
                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4">
                  <Thiings name={y.thiingsIcon} size={36} />
                  <div className="min-w-0">
                    <h3 className="font-display text-[15px] font-bold tracking-tight leading-tight group-hover:text-brand dark:group-hover:text-brand-mute transition truncate">
                      {y.uniteAd}
                    </h3>
                    <div className="font-mono text-[11px] text-ink-mute mt-0.5 tabular-nums">
                      {y.cozulenSoru}/{y.toplamSoru} soru
                    </div>
                  </div>

                  <div className="flex items-center gap-5 sm:gap-7">
                    {y.toplamSoru > 0 && (
                      <div className="hidden sm:flex items-center gap-4 text-right">
                        {(['kolay', 'orta', 'zor'] as const).map((zor) => {
                          const d = y.dagilim[zor];
                          if (d.toplam === 0) return null;
                          const renk =
                            zor === 'kolay'
                              ? 'text-success dark:text-success'
                              : zor === 'orta'
                                ? 'text-premium-deep'
                                : 'text-danger dark:text-danger';
                          return (
                            <div key={zor} className="leading-tight">
                              <div
                                className={`text-[9px] tracking-[0.18em] uppercase font-bold ${renk}`}
                              >
                                {zor}
                              </div>
                              <div className="font-mono text-[12.5px] font-bold tabular-nums text-ink-soft mt-0.5">
                                {d.cozulen}
                                <span className="text-ink-quiet">
                                  /{d.toplam}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-baseline gap-0.5 w-14 justify-end">
                      <span className="font-display text-2xl sm:text-3xl font-bold tabular-nums leading-none">
                        {y.yetkinlik}
                      </span>
                      <span className="text-[10px] text-ink-quiet font-bold">
                        %
                      </span>
                    </div>
                  </div>
                </div>

                {/* Mobile: yüzde altta zorluk dağılımı kompakt satır */}
                {y.toplamSoru > 0 && (
                  <div className="sm:hidden flex items-center gap-3 mt-2 pl-[52px] text-[10.5px] font-mono">
                    {(['kolay', 'orta', 'zor'] as const).map((zor) => {
                      const d = y.dagilim[zor];
                      if (d.toplam === 0) return null;
                      const renk =
                        zor === 'kolay'
                          ? 'text-success dark:text-success'
                          : zor === 'orta'
                            ? 'text-premium-deep'
                            : 'text-danger dark:text-danger';
                      return (
                        <span key={zor} className={`font-bold ${renk}`}>
                          <span className="uppercase tracking-wider mr-1">{zor.slice(0, 1)}</span>
                          {d.cozulen}/{d.toplam}
                        </span>
                      );
                    })}
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* 12 aylık aktivite haritası */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-display text-xl md:text-2xl tracking-tight font-bold">Son 12 Ay</h2>
          <span className="text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
            {yil.toplam} aktivite
          </span>
        </div>
        <div className="overflow-x-auto pb-2">
          <div className="inline-block">
            {/* Ay etiketleri — haftaIndex × (11px hücre + 3px gap) = 14px adım */}
            <div
              className="relative h-4 mb-1"
              style={{ width: `${yil.haftalar.length * 14 - 3}px` }}
            >
              {ayEtiketleri.map((a, i) => (
                <span
                  key={i}
                  className="absolute text-[9.5px] tracking-wider uppercase font-bold text-ink-mute"
                  style={{ left: `${a.haftaIndex * 14}px` }}
                >
                  {a.ad}
                </span>
              ))}
            </div>
            <div
              className="grid grid-flow-col gap-[3px]"
              style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
            >
              {yil.haftalar.map((hafta, hi) =>
                hafta.map((g, gi) => {
                  const yogunluk =
                    g.sayi === 0 ? 0 : Math.min(4, Math.ceil((g.sayi / maxYilAkt) * 4));
                  const opacity = [0.06, 0.3, 0.55, 0.8, 1][yogunluk];
                  const ileride = new Date(g.tarih) > new Date();
                  return (
                    <div
                      key={`${hi}-${gi}`}
                      title={ileride ? '' : `${g.tarih}: ${g.sayi} soru`}
                      className="w-[11px] h-[11px] bg-brand-deep rounded-[2px]"
                      style={{ opacity: ileride ? 0 : opacity }}
                    />
                  );
                }),
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <div className="flex items-center gap-1.5 text-[10px] text-ink-mute font-semibold">
            <span>Az</span>
            {[0.06, 0.3, 0.55, 0.8, 1].map((o, i) => (
              <span
                key={i}
                className="w-2.5 h-2.5 bg-brand-deep rounded-[2px]"
                style={{ opacity: o }}
              />
            ))}
            <span>Çok</span>
          </div>
          <div className="text-[10px] text-ink-mute font-semibold">
            12 ay önce → Bugün
          </div>
        </div>
      </section>
    </div>
  );
};
