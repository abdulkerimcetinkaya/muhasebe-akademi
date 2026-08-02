// ModulLayout — modül overview ve alt başlık sayfaları için ortak sarmal.
//
// İki sütunlu yapı: sol sticky sidebar (Genel Bakış + atölye listesi) + sağ
// içerik slotu. Breadcrumb satırında "Tüm Modüller" geri butonu ve
// önceki/sonraki modül navigasyonu yer alır. Hem ModulSayfasi hem
// AltBaslikSayfasi bu sarmalı kullanır.
//
// Sol sidebar:
//  - Modülün başlığı + zorluk badge'i (kompakt)
//  - "Genel Bakış" satırı (en üstte) — link `/isletmeler/:uniteId/modul/:modulId`
//  - Tüm alt başlıklar (atölyeler) listesi — kilit/tamamlandı/başlandı durumu
//  - Aktif olan vurgulu (border-l-2 brand)
//
// Mobil: `<details>` ile sidebar `< lg` ekranlarda collapsed başlar.
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { TamamRozeti } from './TamamRozeti';
import {
  MODUL_ZORLUK_AD,
  MODUL_ZORLUK_BADGE,
} from '../data/sabitler';
import {
  altBaslikTamamlandiMi,
  modulKilitDurumu,
} from '../lib/modul-kilit';
import type { Ilerleme, Modul, Unite } from '../types';

interface Props {
  unite: Unite;
  moduller: Modul[];
  modul: Modul;
  ilerleme: Ilerleme;
  /** null → "Genel Bakış" aktif; string → o alt başlık aktif. */
  aktifAltBaslikId: string | null;
  children: React.ReactNode;
}

export const ModulLayout = ({
  unite,
  moduller,
  modul,
  ilerleme,
  aktifAltBaslikId,
  children,
}: Props) => {
  const nav = useNavigate();

  // Modüller arası önceki/sonraki
  const idx = moduller.findIndex((m) => m.id === modul.id);
  const oncekiModul = idx > 0 ? moduller[idx - 1] : null;
  const sonrakiModul = idx >= 0 && idx < moduller.length - 1 ? moduller[idx + 1] : null;

  const oncekiKilitli = oncekiModul
    ? modulKilitDurumu(moduller, oncekiModul, ilerleme) === 'kilitli'
    : false;
  const sonrakiKilitli = sonrakiModul
    ? modulKilitDurumu(moduller, sonrakiModul, ilerleme) === 'kilitli'
    : false;

  const modulKilitli = modulKilitDurumu(moduller, modul, ilerleme) === 'kilitli';

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      {/* Breadcrumb satırı: geri + önceki/sonraki modül */}
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <button
          onClick={() => nav(`/isletmeler/${unite.id}?overview=1`)}
          className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink font-semibold"
        >
          <Icon name="ArrowLeft" size={14} />
          <span>Tüm Modüller</span>
        </button>

        <div className="flex items-center gap-1 text-[11px] tracking-[0.16em] uppercase font-bold">
          <button
            onClick={() =>
              oncekiModul &&
              !oncekiKilitli &&
              nav(`/isletmeler/${unite.id}/modul/${oncekiModul.id}`)
            }
            disabled={!oncekiModul || oncekiKilitli}
            title={
              !oncekiModul
                ? 'İlk modüldesin'
                : oncekiKilitli
                  ? 'Önceki modül kilitli'
                  : oncekiModul.baslik
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition ${
              !oncekiModul || oncekiKilitli
                ? 'border-line text-ink-quiet opacity-50 cursor-not-allowed'
                : 'border-line text-ink-mute hover:text-ink hover:border-ink'
            }`}
          >
            <Icon name="ArrowLeft" size={12} />
            <span>Önceki</span>
          </button>

          <span className="px-3 py-2 text-ink-mute font-mono tabular-nums">
            {String(modul.sira).padStart(2, '0')} / {String(moduller.length).padStart(2, '0')}
          </span>

          <button
            onClick={() =>
              sonrakiModul &&
              !sonrakiKilitli &&
              nav(`/isletmeler/${unite.id}/modul/${sonrakiModul.id}`)
            }
            disabled={!sonrakiModul || sonrakiKilitli}
            title={
              !sonrakiModul
                ? 'Son modüldesin'
                : sonrakiKilitli
                  ? 'Sonraki modül kilitli'
                  : sonrakiModul.baslik
            }
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition ${
              !sonrakiModul || sonrakiKilitli
                ? 'border-line text-ink-quiet opacity-50 cursor-not-allowed'
                : 'border-line text-ink-mute hover:text-ink hover:border-ink'
            }`}
          >
            <span>Sonraki</span>
            <Icon name="ArrowRight" size={12} />
          </button>
        </div>
      </div>

      {/* İki sütunlu içerik */}
      <div className="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-6 lg:gap-8">
        {/* Sol sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <details
            className="lg:!open group bg-surface border border-line rounded-2xl lg:bg-transparent lg:border-0 lg:rounded-none"
            open
          >
            <summary className="lg:hidden cursor-pointer px-4 py-3 flex items-center justify-between font-semibold text-sm">
              <span>Atölyeler</span>
              <Icon name="ChevronDown" size={14} />
            </summary>

            {/* Modül başlık + zorluk */}
            <div className="px-4 lg:px-2 pt-4 lg:pt-0 pb-3 lg:pb-4 border-b border-line lg:border-b-0">
              <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-1 font-bold">
                Modül {String(modul.sira).padStart(2, '0')}
              </div>
              <div className="font-display text-lg font-bold tracking-tight leading-tight mb-2">
                {modul.baslik}
              </div>
              <span
                className={`text-[9px] tracking-[0.22em] uppercase font-bold px-2 py-0.5 rounded border ${MODUL_ZORLUK_BADGE[modul.zorlukSeviyesi]}`}
              >
                {MODUL_ZORLUK_AD[modul.zorlukSeviyesi]}
              </span>
              {modul.opsiyonel && (
                <span className="ml-2 text-[9px] tracking-[0.22em] uppercase font-bold text-premium-deep dark:text-premium inline-flex items-center gap-1">
                  <Icon name="Star" size={10} />
                  Opsiyonel
                </span>
              )}
            </div>

            {/* Navigasyon listesi */}
            <nav className="px-2 py-2 lg:py-3 flex flex-col gap-0.5">
              {/* Genel Bakış */}
              <button
                onClick={() => nav(`/isletmeler/${unite.id}/modul/${modul.id}`)}
                className={`text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition border-l-2 ${
                  aktifAltBaslikId === null
                    ? 'bg-brand-soft/40 dark:bg-brand-soft/15 border-brand-deep text-ink font-semibold'
                    : 'border-transparent text-ink-soft hover:bg-surface-2 hover:text-ink'
                }`}
              >
                <Icon name="BookOpen" size={14} className="flex-shrink-0" />
                <span className="text-sm">Genel Bakış</span>
              </button>

              <div className="px-3 pt-3 pb-1 text-[10px] tracking-[0.22em] uppercase text-ink-quiet font-bold">
                Atölyeler · {modul.altBasliklar.length}
              </div>

              {modul.altBasliklar.length === 0 ? (
                <div className="px-3 py-2 text-[11px] text-ink-mute">
                  Atölyeler hazırlanıyor.
                </div>
              ) : (
                modul.altBasliklar.map((a) => {
                  const aktif = aktifAltBaslikId === a.id;
                  const aTamam = altBaslikTamamlandiMi(a, ilerleme);
                  const aBaslandi =
                    !aTamam && a.sorular.some((s) => !!ilerleme.cozulenler[s.id]);
                  const pasif = a.aktif === false;
                  const tiklanamaz = modulKilitli || pasif;
                  const disabledClass = tiklanamaz
                    ? 'opacity-55 cursor-not-allowed'
                    : '';
                  return (
                    <button
                      key={a.id}
                      onClick={() =>
                        !tiklanamaz &&
                        nav(`/isletmeler/${unite.id}/modul/${modul.id}/alt/${a.id}`)
                      }
                      disabled={tiklanamaz}
                      title={pasif ? 'Bu atölye henüz hazırlanıyor' : undefined}
                      className={`text-left flex items-center gap-2.5 px-3 py-2 rounded-lg transition border-l-2 ${
                        aktif
                          ? 'bg-brand-soft/40 dark:bg-brand-soft/15 border-brand-deep text-ink font-semibold'
                          : 'border-transparent text-ink-soft hover:bg-surface-2 hover:text-ink'
                      } ${disabledClass}`}
                    >
                      <span className="flex-shrink-0 w-4 flex items-center justify-center">
                        {pasif ? (
                          <Icon name="Lock" size={12} className="text-premium-deep" />
                        ) : modulKilitli ? (
                          <Icon name="Lock" size={12} className="text-ink-quiet" />
                        ) : aTamam ? (
                          <TamamRozeti size={14} />
                        ) : aBaslandi ? (
                          <Icon
                            name="CircleDashed"
                            size={14}
                            className="text-brand dark:text-brand-mute"
                          />
                        ) : (
                          <Icon name="Circle" size={14} className="text-ink-quiet" />
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-ink-quiet font-bold tabular-nums flex-shrink-0 w-7">
                        {modul.sira}.{a.sira}
                      </span>
                      <span className="text-sm leading-snug min-w-0 flex-1 break-words">
                        {a.baslik}
                      </span>
                      {pasif && (
                        <span className="text-[8px] tracking-[0.2em] uppercase font-bold text-premium-deep flex-shrink-0">
                          Yakında
                        </span>
                      )}
                      {a.karma && !pasif && (
                        <Icon
                          name="Star"
                          size={11}
                          className="text-premium-deep dark:text-premium flex-shrink-0"
                        />
                      )}
                    </button>
                  );
                })
              )}
            </nav>
          </details>
        </aside>

        {/* Sağ içerik */}
        <section className="min-w-0">{children}</section>
      </div>
    </main>
  );
};
