import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { kartDersSayisi, kartSureDk, type KesfetKart } from '../data/kesfet';
import { tumKartlariYukle } from '../lib/kesfet';
import { tamamlananSet } from '../lib/kesfet-ilerleme';

/**
 * Keşfet — kart vitrini (LeetCode Explore ana ekranı gibi), editorial/ledger dili.
 * Kartlar DB'den (kesfet_kartlar) yüklenir; admin panelinden yönetilir.
 */

export const KesfetSayfasi = () => {
  const nav = useNavigate();
  const [kartlar, setKartlar] = useState<KesfetKart[] | null>(null);
  const [hata, setHata] = useState<string | null>(null);
  const tamamlanan = tamamlananSet();

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

      {hata && (
        <div className="text-center py-16 text-ink-mute">{hata}</div>
      )}

      {!kartlar && !hata && (
        <div className="flex items-center justify-center py-24">
          <Icon name="Loader2" size={22} className="animate-spin text-ink-mute" />
        </div>
      )}

      {kartlar && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {kartlar.map((k) => {
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
                className={`group relative text-left bg-surface border rounded-[20px] p-7 flex flex-col transition-all duration-200 ${
                  acik
                    ? 'border-line hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_20px_44px_-16px_rgba(26,37,56,0.28)] cursor-pointer'
                    : 'border-line-soft opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-mute">
                      {k.kategori}
                    </span>
                    <span
                      className={`mt-3 w-14 h-14 rounded-2xl grid place-items-center transition-colors ${
                        acik
                          ? 'bg-brand-soft text-brand-deep group-hover:bg-brand group-hover:text-white'
                          : 'bg-surface-2 text-ink-quiet'
                      }`}
                    >
                      <Icon name={k.ikon} size={25} />
                    </span>
                  </div>
                  {!acik && <span className="chip">Yakında</span>}
                </div>

                <h2 className="font-display text-[23px] leading-tight font-bold tracking-tight text-ink mb-2">
                  {k.ad}
                </h2>
                <p className="text-[14px] text-ink-mute leading-relaxed flex-1">{k.aciklama}</p>

                {acik && (
                  <>
                    <div className="hairline my-5" />
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
