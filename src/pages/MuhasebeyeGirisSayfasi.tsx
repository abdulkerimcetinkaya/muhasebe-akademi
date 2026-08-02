import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '../components/Icon';

/**
 * "Muhasebeye Giriş" — yeni kullanıcı için 5-6 adımlı interaktif ısınma akışı.
 * Amaç: muhasebe kayıt mantığını 2-4 dk'da hissettirmek (öğretimi bitirmek değil).
 *
 * İçerik hardcoded ama data array yapısıyla — ileride CMS/DB'ye taşınabilir.
 * Mevzuat/TDHP detayı/7A-7B/KDV istisnaları KAPSAM DIŞI (MVP/Beta).
 */

// ── İçerik verisi (ileride taşınabilir) ────────────────────────────────────

interface IsletmeOgesi {
  ad: string;
  ikon: string;
  aciklama: string;
}

const ISLETME_OGELERI: IsletmeOgesi[] = [
  { ad: 'Kasa', ikon: 'Wallet', aciklama: 'İşletmedeki nakit para. Tahsilat girer, ödeme çıkar.' },
  { ad: 'Banka', ikon: 'Landmark', aciklama: 'İşletmenin banka hesabındaki para. Havale, EFT, POS burada izlenir.' },
  { ad: 'Müşteri', ikon: 'Users', aciklama: 'İşletmeden mal/hizmet alan taraf. Vadeli satışta işletmeye borçlanır.' },
  { ad: 'Tedarikçi', ikon: 'Store', aciklama: 'İşletmeye mal/hizmet satan taraf. Vadeli alışta işletme ona borçlanır.' },
  { ad: 'Mal', ikon: 'Package', aciklama: 'Satmak için alınan ticari mallar. İşletmenin stoğunu oluşturur.' },
  { ad: 'Vergi', ikon: 'Receipt', aciklama: 'Alış ve satışlarda hesaplanan KDV gibi vergiler ayrı izlenir.' },
];

interface OlayKarti {
  ad: string;
  ikon: string;
  belge: string;
}

const OLAY_KARTLARI: OlayKarti[] = [
  { ad: 'Peşin mal alındı', ikon: 'Package', belge: 'Alış faturası' },
  { ad: 'Vadeli satış yapıldı', ikon: 'Store', belge: 'Satış faturası' },
  { ad: 'Kira ödendi', ikon: 'Home', belge: 'Banka dekontu' },
];

const OLAY_ZINCIRI = ['İşlem oldu', 'Belge oluştu', 'Hesaplar etkilendi', 'Kayıt yapılır'];

interface Cta {
  etiket: string;
  ikon: string;
  rota: string;
  not?: string;
}

const CTA_LISTESI: Cta[] = [
  { etiket: 'Temelleri Öğrenmeye Başla', ikon: 'BookOpen', rota: '/isletmeler' },
  { etiket: 'İlk Sorunu Çöz', ikon: 'ListChecks', rota: '/problemler' },
  // TODO: Ayrı bir "muhasebe olayları" (KUR) galerisi rotası eklenirse buraya bağla.
  //       Şimdilik en yakın mevcut hedef olan problemler listesine yönlendiriyor.
  { etiket: 'Muhasebe Olaylarını Keşfet', ikon: 'Search', rota: '/problemler', not: 'olaylar-rotasi-todo' },
];

const ADIM_SAYISI = 6;

// ── Ortak küçük parçalar ───────────────────────────────────────────────────

const AdimBaslik = ({ ustBaslik, baslik }: { ustBaslik: string; baslik: string }) => (
  <div className="text-center mb-8">
    <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold mb-2">
      {ustBaslik}
    </div>
    <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-ink">
      {baslik}
    </h2>
  </div>
);

const gecis = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -16 },
  transition: { duration: 0.28, ease: 'easeOut' as const },
};

// ── Adım 1: Muhasebe neyi takip eder? ──────────────────────────────────────

const AdimTakip = () => {
  const [secili, setSecili] = useState<number>(0);
  return (
    <div>
      <AdimBaslik ustBaslik="Adım 1 / 6" baslik="Muhasebe neyi takip eder?" />
      <p className="text-center text-ink-soft mb-8 max-w-xl mx-auto">
        Muhasebe, bir işletmedeki para ve değer hareketlerini kayıt altına alır. Bir öğeye dokun,
        ne izlediğini gör.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {ISLETME_OGELERI.map((o, i) => {
          const aktif = secili === i;
          return (
            <button
              key={o.ad}
              onClick={() => setSecili(i)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition ${
                aktif
                  ? 'border-brand bg-brand-soft/50 shadow-sm'
                  : 'border-line-strong bg-surface hover:border-brand-mute'
              }`}
            >
              <Icon name={o.ikon} size={26} className={aktif ? 'text-brand-deep' : 'text-ink-soft'} />
              <span className={`text-sm font-semibold ${aktif ? 'text-brand-deep' : 'text-ink'}`}>
                {o.ad}
              </span>
            </button>
          );
        })}
      </div>
      <motion.div
        key={secili}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6 max-w-xl mx-auto bg-bg-tint border border-line-strong rounded-xl px-5 py-4 text-center"
      >
        <span className="font-semibold text-ink">{ISLETME_OGELERI[secili].ad}: </span>
        <span className="text-ink-soft">{ISLETME_OGELERI[secili].aciklama}</span>
      </motion.div>
    </div>
  );
};

// ── Adım 2: Her işlem bir olaydır ──────────────────────────────────────────

const AdimOlay = () => {
  const [acik, setAcik] = useState<number | null>(null);
  return (
    <div>
      <AdimBaslik ustBaslik="Adım 2 / 6" baslik="Her işlem bir olaydır" />
      <p className="text-center text-ink-soft mb-8 max-w-xl mx-auto">
        İşletmede olan her parasal işlem bir <strong>muhasebe olayıdır</strong>. Bir karta dokun,
        arkasındaki zinciri gör.
      </p>
      <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
        {OLAY_KARTLARI.map((k, i) => (
          <button
            key={k.ad}
            onClick={() => setAcik(acik === i ? null : i)}
            className={`p-4 rounded-xl border text-left transition ${
              acik === i
                ? 'border-brand bg-brand-soft/40'
                : 'border-line-strong bg-surface hover:border-brand-mute'
            }`}
          >
            <Icon name={k.ikon} size={22} className="text-brand-deep mb-2" />
            <div className="text-sm font-semibold text-ink">{k.ad}</div>
            <div className="text-[11px] text-ink-mute mt-0.5">{k.belge}</div>
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {acik !== null && (
          <motion.div
            key={acik}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden max-w-2xl mx-auto"
          >
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              {OLAY_ZINCIRI.map((adim, i) => (
                <div key={adim} className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-ink text-white text-xs font-semibold">
                    {adim}
                  </span>
                  {i < OLAY_ZINCIRI.length - 1 && (
                    <Icon name="ArrowRight" size={14} className="text-ink-mute" />
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Adım 3: Çift taraflı kayıt ─────────────────────────────────────────────

const AdimCiftTaraf = () => (
  <div>
    <AdimBaslik ustBaslik="Adım 3 / 6" baslik="Çift taraflı kayıt mantığı" />
    <p className="text-center text-ink-soft mb-8 max-w-xl mx-auto">
      Bir işlem tek taraflı değildir; <strong>en az iki hesabı</strong> etkiler. Örnek: peşin mal
      alındığında bir değer artar, başka bir değer azalır.
    </p>
    <div className="grid grid-cols-2 gap-3 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-xl border border-brand bg-brand-soft/40 text-center"
      >
        <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-brand-deep mb-2">
          Borç
        </div>
        <Icon name="ArrowUp" size={22} className="text-brand-deep mx-auto mb-1" />
        <div className="font-semibold text-ink">Ticari mal arttı</div>
      </motion.div>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.25 }}
        className="p-5 rounded-xl border border-line-strong bg-surface text-center"
      >
        <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-2">
          Alacak
        </div>
        <Icon name="TrendingDown" size={22} className="text-ink-soft mx-auto mb-1" />
        <div className="font-semibold text-ink">Kasa azaldı</div>
      </motion.div>
    </div>
    <p className="text-center text-sm text-ink-mute mt-6 max-w-md mx-auto">
      İki taraf her zaman dengededir: bir tarafın toplamı, diğer tarafın toplamına eşittir.
    </p>
  </div>
);

// ── Adım 4: Borç / alacak ne demek? ────────────────────────────────────────

const AdimBorcAlacak = () => (
  <div>
    <AdimBaslik ustBaslik="Adım 4 / 6" baslik="Borç / alacak ne demek?" />
    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
      <div className="p-5 rounded-xl border border-line-strong bg-surface">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="MessagesSquare" size={18} className="text-ink-mute" />
          <span className="text-sm font-bold text-ink">Günlük dilde</span>
        </div>
        <p className="text-ink-soft text-sm leading-relaxed">
          "Borç", birine borçlu olmak anlamına gelir. Alacak ise birinden alacağın olmasıdır.
        </p>
      </div>
      <div className="p-5 rounded-xl border border-brand bg-brand-soft/30">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="Calculator" size={18} className="text-brand-deep" />
          <span className="text-sm font-bold text-brand-deep">Muhasebede</span>
        </div>
        <p className="text-ink-soft text-sm leading-relaxed">
          Borç ve alacak, hesabın <strong>kayıt yönünü</strong> ifade eder — sola mı yoksa sağa mı
          yazıldığıdır. "Borçlu olmak" ile ilgisi yoktur.
        </p>
      </div>
    </div>
    <p className="text-center text-sm text-ink-mute mt-6 max-w-md mx-auto">
      Bu yüzden bir hesabın "borç" tarafına yazmak, o hesabın kötü durumda olduğu anlamına gelmez.
    </p>
  </div>
);

// ── Adım 5: İlk kaydı birlikte yapalım ─────────────────────────────────────

// Modül seviyesinde: render içinde tanımlanırsa her tıklamada remount olur
// (focus/animasyon kaybı — react-hooks/static-components).
const Secim = ({
  soru,
  secilen,
  dogru,
  onSec,
}: {
  soru: string;
  secilen: string | null;
  dogru: string;
  onSec: (s: string) => void;
}) => (
    <div className="bg-surface border border-line-strong rounded-xl p-4">
      <div className="text-sm font-semibold text-ink mb-3">{soru}</div>
      <div className="grid grid-cols-2 gap-2">
        {['Ticari Mal', 'Kasa'].map((s) => {
          const secili = secilen === s;
          const dogruSecim = secili && s === dogru;
          const yanlisSecim = secili && s !== dogru;
          return (
            <button
              key={s}
              onClick={() => onSec(s)}
              className={`px-3 py-2.5 rounded-lg text-sm font-semibold border transition ${
                dogruSecim
                  ? 'border-success bg-success-soft/40 text-success'
                  : yanlisSecim
                    ? 'border-danger bg-danger-soft/40 text-danger'
                    : 'border-line-strong bg-bg-tint hover:border-brand-mute text-ink'
              }`}
            >
              {s}
            </button>
          );
        })}
      </div>
      {secilen && secilen !== dogru && (
        <p className="text-[11px] text-danger mt-2">Tekrar düşün — ipucu senaryoda gizli.</p>
      )}
    </div>
);

const AdimIlkKayit = () => {
  const [artan, setArtan] = useState<string | null>(null);
  const [azalan, setAzalan] = useState<string | null>(null);
  const tamam = artan === 'Ticari Mal' && azalan === 'Kasa';

  return (
    <div>
      <AdimBaslik ustBaslik="Adım 5 / 6" baslik="İlk kaydı birlikte yapalım" />
      <div className="max-w-lg mx-auto bg-brand-soft/30 border border-brand rounded-xl px-5 py-4 mb-6 text-center">
        <Icon name="Package" size={20} className="text-brand-deep mx-auto mb-1" />
        <p className="text-ink font-medium">İşletme peşin olarak 12.000 TL'ye ticari mal aldı.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
        <Secim soru="Hangi değer arttı?" secilen={artan} dogru="Ticari Mal" onSec={setArtan} />
        <Secim soru="Hangi değer azaldı?" secilen={azalan} dogru="Kasa" onSec={setAzalan} />
      </div>

      <AnimatePresence>
        {tamam && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 max-w-lg mx-auto"
          >
            <div className="bg-surface border border-line-strong rounded-xl overflow-hidden">
              <div className="grid grid-cols-12 px-4 py-2.5 bg-bg-tint border-b border-line-strong text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                <div className="col-span-7">Hesap</div>
                <div className="col-span-2 text-right">Borç</div>
                <div className="col-span-3 text-right">Alacak</div>
              </div>
              <div className="grid grid-cols-12 px-4 py-3 border-b border-line-strong/60 text-sm">
                <div className="col-span-7 font-medium text-ink">153 Ticari Mallar</div>
                <div className="col-span-2 text-right font-mono font-semibold text-ink">12.000</div>
                <div className="col-span-3 text-right text-ink-quiet">—</div>
              </div>
              <div className="grid grid-cols-12 px-4 py-3 text-sm">
                <div className="col-span-7 font-medium text-ink">100 Kasa</div>
                <div className="col-span-2 text-right text-ink-quiet">—</div>
                <div className="col-span-3 text-right font-mono font-semibold text-ink">12.000</div>
              </div>
            </div>
            <p className="text-center text-sm text-ink-mute mt-3">
              Artan değer <strong>borç</strong>, azalan değer <strong>alacak</strong> tarafına
              yazıldı. Kodları ezberlemene gerek yok — mantık bu.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Adım 6: Hazırsın ───────────────────────────────────────────────────────

const AdimHazir = ({ onGit }: { onGit: (rota: string) => void }) => (
  <div className="text-center">
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 200, damping: 15 }}
      className="w-16 h-16 rounded-2xl bg-brand-soft/60 flex items-center justify-center mx-auto mb-5"
    >
      <Icon name="Sparkles" size={30} className="text-brand-deep" />
    </motion.div>
    <AdimBaslik ustBaslik="Adım 6 / 6" baslik="Hazırsın" />
    <p className="text-ink-soft mb-8 max-w-md mx-auto">
      Muhasebenin temel kayıt mantığını öğrendin: her işlem bir olaydır, en az iki hesabı etkiler ve
      borç/alacak sadece kayıt yönüdür. Şimdi uygulayalım.
    </p>
    <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
      {CTA_LISTESI.map((c) => (
        <button
          key={c.etiket}
          onClick={() => onGit(c.rota)}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-ink text-white text-sm font-semibold hover:bg-brand-deep transition"
        >
          <Icon name={c.ikon} size={16} />
          <span>{c.etiket}</span>
        </button>
      ))}
    </div>
  </div>
);

// ── Sayfa kabuğu: ilerleme + navigasyon ────────────────────────────────────

export const MuhasebeyeGirisSayfasi = () => {
  const nav = useNavigate();
  const [adim, setAdim] = useState(0);

  const ileri = () => setAdim((a) => Math.min(a + 1, ADIM_SAYISI - 1));
  const geri = () => setAdim((a) => Math.max(a - 1, 0));

  const adimlar = [
    <AdimTakip key="1" />,
    <AdimOlay key="2" />,
    <AdimCiftTaraf key="3" />,
    <AdimBorcAlacak key="4" />,
    <AdimIlkKayit key="5" />,
    <AdimHazir key="6" onGit={(r) => nav(r)} />,
  ];

  const sonAdim = adim === ADIM_SAYISI - 1;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
      {/* İlerleme göstergesi */}
      <div className="flex items-center gap-1.5 mb-10 max-w-md mx-auto">
        {Array.from({ length: ADIM_SAYISI }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= adim ? 'bg-brand' : 'bg-line-strong/50'
            }`}
          />
        ))}
      </div>

      {/* Adım içeriği */}
      <div className="min-h-[22rem]">
        <AnimatePresence mode="wait">
          <motion.div key={adim} {...gecis}>
            {adimlar[adim]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigasyon */}
      <div className="flex items-center justify-between mt-10 max-w-md mx-auto">
        <button
          onClick={geri}
          disabled={adim === 0}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-ink-soft disabled:opacity-30 disabled:cursor-not-allowed hover:text-ink transition"
        >
          <Icon name="ArrowLeft" size={16} />
          Geri
        </button>

        {sonAdim ? (
          <button
            onClick={() => nav('/')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-ink-mute hover:text-ink transition"
          >
            Kapat
          </button>
        ) : (
          <button
            onClick={ileri}
            className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg bg-ink text-white text-sm font-semibold hover:bg-brand-deep transition"
          >
            Devam Et
            <Icon name="ArrowRight" size={16} />
          </button>
        )}
      </div>

      {/* Atla — akışı zorunlu kılma */}
      {!sonAdim && (
        <div className="text-center mt-4">
          <button
            onClick={() => setAdim(ADIM_SAYISI - 1)}
            className="text-xs text-ink-quiet hover:text-ink-mute transition"
          >
            Atla
          </button>
        </div>
      )}
    </div>
  );
};
