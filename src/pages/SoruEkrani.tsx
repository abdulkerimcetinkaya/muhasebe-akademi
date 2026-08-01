import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Thiings } from '../components/Thiings';
import { HesapKoduInput } from '../components/HesapKoduInput';
import { CozumModal } from '../components/CozumModal';
import { BelgeModal, BelgeGovde } from '../components/BelgeModal';
import { HataBildirModal } from '../components/HataBildirModal';
import { AIAsistanYanPanel } from '../components/AIAsistanYanPanel';
import { MarkdownLite } from '../components/MarkdownLite';
import { KocTuru, type KocTuruAdim } from '../components/KocTuru';
import { useAuth } from '../contexts/AuthContext';
import { useUniteler } from '../contexts/UnitelerContext';
import { ZORLUK_AD, ZORLUK_PUAN, ZORLUK_STIL } from '../data/sabitler';
import { bugununTarihi, paraFormat } from '../lib/format';
import { yanlisAnaliziYap, type YanlisAnaliz } from '../lib/kontrol';
import { kutlamaBaglamiUret, type KutlamaBaglami } from '../lib/kutlama-baglami';
import { CevapKutlama } from '../components/CevapKutlama';
import { aiYanlisAnalizi, AIKotaHatasi } from '../lib/ai';
import { authDonusYaz } from '../lib/auth-donus';
import { aktifMuavinleriYukle, type MuavinHesap } from '../lib/muavin';
import { UNVAN_ETIKETLERI } from '../lib/katkici';
import { hesapAdiBul } from '../lib/hesap';
import { soruBelgeleriniYukle } from '../lib/uniteler-loader';
import { supabase } from '../lib/supabase';
import type {
  Belge,
  CekBelge,
  CozumSatir,
  DekontBelge,
  FaturaBelge,
  FisBilgi,
  FisTuru,
  Ilerleme,
  PerakendeFisBelge,
  SenetBelge,
  Soru,
  SoruWithUnite,
  UserRow,
} from '../types';

type Durum = 'bos' | 'dogru' | 'yanlis';
type SolTab = 'senaryo' | 'belge' | 'cozum';

const BELGE_ETIKET: Record<Belge['tur'], string> = {
  fatura: 'Fatura',
  'perakende-fis': 'Perakende Fişi',
  cek: 'Çek',
  senet: 'Senet',
  dekont: 'Dekont',
};

const SOL_GENISLIK_KEY = 'soru-sol-genislik';

const SOL_TABLAR: { key: SolTab; ad: string }[] = [
  { key: 'senaryo', ad: 'Senaryo' },
  { key: 'belge', ad: 'Belge' },
  { key: 'cozum', ad: 'Çözüm' },
];

interface CozumYardim {
  kullanilanAi?: boolean;
  cozumGosterildi?: boolean;
}

interface Props {
  soru: SoruWithUnite;
  onCozuldu: (soru: Soru, yardim?: CozumYardim) => void;
  onYanlis: (soruId: string) => void;
  cozulmusMu: boolean;
  onHesapPlaniYanPanel: () => void;
  /** Doğru cevap kutlama bağlamı için tam ilerleme + session combo getter */
  ilerleme: Ilerleme;
  getSessionCombo: () => number;
}

const bosSatir = (): UserRow => ({ kod: '', borc: '', alacak: '', aciklama: '' });

const FIS_TURLERI: { kod: FisTuru; ad: string }[] = [
  { kod: 'M', ad: 'Mahsup' },
  { kod: 'T', ad: 'Tahsil' },
  { kod: 'Ö', ad: 'Tediye' },
  { kod: 'A', ad: 'Açılış' },
  { kod: 'K', ad: 'Kapanış' },
  { kod: 'V', ad: 'Virman' },
];

// Soru ID'sinden deterministik 4 haneli yevmiye no üret
const yevmiyeNoUret = (soruId: string): string => {
  let hash = 0;
  for (let i = 0; i < soruId.length; i++) {
    hash = (hash * 31 + soruId.charCodeAt(i)) | 0;
  }
  return String(Math.abs(hash) % 9999 + 1).padStart(4, '0');
};

const faturaAciklamasi = (f: FaturaBelge): string => {
  if (f.faturaTipi === 'alis') return `Mal alımı — ${f.satici.unvan}`;
  if (f.faturaTipi === 'satis') return `Mal satışı — ${f.alici.unvan}`;
  if (f.faturaTipi === 'iade') return `Fatura iadesi — ${f.satici.unvan}`;
  return `Fatura — ${f.satici.unvan}`;
};

// Belgeden fiş header'ını türet. Belge yoksa eski davranış (bugünün tarihi,
// boş alanlar). Fiş türü her zaman 'M' default — pedagojik olarak öğrencinin
// karar vermesi gereken bir alan.
const belgedenFis = (soruId: string, belge?: Belge): FisBilgi => {
  const taban: FisBilgi = {
    yevmiyeNo: yevmiyeNoUret(soruId),
    tarih: bugununTarihi(),
    fisTuru: 'M',
    belgeNo: '',
    aciklama: '',
  };
  if (!belge) return taban;

  switch (belge.tur) {
    case 'fatura': {
      const f = belge as FaturaBelge;
      return {
        ...taban,
        tarih: f.tarih,
        belgeNo: f.faturaNo,
        aciklama: faturaAciklamasi(f),
      };
    }
    case 'perakende-fis': {
      const f = belge as PerakendeFisBelge;
      return {
        ...taban,
        tarih: f.tarih,
        belgeNo: f.fisNo,
        aciklama: `Perakende satış fişi — ${f.isletme.unvan}`,
      };
    }
    case 'cek': {
      const c = belge as CekBelge;
      return {
        ...taban,
        tarih: c.duzenlemeTarihi,
        belgeNo: c.cekNo,
        aciklama: `Çek — ${c.bankaAdi}`,
      };
    }
    case 'senet': {
      const s = belge as SenetBelge;
      return {
        ...taban,
        tarih: s.duzenlemeTarihi,
        belgeNo: s.senetNo,
        aciklama: `Senet — ${s.lehtar.unvan}`,
      };
    }
    case 'dekont': {
      const d = belge as DekontBelge;
      return {
        ...taban,
        tarih: d.islemTarihi,
        belgeNo: d.dekontNo,
        aciklama: d.aciklama || `Banka işlemi — ${d.bankaAdi}`,
      };
    }
    default:
      return taban;
  }
};

const FisField = ({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={`bg-surface ${className ?? ''}`}>
    <div className="text-[9px] tracking-[0.2em] uppercase text-ink-mute font-bold px-2 pt-1.5">
      {label}
    </div>
    {children}
  </div>
);

const SoruEkraniIci = ({
  soru,
  onCozuldu,
  onYanlis,
  cozulmusMu,
  onHesapPlaniYanPanel,
  ilerleme,
  getSessionCombo,
}: Props) => {
  const nav = useNavigate();
  const location = useLocation();
  const liste = (location.state as { liste?: string[] } | null)?.liste ?? null;
  const { uniteler, tumSorular } = useUniteler();
  const { user } = useAuth();
  const unite = uniteler.find((u) => u.id === soru.uniteId);
  const [kayitlar, setKayitlar] = useState<UserRow[]>([bosSatir(), bosSatir()]);
  // Belgeler lazy yüklenir (egress optimizasyonu) — initial undefined,
  // useEffect ile soru.id değişince Supabase'den çekilir
  const [belgeler, setBelgeler] = useState<Belge[] | undefined>(soru.belgeler);
  const [fis, setFis] = useState<FisBilgi>(() =>
    belgedenFis(soru.id, belgeler?.[0]),
  );
  const [durum, setDurum] = useState<Durum>('bos');
  const [muavinler, setMuavinler] = useState<MuavinHesap[]>([]);
  const [yazar, setYazar] = useState<{ ad: string; unvan: string | null } | null>(null);
  const [satirSonuclari, setSatirSonuclari] = useState<(boolean | null)[]>([]);
  const [yanlisAnaliz, setYanlisAnaliz] = useState<YanlisAnaliz | null>(null);
  const [kutlamaBaglami, setKutlamaBaglami] = useState<KutlamaBaglami | null>(null);
  const [kontrolHatasi, setKontrolHatasi] = useState<string | null>(null);
  const [cozumAcik, setCozumAcik] = useState(false);
  const [cozumOnayAcik, setCozumOnayAcik] = useState(false);
  const [hataAcik, setHataAcik] = useState(false);
  const [belgeAcik, setBelgeAcik] = useState(false);
  const [solTab, setSolTab] = useState<SolTab>('senaryo');
  const [belgeSekme, setBelgeSekme] = useState(0);
  const [solGenislik, setSolGenislik] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem(SOL_GENISLIK_KEY));
      return v >= 30 && v <= 58 ? v : 40;
    } catch {
      return 40;
    }
  });
  const splitRef = useRef<HTMLDivElement>(null);
  const [aiAsistanAcik, setAiAsistanAcik] = useState(false);
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  // Yardım takibi — puanlama için. AI açıldıysa veya çözüm gösterildiyse
  // soru çözüldüğünde bu flag'ler onCozuldu'ya iletilir.
  const [kullanilanAi, setKullanilanAi] = useState(false);
  const [cozumGosterildi, setCozumGosterildi] = useState(false);
  const [aiMetin, setAiMetin] = useState<string | null>(null);
  const [aiHata, setAiHata] = useState<string | null>(null);
  const [aiKotaDoldu, setAiKotaDoldu] = useState(false);
  const [kocTuruAcik, setKocTuruAcik] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem('koc-turu-tamam') === '1') return;
    const t = setTimeout(() => setKocTuruAcik(true), 500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    aktifMuavinleriYukle()
      .then(setMuavinler)
      .catch(() => {
        // sessizce geç — muavin yoksa eski davranış (sadece ana hesap) korunur
      });
  }, []);

  // Yazar (katkıcı) bilgilerini yükle — soru kimlik değişince
  useEffect(() => {
    if (!soru?.ekleyenId) {
      setYazar(null);
      return;
    }
    let iptal = false;
    supabase
      .from('katkici_basvurulari')
      .select('ad_soyad, unvan')
      .eq('user_id', soru.ekleyenId)
      .eq('durum', 'onayli')
      .maybeSingle()
      .then(({ data }) => {
        if (iptal) return;
        if (data) {
          setYazar({
            ad: data.ad_soyad,
            unvan: UNVAN_ETIKETLERI[data.unvan as keyof typeof UNVAN_ETIKETLERI] ?? null,
          });
        } else {
          setYazar(null);
        }
      });
    return () => {
      iptal = true;
    };
  }, [soru?.ekleyenId]);

  const kocTuruKapat = () => {
    setKocTuruAcik(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('koc-turu-tamam', '1');
    }
  };

  const kocTuruAdimlari: KocTuruAdim[] = [
    {
      hedef: 'senaryo',
      baslik: 'Önce senaryoyu oku',
      metin: 'Burada gerçek bir muhasebe olayı anlatılıyor. Tutarlar ve taraflar bu metinden çıkar.',
    },
    {
      hedef: 'fis',
      baslik: 'Yevmiye fişine kayıt gir',
      metin: 'Senaryodaki olayı fişe çeviriyorsun: tarih, açıklama, hesap, borç ve alacak.',
    },
    {
      hedef: 'satir',
      baslik: 'Hesap kodu + tutar',
      metin: 'Hesap kodunu yazınca öneriler çıkar. Borçlanan tarafa borç sütununa, alacaklı tarafa alacak sütununa tutarı yaz.',
    },
    {
      hedef: 'kontrol',
      baslik: 'Kaydı kontrol et',
      metin: 'Bittiğinde bu butonla kaydını doğrula. Yanlış varsa anlık geri bildirim alırsın.',
    },
  ];

  const fisTuruAd = useMemo(
    () => FIS_TURLERI.find((f) => f.kod === fis.fisTuru)?.ad ?? '',
    [fis.fisTuru],
  );

  useEffect(() => {
    setKayitlar([bosSatir(), bosSatir()]);
    // Önce cached belge varsa onu kullan, yoksa fiş başlangıçta boş
    setFis(belgedenFis(soru.id, soru.belgeler?.[0]));
    setBelgeler(soru.belgeler);
    setDurum('bos');
    setSatirSonuclari([]);
    setYanlisAnaliz(null);
    setKontrolHatasi(null);
    setCozumAcik(false);
    setCozumOnayAcik(false);
    setHataAcik(false);
    setBelgeAcik(false);
    setSolTab('senaryo');
    setBelgeSekme(0);
    setAiMetin(null);
    setAiHata(null);

    setAiKotaDoldu(false);
    setKullanilanAi(false);
    setCozumGosterildi(false);

    // Belgeyi lazy yükle — uniteler-loader artık belgeler kolonunu çekmiyor
    // (egress optimizasyonu). Cache'de eski format varsa zaten dolu gelir.
    let iptal = false;
    soruBelgeleriniYukle(soru.id).then((b) => {
      if (iptal) return;
      const yenisi = b.length > 0 ? b : undefined;
      setBelgeler(yenisi);
      // Fiş başlıkları (tarih, belge no, açıklama) belgeden türer → güncelle
      setFis(belgedenFis(soru.id, yenisi?.[0]));
    });
    return () => {
      iptal = true;
    };
  }, [soru.id, soru.belgeler]);

  const aiCacheKey = user ? `mli_ai_yanlis_${user.id}_${soru.id}` : null;

  const aiAnalizCalistir = async () => {
    setAiHata(null);
    setAiKotaDoldu(false);

    if (aiCacheKey) {
      const cached = localStorage.getItem(aiCacheKey);
      if (cached) {
        setAiMetin(cached);
        setKullanilanAi(true);
        return;
      }
    }

    setAiYukleniyor(true);
    try {
      const kullaniciCevap: CozumSatir[] = kayitlar
        .filter((k) => k.kod && (+k.borc > 0 || +k.alacak > 0))
        .map((k) => ({ kod: k.kod, borc: +k.borc || 0, alacak: +k.alacak || 0 }));
      const sonuc = await aiYanlisAnalizi({
        soruBaslik: soru.baslik,
        senaryo: soru.senaryo,
        dogruCozum: soru.cozum,
        kullaniciCevap,
      });
      setAiMetin(sonuc.metin);
      setKullanilanAi(true);
      if (aiCacheKey) {
        try {
          localStorage.setItem(aiCacheKey, sonuc.metin);
        } catch {
          // quota / private mode — sessizce geç
        }
      }
    } catch (e) {
      if (e instanceof AIKotaHatasi) {
        setAiKotaDoldu(true);
      } else {
        setAiHata((e as Error).message);
      }
    } finally {
      setAiYukleniyor(false);
    }
  };

  const toplamBorc = kayitlar.reduce((a, k) => a + (+k.borc || 0), 0);
  const toplamAlacak = kayitlar.reduce((a, k) => a + (+k.alacak || 0), 0);
  const esit = Math.abs(toplamBorc - toplamAlacak) < 0.01 && toplamBorc > 0;

  // İki-pane bölücüyü sürükle
  const surukleBaslat = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const rect = splitRef.current?.getBoundingClientRect();
    if (!rect) return;
    const hareket = (ev: PointerEvent) => {
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSolGenislik(Math.min(58, Math.max(30, Math.round(pct))));
    };
    const bitir = () => {
      window.removeEventListener('pointermove', hareket);
      window.removeEventListener('pointerup', bitir);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      setSolGenislik((g) => {
        try {
          localStorage.setItem(SOL_GENISLIK_KEY, String(g));
        } catch {
          /* yok say */
        }
        return g;
      });
    };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
    window.addEventListener('pointermove', hareket);
    window.addEventListener('pointerup', bitir);
  }, []);

  const satirEkle = () => {
    setKayitlar((prev) => [...prev, bosSatir()]);
    setSatirSonuclari((prev) => [...prev, null]);
    setDurum('bos');
    setTimeout(() => {
      const yeniIdx = kayitlar.length;
      const input = document.querySelector<HTMLInputElement>(
        `[data-row="${yeniIdx}"][data-col="kod"]`,
      );
      if (input) input.focus();
    }, 50);
  };

  const satirSil = (i: number) => {
    setKayitlar(kayitlar.filter((_, idx) => idx !== i));
    setSatirSonuclari(satirSonuclari.filter((_, idx) => idx !== i));
  };

  const satirGuncelle = (i: number, alan: keyof UserRow, deger: string) => {
    const yeni = [...kayitlar];
    yeni[i] = { ...yeni[i], [alan]: deger };
    if (alan === 'borc' && deger) yeni[i].alacak = '';
    if (alan === 'alacak' && deger) yeni[i].borc = '';
    setKayitlar(yeni);
    if (durum !== 'bos') {
      setDurum('bos');
      setSatirSonuclari([]);
      setYanlisAnaliz(null);
      setKontrolHatasi(null);
    }
  };

  const kontrol = useCallback(() => {
    setKontrolHatasi(null);
    const dolu = kayitlar.filter(
      (k) => k.kod || +k.borc > 0 || +k.alacak > 0,
    );
    if (dolu.length < 2) {
      setKontrolHatasi('En az iki satır doldurulmalı.');
      return;
    }

    // Global muavinler + soruya özel muavinler birleşik geçilir.
    const soruyaOzelMuavinHesaplar = (soru.muavinler ?? []).map((m) => ({
      kod: m.kod,
      ad: m.ad,
      ana_kod: m.kod.includes('.') ? m.kod.split('.')[0] : m.kod,
    }));
    const mevcutKodlar = new Set(muavinler.map((m) => m.kod));
    const birlesikMuavinler = [
      ...muavinler.map((m) => ({ kod: m.kod, ad: m.ad, ana_kod: m.ana_kod })),
      ...soruyaOzelMuavinHesaplar.filter((m) => !mevcutKodlar.has(m.kod)),
    ];
    const analiz = yanlisAnaliziYap(kayitlar, soru.cozum, birlesikMuavinler);

    // En iyi senaryo: tüm satırlar doğru ve eksik yok
    const hepsiDogru =
      analiz.satirAnalizleri.every((s) => s.tip === 'dogru') &&
      analiz.eksikHesaplar.length === 0 &&
      Math.abs(analiz.dengeFarki) < 0.01 &&
      analiz.satirAnalizleri.length >= 2;

    // Backend ile uyumlu satırSonuclari (true/false) — UI satır işaretleri için
    const sonuclar = kayitlar.map((_, i) => {
      const a = analiz.satirAnalizleri.find((s) => s.satirIdx === i);
      if (!a) return null;
      return a.tip === 'dogru';
    });
    setSatirSonuclari(sonuclar);

    if (hepsiDogru) {
      // sessionCombo: bu çözümle birlikte oturum içi ardışık doğru sayısı.
      // App.tsx'te ref tutulan combo, onCozuldu callback'inde +1 oluyor —
      // bizim göstermek istediğimiz "bu çözüm sonrası" değer için +1 ekliyoruz.
      // Daha önce çözülmüşse combo'yu etkilemez (ref aynı kalır).
      const eskidenCozulmus = !!ilerleme.cozulenler[soru.id];
      const yeniCombo = eskidenCozulmus ? getSessionCombo() : getSessionCombo() + 1;
      const baglam = kutlamaBaglamiUret({
        soru,
        ilerlemeOnce: ilerleme,
        uniteler,
        tumSorular,
        sessionCombo: yeniCombo,
      });
      setKutlamaBaglami(baglam);
      setDurum('dogru');
      setYanlisAnaliz(null);
      onCozuldu(soru, { kullanilanAi, cozumGosterildi });
    } else {
      setKutlamaBaglami(null);
      setDurum('yanlis');
      setYanlisAnaliz(analiz);
      onYanlis(soru.id);
    }
  }, [kayitlar, soru, onCozuldu, onYanlis, kullanilanAi, cozumGosterildi, ilerleme, uniteler, tumSorular, getSessionCombo]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        kontrol();
        return;
      }
      if (e.key === 'Escape') {
        if (cozumAcik) { setCozumAcik(false); return; }
        if (cozumOnayAcik) { setCozumOnayAcik(false); return; }
        if (belgeAcik) { setBelgeAcik(false); return; }
        if (hataAcik) { setHataAcik(false); return; }
        if (aiAsistanAcik) { setAiAsistanAcik(false); return; }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [kontrol, cozumAcik, cozumOnayAcik, belgeAcik, hataAcik, aiAsistanAcik]);

  const bulunanHesap = (kod: string) => hesapAdiBul(kod, muavinler);

  // Enter akışı: kod → açıklama → borç → alacak → alt satır kodu.
  // Tek satırın içinde sağa, son alanda alt satıra atlar.
  const handleSatirKey = (
    e: React.KeyboardEvent<HTMLInputElement>,
    i: number,
    col: 'aciklama' | 'borc' | 'alacak',
  ) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (col === 'aciklama') {
      document
        .querySelector<HTMLInputElement>(`[data-row="${i}"][data-col="borc"]`)
        ?.focus();
      return;
    }
    if (col === 'borc') {
      document
        .querySelector<HTMLInputElement>(`[data-row="${i}"][data-col="alacak"]`)
        ?.focus();
      return;
    }
    // alacak → alt satır kod (yoksa yeni satır)
    const next = document.querySelector<HTMLInputElement>(
      `[data-row="${i + 1}"][data-col="kod"]`,
    );
    if (next) next.focus();
    else satirEkle();
  };

  const sonraki = () => {
    if (liste && liste.length > 0) {
      const idx = liste.findIndex((id) => id === soru.id);
      if (idx >= 0 && idx < liste.length - 1) {
        nav(`/problemler/${liste[idx + 1]}`, { state: { liste } });
        return;
      }
      nav('/problemler');
      return;
    }
    const idx = tumSorular.findIndex((s) => s.id === soru.id);
    if (idx >= 0 && idx < tumSorular.length - 1) nav(`/problemler/${tumSorular[idx + 1].id}`);
    else nav('/problemler');
  };

  return (
    <main className="max-w-[1500px] mx-auto px-4 lg:px-6 py-5">
      {/* ÜST ŞERİT — kimlik + navigasyon */}
      <div className="mb-4">
        <button
          onClick={() => nav('/problemler')}
          className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-3 font-semibold"
        >
          <Icon name="ArrowLeft" size={14} />
          <span>Tüm Problemler</span>
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          {unite && <Thiings name={unite.thiingsIcon} size={22} />}
          <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold">
            {unite?.ad}
          </div>
          <span
            className={`text-[9px] tracking-[0.2em] uppercase font-bold ${ZORLUK_STIL[soru.zorluk]}`}
          >
            {ZORLUK_AD[soru.zorluk]} · {ZORLUK_PUAN[soru.zorluk]} puan
          </span>
          {cozulmusMu && (
            <span className="text-[9px] tracking-[0.2em] uppercase font-bold text-success dark:text-success bg-success-soft px-2 py-0.5 rounded">
              Çözüldü
            </span>
          )}
        </div>
        <h1 className="font-display text-2xl md:text-3xl tracking-tight mt-1.5 font-bold">
          {soru.baslik}
        </h1>
      </div>

      {/* İKİ PANE: solda referans · sağda çalışma */}
      <div
        ref={splitRef}
        style={{ ['--sol' as string]: `${solGenislik}%` } as React.CSSProperties}
        className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-0"
      >
        {/* SOL PANE — referans */}
        <section className="w-full lg:w-[var(--sol)] flex-shrink-0 lg:sticky lg:top-4 self-start">
          <div className="rounded-xl border border-line bg-surface overflow-hidden flex flex-col lg:max-h-[calc(100vh-108px)]">
            {/* Sekme başlıkları */}
            <div className="flex items-stretch border-b border-line bg-surface-2/40">
              {SOL_TABLAR.filter(
                (t) => t.key !== 'belge' || (belgeler && belgeler.length > 0),
              ).map((t) => {
                const aktifTab = solTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => setSolTab(t.key)}
                    className={`relative px-4 py-2.5 text-[12px] font-bold tracking-tight transition-colors ${
                      aktifTab ? 'text-ink' : 'text-ink-mute hover:text-ink-soft'
                    }`}
                  >
                    {t.ad}
                    {t.key === 'belge' && belgeler && belgeler.length > 1 && (
                      <span className="ml-1 text-[10px] text-ink-quiet">
                        ({belgeler.length})
                      </span>
                    )}
                    {aktifTab && (
                      <span className="absolute left-3 right-3 -bottom-px h-0.5 bg-ink rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sekme içeriği */}
            <div className="overflow-auto flex-1">
              {solTab === 'senaryo' && (
                <div data-tour="senaryo" className="p-5">
                  <p className="text-base lg:text-lg leading-relaxed text-ink font-medium whitespace-pre-line">
                    {soru.senaryo}
                  </p>
                  {yazar && (
                    <div className="flex items-center gap-1.5 text-[12px] text-ink-mute mt-5 pt-4 border-t border-line-soft">
                      <Icon
                        name="BadgeCheck"
                        size={11}
                        className="text-success dark:text-success"
                      />
                      <span>
                        <strong>{yazar.ad}</strong> tarafından önerildi
                        {yazar.unvan && (
                          <span className="text-ink-quiet"> · {yazar.unvan}</span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {solTab === 'belge' && belgeler && belgeler.length > 0 && (
                <div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-line-soft bg-surface-2/30">
                    {belgeler.length > 1 ? (
                      <div className="flex items-center gap-1 overflow-x-auto">
                        {belgeler.map((b, i) => (
                          <button
                            key={i}
                            onClick={() => setBelgeSekme(i)}
                            className={`flex-shrink-0 px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                              i === belgeSekme
                                ? 'bg-ink text-white'
                                : 'text-ink-soft hover:bg-line-soft'
                            }`}
                          >
                            {BELGE_ETIKET[b.tur]}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold px-1">
                        {BELGE_ETIKET[belgeler[0].tur]}
                      </span>
                    )}
                    <button
                      onClick={() => setBelgeAcik(true)}
                      className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-deep hover:gap-2 transition-all flex-shrink-0"
                    >
                      Tam ekran <Icon name="Eye" size={12} />
                    </button>
                  </div>
                  <div className="bg-line-soft/25 p-3.5">
                    <div style={{ zoom: 0.82 }}>
                      <BelgeGovde
                        belge={belgeler[Math.min(belgeSekme, belgeler.length - 1)]}
                      />
                    </div>
                  </div>
                </div>
              )}

              {solTab === 'cozum' && (
                <div className="p-5">
                  {cozulmusMu || cozumGosterildi ? (
                    <div>
                      <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-3">
                        <Icon name="Eye" size={13} /> Çözüm
                      </div>
                      <p className="text-sm text-ink-soft font-medium leading-relaxed mb-4">
                        Bu sorunun çözümü senin için açık.
                        {cozumGosterildi &&
                          !cozulmusMu &&
                          ' (Çözümü gördüğün için puan kazanılmadı.)'}
                      </p>
                      <button
                        onClick={() => setCozumAcik(true)}
                        className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2.5 text-sm font-semibold rounded-lg hover:bg-ink-soft dark:hover:bg-surface transition"
                      >
                        <Icon name="Eye" size={14} /> Çözümü Aç
                      </button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase font-bold text-danger mb-3">
                        <Icon name="Lock" size={13} /> Çözüm kilitli
                      </div>
                      <p className="text-sm text-ink-soft font-medium leading-relaxed mb-4">
                        Önce kendin dene. Çözümü görürsen bu sorudan{' '}
                        <strong>puan kazanamazsın</strong>.
                      </p>
                      <button
                        onClick={() => setCozumOnayAcik(true)}
                        className="inline-flex items-center gap-2 border border-danger bg-danger-soft/40 text-danger px-4 py-2.5 text-sm font-semibold rounded-lg hover:bg-danger-soft transition"
                      >
                        <Icon name="Eye" size={14} /> Yine de Çözümü Gör
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Sürüklenebilir bölücü (lg) */}
        <div
          onPointerDown={surukleBaslat}
          className="hidden lg:flex items-center justify-center w-4 flex-shrink-0 self-stretch cursor-col-resize group"
        >
          <div className="w-px h-12 bg-line group-hover:bg-ink transition-colors rounded-full" />
        </div>

        {/* SAĞ PANE — çalışma alanı */}
        <div className="w-full lg:flex-1 lg:min-w-0">
          {/* Araç çubuğu */}
          <div className="flex items-center justify-end gap-1.5 mb-3">
            <button
              onClick={onHesapPlaniYanPanel}
              title="Hesap Planı"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-line-strong hover:border-ink transition text-[12px] font-semibold rounded-lg"
            >
              <Icon name="BookOpen" size={13} />
              <span className="hidden sm:inline">Hesap Planı</span>
            </button>
            <button
              onClick={() => {
                setAiAsistanAcik(true);
                setKullanilanAi(true);
              }}
              title="AI Asistan"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-premium/60 dark:border-premium-deep/40 bg-gradient-to-r from-premium-soft to-transparent hover:border-premium transition text-[12px] font-semibold rounded-lg"
            >
              <Icon name="Sparkles" size={13} className="text-premium" />
              <span className="hidden sm:inline">AI Asistan</span>
              <span className="text-[8px] tracking-[0.15em] uppercase font-bold text-premium-deep">
                Pro
              </span>
            </button>
            <button
              onClick={() => setHataAcik(true)}
              title="Hata Bildir"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-line-strong hover:border-danger dark:hover:border-danger transition text-[12px] font-semibold rounded-lg"
            >
              <Icon name="AlertCircle" size={13} className="text-danger" />
              <span className="hidden sm:inline">Hata Bildir</span>
            </button>
          </div>

      {/* YEVMİYE FİŞİ — LUCA tarzı */}
      <div data-tour="fis" className="bg-surface border border-line-strong rounded-xl overflow-hidden shadow-sm">
        {/* Fiş başlığı */}
        <div className="bg-surface-2 px-4 py-2 border-b-2 border-line-strong flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="FileText" size={14} className="text-ink-soft" />
            <span className="font-display font-bold text-sm tracking-tight">YEVMİYE FİŞİ</span>
            <span className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
              · {fisTuruAd}
            </span>
          </div>
          <div className="text-[10px] text-ink-mute font-medium hidden sm:flex items-center gap-1.5">
            <Icon name="Info" size={11} />
            Sıralama serbest, istediğin satıra yazabilirsin
          </div>
        </div>

        {/* Fiş üst bilgi satırı */}
        <div className="grid grid-cols-2 md:grid-cols-12 gap-px bg-line-soft">
          <FisField label="Yev. No" className="md:col-span-2">
            <input
              type="text"
              value={fis.yevmiyeNo}
              onChange={(e) => setFis({ ...fis, yevmiyeNo: e.target.value })}
              className="w-full font-mono text-sm bg-surface px-2 py-1.5 outline-none focus:bg-premium-soft transition font-semibold"
            />
          </FisField>
          <FisField label="Tarih" className="md:col-span-2">
            <input
              type="date"
              value={fis.tarih}
              onChange={(e) => setFis({ ...fis, tarih: e.target.value })}
              className="w-full font-mono text-sm bg-surface px-2 py-1.5 outline-none focus:bg-premium-soft transition font-semibold"
            />
          </FisField>
          <FisField label="Fiş Türü" className="md:col-span-2">
            <select
              value={fis.fisTuru}
              onChange={(e) => setFis({ ...fis, fisTuru: e.target.value as FisTuru })}
              className="w-full font-mono text-sm bg-surface px-2 py-1.5 outline-none focus:bg-premium-soft transition font-semibold cursor-pointer"
            >
              {FIS_TURLERI.map((f) => (
                <option key={f.kod} value={f.kod}>
                  {f.kod} — {f.ad}
                </option>
              ))}
            </select>
          </FisField>
          <FisField label="Belge No" className="md:col-span-2">
            <input
              type="text"
              value={fis.belgeNo}
              onChange={(e) => setFis({ ...fis, belgeNo: e.target.value })}
              placeholder="—"
              className="w-full font-mono text-sm bg-surface px-2 py-1.5 outline-none focus:bg-premium-soft transition font-semibold placeholder:text-ink-quiet"
            />
          </FisField>
          <FisField label="Açıklama" className="md:col-span-4">
            <input
              type="text"
              value={fis.aciklama}
              onChange={(e) => setFis({ ...fis, aciklama: e.target.value })}
              placeholder="Fiş açıklaması..."
              className="w-full text-sm bg-surface px-2 py-1.5 outline-none focus:bg-premium-soft transition font-medium placeholder:text-ink-quiet"
            />
          </FisField>
        </div>

        <div className="overflow-x-auto">
        <div data-tour="satir" className="min-w-[680px]">
        {/* Satır başlıkları */}
        <div className="grid grid-cols-[40px_120px_1fr_1.5fr_140px_140px_40px] gap-px bg-line border-t-2 border-line-strong">
          {['Sıra', 'Hesap Kodu', 'Hesap Adı', 'Açıklama', 'Borç', 'Alacak', ''].map((h, i) => (
            <div
              key={i}
              className={`bg-surface-2 px-2 py-2 text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold ${
 i >= 4 && i <= 5 ? 'text-right' : i === 0 ? 'text-center' : ''
 }`}
            >
              {h}
            </div>
          ))}
        </div>

        {/* Satırlar */}
        {kayitlar.map((k, i) => {
          const sonuc = satirSonuclari[i];
          let satirBg = 'bg-surface';
          if (durum === 'yanlis' && sonuc === false) satirBg = 'bg-danger-soft dark:bg-danger/10';
          else if (durum === 'yanlis' && sonuc === true)
            satirBg = 'bg-success-soft/60';
          return (
            <div
              key={i}
              className={`grid grid-cols-[40px_120px_1fr_1.5fr_140px_140px_40px] gap-px bg-line-soft border-b border-line ${satirBg}`}
            >
              <div
                className={`px-2 py-1.5 text-center text-xs font-mono font-bold text-ink-quiet ${satirBg}`}
              >
                {i + 1}
              </div>
              <div className={satirBg}>
                <HesapKoduInput
                  value={k.kod}
                  onChange={(v) => satirGuncelle(i, 'kod', v)}
                  rowIndex={i}
                  muavinler={muavinler}
                  soruyaOzelMuavinler={soru.muavinler}
                />
              </div>
              <div
                className={`px-2 py-1.5 text-xs text-ink-soft truncate font-medium flex items-center ${satirBg}`}
              >
                {bulunanHesap(k.kod)}
              </div>
              <div className={satirBg}>
                <input
                  type="text"
                  value={k.aciklama ?? ''}
                  onChange={(e) => satirGuncelle(i, 'aciklama', e.target.value)}
                  onKeyDown={(e) => handleSatirKey(e, i, 'aciklama')}
                  placeholder="—"
                  data-row={i}
                  data-col="aciklama"
                  className="w-full text-xs px-2 py-1.5 bg-transparent outline-none focus:bg-premium-soft transition font-medium placeholder:text-ink-quiet"
                />
              </div>
              <div className={satirBg}>
                <input
                  type="number"
                  value={k.borc}
                  onChange={(e) => satirGuncelle(i, 'borc', e.target.value)}
                  onKeyDown={(e) => handleSatirKey(e, i, 'borc')}
                  placeholder="0,00"
                  data-row={i}
                  data-col="borc"
                  className="w-full font-mono text-sm text-right px-2 py-1.5 bg-transparent outline-none focus:bg-premium-soft transition font-semibold placeholder:text-ink-quiet"
                />
              </div>
              <div className={satirBg}>
                <input
                  type="number"
                  value={k.alacak}
                  onChange={(e) => satirGuncelle(i, 'alacak', e.target.value)}
                  onKeyDown={(e) => handleSatirKey(e, i, 'alacak')}
                  placeholder="0,00"
                  data-row={i}
                  data-col="alacak"
                  className="w-full font-mono text-sm text-right px-2 py-1.5 bg-transparent outline-none focus:bg-premium-soft transition font-semibold placeholder:text-ink-quiet"
                />
              </div>
              <div className={`flex items-center justify-center ${satirBg}`}>
                {durum === 'yanlis' && sonuc === false && (
                  <Icon name="X" size={13} className="text-danger" />
                )}
                {durum === 'yanlis' && sonuc === true && (
                  <Icon name="Check" size={13} className="text-success" />
                )}
                {durum !== 'yanlis' && kayitlar.length > 2 && (
                  <button
                    onClick={() => satirSil(i)}
                    className="text-ink-quiet hover:text-danger transition p-1"
                  >
                    <Icon name="Trash2" size={12} />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Satır ekle */}
        <button
          onClick={satirEkle}
          className="w-full px-4 py-2 text-xs text-ink-mute hover:text-ink hover:bg-bg-tint transition flex items-center justify-center gap-2 border-b-2 border-line-strong font-semibold bg-bg-tint/50"
        >
          <Icon name="Plus" size={11} /> Satır Ekle
        </button>

        {/* Toplam */}
        <div className="grid grid-cols-[40px_120px_1fr_1.5fr_140px_140px_40px] gap-px bg-line">
          <div className="bg-surface-2 col-span-4 px-3 py-2.5 text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold text-right flex items-center justify-end">
            Toplam
          </div>
          <div
            className={`bg-surface-2 px-2 py-2.5 text-right font-mono text-sm font-bold ${esit ? 'text-success dark:text-success' : 'text-ink-soft'}`}
          >
            {paraFormat(toplamBorc) || '0,00'}
          </div>
          <div
            className={`bg-surface-2 px-2 py-2.5 text-right font-mono text-sm font-bold ${esit ? 'text-success dark:text-success' : 'text-ink-soft'}`}
          >
            {paraFormat(toplamAlacak) || '0,00'}
          </div>
          <div className="bg-surface-2 flex items-center justify-center">
            {esit && (
              <Icon
                name="CheckCircle2"
                size={13}
                className="text-success dark:text-success"
              />
            )}
          </div>
        </div>
        </div>
        </div>
      </div>

      {/* Canlı denge göstergesi + kontrol */}
      <div className="mt-5 flex flex-col sm:flex-row items-stretch gap-3">
        {(toplamBorc > 0 || toplamAlacak > 0) && (
          <div
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold whitespace-nowrap sm:min-w-[196px] transition-colors ${
              esit ? 'bg-success-soft text-success' : 'bg-premium-soft text-premium-deep'
            }`}
          >
            <Icon name={esit ? 'CheckCircle2' : 'Scale'} size={15} />
            {esit
              ? 'Borç = Alacak · Denk'
              : `Fark: ${paraFormat(Math.abs(toplamBorc - toplamAlacak))} ₺`}
          </div>
        )}
        <button
          onClick={kontrol}
          data-tour="kontrol"
          className="flex-1 bg-ink text-bg py-3.5 text-sm tracking-wide uppercase font-bold hover:bg-ink-soft dark:hover:bg-surface active:scale-[0.99] transition flex items-center justify-center gap-2 rounded-xl shadow-lg"
        >
          <Icon name="Zap" size={14} />
          Kaydı Kontrol Et
          <span className="hidden sm:inline font-mono text-[9px] opacity-60 ml-2">Ctrl+↵</span>
        </button>
      </div>

      {kontrolHatasi && (
        <div className="mt-3 px-4 py-2.5 border border-premium dark:border-premium-deep/40 bg-premium-soft text-premium-deep text-sm font-medium rounded-lg flex items-center gap-2">
          <Icon name="AlertTriangle" size={14} />
          {kontrolHatasi}
        </div>
      )}

      {/* Sonuç paneli — doğru cevap için yeni context-aware kutlama */}
      {durum === 'dogru' && kutlamaBaglami && (() => {
        // Bu çözümden kazanılan gerçek puan (sadece çözüm gör cezasını uygular)
        const kazanilan = cozumGosterildi ? 0 : ZORLUK_PUAN[soru.zorluk];
        const puanMesaji = cozulmusMu
          ? ''
          : kazanilan > 0
            ? `+${kazanilan} puan`
            : 'Çözümü gördüğün için puan kazanamadın.';
        return (
          <div className="mt-4">
            <CevapKutlama
              baglam={kutlamaBaglami}
              puanMesaji={puanMesaji}
              aciklama={soru.aciklama}
              cta={
                <button
                  onClick={sonraki}
                  className="flex items-center gap-2 text-sm bg-ink text-bg px-4 py-2 hover:bg-ink-soft dark:hover:bg-surface transition rounded-lg font-semibold"
                >
                  Sıradaki Soru <Icon name="ArrowRight" size={14} />
                </button>
              }
            />
          </div>
        );
      })()}
      {durum === 'yanlis' && yanlisAnaliz && (
        <div className="mt-4 space-y-4">
          <div className="p-5 border-l-4 border-danger dark:border-danger bg-danger-soft dark:bg-danger/10 rounded-xl">
            <div className="flex items-center gap-3 mb-3">
              <Icon name="X" size={20} className="text-danger dark:text-danger" />
              <div className="font-display text-lg font-bold">Kayıt doğru değil.</div>
            </div>

            {yanlisAnaliz.ozet.length > 0 && (
              <ul className="space-y-1.5 mb-3">
                {yanlisAnaliz.ozet.map((m, i) => (
                  <li
                    key={i}
                    className="text-sm text-ink-soft leading-relaxed font-medium flex gap-2"
                  >
                    <span className="text-danger dark:text-danger font-bold flex-shrink-0 mt-0.5">
                      ▸
                    </span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            )}

            {yanlisAnaliz.satirAnalizleri.some((s) => s.tip !== 'dogru') && (
              <details className="mt-3 group">
                <summary className="cursor-pointer text-[11px] tracking-[0.2em] uppercase font-bold text-ink-mute hover:text-ink inline-flex items-center gap-1.5">
                  <Icon
                    name="ChevronRight"
                    size={11}
                    className="transition group-open:rotate-90"
                  />
                  Satır satır detay
                </summary>
                <div className="mt-2 space-y-1.5 pl-3 border-l border-danger-soft dark:border-danger/40">
                  {yanlisAnaliz.satirAnalizleri
                    .filter((s) => s.tip !== 'dogru')
                    .map((s, i) => (
                      <div key={i} className="text-xs leading-relaxed">
                        <span className="font-mono font-bold text-ink-mute">
                          Satır {s.satirIdx + 1}:
                        </span>{' '}
                        <span className="text-ink-soft font-medium">
                          {s.mesaj}
                        </span>
                      </div>
                    ))}
                </div>
              </details>
            )}
          </div>

          {!aiMetin && !aiYukleniyor && !aiKotaDoldu && (
            <button
              onClick={aiAnalizCalistir}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-premium-soft to-premium-soft hover:from-premium-soft hover:to-premium-soft text-ink text-sm font-bold rounded-xl transition shadow-md"
            >
              <Icon name="Sparkles" size={14} />
              AI ile Yanlışını Anla
            </button>
          )}
          {aiYukleniyor && (
            <div className="flex items-center justify-center gap-2 px-4 py-4 bg-premium-soft/60 border border-premium/50 dark:border-premium-deep/40 rounded-xl text-sm text-premium-deep font-semibold">
              <Icon name="Loader2" size={14} className="animate-spin" />
              AI yanlışını analiz ediyor...
            </div>
          )}
          {aiMetin && (
            <div className="p-5 bg-gradient-to-br from-premium-soft to-bg border border-premium/50 dark:border-premium-deep/40 rounded-xl">
              <div className="flex items-center gap-2 mb-3 text-[10px] tracking-[0.2em] uppercase font-bold text-premium-deep">
                <Icon name="Sparkles" size={12} />
                AI Yanlış Analizi
              </div>
              <MarkdownLite text={aiMetin} />
              <button
                onClick={() => {
                  setAiMetin(null);
                  setAiHata(null);
                }}
                className="mt-3 text-xs text-ink-mute hover:text-ink font-semibold"
              >
                Kapat
              </button>
            </div>
          )}
          {aiKotaDoldu && (
            <div className="rounded-2xl border-2 border-dashed border-premium/70 dark:border-premium-deep/40 bg-gradient-to-br from-premium-soft to-bg p-6 text-center">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-full bg-gradient-to-br from-premium-soft to-premium-soft mb-3">
                <Icon name="Sparkles" size={18} className="text-premium-deep" />
              </div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-premium-deep font-bold mb-1">
                Günlük AI Hakkın Doldu
              </div>
              <h3 className="font-display text-lg font-bold tracking-tight mb-1">
                Bugün için 3 analiz yaptın
              </h3>
              <p className="text-[13px] text-ink-soft font-medium max-w-sm mx-auto mb-4">
                Free hesap günde 3 AI analizi alır. Premium ile sınırsız analiz,
                yanlışlarını her seferinde aynı detayda gör.
              </p>
              <button
                onClick={() => nav('/premium')}
                className="inline-flex items-center gap-2 bg-ink text-bg px-5 py-2 text-xs tracking-wide uppercase font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-md"
              >
                <Icon name="Sparkles" size={12} />
                Premium&apos;u Keşfet
              </button>
            </div>
          )}
          {aiHata && (
            <div className="text-sm text-danger dark:text-danger font-medium mt-2">
              AI yanıtı alınamadı: {aiHata}
            </div>
          )}
        </div>
      )}
        </div>{/* /sağ pane */}
      </div>{/* /iki pane */}

      {cozumAcik && <CozumModal soru={soru} onKapat={() => setCozumAcik(false)} />}
      {cozumOnayAcik && (
        <div
          className="fixed inset-0 z-[110] bg-ink/55 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
          onClick={() => setCozumOnayAcik(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-surface border border-danger-soft rounded-2xl shadow-2xl my-auto"
          >
            <div className="p-5 border-b border-line">
              <div className="flex items-center gap-2 text-danger mb-2">
                <Icon name="AlertTriangle" size={18} />
                <span className="font-mono text-[10px] tracking-[0.25em] uppercase font-bold">
                  Puan kaybı
                </span>
              </div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                Çözümü görmek üzeresin
              </h2>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-[14px] text-ink-soft leading-relaxed">
                Çözümü görürsen bu sorudan{' '}
                <strong className="text-danger dark:text-danger">0 puan</strong> alırsın
                (normalde {ZORLUK_PUAN[soru.zorluk]} puan).
              </p>
              <p className="text-[13px] text-ink-soft leading-relaxed">
                Önce kendin denemeyi tercih edersen modalı kapatabilirsin.
                Yardım için <span className="font-bold">AI Asistan</span> seçeneği var
                — puana etkisi yok.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 p-5 border-t border-line">
              <button
                onClick={() => setCozumOnayAcik(false)}
                className="px-4 py-2 text-[12px] font-bold text-ink-soft hover:bg-surface-2 rounded-lg transition"
              >
                Vazgeç
              </button>
              <button
                onClick={() => {
                  setCozumGosterildi(true);
                  setCozumOnayAcik(false);
                  setCozumAcik(true);
                }}
                className="inline-flex items-center gap-2 bg-danger hover:bg-danger dark:bg-danger dark:hover:bg-danger text-bg px-4 py-2 text-[12px] tracking-[0.2em] uppercase font-bold rounded-lg active:scale-[0.98] transition"
              >
                <Icon name="Eye" size={13} />
                Çözümü Göster (0 puan)
              </button>
            </div>
          </div>
        </div>
      )}
      {belgeAcik && belgeler && (
        <BelgeModal belgeler={belgeler} onKapat={() => setBelgeAcik(false)} />
      )}
      {hataAcik && (
        <HataBildirModal
          soruId={soru.id}
          soruBaslik={soru.baslik}
          onKapat={() => setHataAcik(false)}
        />
      )}
      <AIAsistanYanPanel
        acik={aiAsistanAcik}
        onKapat={() => setAiAsistanAcik(false)}
        baglam={{ soruBaslik: soru.baslik, senaryo: soru.senaryo }}
      />
      <KocTuru
        adimlar={kocTuruAdimlari}
        acik={kocTuruAcik}
        onKapat={kocTuruKapat}
      />
    </main>
  );
};

interface WrapperProps {
  ilerleme: Ilerleme;
  onCozuldu: (soru: Soru, yardim?: CozumYardim) => void;
  onYanlis: (soruId: string) => void;
  onHesapPlaniYanPanel: () => void;
  /** App.tsx'teki session-scoped ardışık doğru sayısı getter'ı */
  getSessionCombo: () => number;
}

export const SoruEkrani = ({
  ilerleme,
  onCozuldu,
  onYanlis,
  onHesapPlaniYanPanel,
  getSessionCombo,
}: WrapperProps) => {
  const { soruId } = useParams<{ soruId: string }>();
  const nav = useNavigate();
  const { user, yukleniyor } = useAuth();
  const { tumSorular, yukleniyor: uniteYukleniyor } = useUniteler();
  const soru = tumSorular.find((s) => s.id === soruId);

  useEffect(() => {
    if (!uniteYukleniyor && !soru) nav('/problemler', { replace: true });
  }, [soru, nav, uniteYukleniyor]);

  if (yukleniyor || uniteYukleniyor) {
    return (
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-16 flex items-center justify-center">
        <Icon name="Loader2" size={20} className="animate-spin text-ink-mute" />
      </main>
    );
  }

  if (!soru) return null;

  if (!user) return <GirisDuvari soru={soru} />;

  return (
    <SoruEkraniIci
      soru={soru}
      onCozuldu={onCozuldu}
      onYanlis={onYanlis}
      cozulmusMu={!!ilerleme.cozulenler[soru.id]}
      onHesapPlaniYanPanel={onHesapPlaniYanPanel}
      ilerleme={ilerleme}
      getSessionCombo={getSessionCombo}
    />
  );
};

const GirisDuvari = ({ soru }: { soru: SoruWithUnite }) => {
  const nav = useNavigate();
  const { uniteler } = useUniteler();
  const unite = uniteler.find((u) => u.id === soru.uniteId);

  const giriseGit = () => {
    authDonusYaz(`/problemler/${soru.id}`);
    nav('/giris');
  };

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <button
        onClick={() => nav('/problemler')}
        className="flex items-center gap-2 text-sm text-ink-mute hover:text-ink mb-8 font-semibold"
      >
        <Icon name="ArrowLeft" size={14} />
        <span>Tüm Problemler</span>
      </button>

      <div className="flex items-center gap-3 mb-3">
        {unite && <Thiings name={unite.thiingsIcon} size={24} />}
        <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold">
          {unite?.ad}
        </div>
        <span
          className={`text-[9px] tracking-[0.2em] uppercase font-bold ${ZORLUK_STIL[soru.zorluk]}`}
        >
          {ZORLUK_AD[soru.zorluk]} · {ZORLUK_PUAN[soru.zorluk]} puan
        </span>
      </div>
      <h1 className="font-display text-3xl md:text-4xl tracking-tight mb-4 font-bold">
        {soru.baslik}
      </h1>
      <p className="text-base text-ink-soft leading-relaxed font-medium mb-10">
        {soru.senaryo}
      </p>

      <div className="bg-surface border border-line rounded-2xl p-8 md:p-10 text-center">
        <div className="w-14 h-14 rounded-2xl bg-brand-soft dark:bg-brand-deep/20 flex items-center justify-center mx-auto mb-5">
          <Icon name="Lock" size={22} className="text-brand dark:text-brand-mute" />
        </div>
        <h2 className="font-display text-2xl font-bold tracking-tight mb-3">
          Soruyu çözmek için giriş yap
        </h2>
        <p className="text-sm text-ink-soft leading-relaxed font-medium max-w-md mx-auto mb-7">
          Ücretsiz hesap ile ilerlemeni kaydet, rozet kazan, seriyi büyüt. 30 saniyede
          başlayabilirsin.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={giriseGit}
            className="bg-brand-deep hover:bg-brand-deep dark:bg-brand text-bg px-6 py-3 text-sm tracking-wide uppercase font-bold transition inline-flex items-center justify-center gap-2 rounded-xl shadow-md"
          >
            <Icon name="LogIn" size={14} />
            Giriş Yap / Kayıt Ol
          </button>
          <button
            onClick={() => nav('/problemler')}
            className="border border-line-strong hover:border-ink px-6 py-3 text-sm tracking-wide uppercase font-bold transition inline-flex items-center justify-center gap-2 rounded-xl"
          >
            Soru Listesine Dön
          </button>
        </div>
      </div>
    </main>
  );
};
