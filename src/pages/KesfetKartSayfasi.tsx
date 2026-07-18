import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { kartBul, kartItemlari, kartSureDk, type KesfetKart } from '../data/kesfet';
import { tumKartlariYukle } from '../lib/kesfet';
import { tamamlananSet } from '../lib/kesfet-ilerleme';

/**
 * Keşfet kart detayı — editorial/ledger dili.
 * Hero: ilerleme halkası + meta. Bölümler: büyük Fraunces numaralar.
 */

export const KesfetKartSayfasi = () => {
  const nav = useNavigate();
  const { kart: slug } = useParams();
  const [kartlar, setKartlar] = useState<KesfetKart[] | null>(null);
  const tamamlanan = tamamlananSet();

  useEffect(() => {
    tumKartlariYukle().then(setKartlar).catch(() => setKartlar([]));
  }, []);

  if (!kartlar) {
    return (
      <div className="flex items-center justify-center py-32">
        <Icon name="Loader2" size={22} className="animate-spin text-ink-mute" />
      </div>
    );
  }

  const kart = kartBul(kartlar, slug);
  if (!kart) {
    return (
      <main className="max-w-[860px] mx-auto px-5 sm:px-8 py-20 text-center">
        <p className="text-ink-soft">Bu kart bulunamadı.</p>
        <button
          onClick={() => nav('/kesfet')}
          className="mt-4 text-brand-deep font-semibold text-sm inline-flex items-center gap-1.5"
        >
          <Icon name="ArrowLeft" size={15} /> Keşfet'e dön
        </button>
      </main>
    );
  }

  const hepsi = kartItemlari(kart);
  const toplam = hepsi.length;
  const biten = hepsi.filter((x) => tamamlanan.has(x.item.id)).length;
  const yuzde = toplam ? Math.round((biten / toplam) * 100) : 0;
  const sirada = hepsi.find((x) => !tamamlanan.has(x.item.id)) ?? hepsi[0];

  const R = 30;
  const C = 2 * Math.PI * R;
  const offset = C * (1 - yuzde / 100);

  return (
    <main className="max-w-[860px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <nav className="flex items-center gap-2 font-mono text-[11px] tracking-wide uppercase text-ink-mute mb-8">
        <button onClick={() => nav('/kesfet')} className="hover:text-ink transition">
          Keşfet
        </button>
        <Icon name="ChevronRight" size={12} className="text-ink-quiet" />
        <span className="text-ink-soft">{kart.ad}</span>
      </nav>

      <header>
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-brand-mute">
              {kart.kategori}
            </span>
            <h1 className="font-display text-[34px] sm:text-[44px] leading-[1.04] font-bold tracking-[-0.02em] text-ink mt-3 text-balance">
              {kart.ad}
            </h1>
            <p className="mt-4 text-[16px] text-ink-soft leading-relaxed max-w-lg">{kart.aciklama}</p>
          </div>

          {toplam > 0 && (
            <div className="hidden sm:grid place-items-center flex-none relative w-[84px] h-[84px]">
              <svg width="84" height="84" viewBox="0 0 84 84" className="-rotate-90">
                <circle cx="42" cy="42" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
                <circle
                  cx="42" cy="42" r={R} fill="none" stroke="var(--blue)" strokeWidth="5"
                  strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
                  style={{ transition: 'stroke-dashoffset .6s ease' }}
                />
              </svg>
              <span className="absolute font-display font-bold text-[18px] text-ink tnum">%{yuzde}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-5 mt-7 flex-wrap">
          {sirada && (
            <button
              onClick={() => nav(`/kesfet/${kart.slug}/${sirada.item.id}`)}
              className="btn btn-primary btn-lg"
            >
              {biten === 0 ? 'Başla' : biten === toplam ? 'Tekrar Et' : 'Devam Et'}
              <Icon name="ArrowRight" size={16} className="ml-1" />
            </button>
          )}
          <div className="flex items-center gap-4 font-mono text-[11.5px] tracking-wide uppercase text-ink-mute tnum">
            <span>{kart.bolumler.length} bölüm</span>
            <span className="text-ink-quiet">·</span>
            <span>{toplam} ders</span>
            <span className="text-ink-quiet">·</span>
            <span>~{kartSureDk(kart)} dk</span>
          </div>
        </div>
      </header>

      <div className="hairline my-10" />

      <div className="flex flex-col gap-10">
        {kart.bolumler.map((bolum, bi) => (
          <section key={bolum.id} className="grid grid-cols-[auto_1fr] gap-5 sm:gap-7">
            <div className="font-display text-[40px] sm:text-[52px] font-bold leading-none text-line-strong tnum select-none pt-0.5">
              {String(bi + 1).padStart(2, '0')}
            </div>

            <div className="min-w-0">
              <h2 className="font-display text-[19px] font-bold tracking-tight text-ink mb-3.5 pt-2">
                {bolum.ad}
              </h2>
              <div className="bg-surface border border-line rounded-[16px] overflow-hidden">
                {bolum.itemlar.map((item, ii) => {
                  const bitti = tamamlanan.has(item.id);
                  return (
                    <button
                      key={item.id}
                      onClick={() => nav(`/kesfet/${kart.slug}/${item.id}`)}
                      className={`group w-full flex items-center gap-4 px-4 sm:px-5 py-4 text-left hover:bg-bg-tint transition ${
                        ii > 0 ? 'border-t border-line-soft' : ''
                      }`}
                    >
                      <span className={`flex-none ${bitti ? 'text-success' : 'text-ink-quiet'}`}>
                        <Icon name={bitti ? 'CheckCircle2' : 'Circle'} size={20} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-[15px] font-medium text-ink truncate">
                          {item.ad}
                        </span>
                        <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-ink-mute">
                          {item.tip === 'ders' ? 'Ders' : 'Alıştırma'}
                        </span>
                      </span>
                      <Icon
                        name="ArrowRight"
                        size={16}
                        className="flex-none text-ink-quiet opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};
