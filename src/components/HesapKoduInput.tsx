import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { HESAP_PLANI } from '../data/hesap-plani';
import { useIsPremium } from '../contexts/AuthContext';
import { Icon } from './Icon';
import { grupEtiketi, type MuavinHesap } from '../lib/muavin';
import { YeniMuavinModal } from './YeniMuavinModal';
import type { Hesap } from '../types';

type Oneri =
  | { tip: 'ana'; hesap: Hesap }
  | { tip: 'muavin'; muavin: MuavinHesap };

interface Props {
  value: string;
  onChange: (v: string) => void;
  rowIndex: number;
  /** Aktif muavin listesi — parent'tan tek sefer yüklenip prop olarak geçilir. */
  muavinler?: MuavinHesap[];
  /** Soruya özel muavinler — global ile birleşip dropdown'da gösterilir. */
  soruyaOzelMuavinler?: { kod: string; ad: string }[];
  /** Admin context'inde true → dropdown'da "+ Yeni Muavin" butonu çıkar. */
  yeniMuavinEkleyebilir?: boolean;
  /** Yeni muavin eklendiğinde parent'ın listesini güncellemek için. */
  onMuavinEklendi?: (muavin: MuavinHesap) => void;
}

export const HesapKoduInput = ({
  value,
  onChange,
  rowIndex,
  muavinler = [],
  soruyaOzelMuavinler = [],
  yeniMuavinEkleyebilir = false,
  onMuavinEklendi,
}: Props) => {
  // Soruya özel muavinleri MuavinHesap (v2) formatına yükselt — global ile birleşir.
  // ana_kod muavin kodunun ilk parçasından türetilir (örn 100.001 → 100).
  // Grup etiketi ana_kod'dan türetilir (tip kolonu yok); id sentetik (DB satırı değil).
  const birlesikMuavinler = useMemo<MuavinHesap[]>(() => {
    const soruyaOzelMuavinHesaplar: MuavinHesap[] = soruyaOzelMuavinler.map(
      (m) => ({
        id: `soru:${m.kod}`,
        kod: m.kod,
        ad: m.ad,
        ana_kod: m.kod.includes('.') ? m.kod.split('.')[0] : m.kod,
        cari_id: null,
        varsayilan: false,
        isletme_id: null,
        olusturan_user_id: null,
        aciklama: null,
        sira: 0,
        aktif: true,
        created_at: '',
        updated_at: '',
      }),
    );
    const mevcutKodlar = new Set(muavinler.map((m) => m.kod));
    return [
      ...muavinler,
      ...soruyaOzelMuavinHesaplar.filter((m) => !mevcutKodlar.has(m.kod)),
    ];
  }, [muavinler, soruyaOzelMuavinler]);
  const nav = useNavigate();
  const isPremium = useIsPremium();
  const [dropdownAcik, setDropdownAcik] = useState(false);
  const [seciliIdx, setSeciliIdx] = useState(0);
  const [muavinModalAcik, setMuavinModalAcik] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  // Portal koordinatları — viewport'a göre fixed konum + akıllı flip (yukarı/aşağı)
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);

  const sayisalMi = /^[0-9.]+$/.test(value);

  const oneriler = useMemo<Oneri[]>(() => {
    if (!value || value.length === 0) return [];

    if (sayisalMi) {
      // Prefix-match: hem ana hesap hem muavin (Free + Premium)
      const anaHesaplar: Oneri[] = HESAP_PLANI.filter((h) =>
        h.kod.startsWith(value),
      ).map((h) => ({ tip: 'ana' as const, hesap: h }));
      const muavinSatirlari: Oneri[] = birlesikMuavinler
        .filter((m) => m.kod.startsWith(value))
        .map((m) => ({ tip: 'muavin' as const, muavin: m }));
      // Ana hesap önce, ardından muavinleri (gruplar halinde)
      const birlesik: Oneri[] = [];
      anaHesaplar.forEach((ah) => {
        birlesik.push(ah);
        const ahKod = ah.tip === 'ana' ? ah.hesap.kod : '';
        muavinSatirlari
          .filter((m) => m.tip === 'muavin' && m.muavin.ana_kod === ahKod)
          .forEach((m) => birlesik.push(m));
      });
      // Doğrudan muavin koduyla başlanmış olabilir (örn: "120.0") — eklenmemiş kalanları ekle
      muavinSatirlari.forEach((m) => {
        if (!birlesik.some((x) => x.tip === 'muavin' && x.muavin.kod === (m.tip === 'muavin' ? m.muavin.kod : ''))) {
          birlesik.push(m);
        }
      });
      return birlesik.slice(0, 10);
    }

    // Ad ile arama → Premium only
    if (!isPremium) return [];
    const q = value.toLocaleLowerCase('tr');
    const anaAd: Oneri[] = HESAP_PLANI.filter((h) =>
      h.ad.toLocaleLowerCase('tr').includes(q),
    ).map((h) => ({ tip: 'ana' as const, hesap: h }));
    const muavinAd: Oneri[] = birlesikMuavinler
      .filter((m) => m.ad.toLocaleLowerCase('tr').includes(q))
      .map((m) => ({ tip: 'muavin' as const, muavin: m }));
    return [...muavinAd, ...anaAd].slice(0, 10);
  }, [value, sayisalMi, birlesikMuavinler, isPremium]);

  // Ana hesap seçilmiş ve onun aktif muavinleri var mı? (uyarı için)
  const anaHesapUyari = useMemo(() => {
    if (!value || !/^[0-9]{3}$/.test(value)) return null;
    const muavinSayisi = muavinler.filter((m) => m.ana_kod === value).length;
    return muavinSayisi > 0 ? muavinSayisi : null;
  }, [value, muavinler]);

  useEffect(() => {
    setSeciliIdx(0);
  }, [value]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) {
        setDropdownAcik(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Portal pozisyonunu hesapla — dropdown açıldığında/öneriler değiştiğinde.
  // Varsayılan: aşağı aç. Sadece altta gerçekten yer kalmadıysa (160px'den az)
  // ve üstte daha fazla yer varsa yukarı aç. maxHeight ile içerik scroll edilir.
  useLayoutEffect(() => {
    if (!dropdownAcik || oneriler.length === 0 || !containerRef.current) {
      setDropdownPos(null);
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const istenenY = Math.min(384, oneriler.length * 38 + 24);
    const altSpace = window.innerHeight - rect.bottom - 16;
    const ustSpace = rect.top - 16;
    const altYetersiz = altSpace < 160;
    const yukariAc = altYetersiz && ustSpace > altSpace;
    const maxH = yukariAc
      ? Math.min(istenenY, ustSpace)
      : Math.min(istenenY, altSpace);
    setDropdownPos({
      top: yukariAc ? Math.max(8, rect.top - maxH - 4) : rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 380),
      maxHeight: maxH,
    });
  }, [dropdownAcik, oneriler.length]);

  // Scroll/resize'da dropdown'u kapat — pozisyon eski kalmasın.
  useEffect(() => {
    if (!dropdownAcik) return;
    const kapat = () => setDropdownAcik(false);
    window.addEventListener('scroll', kapat, true);
    window.addEventListener('resize', kapat);
    return () => {
      window.removeEventListener('scroll', kapat, true);
      window.removeEventListener('resize', kapat);
    };
  }, [dropdownAcik]);

  const oneriKodu = (o: Oneri): string =>
    o.tip === 'ana' ? o.hesap.kod : o.muavin.kod;

  const secim = (oneri: Oneri) => {
    onChange(oneriKodu(oneri));
    setDropdownAcik(false);
    setTimeout(() => {
      // Hesap seçildikten sonra açıklama alanına geç (varsa); yoksa borç.
      const aciklamaInput = document.querySelector<HTMLInputElement>(
        `[data-row="${rowIndex}"][data-col="aciklama"]`,
      );
      if (aciklamaInput) {
        aciklamaInput.focus();
        return;
      }
      const borcInput = document.querySelector<HTMLInputElement>(
        `[data-row="${rowIndex}"][data-col="borc"]`,
      );
      if (borcInput) borcInput.focus();
    }, 0);
  };

  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownAcik || oneriler.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSeciliIdx((seciliIdx + 1) % oneriler.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSeciliIdx((seciliIdx - 1 + oneriler.length) % oneriler.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (oneriler[seciliIdx]) {
        e.preventDefault();
        secim(oneriler[seciliIdx]);
      }
    } else if (e.key === 'Escape') {
      setDropdownAcik(false);
    }
  };

  // Modal için ön-doldurma: input'taki ana hesabı varsayılan al
  const modalAnaKod = useMemo(() => {
    if (/^[0-9]{3}$/.test(value)) return value;
    if (/^[0-9]{3}\.[0-9]+$/.test(value)) return value.split('.')[0];
    return '';
  }, [value]);

  const muavinEklendi = (yeni: MuavinHesap) => {
    onMuavinEklendi?.(yeni);
    onChange(yeni.kod);
    setMuavinModalAcik(false);
  };

  // Free kullanıcı için ad arama upsell çağrısı
  const adAramaUpsellGoster = !isPremium && !sayisalMi && value.length > 0;

  return (
    <>
      <div className="relative" ref={containerRef}>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value.trim());
            setDropdownAcik(true);
          }}
          onFocus={(e) => {
            // Input viewport'un altındaysa önce sayfayı kaydır (instant —
            // smooth scroll dropdown'u kapatan listener'ı tetikler), sonra
            // dropdown'u bir sonraki frame'de aç. Böylece dropdown daima
            // input'un altında ve görünür alanda açılır.
            const el = e.currentTarget;
            const rect = el.getBoundingClientRect();
            const altBosluk = window.innerHeight - rect.bottom;
            if (altBosluk < 240) {
              el.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
              requestAnimationFrame(() => setDropdownAcik(true));
            } else {
              setDropdownAcik(true);
            }
          }}
          onKeyDown={handleKey}
          placeholder={isPremium ? 'Kod / ad...' : 'Kod...'}
          data-row={rowIndex}
          data-col="kod"
          className={`w-full font-mono text-sm px-2 py-1.5 bg-bg-tint border border-transparent focus:border-ink focus:bg-surface outline-none transition ${adAramaUpsellGoster ? 'pr-7' : ''}`}
        />

        {/* Premium upsell — ad ile arama yapmaya çalışan free kullanıcı için */}
        {adAramaUpsellGoster && dropdownAcik && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              nav('/premium');
            }}
            title="Ad ile arama — Premium özellik"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded text-premium hover:bg-premium-soft transition"
          >
            <Icon name="Sparkles" size={12} />
          </button>
        )}

        {/* Ana hesap uyarısı — kayıt yapılamaz */}
        {anaHesapUyari && (
          <div className="absolute top-full left-0 right-0 mt-1 z-40 px-2 py-1.5 bg-premium-soft border border-premium rounded text-[11px] font-medium text-premium-deep flex items-center gap-1.5">
            <Icon name="AlertTriangle" size={11} className="flex-shrink-0" />
            <span>
              Ana hesaba kayıt yapılamaz — alt muavin seç ({anaHesapUyari} adet
              muavin var)
            </span>
          </div>
        )}

      </div>

      {/* Dropdown — portal ile body'ye render; parent overflow'a takılmaz, viewport'a göre konumlanır */}
      {dropdownAcik &&
        oneriler.length > 0 &&
        dropdownPos &&
        createPortal(
          <div
            ref={dropdownRef}
            className="autocomplete-dropdown bg-surface border border-ink/10 overflow-auto rounded-xl shadow-xl"
            style={{
              position: 'fixed',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              maxHeight: dropdownPos.maxHeight,
              zIndex: 100,
            }}
          >
            {oneriler.map((o, i) =>
              o.tip === 'ana' ? (
                <button
                  key={`a-${o.hesap.kod}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    secim(o);
                  }}
                  onMouseEnter={() => setSeciliIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left text-xs hover:bg-bg-tint ${i === seciliIdx ? 'bg-surface-2' : ''}`}
                >
                  <span className="font-mono font-semibold w-14">
                    {o.hesap.kod}
                  </span>
                  <span className="flex-1">{o.hesap.ad}</span>
                  <span
                    className={`text-[9px] tracking-widest uppercase font-semibold ${
                      o.hesap.tur === 'AKTİF'
                        ? 'text-brand dark:text-brand-mute'
                        : o.hesap.tur === 'PASİF'
                          ? 'text-premium-deep'
                          : o.hesap.tur === 'GELİR'
                            ? 'text-success dark:text-success'
                            : o.hesap.tur === 'GİDER'
                              ? 'text-danger dark:text-danger'
                              : 'text-ink-mute'
                    }`}
                  >
                    {o.hesap.tur}
                  </span>
                </button>
              ) : (
                <button
                  key={`m-${o.muavin.kod}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    secim(o);
                  }}
                  onMouseEnter={() => setSeciliIdx(i)}
                  className={`w-full flex items-center gap-3 px-3 py-2 pl-6 text-left text-xs hover:bg-bg-tint border-l-2 border-line ml-2 ${i === seciliIdx ? 'bg-surface-2' : ''}`}
                >
                  <span className="font-mono font-semibold w-16">
                    {o.muavin.kod}
                  </span>
                  <span className="flex-1">{o.muavin.ad}</span>
                  <span className="text-[9px] tracking-widest uppercase font-semibold text-ink-mute">
                    {grupEtiketi(o.muavin.ana_kod)}
                  </span>
                </button>
              ),
            )}

            {/* "+ Yeni Muavin" butonu — sadece admin */}
            {yeniMuavinEkleyebilir && modalAnaKod && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setDropdownAcik(false);
                  setMuavinModalAcik(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs border-t border-line text-brand dark:text-brand-mute hover:bg-brand-soft font-semibold"
              >
                <Icon name="PlusCircle" size={12} />
                <span>{modalAnaKod} altına yeni muavin ekle</span>
              </button>
            )}
          </div>,
          document.body,
        )}

      {muavinModalAcik && (
        <YeniMuavinModal
          anaKod={modalAnaKod}
          onKapat={() => setMuavinModalAcik(false)}
          onEklendi={muavinEklendi}
        />
      )}
    </>
  );
};
