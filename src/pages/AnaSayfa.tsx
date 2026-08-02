import { useMemo, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { Icon } from '../components/Icon';
import { SeoMeta } from '../components/SeoMeta';
import { Thiings } from '../components/Thiings';
import { OpenBookHero } from '../components/OpenBookHero';
import { SlideInWords } from '../components/SlideInWords';
import { useAuth } from '../contexts/AuthContext';
import { useUniteler } from '../contexts/UnitelerContext';
import { gununSorusu } from '../lib/gunun-sorusu';
import { devamEtSorusu, enCokYanlisSoru } from '../lib/oneriler';
import { bugununTarihi } from '../lib/format';
import { ZORLUK_AD, ZORLUK_PUAN } from '../data/sabitler';
import type { Ilerleme, Istatistik, SoruWithUnite, Zorluk } from '../types';

/* ----------------------------------------------------------------------
   Yardımcılar
---------------------------------------------------------------------- */

const ZORLUK_RENK: Record<Zorluk, string> = {
  kolay: 'chip-success',
  orta: 'chip-premium',
  zor: 'chip-danger',
};

const ZorlukChip = ({ zorluk }: { zorluk: Zorluk }) => (
  <span className={`chip ${ZORLUK_RENK[zorluk]}`}>
    {ZORLUK_AD[zorluk]} · {ZORLUK_PUAN[zorluk]}p
  </span>
);

/* ----------------------------------------------------------------------
   Ana giriş
---------------------------------------------------------------------- */

interface Props {
  ilerleme: Ilerleme;
  stat: Istatistik;
}

export const AnaSayfa = ({ ilerleme, stat }: Props) => {
  const { user, yukleniyor } = useAuth();

  if (yukleniyor) {
    return (
      <main className="max-w-[1240px] mx-auto px-5 py-32 flex items-center justify-center">
        <Icon name="Loader2" size={20} className="animate-spin text-ink-mute" />
      </main>
    );
  }

  if (user) return <KullaniciPaneli ilerleme={ilerleme} stat={stat} />;
  return <AnonimAnaSayfa />;
};

/* ----------------------------------------------------------------------
   Kullanıcı paneli
---------------------------------------------------------------------- */

const KullaniciPaneli = ({ ilerleme, stat }: Props) => {
  const nav = useNavigate();
  const { uniteler, tumSorular } = useUniteler();
  const gununSoru = useMemo(() => gununSorusu(tumSorular, ilerleme), [tumSorular, ilerleme]);
  const bugun = bugununTarihi();
  const gununCozulduMu = gununSoru ? ilerleme.cozulenler[gununSoru.id]?.tarih === bugun : false;
  const devamSoru = useMemo(() => devamEtSorusu(ilerleme, tumSorular), [ilerleme, tumSorular]);
  const yanlisSoru = useMemo(() => enCokYanlisSoru(ilerleme, tumSorular), [ilerleme, tumSorular]);

  // Karşılama: önce gerçek ad (Onboarding'de toplandı), yoksa kullanıcı adı, yoksa "Öğrenci"
  const ad = ilerleme.ad?.trim() || ilerleme.kullaniciAdi || 'Öğrenci';

  const aktifUnite = useMemo(() => {
    if (!devamSoru) return null;
    const u = uniteler.find((x) => x.id === devamSoru.uniteId);
    if (!u) return null;
    const cozulen = u.sorular.filter((s) => ilerleme.cozulenler[s.id]).length;
    return { unite: u, cozulen, toplam: u.sorular.length };
  }, [devamSoru, ilerleme.cozulenler, uniteler]);

  const bugunCozulen = useMemo(
    () => ilerleme.aktiviteTarihleri[bugun] || 0,
    [ilerleme.aktiviteTarihleri, bugun],
  );
  const gunlukHedef = 5;
  const hedefYuzde = Math.min(100, (bugunCozulen / gunlukHedef) * 100);
  const hedefTamam = bugunCozulen >= gunlukHedef;

  const yanlisListe = useMemo(
    () =>
      Object.entries(ilerleme.yanlislar)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([id, sayi]) => {
          const s = tumSorular.find((x) => x.id === id);
          return s ? { soru: s, sayi } : null;
        })
        .filter((x): x is { soru: SoruWithUnite; sayi: number } => x !== null),
    [ilerleme.yanlislar, tumSorular],
  );

  const henuzCozulmemis = stat.cozulenSayi === 0;
  const cozulenYuzde = stat.toplamSoru > 0 ? Math.round((stat.cozulenSayi / stat.toplamSoru) * 100) : 0;

  return (
    <main className="max-w-[1240px] mx-auto px-5 sm:px-8 py-10">
      <SeoMeta
        title="MuhasebeAkademi — Muhasebe ve Yevmiye Kaydı Pratik Platformu"
        description="Türkiye'deki muhasebe öğrencileri için interaktif yevmiye kaydı pratik platformu. Senaryolu sorular, gerçek belgeler, anında geri bildirim. Tek Düzen Hesap Planı tabanlı."
        canonical="/"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'MuhasebeAkademi',
          url: 'https://muhasebeakademi.com',
          inLanguage: 'tr-TR',
        }}
      />
      {/* Üst bar — selamlama + tarih */}
      <section className="mb-8 rise flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-[28px] sm:text-[34px] font-bold tracking-tight text-ink leading-tight">
            Merhaba, {ad}
          </h1>
          <p className="text-[14.5px] text-ink-soft mt-1">
            {henuzCozulmemis
              ? 'Hadi ilk soruyu çözelim. Otuz saniye yetiyor.'
              : `${stat.cozulenSayi}/${stat.toplamSoru} soru çözdün — bugün ${bugunCozulen}/${gunlukHedef}.`}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="chip">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long' })}</span>
          {ilerleme.streak > 0 && (
            <span className="chip chip-mint">
              <Icon name="Flame" size={11} />
              {ilerleme.streak} günlük seri
            </span>
          )}
        </div>
      </section>

      {/* Üst grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4 rise-2">
        <div className="md:col-span-8">
          {aktifUnite && devamSoru ? (
            <button
              onClick={() => nav(`/problemler/${devamSoru.id}`)}
              className="w-full text-left surface-lift group p-7 sm:p-8 h-full flex flex-col min-h-[280px]"
            >
              <div className="flex items-center gap-2 mb-5">
                <span className="chip chip-primary">
                  {henuzCozulmemis ? 'Başlat' : 'Devam et'}
                </span>
                <span className="chip">{aktifUnite.unite.ad}</span>
                <ZorlukChip zorluk={devamSoru.zorluk} />
              </div>
              <div className="flex items-start justify-between gap-6 mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="font-display text-[26px] sm:text-[34px] font-bold leading-[1.05] tracking-tight text-ink mb-3">
                    {devamSoru.baslik}
                  </h2>
                  <p className="text-[15px] text-ink-soft leading-relaxed line-clamp-3 max-w-2xl">
                    {devamSoru.senaryo}
                  </p>
                </div>
                <Thiings name={aktifUnite.unite.thiingsIcon} size={56} />
              </div>
              <div className="hairline mb-4 mt-auto" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-[13px] text-ink-soft">
                  <div className="flex items-center gap-2">
                    <span className="font-mono tnum text-ink font-semibold">
                      {aktifUnite.cozulen}/{aktifUnite.toplam}
                    </span>
                    <span className="text-ink-mute">çözüldü</span>
                  </div>
                  <span className="text-ink-quiet">·</span>
                  <div className="w-32 h-1 bg-line rounded-full relative">
                    <div
                      className="absolute inset-y-0 left-0 bg-ink rounded-full"
                      style={{ width: `${(aktifUnite.cozulen / aktifUnite.toplam) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-[13px] text-ink font-medium group-hover:text-accent-deep flex items-center gap-1.5 transition">
                  Çözmeye başla
                  <Icon name="ArrowRight" size={13} />
                </span>
              </div>
            </button>
          ) : (
            <div className="surface p-12 text-center h-full flex flex-col items-center justify-center min-h-[280px]">
              <Thiings name="trophy" size={56} />
              <h2 className="font-display text-[24px] font-bold tracking-tight mt-5 mb-2 text-ink">
                Tüm soruları çözdün.
              </h2>
              <p className="text-[14.5px] text-ink-soft mb-6 max-w-md">
                Yeni soruları beklerken yanlışlarını tekrar edebilirsin.
              </p>
              <button onClick={() => nav('/problemler')} className="btn btn-primary">
                Tüm Sorular
              </button>
            </div>
          )}
        </div>

        {/* Hedef kart */}
        <div className="md:col-span-4">
          <div className="surface-lift p-6 h-full flex flex-col">
            <div className="flex items-baseline justify-between mb-4">
              <span className="eyebrow">Bugünkü hedef</span>
              {hedefTamam && <span className="chip chip-success">Tamam</span>}
            </div>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display font-bold text-[64px] tnum tracking-tighter text-ink leading-none">
                {bugunCozulen}
              </span>
              <span className="font-mono tnum text-[20px] text-ink-quiet font-medium">/{gunlukHedef}</span>
            </div>
            <p className="text-[13.5px] text-ink-soft mb-5">
              {hedefTamam
                ? 'Hedefi geçtin. Bonus puanlar bekliyor.'
                : `${gunlukHedef - bugunCozulen} soru kaldı.`}
            </p>
            <div className="h-1.5 bg-line rounded-full relative mb-5 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${hedefYuzde}%`,
                  background: hedefTamam ? 'var(--success)' : 'var(--ink)',
                }}
              />
            </div>
            <div className="hairline mb-4" />
            <dl className="space-y-2.5 text-[13px]">
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-mute">Seri</dt>
                <dd className="font-mono tnum font-semibold text-ink">{ilerleme.streak} gün</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-mute">Toplam puan</dt>
                <dd className="font-mono tnum font-semibold text-ink">{ilerleme.puan}</dd>
              </div>
              <div className="flex items-baseline justify-between">
                <dt className="text-ink-mute">Çözülen</dt>
                <dd className="font-mono tnum font-semibold text-ink">
                  {stat.cozulenSayi}/{stat.toplamSoru}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Yan görevler */}
      {(gununSoru || yanlisSoru) && (
        <>
          <div className="flex items-baseline justify-between mb-4 mt-10 rise-3">
            <h2 className="font-display text-[20px] font-bold tracking-tight text-ink">
              Önerilen sorular
            </h2>
            <button onClick={() => nav('/problemler')} className="btn-link">
              Tüm sorular →
            </button>
          </div>
          <div className={`grid grid-cols-1 ${gununSoru && yanlisSoru ? 'md:grid-cols-2' : ''} gap-4 mb-10`}>
            {gununSoru && (
              <button
                onClick={() => nav(`/problemler/${gununSoru.id}`)}
                className="surface-lift p-6 text-left group"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip chip-premium">
                      <Icon name="Calendar" size={10} />
                      Günün Sorusu
                    </span>
                    {gununCozulduMu && <span className="chip chip-success">Çözüldü</span>}
                  </div>
                  <Thiings name={gununSoru.uniteIcon} size={36} />
                </div>
                <h3 className="font-display text-[20px] font-bold leading-tight tracking-tight text-ink mb-2 group-hover:text-accent-deep transition">
                  {gununSoru.baslik}
                </h3>
                <p className="text-[13.5px] text-ink-soft line-clamp-2 mb-4 leading-relaxed">
                  {gununSoru.senaryo}
                </p>
                <div className="hairline mb-3" />
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-mute">{gununSoru.uniteAd}</span>
                  <span className="text-ink font-medium flex items-center gap-1 group-hover:text-accent-deep transition">
                    {gununCozulduMu ? 'Tekrar' : 'Çöz'}
                    <Icon name="ArrowRight" size={12} />
                  </span>
                </div>
              </button>
            )}
            {yanlisSoru && (
              <button
                onClick={() => nav(`/problemler/${yanlisSoru.id}`)}
                className="surface-lift p-6 text-left group"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="chip chip-danger">
                      <Icon name="RotateCcw" size={10} />
                      Tekrarla
                    </span>
                    <span className="chip">× {ilerleme.yanlislar[yanlisSoru.id]} yanlış</span>
                  </div>
                  <Thiings name={yanlisSoru.uniteIcon} size={36} />
                </div>
                <h3 className="font-display text-[20px] font-bold leading-tight tracking-tight text-ink mb-2 group-hover:text-accent-deep transition">
                  {yanlisSoru.baslik}
                </h3>
                <p className="text-[13.5px] text-ink-soft line-clamp-2 mb-4 leading-relaxed">
                  {yanlisSoru.senaryo}
                </p>
                <div className="hairline mb-3" />
                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ink-mute">{yanlisSoru.uniteAd}</span>
                  <span className="text-ink font-medium flex items-center gap-1 group-hover:text-accent-deep transition">
                    Yeniden
                    <Icon name="ArrowRight" size={12} />
                  </span>
                </div>
              </button>
            )}
          </div>
        </>
      )}

      {/* İstatistik tablosu */}
      <div className="surface mb-10 rise-4">
        <div className="px-6 sm:px-8 py-4 border-b border-line">
          <h2 className="font-display text-[18px] font-bold text-ink tracking-tight">İstatistikler</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-line">
          {[
            { label: 'Genel ilerleme', sayi: cozulenYuzde, suffix: '%', alt: `${stat.cozulenSayi}/${stat.toplamSoru} soru` },
            { label: 'Bugün', sayi: bugunCozulen, suffix: '', alt: 'çözülen soru' },
            { label: 'Seri', sayi: ilerleme.streak, suffix: '', alt: 'gün üst üste' },
            { label: 'Puan', sayi: ilerleme.puan, suffix: '', alt: 'toplam' },
          ].map((s, i) => (
            <div key={i} className="px-6 py-6">
              <div className="text-[11px] text-ink-mute uppercase tracking-wider font-mono mb-2">{s.label}</div>
              <div className="font-display font-bold text-[36px] sm:text-[44px] text-ink tnum leading-none mb-1.5 tracking-tight">
                {s.sayi}{s.suffix && <span className="text-[20px] text-ink-quiet font-medium ml-0.5">{s.suffix}</span>}
              </div>
              <div className="text-[12px] text-ink-mute">{s.alt}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Sıkıntılı sorular */}
      {yanlisListe.length > 1 && (
        <div className="surface mb-10 rise-5">
          <div className="px-6 sm:px-8 py-4 border-b border-line flex items-baseline justify-between">
            <h2 className="font-display text-[18px] font-bold text-ink tracking-tight">
              Tekrar etmen gereken sorular
            </h2>
            <button onClick={() => nav('/problemler')} className="btn-link">
              Hepsi →
            </button>
          </div>
          <div className="divide-y divide-line">
            {yanlisListe.map(({ soru, sayi }, i) => (
              <button
                key={soru.id}
                onClick={() => nav(`/problemler/${soru.id}`)}
                className="w-full flex items-center gap-4 px-6 sm:px-8 py-4 hover:bg-surface-2 transition text-left group"
              >
                <span className="font-mono tnum text-[12px] text-ink-quiet w-5 text-right">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <Thiings name={soru.uniteIcon} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="font-display font-semibold text-[15.5px] tracking-tight truncate text-ink group-hover:text-accent-deep transition">
                    {soru.baslik}
                  </div>
                  <div className="text-[12px] text-ink-mute mt-0.5">
                    {soru.uniteAd}
                  </div>
                </div>
                <span className="chip chip-danger">× {sayi}</span>
                <Icon name="ChevronRight" size={14} className="text-ink-quiet group-hover:text-ink transition" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Hızlı navigasyon */}
      <div className="surface rise-5">
        <div className="px-6 sm:px-8 py-4 border-b border-line">
          <h2 className="font-display text-[18px] font-bold text-ink tracking-tight">Sayfalar</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line">
          {[
            { yol: '/isletmeler', baslik: 'İşletmeler', alt: 'Konu konu pratik', icon: 'LayoutGrid' },
            { yol: '/problemler', baslik: 'Tüm Sorular', alt: 'Filtrele, ara', icon: 'ListChecks' },
            { yol: '/profil', baslik: 'Profil', alt: 'Rozet · İstatistik', icon: 'User' },
          ].map((l) => (
            <button
              key={l.yol}
              onClick={() => nav(l.yol)}
              className="text-left p-6 hover:bg-surface-2 transition group flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-ink-soft group-hover:text-ink group-hover:border-line-strong transition">
                  <Icon name={l.icon} size={16} />
                </div>
                <div>
                  <div className="font-display text-[16px] font-semibold tracking-tight text-ink group-hover:text-accent-deep transition">
                    {l.baslik}
                  </div>
                  <div className="text-[12.5px] text-ink-mute mt-0.5">{l.alt}</div>
                </div>
              </div>
              <Icon name="ArrowRight" size={14} className="text-ink-quiet group-hover:text-ink group-hover:translate-x-0.5 transition" />
            </button>
          ))}
        </div>
      </div>
    </main>
  );
};

/* ----------------------------------------------------------------------
   Anonim ana sayfa — info-yoğun, gerçek belge
---------------------------------------------------------------------- */

/* Hero altı bölümler için sabit içerik */

const YETENEKLER = [
  {
    no: '01',
    baslik: 'Gerçek senaryolar',
    aciklama:
      'Fatura, makbuz, dekont. Olay, taraflar, tutar. Sınıfta görmediğin pratiği masan başında çöz.',
  },
  {
    no: '02',
    baslik: 'Konuyu uygulayarak pekiştir',
    aciklama:
      'Her işletmede teori + bol soru. Aynı kavramı farklı senaryolarda görerek kalıcı öğren.',
  },
  {
    no: '03',
    baslik: 'AI hata analizi',
    aciklama:
      'Yanlış cevabını satır satır açıklar. Hangi kodun neden hatalı olduğunu kavramsal anlatır.',
    rozet: 'Premium',
  },
  {
    no: '04',
    baslik: 'İş hayatına hazırlık',
    aciklama:
      'Stajda göreceğin yevmiye fişinin tam aynısı. Mezun olunca defter karşısında tereddüt etmeyesin.',
  },
];

interface SnippetSatir {
  kod?: string;
  ad?: string;
  borc?: string;
  alacak?: string;
  not?: string;
  tip?: 'satir' | 'baslik' | 'sonuc';
}

interface NasilAdim {
  no: string;
  baslik: string;
  aciklama: string;
  snippet: SnippetSatir[];
}

const NASIL_ADIMLAR: NasilAdim[] = [
  {
    no: 'I',
    baslik: 'Senaryoyu oku',
    aciklama: 'Gerçek bir fatura, makbuz ya da dekont. Olay, taraflar, tutar.',
    snippet: [
      { tip: 'baslik', not: '// Müşteriye 1.000 ₺ peşin satış' },
      { tip: 'baslik', not: '// KDV %20 dahil — 1.200 ₺ tahsilat' },
    ],
  },
  {
    no: 'II',
    baslik: 'Fişe kaydet',
    aciklama: 'TDHP hesap kodunu yaz, borç-alacak tarafına tutarı bırak.',
    snippet: [
      { tip: 'satir', kod: '100', ad: 'KASA', borc: '1.200' },
      { tip: 'satir', kod: '600', ad: 'YURT İÇİ SAT.', alacak: '1.000' },
      { tip: 'satir', kod: '391', ad: 'HESAP. KDV', alacak: '200' },
    ],
  },
  {
    no: 'III',
    baslik: 'Anında kontrol',
    aciklama: 'Yanlış satır kırmızı, dengeli kayıt yeşil. Saniyeler içinde puan.',
    snippet: [
      { tip: 'sonuc', not: '✓ Borç-Alacak dengeli' },
      { tip: 'sonuc', not: '+10p kazanıldı' },
    ],
  },
];

const MARQUEE_KODLAR = [
  'Peşin Mal Satışı',
  'Vadeli Tahsilat',
  'Senet Tahsili',
  'Çek İadesi',
  'KDV Mahsubu',
  'Banka Havalesi',
  'Kasa Tediyesi',
  'Faiz Tahakkuku',
  'Maaş Bordrosu',
  'SGK Ödemesi',
  'Stopaj Beyannamesi',
  'Reeskont',
  'Amortisman Ayırma',
  'Şüpheli Alacak',
  'Stok Sayım Farkı',
  'Kur Değerleme',
  'Kıdem Tazminatı',
  'Açılış Bilançosu',
  'Dönem Sonu Kapanış',
  'İskonto Hesabı',
  'Kredi Kartı Slipi',
  'Sevk İrsaliyesi',
  'Gider Pusulası',
  'Demirbaş Alımı',
  'İade Faturası',
  'Sigorta Gideri',
  'Kira Bordrosu',
  'Avans Tahsilatı',
  'Komisyon Gideri',
  'Kambiyo Senedi',
];

/* ----------------------------------------------------------------------
   Yardımcı bileşenler — Reveal + CountUp
---------------------------------------------------------------------- */
/* Görüntüye girince fade + slide-up — staggered children destekli */
interface RevealProps {
  children: ReactNode;
  delay?: number;
  className?: string;
  y?: number;
  as?: 'div' | 'section' | 'article' | 'span';
}
const Reveal = ({ children, delay = 0, className, y = 24, as = 'div' }: RevealProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const Tag = motion[as];
  return (
    <Tag
      ref={ref}
      initial={{ opacity: 0, y }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </Tag>
  );
};

const AnonimAnaSayfa = () => {
  const nav = useNavigate();

  return (
    <main>
      {/* ===========================================================
          HERO — Açık defter sayfası (cursor parallax + typewriter)
      =========================================================== */}
      <OpenBookHero
        onProblemler={() => nav('/problemler')}
        onGiris={() => nav('/giris')}
      />

      {/* ===========================================================
          § 01 · MANİFESTO — sol metin, sağ yevmiye fişi
      =========================================================== */}
      <section className="px-5 sm:px-8 py-20 sm:py-24 border-t border-line">
        <div className="max-w-[1240px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* SOL — başlık + alt metin */}
            <div>
              <p
                className="font-display-italic text-ink leading-[1.05] tracking-tight"
                style={{ fontSize: 'clamp(36px, 4.8vw, 64px)' }}
              >
                <span className="block">
                  <SlideInWords stagger={0.07} delay={0.05}>
                    Teoride öğrendiğin
                  </SlideInWords>
                </span>
                <span className="block">
                  <SlideInWords stagger={0.07} delay={0.22}>
                    bilgileri
                  </SlideInWords>
                </span>
                <span className="block">
                  <SlideInWords
                    stagger={0.07}
                    delay={0.4}
                    highlightWords={[
                      { index: 0, color: 'var(--copper-deep)' },
                    ]}
                  >
                    pratikle birleştir.
                  </SlideInWords>
                </span>
              </p>
              <Reveal delay={0.55}>
                <p className="text-[15px] sm:text-[16px] text-ink-soft leading-relaxed mt-10 max-w-xl">
                  Stajda göreceğin senaryo, bugün masan başında. Çöz, takıl, yapay zekâ
                  açıklasın — sınıftan iş hayatına geçişin pürüzsüz olsun.
                </p>
              </Reveal>
            </div>

            {/* SAĞ — yevmiye fişi (paper-sheet) */}
            <Reveal delay={0.25} y={32}>
              <div className="paper-sheet p-7 sm:p-8 relative">
                {/* Üst etiket */}
                <div className="flex items-baseline justify-between mb-5 pb-4 border-b border-line">
                  <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                    Yevmiye Fişi · 042
                  </span>
                  <span className="font-mono text-[11px] tnum text-ink-mute">
                    26.04.2026
                  </span>
                </div>

                {/* Senaryo başlığı */}
                <h4 className="font-display text-[20px] sm:text-[22px] font-bold text-ink leading-snug mb-2">
                  Peşin Mal Satışı
                </h4>
                <p className="text-[12.5px] text-ink-soft leading-relaxed mb-6">
                  KDV dahil <span className="font-mono tnum text-ink">1.200,00 ₺</span>{' '}
                  tutarındaki satış nakit tahsil edildi.
                </p>

                {/* Yevmiye tablosu */}
                <table className="w-full text-[13px] mb-2">
                  <thead>
                    <tr className="border-b border-line">
                      <th className="text-left font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute font-bold py-2">
                        Hesap
                      </th>
                      <th className="text-right font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute font-bold py-2 w-20">
                        Borç
                      </th>
                      <th className="text-right font-mono text-[9.5px] tracking-[0.18em] uppercase text-ink-mute font-bold py-2 w-20">
                        Alacak
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-line/50">
                      <td className="py-2.5">
                        <span className="font-mono tnum text-ink-mute mr-2 text-[11.5px]">100</span>
                        <span className="text-ink">KASA</span>
                      </td>
                      <td className="py-2.5 text-right font-mono tnum text-ink">1.200,00</td>
                      <td className="py-2.5 text-right text-ink-quiet">—</td>
                    </tr>
                    <tr className="border-b border-line/50">
                      <td className="py-2.5">
                        <span className="font-mono tnum text-ink-mute mr-2 text-[11.5px]">600</span>
                        <span className="text-ink">YURT İÇİ SATIŞLAR</span>
                      </td>
                      <td className="py-2.5 text-right text-ink-quiet">—</td>
                      <td className="py-2.5 text-right font-mono tnum text-ink">1.000,00</td>
                    </tr>
                    <tr>
                      <td className="py-2.5">
                        <span className="font-mono tnum text-ink-mute mr-2 text-[11.5px]">391</span>
                        <span className="text-ink">HESAPLANAN KDV</span>
                      </td>
                      <td className="py-2.5 text-right text-ink-quiet">—</td>
                      <td className="py-2.5 text-right font-mono tnum text-ink">200,00</td>
                    </tr>
                  </tbody>
                </table>

                {/* Footer — doğrulama + puan */}
                <div className="flex items-center justify-between pt-4 mt-3 border-t border-line">
                  <div className="inline-flex items-center gap-2">
                    <Icon name="Check" size={12} className="text-success" />
                    <span className="font-mono text-[10.5px] tracking-[0.2em] uppercase text-success font-bold">
                      Doğrulandı
                    </span>
                  </div>
                  <span
                    className="font-mono text-[13px] tnum font-bold"
                    style={{ color: 'var(--copper-deep)' }}
                  >
                    +10p
                  </span>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===========================================================
          § 02 · YETENEKLER — 4 numbered kart
      =========================================================== */}
      <section className="px-5 sm:px-8 py-28 sm:py-36 border-t border-line">
        <div className="max-w-[1240px] mx-auto">
          <h2
            className="font-display font-bold text-ink leading-[1.05] tracking-tight max-w-[20ch] mb-14 sm:mb-20"
            style={{ fontSize: 'clamp(36px, 5.6vw, 76px)' }}
          >
            <SlideInWords
              stagger={0.07}
              delay={0.05}
              highlightWords={[
                {
                  index: 2,
                  color: 'var(--copper-deep)',
                  italic: true,
                  fontFamily: 'var(--font-display)',
                },
                {
                  index: 3,
                  color: 'var(--copper-deep)',
                  italic: true,
                  fontFamily: 'var(--font-display)',
                },
              ]}
            >
              Tek amacı: gerçek hayata hazırlamak.
            </SlideInWords>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-line">
            {YETENEKLER.map((y, i) => (
              <Reveal key={y.no} delay={0.05 + i * 0.08} y={24}>
                <article className="group bg-bg border-r border-b border-line p-7 sm:p-9 h-full flex flex-col relative overflow-hidden">
                  <div className="flex items-baseline justify-between mb-10 sm:mb-14">
                    <span className="font-mono text-[12.5px] tracking-[0.18em] tnum text-ink-mute font-bold">
                      {y.no}
                    </span>
                    {y.rozet && (
                      <span
                        className="font-mono text-[9.5px] tracking-[0.16em] uppercase font-bold"
                        style={{ color: 'var(--copper-deep)' }}
                      >
                        {y.rozet}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-ink text-[22px] sm:text-[24px] tracking-tight leading-tight mb-3">
                    {y.baslik}
                  </h3>
                  <p className="text-[13.5px] text-ink-soft leading-relaxed mb-7">
                    {y.aciklama}
                  </p>
                  {/* Hover line-reveal — alttan bakır çizgi soldan sağa */}
                  <div
                    className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-[700ms] ease-[cubic-bezier(.77,0,.175,1)]"
                    style={{ background: 'var(--copper-deep)' }}
                  />
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===========================================================
          § 03 · NASIL ÇALIŞIR — 3 adım numaralı
      =========================================================== */}
      <section className="px-5 sm:px-8 py-28 sm:py-36 border-t border-line">
        <div className="max-w-[1240px] mx-auto">
          <h2
            className="font-display font-bold text-ink leading-[0.95] tracking-tight max-w-[18ch] mb-16 sm:mb-20"
            style={{ fontSize: 'clamp(36px, 5.6vw, 76px)' }}
          >
            <SlideInWords
              stagger={0.07}
              delay={0.05}
              highlightWords={[
                { index: 2, color: 'var(--copper-deep)', italic: true, fontFamily: 'var(--font-display)' },
                { index: 3, color: 'var(--copper-deep)', italic: true, fontFamily: 'var(--font-display)' },
              ]}
            >
              Üç adım, üç saniye.
            </SlideInWords>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8 lg:gap-12">
            {NASIL_ADIMLAR.map((a, i) => (
              <Reveal key={a.no} delay={0.1 + i * 0.1} y={32}>
                <div className="border-t-2 border-ink/85 pt-6 flex flex-col h-full">
                  <div className="flex items-baseline gap-3 mb-4">
                    <span
                      className="font-display-italic text-copper-deep leading-none"
                      style={{ fontSize: 'clamp(48px, 5vw, 64px)' }}
                    >
                      {a.no}
                    </span>
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
                      Adım
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-ink text-[24px] sm:text-[28px] tracking-tight leading-tight mb-3">
                    {a.baslik}
                  </h3>
                  <p className="text-[14px] text-ink-soft leading-relaxed mb-6">
                    {a.aciklama}
                  </p>

                  {/* Yevmiye snippet — kod bloğu tarzı mini örnek */}
                  <div className="mt-auto bg-ink/[0.03] border border-line p-4 font-mono text-[12px] leading-relaxed">
                    {a.snippet.map((s, j) => {
                      if (s.tip === 'baslik') {
                        return (
                          <div
                            key={j}
                            className="text-ink-mute italic tracking-tight"
                          >
                            {s.not}
                          </div>
                        );
                      }
                      if (s.tip === 'sonuc') {
                        return (
                          <div
                            key={j}
                            className="text-ink font-bold tracking-tight"
                            style={{
                              color: j === 0 ? 'var(--success, #5d8a6f)' : 'var(--copper-deep)',
                            }}
                          >
                            {s.not}
                          </div>
                        );
                      }
                      return (
                        <div
                          key={j}
                          className="grid grid-cols-[40px_1fr_70px_70px] gap-2 tnum"
                        >
                          <span className="text-ink font-semibold">{s.kod}</span>
                          <span className="text-ink-soft truncate">{s.ad}</span>
                          <span className="text-right text-ink">{s.borc ?? ''}</span>
                          <span className="text-right text-ink">{s.alacak ?? ''}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===========================================================
          § 04 · HESAP PLANI MARQUEE — 268 hesabı tease eder
      =========================================================== */}
      <section className="border-y border-line py-8 sm:py-10 bg-ink overflow-hidden">
        <div
          className="relative w-full overflow-hidden"
          style={{
            maskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
            WebkitMaskImage:
              'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          }}
        >
          <div
            className="flex gap-12 whitespace-nowrap"
            style={{
              animation: 'mlMarquee 60s linear infinite',
              width: 'max-content',
            }}
          >
            {[...MARQUEE_KODLAR, ...MARQUEE_KODLAR, ...MARQUEE_KODLAR].map((k, i) => (
              <span
                key={i}
                className="font-mono text-[14px] sm:text-[16px] tracking-[0.12em] text-bg whitespace-nowrap inline-flex items-center gap-3"
              >
                <span className="w-1 h-1 rounded-full bg-copper-deep flex-shrink-0" />
                {k}
              </span>
            ))}
          </div>
        </div>
      </section>


      {/* ===========================================================
          KAPANIŞ — son seslenme, atmosferik
      =========================================================== */}
      <section className="relative px-5 sm:px-8 py-24 sm:py-32 border-t border-line overflow-hidden">
        {/* Hafif arka plan halkaları — hero'yu hatırlatma */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30">
          <div className="ring" style={{ width: 400, height: 400 }} />
          <div className="ring ring-inner" style={{ width: 600, height: 600, position: 'absolute' }} />
          <div className="ring" style={{ width: 800, height: 800, position: 'absolute' }} />
        </div>

        <div className="relative max-w-[860px] mx-auto text-center">
          <Reveal>
            <div className="inline-flex items-center gap-2 mb-6">
              <span className="live-dot" />
              <span className="font-mono text-[11.5px] uppercase tracking-[0.16em] text-ink-mute">
                Şu an aktif
              </span>
            </div>
          </Reveal>

          <h2 className="font-display text-[40px] sm:text-[60px] md:text-[76px] font-bold tracking-tight text-ink leading-[0.96] mb-6">
            <SlideInWords
              stagger={0.07}
              delay={0.05}
              highlightWords={[{ index: 2, color: 'var(--ink-soft)' }]}
            >
              Otuz saniyede başla.
            </SlideInWords>
          </h2>

          <Reveal delay={0.18}>
            <p className="text-[16px] sm:text-[18px] text-ink-soft max-w-xl mx-auto leading-relaxed mb-10">
              Üye olmadan da çalışabilirsin. İlerlemeni kaydetmek istersen
              kullanıcı adı + şifre yeter — bir saniye bile sürmüyor.
            </p>
          </Reveal>

          <Reveal delay={0.25}>
            <div className="flex flex-wrap gap-3 justify-center mb-8">
              <button onClick={() => nav('/giris')} className="btn btn-primary btn-lg">
                Hesap Oluştur
              </button>
              <button onClick={() => nav('/problemler')} className="btn btn-soft btn-lg">
                Önce Soruları Gör
              </button>
            </div>
          </Reveal>

          <Reveal delay={0.32}>
            <div className="inline-flex items-baseline gap-6 text-[12.5px] font-mono uppercase tracking-[0.14em] text-ink-mute">
              <span className="flex items-center gap-2">
                <Icon name="Check" size={11} className="text-success" />
                Ücretsiz başlangıç
              </span>
              <span className="flex items-center gap-2">
                <Icon name="Check" size={11} className="text-success" />
                Kart zorunlu değil
              </span>
              <span className="flex items-center gap-2">
                <Icon name="Check" size={11} className="text-success" />
                İlk 100'e Premium
              </span>
            </div>
          </Reveal>
        </div>
      </section>
    </main>
  );
};
