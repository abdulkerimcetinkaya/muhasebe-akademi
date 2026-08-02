// ModulSayfasi — modül "Genel Bakış" görünümü.
//
// Sol sidebar (ModulLayout) + sağ panel: modülün BlockNote içeriği +
// hızlı eylem (ilk açık alt başlığa zıpla). İçerik admin'den
// `unite_modulleri.icerik` alanına yazılır.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { IcerikGoruntuleyici } from '../components/IcerikGoruntuleyici';
import { ModulLayout } from '../components/ModulLayout';
import { TamamRozeti } from '../components/TamamRozeti';
import { useUniteler } from '../contexts/UnitelerContext';
import {
  altBaslikTamamlandiMi,
  kilidiAcanModul,
  modulIlerlemeYuzde,
  modulKilitDurumu,
} from '../lib/modul-kilit';
import { modulIcerikYukle } from '../lib/isletmeler-loader';
import type { AltBaslik, Ilerleme } from '../types';

interface Props {
  ilerleme: Ilerleme;
}

const icerikDolu = (icerik: unknown | null | undefined): boolean =>
  Array.isArray(icerik) && icerik.length > 0;

export const ModulSayfasi = ({ ilerleme }: Props) => {
  const { uniteId, modulId } = useParams<{ uniteId: string; modulId: string }>();
  const nav = useNavigate();
  const { uniteler } = useUniteler();

  const unite = uniteler.find((u) => u.id === uniteId);
  const moduller = unite?.moduller ?? [];
  const modul = moduller.find((m) => m.id === modulId);

  if (!unite || !modul) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <button
          onClick={() => nav('/isletmeler')}
          className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 font-semibold"
        >
          <Icon name="ArrowLeft" size={14} />
          <span>Tüm İşletmeler</span>
        </button>
        <div className="bg-surface border border-line rounded-2xl p-10 text-center">
          <p className="text-sm text-ink-mute font-medium">Modül bulunamadı.</p>
        </div>
      </main>
    );
  }

  const durum = modulKilitDurumu(moduller, modul, ilerleme);
  const yuzde = modulIlerlemeYuzde(modul, ilerleme);
  const kilitli = durum === 'kilitli';
  const tamam = durum === 'tamamlandi';
  const acanModul = kilitli ? kilidiAcanModul(moduller, modul, ilerleme) : null;
  const altBasliklar = modul.altBasliklar;
  const tamamAlt = altBasliklar.filter((a) => altBaslikTamamlandiMi(a, ilerleme)).length;

  // İçerik lazy yüklenir — uniteler-loader liste yüklemesinde icerik çekmiyor.
  // Modül sayfası açılınca ayrı bir query ile çek.
  const [icerik, setIcerik] = useState<unknown[] | null>(
    Array.isArray(modul.icerik) ? (modul.icerik as unknown[]) : null,
  );
  const [icerikYukleniyor, setIcerikYukleniyor] = useState(!Array.isArray(modul.icerik));

  useEffect(() => {
    if (!modul.id) return;
    if (Array.isArray(modul.icerik)) {
      setIcerik(modul.icerik as unknown[]);
      setIcerikYukleniyor(false);
      return;
    }
    let iptal = false;
    setIcerikYukleniyor(true);
    modulIcerikYukle(modul.id).then((r) => {
      if (iptal) return;
      setIcerik(r.icerik);
      setIcerikYukleniyor(false);
    });
    return () => {
      iptal = true;
    };
  }, [modul.id, modul.icerik]);

  const icerikVar = icerikDolu(icerik);

  // "Devam et / Başla" — ilk tamamlanmamış (ama başlanmış veya hiç başlanmamış) alt başlık
  const ilkAcikAlt: AltBaslik | undefined = altBasliklar.find(
    (a) => !altBaslikTamamlandiMi(a, ilerleme),
  );

  return (
    <ModulLayout
      unite={unite}
      moduller={moduller}
      modul={modul}
      ilerleme={ilerleme}
      aktifAltBaslikId={null}
    >
      {/* Başlık + ilerleme şeridi */}
      <header className="mb-6">
        <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-2 font-bold">
          Genel Bakış · Modül {String(modul.sira).padStart(2, '0')}
        </div>
        <h1 className="font-display text-3xl md:text-4xl tracking-tight font-bold leading-tight mb-3">
          {modul.baslik}
        </h1>
        {modul.aciklama && (
          <p className="text-base text-ink-soft leading-relaxed font-medium max-w-2xl mb-5">
            {modul.aciklama}
          </p>
        )}

        {/* İlerleme şeridi */}
        <div className="bg-surface border border-line rounded-xl px-4 py-3 flex items-center gap-4 max-w-2xl">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
                İlerleme
              </span>
              <span className="font-mono text-[11px] text-ink-mute font-bold tabular-nums">
                {tamamAlt}/{altBasliklar.length} atölye · %{yuzde}
              </span>
            </div>
            <div className="h-1.5 bg-surface-2 rounded overflow-hidden">
              <div
                className="h-full bg-brand-deep transition-all"
                style={{ width: `${yuzde}%` }}
              />
            </div>
          </div>
          {tamam && (
            <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-success flex items-center gap-1.5 flex-shrink-0">
              <Icon name="CheckCircle2" size={12} />
              Tamam
            </span>
          )}
        </div>
      </header>

      {/* Kilit uyarısı */}
      {kilitli && acanModul && (
        <div className="bg-premium-soft/40 dark:bg-premium-soft/15 border border-premium-soft dark:border-premium-deep/40 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <Icon
            name="Lock"
            size={16}
            className="text-premium-deep dark:text-premium flex-shrink-0 mt-0.5"
          />
          <div className="text-sm text-ink leading-relaxed">
            Bu modül kilitli. Açmak için önce{' '}
            <button
              onClick={() => nav(`/isletmeler/${unite.id}/modul/${acanModul.id}`)}
              className="font-bold underline underline-offset-2 hover:text-brand dark:hover:text-brand-mute"
            >
              {acanModul.baslik}
            </button>{' '}
            modülünü tamamla.
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
        <div className="bg-surface border border-dashed border-line-strong rounded-2xl px-6 py-10 text-center mb-6">
          <div className="text-[10px] tracking-[0.22em] uppercase text-ink-quiet font-bold mb-2">
            Konu Anlatımı
          </div>
          <p className="text-[14px] text-ink-mute max-w-md mx-auto leading-relaxed">
            Bu modülün genel bakış içeriği henüz hazırlanmadı. Soldaki listeden bir
            atölyeye geçerek senaryolara başlayabilirsin.
          </p>
        </div>
      )}

      {/* Hızlı eylem */}
      {!kilitli && ilkAcikAlt && (
        <div className="flex items-center justify-between gap-4 mt-6 p-5 bg-bg border border-line rounded-2xl">
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-ink-mute mb-1">
              {tamamAlt > 0 ? 'Devam Et' : 'Başla'}
            </div>
            <div className="font-display text-lg font-bold tracking-tight leading-tight truncate">
              {modul.sira}.{ilkAcikAlt.sira} · {ilkAcikAlt.baslik}
            </div>
          </div>
          <button
            onClick={() =>
              nav(`/isletmeler/${unite.id}/modul/${modul.id}/alt/${ilkAcikAlt.id}`)
            }
            className="flex-shrink-0 bg-brand-deep hover:bg-brand-deep dark:bg-brand text-bg px-5 py-2.5 text-sm tracking-wide uppercase font-bold transition inline-flex items-center gap-2 rounded-xl shadow-md"
          >
            <Icon name="Zap" size={13} />
            {tamamAlt > 0 ? 'Devam Et' : 'Atölyeye Başla'}
            <Icon name="ArrowRight" size={13} />
          </button>
        </div>
      )}

      {tamam && (
        <div className="flex items-center gap-3 mt-6 p-5 bg-gradient-to-br from-brand-soft to-bg border border-brand-soft dark:border-brand-deep/40 rounded-2xl">
          <TamamRozeti size={20} />
          <div className="min-w-0">
            <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-brand-deep dark:text-brand-mute mb-0.5">
              Modül Tamamlandı
            </div>
            <div className="text-sm text-ink-soft font-medium">
              Tüm atölyeleri çözdün — sıradaki modüle üst kısımdan geçebilirsin.
            </div>
          </div>
        </div>
      )}
    </ModulLayout>
  );
};
