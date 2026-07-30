import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { kartBul, kartItemlari, kartSureDk, trackAyar, type KesfetKart } from '../data/kesfet';
import { tumKartlariYukle } from '../lib/kesfet';
import { useKesfetIlerleme } from '../lib/use-kesfet-ilerleme';

/**
 * Keşfet kart detayı — editorial/ledger dili.
 * Hero: ilerleme halkası + meta. Bölümler: büyük Fraunces numaralar.
 */

export const KesfetKartSayfasi = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const ayar = trackAyar(pathname);
  const { kart: slug } = useParams();
  const [kartlar, setKartlar] = useState<KesfetKart[] | null>(null);
  const { tamamlanan } = useKesfetIlerleme();

  useEffect(() => {
    tumKartlariYukle(ayar.tip).then(setKartlar).catch(() => setKartlar([]));
  }, [ayar.tip]);

  if (!kartlar) {
    return (
      <main className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="h-3 w-40 bg-surface-2 rounded animate-pulse mb-8" />
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
          <div className="max-w-2xl w-full">
            <div className="h-3 w-24 bg-surface-2 rounded animate-pulse mb-4" />
            <div className="h-12 w-3/4 bg-surface-2 rounded animate-pulse mb-4" />
            <div className="h-4 w-full bg-surface-2 rounded animate-pulse mb-2" />
            <div className="h-4 w-5/6 bg-surface-2 rounded animate-pulse" />
            <div className="h-11 w-40 bg-surface-2 rounded-lg animate-pulse mt-8" />
          </div>
          <div className="w-[84px] h-[84px] rounded-full bg-surface-2 animate-pulse flex-none" />
        </div>
        <div className="hairline my-11" />
        <div className="h-6 w-48 bg-surface-2 rounded animate-pulse mb-5" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-surface-2 rounded-2xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  const kart = kartBul(kartlar, slug);
  if (!kart) {
    return (
      <main className="max-w-[860px] mx-auto px-5 sm:px-8 py-20 text-center">
        <p className="text-ink-soft">Bu kart bulunamadı.</p>
        <button
          onClick={() => nav(ayar.taban)}
          className="mt-4 text-brand-deep font-semibold text-sm inline-flex items-center gap-1.5"
        >
          <Icon name="ArrowLeft" size={15} /> {ayar.etiket}'e dön
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
    <main className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
      <nav className="flex items-center gap-2 font-mono text-[11px] tracking-wide uppercase text-ink-mute mb-8">
        <button onClick={() => nav(ayar.taban)} className="hover:text-ink transition">
          {ayar.etiket}
        </button>
        <Icon name="ChevronRight" size={12} className="text-ink-quiet" />
        <span className="text-ink-soft">{kart.ad}</span>
      </nav>

      {/* Hero — tam genişlik banner */}
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-8">
        <div className="min-w-0 max-w-2xl">
          <span className="font-mono text-[11px] tracking-[0.22em] uppercase text-brand-mute">
            {kart.kategori}
          </span>
          <h1 className="font-display text-[38px] sm:text-[54px] leading-[1.02] font-bold tracking-[-0.02em] text-ink mt-3 text-balance">
            {kart.ad}
          </h1>
          <p className="mt-5 text-[16px] sm:text-[17px] text-ink-soft leading-relaxed">{kart.aciklama}</p>

          <div className="flex items-center gap-5 mt-8 flex-wrap">
            {sirada && (
              <button
                onClick={() => nav(`${ayar.taban}/${kart.slug}/${sirada.item.id}`)}
                className="btn btn-primary btn-lg active:scale-[0.98]"
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
        </div>

        {toplam > 0 && (
          <div className="flex items-center gap-4 flex-none">
            <div className="grid place-items-center relative w-[84px] h-[84px]">
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
            <div className="sm:hidden">
              <div className="font-display text-[15px] font-bold text-ink">
                {biten === 0 ? 'Henüz başlamadın' : biten === toplam ? 'Tamamlandı' : 'Devam ediyor'}
              </div>
              <div className="font-mono text-[11px] uppercase tracking-wide text-ink-mute tnum mt-0.5">
                {biten}/{toplam} ders
              </div>
            </div>
          </div>
        )}
      </header>

      <div className="hairline my-11" />

      {/* Bölümler — ders kartları grid */}
      <div className="flex flex-col gap-12">
        {kart.bolumler.map((bolum, bi) => (
          <section key={bolum.id}>
            <div className="flex items-baseline gap-3 mb-5">
              <span className="font-display text-[24px] font-bold leading-none text-line-strong tnum select-none">
                {String(bi + 1).padStart(2, '0')}
              </span>
              <h2 className="font-display text-[20px] font-bold tracking-tight text-ink">{bolum.ad}</h2>
              <span className="font-mono text-[11px] font-medium text-ink-quiet tracking-wide tnum">
                {bolum.itemlar.length} ders
              </span>
            </div>

            <div className="border-t border-line-strong">
              {bolum.itemlar.map((item, ii) => {
                const bitti = tamamlanan.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => nav(`${ayar.taban}/${kart.slug}/${item.id}`)}
                    className="group relative w-full flex items-center gap-4 py-3.5 pr-1 border-b border-line-soft text-left transition-all"
                  >
                    {/* hover'da sola kayan mavi vurgu */}
                    <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-brand scale-y-0 group-hover:scale-y-100 transition-transform duration-200 origin-center" />
                    <span className="font-mono text-[12px] text-ink-quiet tnum w-7 flex-none text-center transition-transform group-hover:translate-x-1.5">
                      {String(ii + 1).padStart(2, '0')}
                    </span>
                    <span
                      className={`flex-none transition-colors ${
                        bitti ? 'text-success' : 'text-ink-quiet group-hover:text-brand'
                      }`}
                    >
                      <Icon
                        name={bitti ? 'CheckCircle2' : item.tip === 'ders' ? 'BookOpen' : 'Pencil'}
                        size={16}
                      />
                    </span>
                    <span className="flex-1 min-w-0 text-[15px] font-medium text-ink truncate group-hover:text-brand-deep transition-colors">
                      {item.ad}
                    </span>
                    <span className="hidden sm:inline font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute flex-none">
                      {item.tip === 'ders' ? 'Ders' : 'Alıştırma'}
                    </span>
                    <span className="font-mono text-[11px] text-ink-quiet tnum flex-none w-14 text-right">
                      ~{item.tip === 'ders' ? 3 : 6} dk
                    </span>
                    <Icon
                      name="ArrowRight"
                      size={15}
                      className="flex-none text-ink-quiet opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                    />
                  </button>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
};
