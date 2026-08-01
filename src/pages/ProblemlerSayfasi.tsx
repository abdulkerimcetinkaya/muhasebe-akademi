import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/EmptyState';
import { useUniteler } from '../contexts/UnitelerContext';
import { devamEtSorusu } from '../lib/oneriler';
import { ZORLUK_AD, ZORLUK_PUAN, ZORLUK_SIRA, ZORLUK_STIL } from '../data/sabitler';
import type { Ilerleme, Zorluk } from '../types';

interface Props {
  ilerleme: Ilerleme;
}

type DurumFiltre = 'hepsi' | 'cozulen' | 'cozulmeyen';
type SiralamaFld = 'sira' | 'zorluk' | 'durum';

/** Bir sayfada gösterilecek soru sayısı */
const SAYFA_BOYUT = 10;

/* Etiket çipi — kavramlar chip, hesap kodları tek mono pill içinde birleşik.
   Görsel hiyerarşi: kavramlar göz çeker (asıl kategori), hesap kodları sessiz
   detay olarak yan durur. */
const EtiketChipler = ({
  etiketler,
  maxKavram = 3,
}: {
  etiketler: string[];
  maxKavram?: number;
}) => {
  if (etiketler.length === 0) return null;
  const kavramlar = etiketler.filter((e) => !/^\d+$/.test(e));
  const kodlar = etiketler.filter((e) => /^\d+$/.test(e));
  const kavramGoster = kavramlar.slice(0, maxKavram);
  const kavramFazla = kavramlar.length - kavramGoster.length;
  return (
    <>
      {kavramGoster.map((e) => (
        <span
          key={e}
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-bg-tint text-ink-soft border border-line"
        >
          {e.replace(/-/g, ' ')}
        </span>
      ))}
      {kavramFazla > 0 && (
        <span className="text-[10px] font-semibold text-ink-quiet">+{kavramFazla}</span>
      )}
      {kodlar.length > 0 && (
        <span className="font-mono text-[10px] text-ink-quiet tracking-wide">
          {kodlar.join(' · ')}
        </span>
      )}
    </>
  );
};

/* Segment kontrolü — kaydırmalı pill grubu (native select yerine). */
type SegSecenek = { key: string; label: string; renk?: string };
const Segment = ({
  secenekler,
  secili,
  onSecim,
}: {
  secenekler: SegSecenek[];
  secili: string;
  onSecim: (k: string) => void;
}) => (
  <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-surface-2/70 border border-line">
    {secenekler.map((o) => {
      const aktif = o.key === secili;
      return (
        <button
          key={o.key}
          onClick={() => onSecim(o.key)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] leading-none whitespace-nowrap transition-all active:scale-[0.97] ${
            aktif
              ? 'bg-surface text-ink font-semibold shadow-[0_1px_2px_rgba(26,37,56,0.10)]'
              : 'text-ink-mute font-medium hover:text-ink'
          }`}
        >
          {o.renk && <span className="w-1.5 h-1.5 rounded-full" style={{ background: o.renk }} />}
          {o.label}
        </button>
      );
    })}
  </div>
);

/* Hayalet pill dropdown — çok seçenekli filtreler için (native ok gizli). */
const PillSelect = ({
  value,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  ariaLabel: string;
  children: ReactNode;
}) => (
  <div className="relative">
    <select
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className="appearance-none h-8 rounded-full border border-line bg-surface pl-3.5 pr-8 text-[12.5px] font-medium text-ink-soft hover:border-line-strong focus:border-ink focus:outline-none cursor-pointer transition-colors"
    >
      {children}
    </select>
    <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-quiet">
      <Icon name="ChevronDown" size={13} />
    </span>
  </div>
);

/* İlerleme halkası — animasyonlu (mount'ta dolan). */
const StatRing = ({ yuzde }: { yuzde: number }) => {
  const R = 26;
  const C = 2 * Math.PI * R;
  return (
    <div className="relative w-[64px] h-[64px] grid place-items-center flex-none">
      <svg width="64" height="64" viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" stroke="var(--line)" strokeWidth="5" />
        <motion.circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          stroke="var(--blue)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={C}
          initial={{ strokeDashoffset: C }}
          animate={{ strokeDashoffset: C * (1 - yuzde / 100) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
      </svg>
      <span className="absolute font-display font-bold text-[15px] text-ink tnum">%{yuzde}</span>
    </div>
  );
};

/* Liste stagger — mount'ta dalga gibi açılır. */
const listeVar = { hidden: {}, show: { transition: { staggerChildren: 0.045 } } };
const satirVar = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 120, damping: 18 } },
};

export const ProblemlerSayfasi = ({ ilerleme }: Props) => {
  const nav = useNavigate();
  const { uniteler, tumSorular } = useUniteler();
  const [arama, setArama] = useState('');
  const [zorlukFiltre, setZorlukFiltre] = useState<'hepsi' | Zorluk>('hepsi');
  const [uniteFiltre, setUniteFiltre] = useState('hepsi');
  const [durumFiltre, setDurumFiltre] = useState<DurumFiltre>('hepsi');
  const [etiketFiltre, setEtiketFiltre] = useState('hepsi');
  const [siralamaFld, setSiralamaFld] = useState<SiralamaFld>('sira');
  const [siralamaYon, setSiralamaYon] = useState<'asc' | 'desc'>('asc');
  const [sayfa, setSayfa] = useState(1);

  // Tüm benzersiz etiketler — dropdown options için. Kavramlar önce
  // (alfabetik), sonra hesap kodları (sayısal sıralı).
  const tumEtiketler = useMemo(() => {
    const set = new Set<string>();
    tumSorular.forEach((s) => (s.etiketler ?? []).forEach((e) => set.add(e)));
    const liste = Array.from(set);
    const kavramlar = liste
      .filter((e) => !/^\d+$/.test(e))
      .sort((a, b) => a.localeCompare(b, 'tr'));
    const kodlar = liste
      .filter((e) => /^\d+$/.test(e))
      .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
    return { kavramlar, kodlar };
  }, [tumSorular]);

  const filtreli = useMemo(() => {
    let sonuc = [...tumSorular];
    if (zorlukFiltre !== 'hepsi') sonuc = sonuc.filter((s) => s.zorluk === zorlukFiltre);
    if (uniteFiltre !== 'hepsi') sonuc = sonuc.filter((s) => s.uniteId === uniteFiltre);
    if (etiketFiltre !== 'hepsi')
      sonuc = sonuc.filter((s) => (s.etiketler ?? []).includes(etiketFiltre));
    if (durumFiltre === 'cozulen') sonuc = sonuc.filter((s) => ilerleme.cozulenler[s.id]);
    if (durumFiltre === 'cozulmeyen') sonuc = sonuc.filter((s) => !ilerleme.cozulenler[s.id]);
    if (arama.trim()) {
      const q = arama.toLocaleLowerCase('tr');
      sonuc = sonuc.filter(
        (s) =>
          s.baslik.toLocaleLowerCase('tr').includes(q) ||
          s.senaryo.toLocaleLowerCase('tr').includes(q) ||
          s.uniteAd.toLocaleLowerCase('tr').includes(q),
      );
    }
    sonuc.sort((a, b) => {
      let x = 0;
      if (siralamaFld === 'zorluk') x = ZORLUK_SIRA[a.zorluk] - ZORLUK_SIRA[b.zorluk];
      else if (siralamaFld === 'durum')
        x = (ilerleme.cozulenler[a.id] ? 1 : 0) - (ilerleme.cozulenler[b.id] ? 1 : 0);
      return siralamaYon === 'asc' ? x : -x;
    });
    return sonuc;
  }, [tumSorular, arama, zorlukFiltre, uniteFiltre, etiketFiltre, durumFiltre, siralamaFld, siralamaYon, ilerleme.cozulenler]);

  // Filtre veya sıralama değişince ilk sayfaya dön — kullanıcı yanlış sayfada
  // boş veri görmesin (örn. 20. sayfadayken filtre 3 soruya düşerse).
  useEffect(() => {
    setSayfa(1);
  }, [arama, zorlukFiltre, uniteFiltre, etiketFiltre, durumFiltre, siralamaFld, siralamaYon]);

  const toplamSayfa = Math.max(1, Math.ceil(filtreli.length / SAYFA_BOYUT));
  const guvenliSayfa = Math.min(sayfa, toplamSayfa);
  const ilk = (guvenliSayfa - 1) * SAYFA_BOYUT;
  const son = Math.min(ilk + SAYFA_BOYUT, filtreli.length);
  const sayfadakiler = filtreli.slice(ilk, son);

  const cozulenSayi = tumSorular.filter((s) => ilerleme.cozulenler[s.id]).length;
  const toplamSoru = tumSorular.length;
  const yuzde = toplamSoru > 0 ? Math.round((cozulenSayi / toplamSoru) * 100) : 0;

  // "Kaldığın yerden devam" — filtre yokken 1. sayfada öne çıkan kart.
  const devamSoru = devamEtSorusu(ilerleme, tumSorular);
  const filtreYok =
    !arama.trim() &&
    zorlukFiltre === 'hepsi' &&
    uniteFiltre === 'hepsi' &&
    etiketFiltre === 'hepsi' &&
    durumFiltre === 'hepsi';
  const oneCikanGoster = filtreYok && guvenliSayfa === 1 && !!devamSoru;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      {/* Hero — asimetrik başlık + canlı istatistik */}
      <header className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end mb-10 sm:mb-12">
        <div>
          <div className="font-mono text-[11px] tracking-[0.32em] uppercase text-brand-mute font-semibold mb-4">
            Pratik
          </div>
          <h1 className="font-display text-[52px] md:text-[68px] leading-[0.95] tracking-[-0.02em] font-bold text-ink">
            Problemler
          </h1>
          <p className="font-display-italic text-ink-soft text-[17px] sm:text-[19px] leading-snug mt-4 max-w-md">
            Gerçek senaryolarla yevmiye kaydı pratiği. Çöz, anında gör, ustalaş.
          </p>
        </div>

        {/* İstatistik — kutu yok; halka + dikey ayraçlar */}
        <div className="flex items-center gap-5 sm:gap-6">
          <StatRing yuzde={yuzde} />
          <div className="flex items-center gap-5 sm:gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-quiet font-semibold">
                Çözülen
              </div>
              <div className="font-display text-[22px] font-bold text-ink tnum mt-0.5">
                {cozulenSayi}
                <span className="text-ink-quiet text-[16px] font-medium">/{toplamSoru}</span>
              </div>
            </div>
            {ilerleme.puan > 0 && (
              <>
                <span className="w-px h-9 bg-line" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-quiet font-semibold">
                    Puan
                  </div>
                  <div className="font-mono text-[22px] font-bold text-ink tnum mt-0.5">
                    {ilerleme.puan}
                  </div>
                </div>
              </>
            )}
            {ilerleme.streak > 0 && (
              <>
                <span className="w-px h-9 bg-line" />
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-quiet font-semibold">
                    Seri
                  </div>
                  <div className="font-mono text-[22px] font-bold text-ink tnum mt-0.5">
                    {ilerleme.streak}
                    <span className="text-ink-quiet text-[15px] font-medium">g</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Öne çıkan — "kaldığın yerden devam" */}
      {oneCikanGoster && devamSoru && (
        <motion.button
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 90, damping: 18 }}
          whileHover={{ y: -3 }}
          onClick={() =>
            nav(`/problemler/${devamSoru.id}`, { state: { liste: filtreli.map((x) => x.id) } })
          }
          className="group relative w-full overflow-hidden rounded-[26px] text-left text-white mb-9 px-7 sm:px-10 py-8 sm:py-10 shadow-[0_28px_64px_-32px_rgba(26,37,56,0.65)]"
          style={{ background: 'linear-gradient(135deg, #1d3a5f 0%, #274a76 60%, #2c4f7c 100%)' }}
        >
          {/* Dekoratif defter/T-hesabı motifi */}
          <svg
            className="pointer-events-none absolute right-0 top-0 h-full w-[46%] opacity-[0.10]"
            viewBox="0 0 320 220"
            fill="none"
            aria-hidden
          >
            <path d="M60 40 H300 M180 40 V200" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <path d="M80 78 H150 M80 104 H140 M80 130 H150 M210 78 H280 M210 104 H270 M210 130 H285" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <div className="relative max-w-2xl">
            <div className="font-mono text-[10.5px] tracking-[0.28em] uppercase text-[#a9c4e6] font-semibold">
              Kaldığın yerden devam
            </div>
            <h2 className="font-display text-[27px] sm:text-[34px] font-bold leading-[1.08] mt-2.5">
              {devamSoru.baslik}
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#c7d6ea] leading-relaxed mt-3 line-clamp-2 max-w-xl">
              {devamSoru.senaryo}
            </p>
            <div className="flex items-center gap-4 mt-6 flex-wrap">
              <span className="inline-flex items-center gap-2 rounded-full bg-white text-[#1d3a5f] font-semibold text-[14px] px-5 py-2.5 group-hover:gap-3 transition-all">
                Çöze Başla <Icon name="ArrowRight" size={16} />
              </span>
              <span className="font-mono text-[11.5px] text-[#a9c4e6] uppercase tracking-[0.14em]">
                {ZORLUK_AD[devamSoru.zorluk]} · {ZORLUK_PUAN[devamSoru.zorluk]} puan
              </span>
            </div>
          </div>
        </motion.button>
      )}

      {/* Filtreler — segment + hayalet pill (rafine) */}
      <div className="flex flex-wrap items-center gap-2.5 mb-6">
        <div className="relative flex-1 min-w-[180px] max-w-[260px]">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-quiet">
            <Icon name="Search" size={14} />
          </span>
          <input
            type="text"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Ara…"
            className="w-full h-9 pl-9 pr-3.5 rounded-full border border-line bg-surface text-[13px] font-medium text-ink placeholder:text-ink-quiet hover:border-line-strong focus:border-ink focus:outline-none transition-colors"
          />
        </div>

        <Segment
          secili={zorlukFiltre}
          onSecim={(k) => setZorlukFiltre(k as typeof zorlukFiltre)}
          secenekler={[
            { key: 'hepsi', label: 'Tümü' },
            { key: 'kolay', label: 'Kolay', renk: 'var(--success)' },
            { key: 'orta', label: 'Orta', renk: 'var(--copper)' },
            { key: 'zor', label: 'Zor', renk: 'var(--danger)' },
          ]}
        />

        <Segment
          secili={durumFiltre}
          onSecim={(k) => setDurumFiltre(k as DurumFiltre)}
          secenekler={[
            { key: 'hepsi', label: 'Tümü' },
            { key: 'cozulmeyen', label: 'Kalan' },
            { key: 'cozulen', label: 'Çözülen' },
          ]}
        />

        <PillSelect
          value={uniteFiltre}
          onChange={(e) => setUniteFiltre(e.target.value)}
          ariaLabel="İşletme filtresi"
        >
          <option value="hepsi">Tüm İşletmeler</option>
          {uniteler.map((u) => (
            <option key={u.id} value={u.id}>
              {u.ad}
            </option>
          ))}
        </PillSelect>

        <PillSelect
          value={etiketFiltre}
          onChange={(e) => setEtiketFiltre(e.target.value)}
          ariaLabel="Etiket filtresi"
        >
          <option value="hepsi">Tüm Etiketler</option>
          {tumEtiketler.kavramlar.length > 0 && (
            <optgroup label="Kavramlar">
              {tumEtiketler.kavramlar.map((e) => (
                <option key={e} value={e}>
                  {e.replace(/-/g, ' ')}
                </option>
              ))}
            </optgroup>
          )}
          {tumEtiketler.kodlar.length > 0 && (
            <optgroup label="Hesap Kodları">
              {tumEtiketler.kodlar.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </optgroup>
          )}
        </PillSelect>
      </div>

      {/* Sonuç sayısı + sıralama kontrolü */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="text-[11px] font-semibold text-ink-mute">{filtreli.length} sonuç</div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-ink-quiet font-medium">Sırala</span>
          <PillSelect
            value={siralamaFld}
            onChange={(e) => setSiralamaFld(e.target.value as SiralamaFld)}
            ariaLabel="Sıralama"
          >
            <option value="sira">Varsayılan</option>
            <option value="zorluk">Zorluk</option>
            <option value="durum">Durum</option>
          </PillSelect>
          <button
            onClick={() => setSiralamaYon((y) => (y === 'asc' ? 'desc' : 'asc'))}
            disabled={siralamaFld === 'sira'}
            className="h-8 w-8 grid place-items-center rounded-lg border border-line text-ink-mute hover:text-ink hover:border-line-strong disabled:opacity-40 disabled:hover:text-ink-mute transition-colors"
            title={siralamaYon === 'asc' ? 'Artan' : 'Azalan'}
          >
            <Icon name={siralamaYon === 'asc' ? 'ChevronUp' : 'ChevronDown'} size={14} />
          </button>
        </div>
      </div>

      {/* Kart satırları — staggered, premium */}
      <motion.div
        key={`${zorlukFiltre}|${uniteFiltre}|${etiketFiltre}|${durumFiltre}|${siralamaFld}|${siralamaYon}|${guvenliSayfa}`}
        variants={listeVar}
        initial="hidden"
        animate="show"
        className="space-y-3"
      >
        {sayfadakiler
          .filter((s) => !(oneCikanGoster && devamSoru && s.id === devamSoru.id))
          .map((s) => {
            const cozulmus = !!ilerleme.cozulenler[s.id];
            const yanlisSayi = ilerleme.yanlislar[s.id] || 0;
            const durumIkon = cozulmus ? (
              <Icon name="CheckCircle2" size={20} className="text-success" />
            ) : yanlisSayi > 0 ? (
              <Icon name="XCircle" size={20} className="text-danger" />
            ) : (
              <Icon name="Circle" size={20} className="text-ink-quiet" />
            );
            return (
              <motion.button
                key={s.id}
                variants={satirVar}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.995 }}
                transition={{ type: 'spring', stiffness: 300, damping: 24 }}
                onClick={() =>
                  nav(`/problemler/${s.id}`, { state: { liste: filtreli.map((x) => x.id) } })
                }
                className={`group relative w-full text-left bg-surface border border-line rounded-2xl px-5 sm:px-6 py-5 flex items-center gap-4 sm:gap-5 overflow-hidden hover:border-line-strong hover:shadow-[0_14px_36px_-22px_rgba(26,37,56,0.35)] transition-all ${
                  cozulmus ? 'opacity-[0.62] hover:opacity-100' : ''
                }`}
              >
                {/* hover'da soldan giren mavi aksan */}
                <span
                  className="absolute left-0 top-4 bottom-4 w-[3px] rounded-r-full bg-brand scale-y-0 group-hover:scale-y-100 origin-center transition-transform duration-300"
                  aria-hidden
                />
                <div className="flex-none">{durumIkon}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-display text-[17px] sm:text-[19px] font-bold text-ink leading-tight group-hover:text-brand-deep transition-colors">
                      {s.baslik}
                    </h3>
                    <span
                      className={`text-[10px] tracking-[0.16em] uppercase font-bold ${ZORLUK_STIL[s.zorluk]}`}
                    >
                      {ZORLUK_AD[s.zorluk]}
                    </span>
                    {cozulmus && (
                      <span className="inline-flex items-center gap-1 text-[9.5px] tracking-[0.14em] uppercase font-bold text-success bg-success-soft px-2 py-0.5 rounded-full">
                        <Icon name="Check" size={10} />
                        Çözüldü
                      </span>
                    )}
                  </div>
                  <p className="text-[13.5px] text-ink-mute line-clamp-1 mt-1.5 font-medium">
                    {s.senaryo}
                  </p>
                  <div className="flex items-center gap-2 mt-2.5 flex-wrap">
                    <span className="font-mono text-[10.5px] text-ink-quiet tracking-wide">
                      {ZORLUK_PUAN[s.zorluk]} puan
                    </span>
                    {(s.etiketler ?? []).length > 0 && (
                      <>
                        <span className="text-ink-quiet text-[10px]">·</span>
                        <EtiketChipler etiketler={s.etiketler ?? []} maxKavram={4} />
                      </>
                    )}
                  </div>
                </div>
                <div className="flex-none hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-[0.16em] font-bold text-ink-mute group-hover:text-brand-deep group-hover:gap-2.5 transition-all">
                  Çöz <Icon name="ArrowRight" size={14} />
                </div>
              </motion.button>
            );
          })}
        {filtreli.length === 0 && (
          <EmptyState
            ikon="Search"
            baslik="Filtreyle eşleşen soru yok"
            aciklama="Aramayı temizleyebilir veya farklı bir zorluk/işletme seçebilirsin."
            cta={{
              label: 'Filtreleri Temizle',
              icon: 'RefreshCw',
              onTikla: () => {
                setArama('');
                setZorlukFiltre('hepsi');
                setUniteFiltre('hepsi');
                setDurumFiltre('hepsi');
              },
            }}
          />
        )}
      </motion.div>

      {/* Sayfalama */}
      {filtreli.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="text-xs text-ink-mute font-semibold">
            {ilk + 1}–{son} / {filtreli.length} soru
            {filtreli.length !== tumSorular.length && (
              <span className="text-ink-quiet"> (toplam {tumSorular.length})</span>
            )}
          </div>
          {toplamSayfa > 1 && (
            <nav className="flex items-center gap-1" aria-label="Sayfalama">
              <button
                type="button"
                onClick={() => setSayfa((p) => Math.max(1, p - 1))}
                disabled={guvenliSayfa <= 1}
                className="px-2.5 py-1.5 rounded border border-line text-[12px] font-semibold text-ink-soft hover:bg-bg-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Önceki sayfa"
              >
                <Icon name="ChevronLeft" size={14} />
              </button>
              {sayfaNumaralari(guvenliSayfa, toplamSayfa).map((n, i) =>
                n === '…' ? (
                  <span
                    key={`gap-${i}`}
                    className="px-1 text-[12px] text-ink-quiet select-none"
                  >
                    …
                  </span>
                ) : (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSayfa(n)}
                    className={`min-w-[32px] px-2 py-1.5 rounded text-[12px] font-mono font-bold transition ${
                      n === guvenliSayfa
                        ? 'bg-ink text-paper'
                        : 'border border-line text-ink-soft hover:bg-bg-tint'
                    }`}
                    aria-label={`Sayfa ${n}`}
                    aria-current={n === guvenliSayfa ? 'page' : undefined}
                  >
                    {n}
                  </button>
                ),
              )}
              <button
                type="button"
                onClick={() => setSayfa((p) => Math.min(toplamSayfa, p + 1))}
                disabled={guvenliSayfa >= toplamSayfa}
                className="px-2.5 py-1.5 rounded border border-line text-[12px] font-semibold text-ink-soft hover:bg-bg-tint disabled:opacity-40 disabled:cursor-not-allowed transition"
                aria-label="Sonraki sayfa"
              >
                <Icon name="ChevronRight" size={14} />
              </button>
            </nav>
          )}
        </div>
      )}
    </main>
  );
};

/**
 * Sayfa numarası şeridi üretir: [1, '…', 4, 5, 6, '…', 22] gibi.
 * Aktif sayfanın etrafında 1 sayfa, baş/son sabit, gerekirse … koy.
 */
function sayfaNumaralari(aktif: number, toplam: number): (number | '…')[] {
  if (toplam <= 7) return Array.from({ length: toplam }, (_, i) => i + 1);

  const set = new Set<number>([1, toplam, aktif, aktif - 1, aktif + 1]);
  const sirali = Array.from(set)
    .filter((n) => n >= 1 && n <= toplam)
    .sort((a, b) => a - b);

  const sonuc: (number | '…')[] = [];
  for (let i = 0; i < sirali.length; i++) {
    if (i > 0 && sirali[i] - sirali[i - 1] > 1) sonuc.push('…');
    sonuc.push(sirali[i]);
  }
  return sonuc;
}
