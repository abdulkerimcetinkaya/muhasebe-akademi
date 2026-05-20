// Alt Başlık (Atölye) Sayfası — ModulLayout iki sütunlu yapı.
//
// Sol sidebar (ModulLayout) + sağ panel: alt başlığın BlockNote içeriği +
// senaryo (soru) listesi. AI yan paneli kaldırıldı — soru çözme ekranında
// (SoruEkrani) zaten çalışıyor.
//
// İçerik admin'den `modul_alt_basliklari.icerik` alanına yazılır.

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { IcerikGoruntuleyici } from '../components/IcerikGoruntuleyici';
import { ModulLayout } from '../components/ModulLayout';
import { TamamRozeti } from '../components/TamamRozeti';
import { useUniteler } from '../contexts/UnitelerContext';
import { ZORLUK_AD, ZORLUK_PUAN, ZORLUK_STIL } from '../data/sabitler';
import { altBaslikTamamlandiMi, modulKilitDurumu } from '../lib/modul-kilit';
import { altBaslikIcerikYukle } from '../lib/uniteler-loader';
import type { Ilerleme } from '../types';

interface Props {
  ilerleme: Ilerleme;
}

const icerikDolu = (icerik: unknown | null | undefined): boolean =>
  Array.isArray(icerik) && icerik.length > 0;

export const AltBaslikSayfasi = ({ ilerleme }: Props) => {
  const { uniteId, modulId, altBaslikId } = useParams<{
    uniteId: string;
    modulId: string;
    altBaslikId: string;
  }>();
  const nav = useNavigate();
  const { uniteler } = useUniteler();

  const unite = uniteler.find((u) => u.id === uniteId);
  const moduller = unite?.moduller ?? [];
  const modul = moduller.find((m) => m.id === modulId);
  const altBaslik = modul?.altBasliklar.find((a) => a.id === altBaslikId);

  // İçerik lazy yüklenir — uniteler-loader liste yüklemesinde icerik çekmiyor.
  // Hook'lar erken return'dan ÖNCE çağrılmalı (React kuralı).
  const cachedIcerik = Array.isArray(altBaslik?.icerik)
    ? (altBaslik.icerik as unknown[])
    : null;
  const [icerik, setIcerik] = useState<unknown[] | null>(cachedIcerik);
  const [icerikYukleniyor, setIcerikYukleniyor] = useState(!cachedIcerik && !!altBaslik);

  useEffect(() => {
    if (!altBaslik?.id) return;
    if (Array.isArray(altBaslik.icerik)) {
      setIcerik(altBaslik.icerik as unknown[]);
      setIcerikYukleniyor(false);
      return;
    }
    let iptal = false;
    setIcerikYukleniyor(true);
    altBaslikIcerikYukle(altBaslik.id).then((r) => {
      if (iptal) return;
      setIcerik(r.icerik);
      setIcerikYukleniyor(false);
    });
    return () => {
      iptal = true;
    };
  }, [altBaslik?.id, altBaslik?.icerik]);

  if (!unite || !modul || !altBaslik) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <button
          onClick={() => nav('/uniteler')}
          className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 font-semibold"
        >
          <Icon name="ArrowLeft" size={14} />
          <span>Tüm Üniteler</span>
        </button>
        <div className="bg-surface border border-line rounded-2xl p-10 text-center">
          <p className="text-sm text-ink-mute font-medium">Alt başlık bulunamadı.</p>
        </div>
      </main>
    );
  }

  const durum = modulKilitDurumu(moduller, modul, ilerleme);
  const kilitli = durum === 'kilitli';
  const tamam = altBaslikTamamlandiMi(altBaslik, ilerleme);
  const icerikVar = icerikDolu(icerik);

  // Sonraki alt başlık — aynı modül içinde
  const altIdx = modul.altBasliklar.findIndex((a) => a.id === altBaslik.id);
  const sonrakiAlt = altIdx >= 0 ? modul.altBasliklar[altIdx + 1] : null;

  // Sonraki modülün ilk alt başlığı (modül sonu için)
  const modIdx = moduller.findIndex((m) => m.id === modul.id);
  const sonrakiModul = modIdx >= 0 ? moduller[modIdx + 1] : null;
  const sonrakiModulIlk = sonrakiModul?.altBasliklar[0] ?? null;

  return (
    <ModulLayout
      unite={unite}
      moduller={moduller}
      modul={modul}
      ilerleme={ilerleme}
      aktifAltBaslikId={altBaslik.id}
    >
      {/* Başlık */}
      <header className="mb-6">
        <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-2 font-bold">
          Atölye {modul.sira}.{altBaslik.sira}
        </div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-3xl md:text-4xl tracking-tight font-bold leading-tight">
            {altBaslik.baslik}
          </h1>
          {altBaslik.karma && (
            <Icon
              name="Star"
              size={20}
              className="text-premium-deep dark:text-premium flex-shrink-0"
            />
          )}
          {tamam && <TamamRozeti size={20} />}
        </div>
        <div className="text-sm text-ink-mute font-medium">{modul.baslik}</div>
      </header>

      {/* Kilit uyarısı */}
      {kilitli && (
        <div className="bg-premium-soft/40 dark:bg-premium-soft/15 border border-premium-soft dark:border-premium-deep/40 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <Icon
            name="Lock"
            size={16}
            className="text-premium-deep dark:text-premium flex-shrink-0 mt-0.5"
          />
          <div className="text-sm text-ink leading-relaxed">
            Bu atölye, içinde bulunduğu modül henüz açılmadığı için kilitli.
          </div>
        </div>
      )}

      {/* Konu anlatımı */}
      {icerikYukleniyor ? (
        <div className="bg-surface border border-line rounded-2xl px-6 py-10 mb-6 animate-pulse">
          <div className="h-3 bg-surface-2 rounded w-3/4 mb-3" />
          <div className="h-3 bg-surface-2 rounded w-full mb-3" />
          <div className="h-3 bg-surface-2 rounded w-5/6" />
        </div>
      ) : icerikVar ? (
        <article className="bg-bg border border-line rounded-2xl px-2 py-2 sm:px-4 sm:py-4 mb-6">
          <IcerikGoruntuleyici icerik={icerik} />
        </article>
      ) : (
        <div className="bg-surface border border-dashed border-line-strong rounded-2xl px-6 py-8 text-center mb-6">
          <div className="text-[10px] tracking-[0.22em] uppercase text-ink-quiet font-bold mb-2">
            Konu Anlatımı
          </div>
          <p className="text-[13px] text-ink-mute max-w-md mx-auto leading-relaxed">
            Bu atölyenin konu anlatımı henüz hazırlanmadı. Aşağıdaki senaryolar
            doğrudan çözülebilir.
          </p>
        </div>
      )}

      {/* Senaryo (soru) listesi — 2 kolay + 1 orta sabit set */}
      {(() => {
        const kolaylar = altBaslik.sorular.filter((s) => s.zorluk === 'kolay').slice(0, 2);
        const ortalar = altBaslik.sorular.filter((s) => s.zorluk === 'orta').slice(0, 1);
        const secilenler = [...kolaylar, ...ortalar];
        const kalan = altBaslik.sorular.length - secilenler.length;
        if (secilenler.length === 0) return null;
        return (
        <section className="mb-6">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="font-display text-xl font-bold tracking-tight">
              Atanan Sorular
            </h2>
            <span className="text-xs text-ink-mute font-semibold">
              {secilenler.length} adet
            </span>
          </div>
          <ul className="space-y-2">
            {secilenler.map((s, i) => {
              const cozulmus = !!ilerleme.cozulenler[s.id];
              const yanlisSayi = ilerleme.yanlislar[s.id] || 0;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => !kilitli && nav(`/problemler/${s.id}`)}
                    disabled={kilitli}
                    className={`w-full text-left bg-surface border border-line rounded-xl p-5 transition group ${
                      kilitli
                        ? 'opacity-55 cursor-not-allowed'
                        : 'hover:border-ink hover:-translate-y-0.5 hover:shadow-sm active:scale-[0.99]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] tracking-[0.2em] uppercase text-ink-quiet font-bold font-mono">
                        Senaryo {String(i + 1).padStart(2, '0')}
                      </span>
                      {cozulmus ? (
                        <TamamRozeti size={16} />
                      ) : yanlisSayi > 0 ? (
                        <Icon name="XCircle" size={16} className="text-danger" />
                      ) : (
                        <Icon name="Circle" size={16} className="text-ink-quiet" />
                      )}
                    </div>
                    <h3 className="font-display text-lg font-bold tracking-tight mb-2 group-hover:text-brand dark:group-hover:text-brand-mute transition">
                      {s.baslik}
                    </h3>
                    <p className="text-xs text-ink-mute leading-relaxed font-medium line-clamp-2 mb-3">
                      {s.senaryo}
                    </p>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] tracking-[0.2em] uppercase font-bold ${ZORLUK_STIL[s.zorluk]}`}
                      >
                        {ZORLUK_AD[s.zorluk]}
                      </span>
                      <span className="font-mono text-[10px] text-ink-quiet font-bold">
                        {ZORLUK_PUAN[s.zorluk]}p
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
          {kalan > 0 && (
            <div className="mt-3 text-[11px] text-ink-quiet font-semibold tracking-wide">
              + {kalan} ekstra pratik · Problemler sayfasında
            </div>
          )}
        </section>
        );
      })()}

      {/* Sayfa sonu navigasyon */}
      <div className="mt-8 pt-6 border-t border-line flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => nav(`/uniteler/${unite.id}/modul/${modul.id}`)}
          className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink font-semibold transition"
        >
          <Icon name="ArrowLeft" size={14} />
          <span>Modül Genel Bakış</span>
        </button>

        {sonrakiAlt ? (
          <button
            onClick={() =>
              nav(`/uniteler/${unite.id}/modul/${modul.id}/alt/${sonrakiAlt.id}`)
            }
            className="bg-ink text-bg px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition"
          >
            Sıradaki Atölye
            <Icon name="ArrowRight" size={14} />
          </button>
        ) : sonrakiModulIlk && sonrakiModul ? (
          <button
            onClick={() =>
              nav(
                `/uniteler/${unite.id}/modul/${sonrakiModul.id}/alt/${sonrakiModulIlk.id}`,
              )
            }
            className="bg-ink text-bg px-5 py-2.5 rounded-xl text-sm font-bold tracking-wide uppercase inline-flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition"
          >
            Sonraki Modüle Geç
            <Icon name="ArrowRight" size={14} />
          </button>
        ) : null}
      </div>
    </ModulLayout>
  );
};
