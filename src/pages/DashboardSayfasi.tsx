import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Thiings } from '../components/Thiings';
import { TamamRozeti } from '../components/TamamRozeti';
import { useUniteler } from '../contexts/UnitelerContext';
import { ZORLUK_AD, ZORLUK_PUAN, ZORLUK_STIL } from '../data/sabitler';
import { bugununTarihi, gunAnahtari } from '../lib/format';
import { gununSorusu } from '../lib/gunun-sorusu';
import { konuTamamlandiMi } from '../lib/konu-kilit';
import { devamEtSorusu, enCokYanlisSoru } from '../lib/oneriler';
import type { Ilerleme, Istatistik, Konu, Unite } from '../types';

// Günlük hedef — şimdilik sabit, sonra kullanıcı ayarlanabilir hâle gelebilir
const GUNLUK_HEDEF = 1;

interface Props {
  ilerleme: Ilerleme;
  stat: Istatistik;
}

interface SiradakiAdres {
  href: string;
  baslik: string;
  altBaslik: string;
  yeni: boolean; // hiç çözülmemiş bir noktadan başlıyor
}

/**
 * Aktif (devam edilecek) işletme ve konu — ilk tamamlanmamış noktayı bulur.
 * Konu yapısı olmayan işletmelerde aktif konu null döner; o zaman ilk
 * çözülmemiş soruya yönlendirme yapılır.
 */
const aktifNoktaBul = (
  uniteler: Unite[],
  ilerleme: Ilerleme,
): { unite: Unite; konu: Konu | null } | null => {
  for (const u of uniteler) {
    if (u.konular && u.konular.length > 0) {
      const k = u.konular.find((kn) => !konuTamamlandiMi(kn, ilerleme));
      if (k) return { unite: u, konu: k };
    } else {
      const cozulmemis = u.sorular.find((s) => !ilerleme.cozulenler[s.id]);
      if (cozulmemis) return { unite: u, konu: null };
    }
  }
  return null;
};

export const DashboardSayfasi = ({ ilerleme, stat }: Props) => {
  const nav = useNavigate();
  const { uniteler, tumSorular } = useUniteler();

  const aktif = useMemo(() => aktifNoktaBul(uniteler, ilerleme), [uniteler, ilerleme]);
  const ilkCozulmemis = useMemo(() => devamEtSorusu(ilerleme, tumSorular), [ilerleme, tumSorular]);
  const enYanlis = useMemo(() => enCokYanlisSoru(ilerleme, tumSorular), [ilerleme, tumSorular]);
  const gununS = useMemo(() => gununSorusu(tumSorular, ilerleme), [tumSorular, ilerleme]);

  // "Devam Et" CTA için bir adres seç — konu varsa konuya, yoksa ilk soruya
  const siradaki: SiradakiAdres | null = useMemo(() => {
    if (aktif?.konu) {
      return {
        href: `/uniteler/${aktif.unite.id}/${aktif.konu.id}`,
        baslik: aktif.konu.ad,
        altBaslik: aktif.unite.ad,
        yeni: stat.cozulenSayi === 0,
      };
    }
    if (aktif && !aktif.konu && ilkCozulmemis) {
      return {
        href: `/problemler/${ilkCozulmemis.id}`,
        baslik: ilkCozulmemis.baslik,
        altBaslik: aktif.unite.ad,
        yeni: stat.cozulenSayi === 0,
      };
    }
    if (ilkCozulmemis) {
      return {
        href: `/problemler/${ilkCozulmemis.id}`,
        baslik: ilkCozulmemis.baslik,
        altBaslik: ilkCozulmemis.uniteAd,
        yeni: stat.cozulenSayi === 0,
      };
    }
    return null;
  }, [aktif, ilkCozulmemis, stat.cozulenSayi]);

  // Son 30 gün ısı haritası
  const son30Gun = useMemo(() => {
    const bugun = new Date();
    const gunler: { tarih: string; sayi: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(bugun.getTime() - i * 86400000);
      const k = gunAnahtari(d);
      gunler.push({ tarih: k, sayi: ilerleme.aktiviteTarihleri[k] || 0 });
    }
    return gunler;
  }, [ilerleme.aktiviteTarihleri]);
  const maxAkt = Math.max(1, ...son30Gun.map((g) => g.sayi));
  const aktifGunSayisi = son30Gun.filter((g) => g.sayi > 0).length;

  // "Bugün" kartı — günlük hedef + streak vitrini
  const bugun = bugununTarihi();
  const bugunCozulen = ilerleme.aktiviteTarihleri[bugun] || 0;
  const hedefYuzde = Math.min(100, Math.round((bugunCozulen / GUNLUK_HEDEF) * 100));
  const hedefTamam = bugunCozulen >= GUNLUK_HEDEF;
  const streakRiski = ilerleme.streak > 0 && bugunCozulen === 0;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
      {/* Hero — selamlama + sol: CTA + statlar / sağ: Bugün kartı */}
      <section className="mb-10">
        <h1 className="font-display text-3xl sm:text-4xl tracking-tight font-bold leading-tight mb-5">
          Hoş geldin, {ilerleme.kullaniciAdi}.
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 lg:gap-6">
          {/* Sol kolon: Devam Et CTA + statlar */}
          <div className="min-w-0 space-y-5">
            {siradaki ? (
              <button
                onClick={() => nav(siradaki.href)}
                className="w-full group text-left bg-surface border border-line hover:border-brand-deep rounded-2xl p-5 sm:p-6 transition active:scale-[0.99] shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4 sm:gap-5">
                  <div className="flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-brand-soft border border-brand-soft flex items-center justify-center">
                    <Icon
                      name="Zap"
                      size={20}
                      className="text-brand dark:text-brand-mute"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold mb-1">
                      {siradaki.altBaslik}
                    </div>
                    <div className="font-display text-xl sm:text-2xl font-bold tracking-tight text-ink leading-tight truncate">
                      {siradaki.baslik}
                    </div>
                    <div className="text-[12.5px] text-ink-mute font-medium mt-1">
                      {siradaki.yeni ? 'Çalışmaya başla' : 'Kaldığın yerden devam et'}
                    </div>
                  </div>
                  <div className="flex-shrink-0 hidden sm:flex items-center gap-2 text-ink-quiet group-hover:text-brand dark:group-hover:text-brand-mute transition">
                    <span className="text-[11px] tracking-[0.18em] uppercase font-bold">
                      Devam Et
                    </span>
                    <Icon name="ArrowRight" size={18} />
                  </div>
                </div>
              </button>
            ) : (
              <div className="w-full bg-brand-soft border border-brand-soft rounded-2xl p-6 text-center">
                <Icon
                  name="Trophy"
                  size={28}
                  className="mx-auto mb-2 text-brand dark:text-brand-mute"
                />
                <div className="font-display text-lg font-bold text-brand-deep dark:text-bg-tint mb-1">
                  Tüm işletmeleri tamamladın
                </div>
                <p className="text-[13px] text-brand-deep/80 dark:text-brand-soft/80">
                  Pratik için bir soruyu tekrar çözmeye ne dersin?
                </p>
              </div>
            )}

            {/* Hızlı istatistikler */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <Stat ikon="ListChecks" deger={`${stat.cozulenSayi}`} etiket="Çözülen" />
              <Stat ikon="Star" deger={`${ilerleme.puan}`} etiket="Puan" />
              <Stat
                ikon="Award"
                deger={`${Object.keys(ilerleme.kazanilanRozetler).length}`}
                etiket="Rozet"
              />
            </div>
          </div>

          {/* Sağ kolon: Bugün kartı */}
          <aside
            className={`rounded-2xl border p-5 flex flex-col gap-4 ${
 streakRiski
 ? 'bg-premium-soft border-premium-soft dark:border-premium-deep/40'
 : hedefTamam
 ? 'bg-brand-soft border-brand-soft'
 : 'bg-surface border-line'
 }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-mute">
                Bugün
              </span>
              <div className="flex items-center gap-1.5">
                <Icon
                  name="Flame"
                  size={14}
                  className={
                    ilerleme.streak > 0
                      ? 'text-premium'
                      : 'text-ink-quiet'
                  }
                />
                <span
                  className={`font-mono text-[13px] font-bold tabular-nums ${
 ilerleme.streak > 0
 ? 'text-premium-deep dark:text-premium-soft'
 : 'text-ink-quiet'
 }`}
                >
                  {ilerleme.streak} gün
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-baseline gap-2 mb-1.5">
                <span className="font-display text-3xl font-bold tabular-nums leading-none">
                  {bugunCozulen}
                </span>
                <span className="text-[12px] text-ink-mute font-bold">
                  / {GUNLUK_HEDEF} hedef
                </span>
              </div>
              <div className="h-2 bg-surface-2 rounded overflow-hidden">
                <div
                  className={`h-full transition-all ${
 hedefTamam
 ? 'bg-brand-deep dark:bg-brand'
 : streakRiski
 ? 'bg-premium dark:bg-premium'
 : 'bg-brand-deep'
 }`}
                  style={{ width: `${hedefYuzde}%` }}
                />
              </div>
            </div>

            <div className="text-[12.5px] leading-relaxed font-medium">
              {hedefTamam ? (
                <span className="inline-flex items-center gap-1.5 text-brand-deep dark:text-brand-soft font-bold">
                  <TamamRozeti size={14} />
                  Bugünkü hedefe ulaştın.
                </span>
              ) : streakRiski ? (
                <span className="text-premium-deep dark:text-premium-soft">
                  <span className="font-bold">Streak'in tehlikede.</span> 1 soru çözünce
                  serin koruma altına girer.
                </span>
              ) : ilerleme.streak === 0 ? (
                <span className="text-ink-soft">
                  Bir soru çöz, streak başlasın. Her gün 1 soru yeter.
                </span>
              ) : (
                <span className="text-ink-soft">
                  Hedefi tamamla, streak sayacın bir gün daha çiziği.
                </span>
              )}
            </div>
          </aside>
        </div>
      </section>

      {/* Asimetrik bento: sol 1fr (Günün Sorusu üst + Tekrar Et alt) | sağ 2fr (Aktivite Isı geniş) */}
      <section className="mb-10 grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-4">
        {/* Sol: Günün Sorusu + Tekrar Et üst üste */}
        <div className="grid grid-rows-1 sm:grid-rows-2 gap-4 sm:grid-cols-2 lg:grid-cols-1">
          {gununS && (
            <button
              onClick={() => nav(`/problemler/${gununS.id}`)}
              className="text-left bg-surface border border-line hover:border-ink rounded-2xl p-5 transition active:scale-[0.99] group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon
                    name="Sparkles"
                    size={14}
                    className="text-premium"
                  />
                  <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-mute">
                    Günün Sorusu
                  </span>
                </div>
                {ilerleme.cozulenler[gununS.id] && <TamamRozeti size={14} />}
              </div>
              <h3 className="font-display text-base font-bold tracking-tight mb-1 line-clamp-2 group-hover:text-brand dark:group-hover:text-brand-mute transition">
                {gununS.baslik}
              </h3>
              <div className="text-[11px] text-ink-mute font-semibold mb-2 truncate">
                {gununS.uniteAd}
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-[10px] tracking-[0.2em] uppercase font-bold ${ZORLUK_STIL[gununS.zorluk]}`}
                >
                  {ZORLUK_AD[gununS.zorluk]}
                </span>
                <span className="font-mono text-[10px] text-ink-quiet font-bold">
                  {ZORLUK_PUAN[gununS.zorluk]}p
                </span>
              </div>
            </button>
          )}

          {enYanlis ? (
            <button
              onClick={() => nav(`/problemler/${enYanlis.id}`)}
              className="text-left bg-surface border border-line hover:border-ink rounded-2xl p-5 transition active:scale-[0.99] group"
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  name="RotateCcw"
                  size={14}
                  className="text-danger dark:text-danger"
                />
                <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-mute">
                  Tekrar Et
                </span>
              </div>
              <h3 className="font-display text-base font-bold tracking-tight mb-1 line-clamp-2 group-hover:text-brand dark:group-hover:text-brand-mute transition">
                {enYanlis.baslik}
              </h3>
              <div className="text-[11px] text-ink-mute font-semibold mb-2 truncate">
                {enYanlis.uniteAd}
              </div>
              <div className="text-[11px] text-danger dark:text-danger font-semibold">
                {ilerleme.yanlislar[enYanlis.id]} kez yanlış yapıldı
              </div>
            </button>
          ) : (
            <div className="bg-surface border border-dashed border-line rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Icon
                  name="RotateCcw"
                  size={14}
                  className="text-ink-quiet"
                />
                <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-quiet">
                  Tekrar Et
                </span>
              </div>
              <p className="text-[12.5px] text-ink-mute leading-relaxed">
                Henüz yanlış yapılan soru yok. Pekiştirme listesi burada birikir.
              </p>
            </div>
          )}
        </div>

        {/* Sağ: Aktivite ısı geniş — 2fr alanı kaplar */}
        <div className="bg-surface border border-line rounded-2xl p-5 sm:p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Icon
                name="Calendar"
                size={14}
                className="text-brand dark:text-brand-mute"
              />
              <span className="text-[10px] tracking-[0.22em] uppercase font-bold text-ink-mute">
                Son 30 Gün
              </span>
            </div>
            <span className="text-[11px] text-ink-mute font-bold tabular-nums">
              {aktifGunSayisi} gün aktif
            </span>
          </div>
          <div className="flex-1 flex items-center">
            <div className="grid grid-cols-[repeat(30,minmax(0,1fr))] gap-[3px] w-full">
              {son30Gun.map((g, i) => {
                const yogunluk =
                  g.sayi === 0 ? 0 : Math.min(4, Math.ceil((g.sayi / maxAkt) * 4));
                const opacity = [0.08, 0.3, 0.55, 0.8, 1][yogunluk];
                return (
                  <div
                    key={i}
                    title={`${g.tarih}: ${g.sayi} soru`}
                    className="aspect-square bg-brand-deep rounded-[3px]"
                    style={{ opacity }}
                  />
                );
              })}
            </div>
          </div>
          <div className="flex justify-between mt-3 text-[10px] text-ink-quiet font-semibold">
            <span>30 gün önce</span>
            <span>Bugün</span>
          </div>
        </div>
      </section>

      {/* İşletmeler özet — aktif vurgulu + diğerleri kompakt divide-y liste */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-2xl font-bold tracking-tight">İşletmeler</h2>
            <span className="text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
              Tüm yol haritası
            </span>
          </div>
          <button
            onClick={() => nav('/uniteler')}
            className="text-[12px] text-ink-mute hover:text-ink font-bold inline-flex items-center gap-1 transition"
          >
            Hepsini gör
            <Icon name="ArrowRight" size={11} />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-4">
          {/* Aktif işletme — vurgulu büyük kart */}
          {aktif ? (
            (() => {
              const u = aktif.unite;
              const toplam = u.sorular.length;
              const cozulen = u.sorular.filter((s) => ilerleme.cozulenler[s.id]).length;
              const yuzde = toplam > 0 ? Math.round((cozulen / toplam) * 100) : 0;
              const aktifKonuAdi = aktif.konu?.ad;
              return (
                <button
                  onClick={() => nav(`/uniteler/${u.id}`)}
                  className="text-left bg-brand-soft/50 border-2 border-brand-soft rounded-2xl p-5 transition active:scale-[0.99] hover:border-brand-deep dark:hover:border-brand group"
                >
                  <div className="flex items-center gap-1.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-deep animate-pulse" />
                    <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-brand-deep dark:text-brand-mute">
                      Aktif İşletme
                    </span>
                  </div>
                  <div className="flex items-start gap-4">
                    <Thiings name={u.thiingsIcon} size={56} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl sm:text-2xl font-bold tracking-tight leading-tight group-hover:text-brand dark:group-hover:text-brand-mute transition">
                        {u.ad}
                      </h3>
                      {aktifKonuAdi && (
                        <div className="text-[12.5px] text-brand-deep/80 dark:text-brand-mute/90 font-semibold mt-1">
                          Sıradaki konu · {aktifKonuAdi}
                        </div>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        <div className="flex-1 h-1.5 bg-brand-soft rounded overflow-hidden">
                          <div
                            className="h-full bg-brand-deep transition-all"
                            style={{ width: `${yuzde}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-brand-deep dark:text-brand-soft font-bold tabular-nums whitespace-nowrap">
                          {cozulen}/{toplam}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })()
          ) : (
            <div className="bg-surface border border-dashed border-line-strong rounded-2xl p-5 flex items-center justify-center text-center">
              <div>
                <Icon
                  name="Trophy"
                  size={24}
                  className="mx-auto mb-2 text-ink-quiet"
                />
                <p className="text-[13px] text-ink-mute font-medium">
                  Tüm işletmeler tamam.
                </p>
              </div>
            </div>
          )}

          {/* Diğer işletmeler — divide-y kompakt liste */}
          <div className="border border-line rounded-2xl bg-surface overflow-hidden">
            <ul className="divide-y divide-stone-200">
              {uniteler
                .filter((u) => !aktif || u.id !== aktif.unite.id)
                .map((u) => {
                  const toplam = u.sorular.length;
                  const cozulen = u.sorular.filter((s) => ilerleme.cozulenler[s.id]).length;
                  const yuzde = toplam > 0 ? Math.round((cozulen / toplam) * 100) : 0;
                  const tamam = toplam > 0 && cozulen === toplam;
                  const baslandi = cozulen > 0 && !tamam;
                  return (
                    <li key={u.id}>
                      <button
                        onClick={() => nav(`/uniteler/${u.id}`)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-bg-tint transition group"
                      >
                        <Thiings name={u.thiingsIcon} size={28} />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-display text-[13px] font-bold tracking-tight leading-tight truncate group-hover:text-brand dark:group-hover:text-brand-mute transition">
                            {u.ad}
                          </h3>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-surface-2 rounded overflow-hidden max-w-[180px]">
                              <div
                                className={`h-full transition-all ${tamam ? 'bg-brand-deep dark:bg-brand' : 'bg-brand-deep'}`}
                                style={{ width: `${yuzde}%` }}
                              />
                            </div>
                            <span className="font-mono text-[10px] text-ink-quiet font-bold tabular-nums">
                              {cozulen}/{toplam}
                            </span>
                          </div>
                        </div>
                        <span className="flex-shrink-0">
                          {tamam ? (
                            <TamamRozeti size={14} />
                          ) : baslandi ? (
                            <Icon
                              name="CircleDashed"
                              size={14}
                              className="text-brand dark:text-brand-mute"
                            />
                          ) : (
                            <Icon
                              name="Circle"
                              size={14}
                              className="text-ink-quiet"
                            />
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
};

const Stat = ({ ikon, deger, etiket }: { ikon: string; deger: string; etiket: string }) => (
  <div className="bg-surface border border-line rounded-xl p-3 sm:p-4">
    <div className="flex items-center gap-1.5 mb-1.5">
      <Icon
        name={ikon}
        size={12}
        className="text-ink-mute"
      />
      <span className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute">
        {etiket}
      </span>
    </div>
    <div className="font-display text-xl sm:text-2xl font-bold tracking-tight tabular-nums">
      {deger}
    </div>
  </div>
);
