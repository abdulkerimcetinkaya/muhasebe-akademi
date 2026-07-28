import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { kartDersSayisi, kartSureDk, type KesfetKart } from '../data/kesfet';
import { tumKartlariYukle } from '../lib/kesfet';
import { useKesfetIlerleme } from '../lib/use-kesfet-ilerleme';

/**
 * Keşfet — kart vitrini (LeetCode Explore ana ekranı gibi), editorial/ledger dili.
 * Kartlar DB'den (kesfet_kartlar) yüklenir; admin panelinden yönetilir.
 */

const RISE = ['rise', 'rise-2', 'rise-3', 'rise-4', 'rise-5'];

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
  const [kartlar, setKartlar] = useState<KesfetKart[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const { tamamlanan } = useKesfetIlerleme();

  useEffect(() => {
    tumKartlariYukle()
      .then(setKartlar)
      .catch((e) => setHata(e instanceof Error ? e.message : 'Kartlar yüklenemedi'));
  }, []);

  return (
    <main className="max-w-[1180px] mx-auto px-5 sm:px-8 py-14 sm:py-20">
      {/* Editorial başlık */}
      <header className="mb-12 sm:mb-14">
        <div className="flex items-center gap-2.5 mb-4">
          <span className="font-mono text-[11px] tracking-[0.28em] uppercase text-brand-mute font-medium">
            Keşfet
          </span>
          <span className="h-px w-10 bg-line-strong" />
        </div>
        <h1 className="font-display text-[38px] sm:text-[52px] leading-[1.02] font-bold tracking-[-0.02em] text-ink max-w-2xl text-balance">
          Nereden başlayacağını seç.
        </h1>
        <p className="mt-5 text-[16px] sm:text-[18px] text-ink-soft max-w-xl leading-relaxed">
          Önce temelleri kavra, sonra uzmanlık alanlarında kendi patikanı ilerlet. Her kart, sıralı
          ders ve alıştırmalardan oluşur.
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
          baslik="Henüz içerik yok"
          aciklama="Keşfet kartları yakında burada olacak. İlk kart eklendiğinde görünecek."
          variant="compact"
        />
      )}

      {kartlar && kartlar.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {kartlar.map((k, i) => {
            const acik = k.durum === 'acik';
            const toplam = kartDersSayisi(k);
            const biten = k.bolumler
              .flatMap((b) => b.itemlar)
              .filter((it) => tamamlanan.has(it.id)).length;
            const yuzde = toplam ? Math.round((biten / toplam) * 100) : 0;

            return (
              <button
                key={k.id}
                onClick={() => acik && nav(`/kesfet/${k.slug}`)}
                disabled={!acik}
                className={`${RISE[Math.min(i, 4)]} group relative text-left bg-surface border rounded-2xl p-5 flex flex-col transition-all duration-200 active:scale-[0.99] ${
                  acik
                    ? 'border-line hover:-translate-y-0.5 hover:border-line-strong hover:shadow-[0_14px_32px_-18px_rgba(26,37,56,0.26)] cursor-pointer'
                    : 'border-line-soft opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-mute">
                      {k.kategori}
                    </span>
                    <span
                      className={`mt-2.5 w-11 h-11 rounded-xl grid place-items-center transition-colors ${
                        acik
                          ? 'bg-brand-soft text-brand-deep group-hover:bg-brand group-hover:text-white'
                          : 'bg-surface-2 text-ink-quiet'
                      }`}
                    >
                      <Icon name={k.ikon} size={20} />
                    </span>
                  </div>
                  {!acik && <span className="chip">Yakında</span>}
                </div>

                <h2 className="font-display text-[23px] leading-tight font-bold tracking-tight text-ink mb-1.5">
                  {k.ad}
                </h2>
                <p className="text-[14px] text-ink-mute leading-relaxed flex-1">{k.aciklama}</p>

                {acik && (
                  <>
                    <div className="hairline my-4" />
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] tracking-wide uppercase text-ink-mute tnum">
                        {toplam} ders · ~{kartSureDk(k)} dk
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-deep opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                        {biten === 0 ? 'Başla' : 'Devam'}
                        <Icon name="ArrowRight" size={15} />
                      </span>
                    </div>
                    <div className="mt-3 h-1 bg-surface-2 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${yuzde}%` }}
                      />
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      )}
    </main>
  );
};
