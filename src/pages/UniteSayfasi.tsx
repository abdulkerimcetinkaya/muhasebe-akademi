import { useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Thiings } from '../components/Thiings';
import { TamamRozeti } from '../components/TamamRozeti';
import { useUniteler } from '../contexts/UnitelerContext';
import {
  MODUL_ZORLUK_AD,
  MODUL_ZORLUK_BADGE,
  MODUL_ZORLUK_KENAR,
} from '../data/sabitler';
import { konuKilitliMi, konuTamamlandiMi } from '../lib/konu-kilit';
import {
  modulIlerlemeYuzde,
  modulKilitDurumu,
  uniteModulIlerleme,
} from '../lib/modul-kilit';
import type { Ilerleme } from '../types';

const icerikDolu = (icerik: unknown | null | undefined): boolean =>
  Array.isArray(icerik) && icerik.length > 0;

interface Props {
  ilerleme: Ilerleme;
}

export const UniteSayfasi = ({ ilerleme }: Props) => {
  const { uniteId } = useParams<{ uniteId: string }>();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { uniteler } = useUniteler();
  const unite = uniteler.find((u) => u.id === uniteId);
  // ?overview=1 query param ile akıllı yönlendirme bypass edilebilir
  // (Konu sayfasının breadcrumb'ı bu link'i kullanır → kullanıcı overview'i görmek isterse)
  const overviewIstendi = params.get('overview') === '1';

  useEffect(() => {
    if (!unite) {
      nav('/isletmeler', { replace: true });
      return;
    }

    // Akıllı yönlendirme (Yaklaşım C):
    // Modül yapısı varsa redirect kapalı — kullanıcı her zaman işletme overview'unda
    // başlasın ve modül kartlarını görsün.
    if (overviewIstendi) return;
    if ((unite.moduller?.length ?? 0) > 0) return;

    // Eski konu yapısı için: en az 1 soru çözmüşse bıraktığı konuya götür.
    const cozulen = unite.sorular.filter((s) => ilerleme.cozulenler[s.id]).length;
    const ilkTamamlanmamisKonu = unite.konular?.find(
      (k) => !konuTamamlandiMi(k, ilerleme),
    );

    if (cozulen > 0 && ilkTamamlanmamisKonu) {
      nav(`/isletmeler/${unite.id}/${ilkTamamlanmamisKonu.id}`, { replace: true });
    }
    // Hiç başlamadıysa veya tüm konular tamamsa → overview'da kal
  }, [unite, ilerleme, nav, overviewIstendi]);

  if (!unite) return null;

  const moduller = unite.moduller ?? [];
  const modulleriVar = moduller.length > 0;
  const konular = unite.konular ?? [];
  // Modül yapısı varsa eski konu seksiyonunu gizle — atölye yapısı önceliklidir.
  const konulariVar = !modulleriVar && konular.length > 0;

  const toplam = unite.sorular.length;
  const cozulen = unite.sorular.filter((s) => ilerleme.cozulenler[s.id]).length;
  const yuzde = toplam > 0 ? Math.round((cozulen / toplam) * 100) : 0;

  // Modül bazlı ilerleme — sadece moduller varsa kullanılır.
  const modulIlerleme = modulleriVar
    ? uniteModulIlerleme(moduller, ilerleme)
    : null;

  // İlk açık (kilitsiz, henüz tamamlanmamış) modül — "Devam Et" / "Başla" butonu için
  const ilkAcikModul = modulleriVar
    ? moduller.find((m) => modulKilitDurumu(moduller, m, ilerleme) === 'acik')
    : null;

  // İlk tamamlanmamış konu — "Devam Et" butonu için. Yumuşak kilit:
  // sıralı ilerleyişi öneriyoruz, dolayısıyla "ilk tamamlanmamış" doğal olarak
  // "açık olan" konuya denk gelir.
  const ilkTamamlanmamisKonu = konulariVar
    ? konular.find((k) => !konuTamamlandiMi(k, ilerleme))
    : null;

  const sirayaGoreSorular = [...unite.sorular].sort((a, b) => {
    const aCoz = ilerleme.cozulenler[a.id] ? 1 : 0;
    const bCoz = ilerleme.cozulenler[b.id] ? 1 : 0;
    return aCoz - bCoz;
  });
  const ilkCozulmemis = sirayaGoreSorular.find((s) => !ilerleme.cozulenler[s.id]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <button
        onClick={() => nav('/isletmeler')}
        className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-6 font-semibold"
      >
        <Icon name="ArrowLeft" size={14} />
        <span>Tüm İşletmeler</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 mb-12">
        <div className="lg:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <Thiings name={unite.thiingsIcon} size={64} />
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-1 font-bold">
                İşletme
              </div>
              <h1 className="font-display text-4xl md:text-5xl tracking-tight font-bold leading-none">
                {unite.ad}
              </h1>
            </div>
          </div>
          <p className="text-lg text-ink-soft leading-relaxed font-medium max-w-2xl">
            {unite.aciklama}
          </p>
          {modulleriVar && ilkAcikModul ? (
            <button
              onClick={() => nav(`/isletmeler/${unite.id}/modul/${ilkAcikModul.id}`)}
              className="mt-6 bg-brand-deep hover:bg-brand-deep dark:bg-brand text-bg px-6 py-3 text-sm tracking-wide uppercase font-bold transition inline-flex items-center gap-2 rounded-xl shadow-md"
            >
              <Icon name="Zap" size={14} />
              {(modulIlerleme?.tamamAltBaslik ?? 0) > 0 ? 'Devam Et' : 'Atölyeye Başla'}
              <Icon name="ArrowRight" size={14} />
            </button>
          ) : konulariVar && ilkTamamlanmamisKonu ? (
            <button
              onClick={() => nav(`/isletmeler/${unite.id}/${ilkTamamlanmamisKonu.id}`)}
              className="mt-6 bg-brand-deep hover:bg-brand-deep dark:bg-brand text-bg px-6 py-3 text-sm tracking-wide uppercase font-bold transition inline-flex items-center gap-2 rounded-xl shadow-md"
            >
              <Icon name="Zap" size={14} />
              {cozulen > 0 ? 'Devam Et' : 'Çalışmaya Başla'}
              <Icon name="ArrowRight" size={14} />
            </button>
          ) : !konulariVar && !modulleriVar && ilkCozulmemis ? (
            <button
              onClick={() => nav(`/problemler/${ilkCozulmemis.id}`)}
              className="mt-6 bg-brand-deep hover:bg-brand-deep dark:bg-brand text-bg px-6 py-3 text-sm tracking-wide uppercase font-bold transition inline-flex items-center gap-2 rounded-xl shadow-md"
            >
              <Icon name="Zap" size={14} />
              {cozulen > 0 ? 'Devam Et' : 'Çözmeye Başla'}
              <Icon name="ArrowRight" size={14} />
            </button>
          ) : null}
        </div>

        <aside className="bg-surface border border-line rounded-2xl p-6 self-start">
          <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-4 font-bold">
            İlerleme
          </div>
          {modulleriVar && modulIlerleme ? (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-display text-4xl font-bold tracking-tight">
                  {modulIlerleme.tamamAltBaslik}
                </span>
                <span className="font-mono text-sm text-ink-mute font-bold">
                  / {modulIlerleme.toplamAltBaslik} atölye
                </span>
              </div>
              <div className="h-2 bg-surface-2 rounded overflow-hidden mb-4">
                <div
                  className="h-full bg-brand-deep transition-all"
                  style={{ width: `${modulIlerleme.yuzde}%` }}
                />
              </div>
              <div className="text-xs text-ink-mute font-semibold">
                %{modulIlerleme.yuzde} tamamlandı
              </div>
              <div className="mt-4 pt-4 border-t border-line text-[11px] text-ink-mute font-semibold">
                {moduller.length} modül · Yaklaşık 8-10 saatlik atölye
              </div>
            </>
          ) : (
            <>
              <div className="flex items-baseline justify-between mb-2">
                <span className="font-display text-4xl font-bold tracking-tight">{cozulen}</span>
                <span className="font-mono text-sm text-ink-mute font-bold">
                  / {toplam} soru
                </span>
              </div>
              <div className="h-2 bg-surface-2 rounded overflow-hidden mb-4">
                <div
                  className="h-full bg-brand-deep transition-all"
                  style={{ width: `${yuzde}%` }}
                />
              </div>
              <div className="text-xs text-ink-mute font-semibold">
                %{yuzde} tamamlandı
              </div>
              {konulariVar && (
                <div className="mt-4 pt-4 border-t border-line text-[11px] text-ink-mute font-semibold">
                  {konular.length} alt-konu
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      {/* Modül kartları — atölye yapısı (yeni) */}
      {modulleriVar && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display text-2xl font-bold tracking-tight">Atölye Modülleri</h2>
              <span className="text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
                Sırayla ilerle
              </span>
            </div>
            <span className="text-xs text-ink-mute font-semibold">
              {moduller.length} modül
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {moduller.map((m) => {
              const durum = modulKilitDurumu(moduller, m, ilerleme);
              const yuzdeMod = modulIlerlemeYuzde(m, ilerleme);
              const altBaslikSayi = m.altBasliklar.length;
              const tamamAltBaslik = m.altBasliklar.filter((a) =>
                a.sorular.length > 0 && a.sorular.every((s) => !!ilerleme.cozulenler[s.id]),
              ).length;
              const kilitli = durum === 'kilitli';
              const tamam = durum === 'tamamlandi';
              const pasif = m.aktif === false;
              const tiklanamaz = kilitli || pasif;
              return (
                <button
                  key={m.id}
                  onClick={() =>
                    !tiklanamaz && nav(`/isletmeler/${unite.id}/modul/${m.id}`)
                  }
                  disabled={tiklanamaz}
                  title={
                    pasif
                      ? 'Bu modül henüz hazırlanıyor'
                      : kilitli
                        ? 'Önceki modülü tamamlayarak aç'
                        : tamam
                          ? 'Bu modülü tamamladın'
                          : undefined
                  }
                  className={`text-left bg-surface border border-l-4 ${MODUL_ZORLUK_KENAR[m.zorlukSeviyesi]} rounded-2xl p-5 transition group ${
                    tiklanamaz
                      ? 'border-line opacity-55 cursor-not-allowed'
                      : tamam
                        ? 'border-brand-soft dark:border-brand-deep/50 hover:border-brand hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]'
                        : 'border-line hover:border-ink hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="font-display text-3xl font-bold tracking-tight text-ink-mute font-mono leading-none">
                      {String(m.sira).padStart(2, '0')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] tracking-[0.18em] uppercase font-bold px-2 py-0.5 rounded border ${MODUL_ZORLUK_BADGE[m.zorlukSeviyesi]}`}
                      >
                        {MODUL_ZORLUK_AD[m.zorlukSeviyesi]}
                      </span>
                      {m.opsiyonel && (
                        <Icon
                          name="Star"
                          size={14}
                          className="text-premium-deep dark:text-premium"
                        />
                      )}
                      {pasif ? (
                        <Icon name="Lock" size={15} className="text-premium-deep" />
                      ) : kilitli ? (
                        <Icon name="Lock" size={15} className="text-ink-quiet" />
                      ) : tamam ? (
                        <TamamRozeti size={16} />
                      ) : tamamAltBaslik > 0 ? (
                        <Icon
                          name="CircleDashed"
                          size={16}
                          className="text-brand dark:text-brand-mute"
                        />
                      ) : (
                        <Icon name="Circle" size={16} className="text-ink-quiet" />
                      )}
                    </div>
                  </div>
                  <h3
                    className={`font-display text-lg font-bold tracking-tight mb-1.5 leading-snug transition ${
                      tiklanamaz
                        ? 'text-ink-mute'
                        : 'group-hover:text-brand dark:group-hover:text-brand-mute'
                    }`}
                  >
                    {m.baslik}
                  </h3>
                  {m.aciklama && (
                    <p className="text-xs text-ink-mute leading-relaxed font-medium line-clamp-2 mb-3 min-h-[2.4em]">
                      {m.aciklama}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex-1 h-1.5 bg-surface-2 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${tamam ? 'bg-brand-deep dark:bg-brand' : 'bg-brand-deep'}`}
                        style={{ width: `${yuzdeMod}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-ink-mute font-bold tabular-nums whitespace-nowrap">
                      {tamamAltBaslik}/{altBaslikSayi}
                    </span>
                  </div>
                  {pasif ? (
                    <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-premium-deep font-bold flex items-center gap-1.5">
                      <Icon name="Lock" size={10} />
                      Yakında
                    </div>
                  ) : kilitli ? (
                    <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold flex items-center gap-1.5">
                      <Icon name="Lock" size={10} />
                      Önceki modülü tamamla
                    </div>
                  ) : m.opsiyonel ? (
                    <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-premium-deep dark:text-premium font-bold flex items-center gap-1.5">
                      <Icon name="Star" size={10} />
                      Opsiyonel
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Konu kartları — yeni LeetCode-tarzı yapı */}
      {konulariVar && (
        <section className="mb-12">
          <div className="flex items-baseline justify-between mb-4">
            <div className="flex items-baseline gap-3">
              <h2 className="font-display text-2xl font-bold tracking-tight">Konular</h2>
              <span className="text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
                Sırayla ilerle
              </span>
            </div>
            <span className="text-xs text-ink-mute font-semibold">
              {konular.length} adet
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {konular.map((k, i) => {
              const kSoru = k.sorular.length;
              const kCozulen = k.sorular.filter((s) => ilerleme.cozulenler[s.id]).length;
              const kYuzde = kSoru > 0 ? Math.round((kCozulen / kSoru) * 100) : 0;
              const kTamam = konuTamamlandiMi(k, ilerleme);
              const kBaslandi = kCozulen > 0 && !kTamam;
              const kIcerikVar = icerikDolu(k.icerik);
              const kKilitli = konuKilitliMi(konular, k, ilerleme);
              return (
                <button
                  key={k.id}
                  onClick={() => nav(`/isletmeler/${unite.id}/${k.id}`)}
                  className={`text-left bg-surface border rounded-xl p-5 transition active:scale-[0.99] group ${
 kKilitli
 ? 'border-line opacity-60 hover:opacity-90'
 : kTamam
 ? 'border-brand-soft dark:border-brand-deep/50 hover:border-brand'
 : 'border-line hover:border-ink '
 }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-ink-quiet font-bold font-mono">
                      Konu {String(i + 1).padStart(2, '0')}
                    </span>
                    {kKilitli ? (
                      <Icon name="Lock" size={15} className="text-ink-quiet" />
                    ) : kTamam ? (
                      <TamamRozeti size={16} />
                    ) : kBaslandi ? (
                      <Icon name="CircleDashed" size={16} className="text-brand dark:text-brand-mute" />
                    ) : (
                      <Icon name="Circle" size={16} className="text-ink-quiet" />
                    )}
                  </div>
                  <h3
                    className={`font-display text-lg font-bold tracking-tight mb-1.5 transition ${
 kKilitli
 ? 'text-ink-mute'
 : 'group-hover:text-brand dark:group-hover:text-brand-mute'
 }`}
                  >
                    {k.ad}
                  </h3>
                  {k.aciklama && (
                    <p className="text-xs text-ink-mute leading-relaxed font-medium line-clamp-2 mb-3">
                      {k.aciklama}
                    </p>
                  )}
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <div className="flex-1 h-1.5 bg-surface-2 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${kTamam ? 'bg-brand-deep dark:bg-brand' : 'bg-brand-deep'}`}
                        style={{ width: `${kYuzde}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-ink-mute font-bold tabular-nums whitespace-nowrap">
                      {kCozulen}/{kSoru}
                    </span>
                  </div>
                  {kKilitli ? (
                    <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold flex items-center gap-1.5">
                      <Icon name="Lock" size={10} />
                      Önceki konu bitince açılır
                    </div>
                  ) : !kIcerikVar ? (
                    <div className="mt-2 text-[10px] tracking-[0.2em] uppercase text-premium-deep font-bold">
                      Anlatım hazırlanıyor
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>
      )}

    </main>
  );
};
