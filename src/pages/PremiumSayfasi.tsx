import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Thiings } from '../components/Thiings';
import { useAuth, useIsPremium } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { odemeBaslat, planlariYukle, type Plan } from '../lib/odeme';
import { indirimDogrula } from '../lib/indirim';

const KURUM_EMAIL = 'kurum@muhasebeakademi.com';

const UCRETSIZ_OZELLIKLER = [
  'Tüm soruları sınırsız çöz',
  '213 soru · 15 işletme',
  '272 hesap planı + 20 mali terim',
  'Puan, streak ve rozet sistemi',
  'Günde 3 AI sorgu hakkı',
];

const PREMIUM_OZELLIKLER = [
  'Sınırsız AI Muhasebe Asistanı',
  'AI Yanlış Analizi (satır satır)',
  'Hesap kodu otomatik tamamlama',
  'Adım adım çözüm anlatımı',
  'Sınav modu (yakında)',
  'PDF çözüm defteri (yakında)',
  'Detaylı ilerleme raporu (yakında)',
];

const SSS: { soru: string; cevap: string }[] = [
  {
    soru: 'Ücretsiz hesapla nereye kadar gidebilirim?',
    cevap:
      'Tüm soruları sınırsız çözebilir, işletmeleri tamamlayabilir, puan ve rozet kazanabilirsin. Premium sadece AI rehberliği ve ileri seviye araçları açar — ücretsiz tarafta hiçbir soru kilitli değil.',
  },
  {
    soru: 'Premium’u istediğim zaman iptal edebilir miyim?',
    cevap:
      'Evet. Profil > Premium ekranından iptal edebilirsin. İptal sonrası mevcut dönemin sonuna kadar Premium özellikler açık kalır, otomatik yenilenmez.',
  },
  {
    soru: 'Fatura kesiliyor mu?',
    cevap:
      'Evet, ödeme sonrası e-arşiv fatura email adresine gönderilir. Tutarlar KDV dahildir. Kurumsal müşteriler için e-fatura kesilebilir.',
  },
  {
    soru: 'İade alabilir miyim?',
    cevap:
      'İlk 7 gün koşulsuz iade hakkın var (Mesafeli Satış Sözleşmesi gereği). Bu süre içinde profil sayfasından iade talebi açabilirsin.',
  },
  {
    soru: 'Sınıfım/kurumum için toplu lisans nasıl alırım?',
    cevap: `Yukarıdan "Sınıf · Kurum" sekmesine geçip kişi sayını seç, anlık fiyat görünür. Teklif İste butonu ile ${KURUM_EMAIL} adresimize ön-doldurulmuş bir mail açılır, 1 iş günü içinde dönüş yaparız.`,
  },
  {
    soru: 'Hangi ödeme yöntemleri kabul ediliyor?',
    cevap:
      'iyzico altyapısı üzerinden tüm Türk bankalarının kredi/banka kartlarını kabul ediyoruz. Kart bilgileriniz MuhasebeAkademi’a iletilmez, doğrudan iyzico’da işlenir.',
  },
];

export const PremiumSayfasi = () => {
  const nav = useNavigate();
  const { user, premiumBitis, premiumYenile, yukleniyor } = useAuth();
  const isPremium = useIsPremium();
  const [yukleniyorAktivasyon, setYukleniyorAktivasyon] = useState(false);
  const [hata, setHata] = useState<string | null>(null);
  const [erkenKontenjanKalan, setErkenKontenjanKalan] = useState<number | null>(null);
  const [planlar, setPlanlar] = useState<Plan[]>([]);
  const [secilenPlan, setSecilenPlan] = useState<string | null>(null);
  const [acikSoru, setAcikSoru] = useState<number | null>(null);
  const [mod, setMod] = useState<'bireysel' | 'kurum'>('bireysel');
  const [donem, setDonem] = useState<'aylik' | 'yillik'>('yillik');
  // İndirim kodu (bireysel)
  const [indirimKodu, setIndirimKodu] = useState('');
  const [indirimYuzde, setIndirimYuzde] = useState(0);
  const [indirimMesaj, setIndirimMesaj] = useState<string | null>(null);
  const [indirimDoğrulanıyor, setIndirimDoğrulanıyor] = useState(false);
  const [indirimAcik, setIndirimAcik] = useState(false);

  useEffect(() => {
    if (!yukleniyor && !user) nav('/giris', { replace: true });
  }, [user, yukleniyor, nav]);

  useEffect(() => {
    let aktif = true;
    supabase.rpc('premium_kontenjan_kalan').then(({ data, error }) => {
      if (!aktif) return;
      if (error || data == null) return;
      setErkenKontenjanKalan(data as number);
    });
    return () => {
      aktif = false;
    };
  }, []);

  useEffect(() => {
    let aktif = true;
    planlariYukle()
      .then((p) => {
        if (aktif) setPlanlar(p);
      })
      .catch(() => {
        // Sessiz geç
      });
    return () => {
      aktif = false;
    };
  }, []);

  const planSatinAl = async (kod: string) => {
    if (!user) {
      nav('/giris');
      return;
    }
    setSecilenPlan(kod);
    setHata(null);
    try {
      const yanit = await odemeBaslat(
        kod,
        1,
        indirimYuzde > 0 ? indirimKodu : undefined,
      );
      if (yanit.ucretsiz) {
        nav('/premium/sonuc?durum=basarili&ucretsiz=1');
      } else {
        window.location.assign(yanit.paymentPageUrl);
      }
    } catch (e) {
      setHata((e as Error).message);
      setSecilenPlan(null);
    }
  };

  const indirimUygula = async () => {
    if (!indirimKodu.trim()) return;
    setIndirimDoğrulanıyor(true);
    setIndirimMesaj(null);
    try {
      const sonuc = await indirimDogrula(indirimKodu, aktifPlan?.kod);
      if (sonuc.gecerli) {
        setIndirimYuzde(sonuc.indirim_yuzde);
        setIndirimMesaj(`%${sonuc.indirim_yuzde} indirim uygulandı`);
      } else {
        setIndirimYuzde(0);
        setIndirimMesaj(sonuc.sebep);
      }
    } catch (e) {
      setIndirimMesaj((e as Error).message);
    } finally {
      setIndirimDoğrulanıyor(false);
    }
  };

  const indirimKaldir = () => {
    setIndirimKodu('');
    setIndirimYuzde(0);
    setIndirimMesaj(null);
    setIndirimAcik(false);
  };

  const erkenAktivasyon = async () => {
    if (!user) return;
    setYukleniyorAktivasyon(true);
    setHata(null);
    try {
      const { error } = await supabase.rpc('premium_erken_erisim_aktive');
      if (error) {
        if (error.code === 'P0001') {
          setHata('Erken erişim kontenjanı doldu. Aşağıdaki planlardan birini seçebilirsin.');
          setErkenKontenjanKalan(0);
        } else if (error.code === 'P0002') {
          setHata('Premium üyeliğin zaten aktif.');
        } else {
          setHata(error.message);
        }
        return;
      }
      await premiumYenile();
      setErkenKontenjanKalan((p) => (p === null ? null : Math.max(0, p - 1)));
    } finally {
      setYukleniyorAktivasyon(false);
    }
  };

  // Plan resolution
  const aylikPlan = planlar.find((p) => p.donem === 'aylik');
  const yillikPlan = planlar.find((p) => p.donem === 'yillik');
  const aktifPlan = donem === 'aylik' ? aylikPlan : yillikPlan;

  const aylikFiyat = aylikPlan ? Number(aylikPlan.tutar) : 0;
  const yillikFiyat = yillikPlan ? Number(yillikPlan.tutar) : 0;
  const yillikAylikEsdeger = yillikPlan ? yillikFiyat / Math.max(1, yillikPlan.ay_sayisi) : 0;
  const yillikTasarrufYuzde =
    aylikFiyat > 0 && yillikAylikEsdeger > 0
      ? Math.round((1 - yillikAylikEsdeger / aylikFiyat) * 100)
      : 0;

  const fmt = (n: number) => n.toLocaleString('tr-TR');

  // Kurum birim fiyat (kişi başı, bireyselle aynı — toplu indirim YOK)
  const kurumBirimAylik = donem === 'aylik' ? aylikFiyat : Math.round(yillikAylikEsdeger);
  const kurumYillikTekSefer = yillikFiyat;

  // Kurum talebine tıklayınca: kişi sayısı + iletişim bilgisi
  // ödeme adımında alınır → /premium/kurum-odeme rotası
  const kurumOdemeUrl = `/premium/kurum-odeme?donem=${donem}`;

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-20">
      {/* ─── HERO ─────────────────────────────────────────────────── */}
      <div className="text-center mb-10 md:mb-14">
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-ink-mute mb-4">
          Fiyatlandırma
        </div>
        <h1 className="font-display text-5xl md:text-6xl tracking-tight font-bold mb-3 leading-[1.02]">
          Planını seç
        </h1>
        <p className="text-base md:text-lg text-ink-soft font-medium max-w-xl mx-auto leading-relaxed">
          Tüm sorular ücretsizdir. Premium, AI hata analizi ve adım adım çözüm desteği ekler.
        </p>
      </div>

      {/* ─── BİREYSEL / SINIF TOGGLE ─────────────────────────────── */}
      <div className="flex justify-center mb-8 md:mb-10">
        <div className="inline-flex items-center bg-surface-2 rounded-full p-1">
          <button
            type="button"
            onClick={() => setMod('bireysel')}
            className={`px-5 md:px-6 py-2 text-[13px] font-bold tracking-tight rounded-full transition ${
 mod === 'bireysel'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-ink-mute hover:text-ink-soft '
 }`}
          >
            Bireysel
          </button>
          <button
            type="button"
            onClick={() => setMod('kurum')}
            className={`px-5 md:px-6 py-2 text-[13px] font-bold tracking-tight rounded-full transition ${
 mod === 'kurum'
 ? 'bg-surface text-ink shadow-sm'
 : 'text-ink-mute hover:text-ink-soft '
 }`}
          >
            Sınıf · Kurum
          </button>
        </div>
      </div>

      {/* ─── AYLIK / YILLIK TOGGLE ──────────────────────────────── */}
      <div className="flex justify-center mb-8 md:mb-12">
        <div className="inline-flex items-center bg-surface border border-line rounded-full p-1">
          <button
            type="button"
            onClick={() => setDonem('aylik')}
            className={`px-4 md:px-5 py-1.5 text-[12.5px] font-semibold tracking-tight rounded-full transition ${
 donem === 'aylik'
 ? 'bg-ink text-bg '
 : 'text-ink-soft'
 }`}
          >
            Aylık
          </button>
          <button
            type="button"
            onClick={() => setDonem('yillik')}
            className={`px-4 md:px-5 py-1.5 text-[12.5px] font-semibold tracking-tight rounded-full transition flex items-center gap-1.5 ${
 donem === 'yillik'
 ? 'bg-ink text-bg '
 : 'text-ink-soft'
 }`}
          >
            Yıllık
            {yillikTasarrufYuzde > 0 && (
              <span
                className={`text-[9px] tracking-[0.15em] uppercase font-bold px-1.5 py-0.5 rounded ${
 donem === 'yillik'
 ? 'bg-premium text-ink'
 : 'bg-success-soft text-success dark:text-success'
 }`}
              >
                −%{yillikTasarrufYuzde}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── PREMIUM AKTİF ─────────────────────────────────────── */}
      {isPremium && premiumBitis && (
        <div className="mb-10 max-w-2xl mx-auto p-4 rounded-2xl bg-gradient-to-r from-premium-soft to-premium-soft border border-premium/60 dark:border-premium-deep/40 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Icon name="BadgeCheck" size={16} className="text-premium-deep" />
            <span className="font-display text-base font-bold text-premium-deep dark:text-premium-soft">
              Premium aktif
            </span>
          </div>
          <div className="text-[12.5px] text-premium-deep dark:text-premium-soft/80 font-medium">
            Bitiş: {new Date(premiumBitis).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </div>
        </div>
      )}

      {/* ─── BİREYSEL: 3 KART ────────────────────────────────── */}
      {mod === 'bireysel' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 mb-12">
          {/* ── Card 1: Ücretsiz ── */}
          <div className="rounded-3xl border-2 border-line bg-surface p-7 md:p-8 flex flex-col">
            <div className="flex items-baseline gap-1.5 mb-1">
              <h3 className="font-display text-2xl font-bold tracking-tight">Ücretsiz</h3>
            </div>
            <div className="text-[12.5px] text-ink-mute font-medium mb-6">
              Daima ücretsiz · sınırsız soru
            </div>
            <div className="mb-6">
              <span className="font-display text-5xl font-bold tracking-tight">₺0</span>
              <span className="text-sm text-ink-mute font-medium ml-1">
                / ay
              </span>
            </div>
            <button
              type="button"
              disabled
              className="w-full py-3 mb-7 text-[12px] tracking-[0.2em] uppercase font-bold rounded-xl bg-surface-2 text-ink-mute cursor-not-allowed"
            >
              Mevcut Planın
            </button>
            <ul className="space-y-2.5 text-[13.5px] text-ink-soft">
              {UCRETSIZ_OZELLIKLER.map((o) => (
                <li key={o} className="flex items-start gap-2.5">
                  <Icon
                    name="Check"
                    size={14}
                    className="text-ink-quiet flex-shrink-0 mt-1"
                  />
                  <span className="leading-relaxed">{o}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Card 2: Premium (HIGHLIGHTED) ── */}
          <div className="relative rounded-3xl border-2 border-ink dark:border-premium bg-ink text-bg p-7 md:p-8 flex flex-col shadow-2xl dark: md:-my-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span
                className="text-[10px] tracking-[0.25em] uppercase font-bold px-3 py-1 rounded-full"
                style={{
                  backgroundColor: 'var(--copper, #b87333)',
                  color: '#fff',
                }}
              >
                Premium
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
              <h3 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
                Premium
                <Icon name="Sparkles" size={16} className="text-premium dark:text-premium" />
              </h3>
            </div>
            <div className="text-[12.5px] opacity-70 font-medium mb-6">
              AI hata analizi ve çözüm desteği
            </div>
            {(() => {
              const ayFiyat = donem === 'aylik' ? aylikFiyat : Math.round(yillikAylikEsdeger);
              const indirimliAy = Math.round(ayFiyat * (1 - indirimYuzde / 100));
              return (
                <>
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="font-display text-5xl font-bold tracking-tight">
                      ₺{fmt(indirimYuzde > 0 ? indirimliAy : ayFiyat)}
                    </span>
                    {indirimYuzde > 0 && (
                      <span className="text-base opacity-50 line-through font-mono">
                        ₺{fmt(ayFiyat)}
                      </span>
                    )}
                    <span className="text-sm opacity-60 font-medium ml-1">/ ay</span>
                  </div>
                  <div className="text-[12px] opacity-60 font-mono mb-6 h-4">
                    {donem === 'yillik' && yillikFiyat > 0 &&
                      (indirimYuzde > 0
                        ? `Yıllık ₺${fmt(Math.round(yillikFiyat * (1 - indirimYuzde / 100)))} tek seferde`
                        : `Yıllık ₺${fmt(yillikFiyat)} tek seferde`)}
                  </div>
                </>
              );
            })()}
            <button
              type="button"
              onClick={() => aktifPlan && planSatinAl(aktifPlan.kod)}
              disabled={!aktifPlan || secilenPlan !== null}
              className="w-full py-3 mb-7 text-[12px] tracking-[0.2em] uppercase font-bold rounded-xl bg-premium hover:bg-premium text-ink transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {secilenPlan === aktifPlan?.kod ? (
                <>
                  <Icon name="Loader2" size={13} className="animate-spin" />
                  Yönlendiriliyor…
                </>
              ) : (
                <>
                  <Icon name="ArrowRight" size={13} />
                  Premium’u başlat
                </>
              )}
            </button>
            <ul className="space-y-2.5 text-[13.5px]">
              <li className="flex items-start gap-2.5 opacity-90">
                <Icon
                  name="Check"
                  size={14}
                  className="text-premium dark:text-premium flex-shrink-0 mt-1"
                />
                <span className="leading-relaxed">
                  <strong>Ücretsizdeki her şey</strong>
                </span>
              </li>
              {PREMIUM_OZELLIKLER.map((o) => (
                <li key={o} className="flex items-start gap-2.5">
                  <Icon
                    name="Check"
                    size={14}
                    className="text-premium dark:text-premium flex-shrink-0 mt-1"
                  />
                  <span className="leading-relaxed">{o}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Card 3: Erken Erişim ── */}
          <div className="rounded-3xl border-2 border-line bg-surface p-7 md:p-8 flex flex-col relative overflow-hidden">
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
              style={{ backgroundColor: 'var(--copper, #b87333)' }}
            />
            <div className="relative">
              <div className="flex items-baseline gap-1.5 mb-1">
                <h3 className="font-display text-2xl font-bold tracking-tight flex items-center gap-2">
                  Erken Erişim
                  <Thiings name="rocket" size={20} />
                </h3>
              </div>
              <div className="text-[12.5px] text-ink-mute font-medium mb-6">
                Beta dönemi · sınırlı kontenjan
              </div>
              <div className="mb-1">
                <span className="font-display text-5xl font-bold tracking-tight">₺0</span>
                <span className="text-sm text-ink-mute font-medium ml-1">
                  / 1 yıl
                </span>
              </div>
              <div className="text-[12px] text-ink-mute font-mono mb-6 h-4">
                {erkenKontenjanKalan !== null && erkenKontenjanKalan > 0
                  ? `${erkenKontenjanKalan} / 100 yer kaldı`
                  : erkenKontenjanKalan === 0
                    ? 'Kontenjan doldu'
                    : ''}
              </div>
              {!isPremium && erkenKontenjanKalan !== null && erkenKontenjanKalan > 0 ? (
                <button
                  type="button"
                  onClick={erkenAktivasyon}
                  disabled={yukleniyorAktivasyon}
                  className="w-full py-3 mb-7 text-[12px] tracking-[0.2em] uppercase font-bold rounded-xl bg-ink text-bg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Icon name="Sparkles" size={13} />
                  {yukleniyorAktivasyon ? 'Aktive ediliyor…' : '1 Yıl Ücretsiz Aç'}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="w-full py-3 mb-7 text-[12px] tracking-[0.2em] uppercase font-bold rounded-xl bg-surface-2 text-ink-mute cursor-not-allowed"
                >
                  Kontenjan Dolu
                </button>
              )}
              <ul className="space-y-2.5 text-[13.5px] text-ink-soft">
                <li className="flex items-start gap-2.5">
                  <Icon name="Check" size={14} className="text-success flex-shrink-0 mt-1" />
                  <span className="leading-relaxed">
                    <strong>Premium’un tamamı</strong>
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="Check" size={14} className="text-success flex-shrink-0 mt-1" />
                  <span className="leading-relaxed">1 yıl boyunca ücretsiz</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="Check" size={14} className="text-success flex-shrink-0 mt-1" />
                  <span className="leading-relaxed">Kart bilgisi istemiyoruz</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <Icon name="Check" size={14} className="text-success flex-shrink-0 mt-1" />
                  <span className="leading-relaxed">Karşılığında geri bildirim bekliyoruz</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* ─── HATA (BİREYSEL) ──────────────────────────────────── */}
      {mod === 'bireysel' && hata && (
        <div className="mb-6 text-center text-sm text-danger dark:text-danger font-medium">
          {hata}
        </div>
      )}

      {/* ─── İNDİRİM KODU (BİREYSEL) ─────────────────────────── */}
      {mod === 'bireysel' && !isPremium && (
        <div className="mb-12 max-w-md mx-auto">
          {!indirimAcik && indirimYuzde === 0 ? (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setIndirimAcik(true)}
                className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-soft hover:text-ink transition"
              >
                <Icon name="Tag" size={13} />
                İndirim kodum var
              </button>
            </div>
          ) : indirimYuzde > 0 ? (
            <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-success-soft border border-success-soft">
              <div className="flex items-center gap-2 min-w-0">
                <Icon
                  name="BadgeCheck"
                  size={15}
                  className="text-success dark:text-success flex-shrink-0"
                />
                <span className="text-[13px] font-mono font-semibold text-success dark:text-success-soft truncate">
                  {indirimKodu.toUpperCase()}
                </span>
                <span className="text-[12px] text-success dark:text-success">
                  −%{indirimYuzde}
                </span>
              </div>
              <button
                type="button"
                onClick={indirimKaldir}
                className="text-[12px] text-success dark:text-success hover:underline flex-shrink-0"
              >
                Kaldır
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-line p-4 bg-surface">
              <label className="block text-[10px] tracking-[0.25em] uppercase font-bold text-ink-mute mb-2">
                İndirim kodu
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={indirimKodu}
                  onChange={(e) => setIndirimKodu(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      indirimUygula();
                    }
                  }}
                  placeholder="Kodunu yaz"
                  className="flex-1 h-10 px-3 text-[13px] font-mono uppercase bg-bg-tint border border-line rounded-lg outline-none focus:border-ink"
                />
                <button
                  type="button"
                  onClick={indirimUygula}
                  disabled={indirimDoğrulanıyor || !indirimKodu.trim()}
                  className="px-4 h-10 text-[11px] tracking-[0.15em] uppercase font-bold rounded-lg bg-ink text-bg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {indirimDoğrulanıyor ? '…' : 'Uygula'}
                </button>
              </div>
              {indirimMesaj && (
                <div className="mt-2 text-[11.5px] text-danger dark:text-danger">
                  {indirimMesaj}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── SINIF · KURUM (sade kart) ─────────────────────────── */}
      {mod === 'kurum' && (
        <div className="mb-12">
          <div className="max-w-2xl mx-auto rounded-3xl border-2 border-ink dark:border-premium bg-ink text-bg p-8 md:p-10 shadow-2xl dark: relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span
                className="text-[10px] tracking-[0.25em] uppercase font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: 'var(--copper, #b87333)', color: '#fff' }}
              >
                Sınıf · Kurum
              </span>
            </div>

            <div className="text-center mb-7">
              <h3 className="font-display text-3xl font-bold tracking-tight mb-2 flex items-center justify-center gap-2">
                <Icon name="Users" size={22} />
                Tek seferde, tüm öğrenciler
              </h3>
              <p className="text-[13.5px] opacity-70 font-medium leading-relaxed max-w-md mx-auto">
                Akademisyen, SMMM staj merkezi veya dershanesin?
                Premium’u öğrencilerine bir kerede aç.
              </p>
            </div>

            {/* Fiyat — kişi başı, bireyselle aynı */}
            <div className="text-center py-5 border-y border-bg mb-6">
              <div className="text-[10px] tracking-[0.3em] uppercase font-bold opacity-60 mb-2">
                Kişi başı fiyat
              </div>
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="font-display text-5xl font-bold tracking-tight">
                  ₺{fmt(kurumBirimAylik)}
                </span>
                <span className="text-sm opacity-60 font-medium">/ ay</span>
              </div>
              {donem === 'yillik' && kurumYillikTekSefer > 0 && (
                <div className="text-[12px] opacity-60 font-mono mt-1.5">
                  Yıllık ₺{fmt(kurumYillikTekSefer)} kişi başı, tek seferde
                </div>
              )}
              <div className="text-[11.5px] opacity-50 italic mt-2">
                Bireyselle aynı tarife · toplu indirim yok
              </div>
            </div>

            <ul className="space-y-2.5 text-[13.5px] mb-7">
              <li className="flex items-start gap-2.5">
                <Icon
                  name="Check"
                  size={14}
                  className="text-premium dark:text-premium flex-shrink-0 mt-1"
                />
                <span className="leading-relaxed">
                  Premium’un <strong>tüm özellikleri</strong> her öğrenci için açılır
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon
                  name="Check"
                  size={14}
                  className="text-premium dark:text-premium flex-shrink-0 mt-1"
                />
                <span className="leading-relaxed">
                  <strong>Kişi sayısını ödeme adımında</strong> belirleyeceksin
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon
                  name="Check"
                  size={14}
                  className="text-premium dark:text-premium flex-shrink-0 mt-1"
                />
                <span className="leading-relaxed">Kurumsal e-fatura desteği</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Icon
                  name="Check"
                  size={14}
                  className="text-premium dark:text-premium flex-shrink-0 mt-1"
                />
                <span className="leading-relaxed">
                  Öğretmen yönetim paneli{' '}
                  <span className="opacity-50 font-mono text-[11px]">
                    (yakında)
                  </span>
                </span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => nav(kurumOdemeUrl)}
              className="w-full inline-flex items-center justify-center gap-2 bg-premium hover:bg-premium text-ink px-5 py-3.5 text-[12px] tracking-[0.2em] uppercase font-bold rounded-xl transition"
            >
              <Icon name="ArrowRight" size={13} />
              Devam Et
            </button>
            <div className="mt-3 text-center text-[11px] opacity-50 font-mono">
              Kişi sayısı ve fatura bilgileri sonraki adımda
            </div>
          </div>
        </div>
      )}

      {/* ─── HASSAS NOT ───────────────────────────────────────── */}
      <div className="text-center text-[11.5px] text-ink-mute font-medium leading-relaxed mb-16 max-w-2xl mx-auto">
        Tutarlar KDV dahildir · 7 gün koşulsuz iade · İstediğin zaman iptal · iyzico ile güvenli ödeme
      </div>

      {/* ─── SSS ───────────────────────────────────────────────── */}
      <section className="mb-12 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-ink-mute mb-2">
            Sıkça Sorulanlar
          </div>
          <h2 className="font-display text-3xl md:text-4xl tracking-tight font-bold">
            Aklındaki sorulara cevap
          </h2>
        </div>

        <div className="divide-y divide-stone-200 border-y border-line">
          {SSS.map((s, i) => {
            const acik = acikSoru === i;
            return (
              <div key={i}>
                <button
                  type="button"
                  onClick={() => setAcikSoru(acik ? null : i)}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className="font-display text-base md:text-lg font-semibold tracking-tight">
                    {s.soru}
                  </span>
                  <Icon
                    name={acik ? 'Minus' : 'Plus'}
                    size={16}
                    className="text-ink-quiet flex-shrink-0 group-hover:text-ink-soft dark:group-hover:text-ink-soft transition"
                  />
                </button>
                {acik && (
                  <div className="pb-5 text-[14px] text-ink-soft leading-relaxed font-medium">
                    {s.cevap}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
};
