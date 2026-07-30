import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { kartDersSayisi, kartSureDk, trackAyar, type KesfetKart } from '../data/kesfet';
import { tumKartlariYukle } from '../lib/kesfet';
import { useKesfetIlerleme } from '../lib/use-kesfet-ilerleme';

/**
 * Keşfet — kart vitrini (LeetCode Explore ana ekranı gibi), editorial/ledger dili.
 * Kartlar DB'den (kesfet_kartlar) yüklenir; admin panelinden yönetilir.
 */

const RISE = ['rise', 'rise-2', 'rise-3', 'rise-4', 'rise-5'];

// Kategori bölüm sırası — track'e göre (Temeller/Uzmanlık ya da Ticaret/Üretim…).
const kategoriSira = (siralar: string[], ad: string) => {
  const i = siralar.findIndex((k) => k.toLocaleLowerCase('tr') === ad.toLocaleLowerCase('tr'));
  return i === -1 ? siralar.length : i;
};

// Yükleme iskeleti — kompakt kart layout'una oturur (spinner yerine).
const KartSkeleton = () => (
  <div className="bg-surface border border-line rounded-2xl p-5 flex flex-col">
    <div className="w-11 h-11 rounded-xl bg-surface-2 animate-pulse mb-4" />
    <div className="h-5 w-2/3 bg-surface-2 rounded animate-pulse mb-2.5" />
    <div className="h-3 w-full bg-surface-2 rounded animate-pulse mb-1.5" />
    <div className="h-3 w-4/5 bg-surface-2 rounded animate-pulse" />
    <div className="hairline my-4" />
    <div className="h-3 w-1/2 bg-surface-2 rounded animate-pulse" />
    <div className="mt-3 h-1 bg-surface-2 rounded-full animate-pulse" />
  </div>
);

export const KesfetSayfasi = () => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const ayar = trackAyar(pathname);
  const [kartlar, setKartlar] = useState<KesfetKart[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const { tamamlanan } = useKesfetIlerleme();

  // Kartları kategoriye göre bölümle (track'e özgü sırayla).
  const gruplar = useMemo(() => {
    if (!kartlar) return [];
    const harita = new Map<string, KesfetKart[]>();
    for (const k of kartlar) {
      const ad = k.kategori?.trim() || 'Diğer';
      if (!harita.has(ad)) harita.set(ad, []);
      harita.get(ad)!.push(k);
    }
    return [...harita.entries()]
      .map(([kategori, list]) => ({ kategori, kartlar: list }))
      .sort(
        (a, b) =>
          kategoriSira(ayar.kategoriSira, a.kategori) - kategoriSira(ayar.kategoriSira, b.kategori),
      );
  }, [kartlar, ayar.kategoriSira]);

  useEffect(() => {
    setKartlar(null);
    setHata(null);
    tumKartlariYukle(ayar.tip)
      .then(setKartlar)
      .catch((e) => setHata(e instanceof Error ? e.message : 'Kartlar yüklenemedi'));
  }, [ayar.tip]);

  return (
    <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
      {/* Editorial başlık */}
      <header className="mb-12 sm:mb-14">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-brand-mute font-medium">
            {ayar.katalogUst}
          </span>
          <span className="h-px w-10 bg-line-strong" />
        </div>
        <h1 className="font-display text-[38px] sm:text-[52px] leading-[1.02] font-bold tracking-[-0.02em] text-ink max-w-2xl text-balance">
          {ayar.katalogBaslik}
        </h1>
        <p className="mt-5 text-[16px] sm:text-[18px] text-ink-soft max-w-xl leading-relaxed">
          {ayar.katalogAlt}
        </p>
        <div className="hairline mt-10" />
      </header>

      {/* Hata */}
      {hata && (
        <EmptyState
          ikon="AlertCircle"
          baslik="Kartlar yüklenemedi"
          aciklama="Bağlantıyı kontrol edip sayfayı yenile."
          variant="compact"
        />
      )}

      {/* Yükleniyor — skeleton */}
      {!kartlar && !hata && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KartSkeleton />
          <KartSkeleton />
          <KartSkeleton />
        </div>
      )}

      {/* Boş */}
      {kartlar && kartlar.length === 0 && (
        <EmptyState
          ikon="Search"
          baslik={ayar.bosBaslik}
          aciklama={ayar.bosAciklama}
          variant="compact"
        />
      )}

      {kartlar && kartlar.length > 0 && (
        <div className="space-y-14 sm:space-y-16">
          {gruplar.map((grup) => (
            <section key={grup.kategori}>
              {/* Kategori bölüm başlığı */}
              <div className="flex items-center gap-3 mb-6">
                <h2 className="font-mono text-[12px] tracking-[0.24em] uppercase text-brand-mute font-semibold">
                  {grup.kategori}
                </h2>
                <span className="h-px flex-1 bg-line-soft" />
                <span className="font-mono text-[11px] text-ink-quiet tnum">
                  {grup.kartlar.length} kart
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {grup.kartlar.map((k, i) => {
                  const acik = k.durum === 'acik';
                  const toplam = kartDersSayisi(k);
                  const biten = k.bolumler
                    .flatMap((b) => b.itemlar)
                    .filter((it) => tamamlanan.has(it.id)).length;
                  const yuzde = toplam ? Math.round((biten / toplam) * 100) : 0;

                  return (
                    <button
                      key={k.id}
                      onClick={() => acik && nav(`${ayar.taban}/${k.slug}`)}
                      disabled={!acik}
                      className={`${RISE[Math.min(i, 4)]} group relative text-left bg-surface border rounded-2xl p-5 min-h-[200px] flex flex-col justify-between transition-all duration-200 ${
                        acik
                          ? 'border-line hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(15,23,42,0.4)] active:scale-[0.99] cursor-pointer'
                          : 'border-line-soft opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {acik && (
                        <span
                          className="absolute left-0 top-5 bottom-5 w-[3px] bg-brand-deep rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-hidden
                        />
                      )}

                      {/* Üst: sıra numarası + ikon */}
                      <div className="flex items-start justify-between">
                        <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-quiet font-bold">
                          {String(i + 1).padStart(2, '0')} / {String(grup.kartlar.length).padStart(2, '0')}
                        </span>
                        <Icon name={k.ikon} size={22} className={acik ? 'text-ink' : 'text-ink-quiet'} />
                      </div>

                      {/* Orta: başlık + açıklama */}
                      <div className="mt-6">
                        <h3
                          className="font-display font-bold tracking-tight leading-[1.1] text-ink"
                          style={{ fontSize: 'clamp(18px, 1.6vw, 22px)' }}
                        >
                          {k.ad}
                        </h3>
                        <p className="text-[12.5px] text-ink-mute leading-snug mt-1.5 font-medium line-clamp-3">
                          {k.aciklama}
                        </p>
                      </div>

                      {/* Alt: ders/süre + CTA + ilerleme */}
                      <div className="mt-5">
                        {acik ? (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="font-mono text-[10px] tracking-[0.16em] uppercase text-ink-mute tnum">
                                {toplam} ders · ~{kartSureDk(k)} dk
                              </span>
                              <span className="font-mono text-[10px] tracking-[0.22em] uppercase font-bold text-ink-mute inline-flex items-center gap-1.5 group-hover:text-brand-deep transition-colors">
                                {biten === 0 ? 'Başla' : biten >= toplam ? 'Tekrar' : 'Devam'}
                                <Icon name="ArrowRight" size={11} />
                              </span>
                            </div>
                            <div className="mt-3 h-1 bg-surface-2 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-brand rounded-full transition-all duration-500"
                                style={{ width: `${yuzde}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase font-bold text-premium-deep inline-flex items-center gap-1.5 bg-premium-soft/60 px-2 py-1 rounded">
                            <Icon name="Lock" size={10} />
                            Yakında
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
};
