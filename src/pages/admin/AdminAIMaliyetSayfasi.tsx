import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import { supabase } from '../../lib/supabase';

// Gemini 2.5 Flash fiyatlandırması (USD / 1M token)
const FIYAT_INPUT_USD_PER_M = 0.30;
const FIYAT_OUTPUT_USD_PER_M = 2.50;

// Ücretsiz tier toplamı: Gemini 2.5 Flash (250) + 2.0 Flash fallback (1500) + 2.5 Flash Lite (1500)
const FREE_TIER_TOPLAM_GUNLUK = 3250;

// Varsayılan USD/TL — admin değiştirebilir (localStorage'da saklanır)
const VARSAYILAN_USD_TL = 40;

type Ozellik = 'yanlis_analizi' | 'asistan' | 'belge_uret';

interface GunlukSatir {
  gun: string;
  ozellik: Ozellik;
  cagri_sayisi: number;
  toplam_input_token: number;
  toplam_output_token: number;
  free_cagri: number;
  premium_cagri: number;
}

const OZELLIK_ETIKETI: Record<Ozellik, string> = {
  yanlis_analizi: 'Yanlış Analizi',
  asistan: 'AI Asistan (Chat)',
  belge_uret: 'Belge Üretimi',
};

const OZELLIK_ICON: Record<Ozellik, string> = {
  yanlis_analizi: 'Brain',
  asistan: 'MessageCircle',
  belge_uret: 'FileText',
};

const cagriUSDMaliyet = (inputToken: number, outputToken: number): number => {
  return (
    (inputToken * FIYAT_INPUT_USD_PER_M + outputToken * FIYAT_OUTPUT_USD_PER_M) / 1_000_000
  );
};

/**
 * Ücretsiz tier sonrası NET maliyet — günlük çağrı sayısı 3250'nin altındaysa 0,
 * üstündeyse paid kısmın oranı kadar brüt maliyetin parçası.
 *
 * Yaklaşım: paid çağrıların oranı kadar gün-içi maliyet alınır (yaklaşık).
 * Gerçek paid çağrıların hangileri olduğunu log'lara bakmadan bilemeyiz,
 * o yüzden günün ortalama maliyeti × paid oran ile yaklaşık değer üretilir.
 */
const gunlukNetMaliyetUSD = (cagri: number, brutUSD: number): number => {
  if (cagri <= FREE_TIER_TOPLAM_GUNLUK) return 0;
  const paidCagri = cagri - FREE_TIER_TOPLAM_GUNLUK;
  return brutUSD * (paidCagri / cagri);
};

const formatPara = (tl: number): string => {
  if (tl < 1) return `${(tl * 100).toFixed(1)} krş`;
  return `${tl.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;
};

const formatToken = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString('tr-TR');
};

const bugunISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const AdminAIMaliyetSayfasi = () => {
  const [satirlar, setSatirlar] = useState<GunlukSatir[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [usdTl, setUsdTl] = useState<number>(() => {
    const saved = localStorage.getItem('mli_admin_usd_tl');
    return saved ? Number(saved) || VARSAYILAN_USD_TL : VARSAYILAN_USD_TL;
  });

  useEffect(() => {
    let aktif = true;
    const yukle = async () => {
      setYukleniyor(true);
      setHata(null);
      try {
        const yediGunOnce = new Date();
        yediGunOnce.setDate(yediGunOnce.getDate() - 7);
        const yediGunIso = yediGunOnce.toISOString().slice(0, 10);

        const { data, error } = await supabase
          .from('ai_log_gunluk')
          .select('*')
          .gte('gun', yediGunIso)
          .order('gun', { ascending: false });

        if (error) throw new Error(error.message);
        if (!aktif) return;
        setSatirlar((data as GunlukSatir[]) ?? []);
      } catch (e) {
        if (aktif) setHata((e as Error).message);
      } finally {
        if (aktif) setYukleniyor(false);
      }
    };
    yukle();
    return () => {
      aktif = false;
    };
  }, []);

  const usdTlGuncelle = (v: number) => {
    setUsdTl(v);
    localStorage.setItem('mli_admin_usd_tl', String(v));
  };

  // Bugünkü toplamlar
  const bugun = bugunISO();
  const bugunSatirlari = useMemo(
    () => satirlar.filter((s) => s.gun === bugun),
    [satirlar, bugun],
  );

  const bugunToplam = useMemo(() => {
    let cagri = 0,
      input = 0,
      output = 0,
      freecagri = 0;
    for (const s of bugunSatirlari) {
      cagri += s.cagri_sayisi;
      input += s.toplam_input_token;
      output += s.toplam_output_token;
      freecagri += s.free_cagri;
    }
    return { cagri, input, output, freecagri };
  }, [bugunSatirlari]);

  const bugunBrutUSD = cagriUSDMaliyet(bugunToplam.input, bugunToplam.output);
  const bugunBrutTL = bugunBrutUSD * usdTl;
  const bugunNetUSD = gunlukNetMaliyetUSD(bugunToplam.cagri, bugunBrutUSD);
  const bugunNetTL = bugunNetUSD * usdTl;
  const bugunUcretsizMi = bugunToplam.cagri <= FREE_TIER_TOPLAM_GUNLUK;

  // Ücretsiz tier sayacı (eksiden 0'a, 0 = bitti)
  const freeSayac = bugunToplam.cagri - FREE_TIER_TOPLAM_GUNLUK;
  const freeKalan = Math.max(0, -freeSayac);
  const freeYuzde = Math.min(100, (bugunToplam.cagri / FREE_TIER_TOPLAM_GUNLUK) * 100);

  // Son 7 gün — her gün için NET maliyet hesapla (ücretsiz tier sonrası)
  const yedigunNet = useMemo(() => {
    const gunler: Record<string, { cagri: number; input: number; output: number }> = {};
    for (const s of satirlar) {
      if (!gunler[s.gun]) gunler[s.gun] = { cagri: 0, input: 0, output: 0 };
      gunler[s.gun].cagri += s.cagri_sayisi;
      gunler[s.gun].input += s.toplam_input_token;
      gunler[s.gun].output += s.toplam_output_token;
    }
    let toplamNetUSD = 0;
    let toplamBrutUSD = 0;
    let gunSayisi = 0;
    for (const v of Object.values(gunler)) {
      const brut = cagriUSDMaliyet(v.input, v.output);
      toplamBrutUSD += brut;
      toplamNetUSD += gunlukNetMaliyetUSD(v.cagri, brut);
      gunSayisi += 1;
    }
    return { toplamNetUSD, toplamBrutUSD, gunSayisi };
  }, [satirlar]);

  const aylikTahminTL =
    yedigunNet.gunSayisi > 0
      ? (yedigunNet.toplamNetUSD / yedigunNet.gunSayisi) * 30 * usdTl
      : 0;
  const aylikBrutTahminTL =
    yedigunNet.gunSayisi > 0
      ? (yedigunNet.toplamBrutUSD / yedigunNet.gunSayisi) * 30 * usdTl
      : 0;

  // Bugünkü özellik bazında dağılım
  const ozellikDagilim = useMemo(() => {
    const map: Record<string, { cagri: number; input: number; output: number }> = {};
    for (const s of bugunSatirlari) {
      const k = s.ozellik;
      if (!map[k]) map[k] = { cagri: 0, input: 0, output: 0 };
      map[k].cagri += s.cagri_sayisi;
      map[k].input += s.toplam_input_token;
      map[k].output += s.toplam_output_token;
    }
    return Object.entries(map) as [Ozellik, { cagri: number; input: number; output: number }][];
  }, [bugunSatirlari]);

  // Son 7 gün → günlük tabloya çevir
  const gunlukOzet = useMemo(() => {
    const map: Record<string, { cagri: number; input: number; output: number }> = {};
    for (const s of satirlar) {
      if (!map[s.gun]) map[s.gun] = { cagri: 0, input: 0, output: 0 };
      map[s.gun].cagri += s.cagri_sayisi;
      map[s.gun].input += s.toplam_input_token;
      map[s.gun].output += s.toplam_output_token;
    }
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [satirlar]);

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0 space-y-8">
        <AdminSayfaBaslik
          baslik="AI Maliyet İzleme"
          aciklama="Gemini 2.5 Flash çağrı maliyeti — bugün ve son 7 gün."
          aksiyon={
            <label className="flex items-center gap-2 text-xs text-ink-mute font-semibold">
              USD/TL:
              <input
                type="number"
                min={1}
                max={200}
                step={0.5}
                value={usdTl}
                onChange={(e) => usdTlGuncelle(Number(e.target.value) || VARSAYILAN_USD_TL)}
                className="w-20 px-2 py-1 border border-line rounded-lg bg-surface text-ink text-sm font-mono"
              />
            </label>
          }
        />

        {hata && (
          <div className="rounded-xl border border-danger/40 bg-danger-soft p-4 text-sm text-danger font-medium">
            Yükleme hatası: {hata}
          </div>
        )}

        {/* 4 büyük metrik kartı */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                Bugün toplam çağrı
              </div>
              <Icon name="Zap" size={16} className="text-brand" />
            </div>
            <div className="font-display text-3xl font-bold tracking-tight">
              {yukleniyor ? '—' : bugunToplam.cagri.toLocaleString('tr-TR')}
            </div>
            <div className="text-[11px] text-ink-mute font-medium mt-1">
              {bugunToplam.freecagri} free · {bugunToplam.cagri - bugunToplam.freecagri} premium
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                Bugün net maliyet
              </div>
              <Icon name="DollarSign" size={16} className="text-success" />
            </div>
            <div className="font-display text-3xl font-bold tracking-tight">
              {yukleniyor ? '—' : bugunUcretsizMi ? '0 ₺' : formatPara(bugunNetTL)}
            </div>
            <div className="text-[11px] text-ink-mute font-medium mt-1">
              {bugunUcretsizMi ? (
                <span>Ücretsiz tier dahilinde — cebinden çıkmıyor</span>
              ) : (
                <span className="font-mono">
                  ${bugunNetUSD.toFixed(4)} (paid kısım)
                </span>
              )}
            </div>
            <div className="text-[10px] text-ink-mute font-mono mt-1">
              Brüt token maliyeti: {formatPara(bugunBrutTL)} · {formatToken(bugunToplam.input)} in / {formatToken(bugunToplam.output)} out
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                Ücretsiz tier sayacı
              </div>
              <Icon
                name={freeSayac >= 0 ? 'AlertTriangle' : 'CheckCircle2'}
                size={16}
                className={freeSayac >= 0 ? 'text-danger' : 'text-success'}
              />
            </div>
            <div className={`font-display text-3xl font-bold tracking-tight font-mono ${freeSayac >= 0 ? 'text-danger' : 'text-success'}`}>
              {yukleniyor ? '—' : (freeSayac > 0 ? '+' : '') + freeSayac.toLocaleString('tr-TR')}
            </div>
            <div className="text-[11px] text-ink-mute font-medium mt-1">
              {freeSayac < 0
                ? `${freeKalan.toLocaleString('tr-TR')} ücretsiz hak kaldı`
                : freeSayac === 0
                ? 'Ücretsiz tier tükendi'
                : `${freeSayac.toLocaleString('tr-TR')} çağrı paid tier'da`}
            </div>
            <div className="mt-3 h-1.5 bg-surface-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${freeSayac >= 0 ? 'bg-danger' : 'bg-success'}`}
                style={{ width: `${freeYuzde}%` }}
              />
            </div>
          </div>

          <div className="bg-surface border border-line rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                Aylık net tahmin
              </div>
              <Icon name="TrendingUp" size={16} className="text-brand" />
            </div>
            <div className="font-display text-3xl font-bold tracking-tight">
              {yukleniyor ? '—' : aylikTahminTL <= 0 ? '0 ₺' : formatPara(aylikTahminTL)}
            </div>
            <div className="text-[11px] text-ink-mute font-medium mt-1">
              {aylikTahminTL <= 0
                ? 'Ücretsiz tier yetiyor — paid maliyet beklenmiyor'
                : 'Son 7 günün net günlük ortalaması × 30'}
            </div>
            <div className="text-[10px] text-ink-mute font-mono mt-1">
              Brüt token maliyeti: {formatPara(aylikBrutTahminTL)}
            </div>
          </div>
        </section>

        {/* Bugün özellik bazında dağılım */}
        <section>
          <h2 className="font-display text-xl font-bold tracking-tight mb-3">
            Bugün — Özellik bazında
          </h2>
          {yukleniyor ? (
            <div className="text-sm text-ink-mute">Yükleniyor…</div>
          ) : ozellikDagilim.length === 0 ? (
            <div className="text-sm text-ink-mute bg-surface border border-line rounded-xl p-6 text-center">
              Bugün henüz AI çağrısı yapılmamış.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(['yanlis_analizi', 'asistan', 'belge_uret'] as Ozellik[]).map((ozellik) => {
                const veri = ozellikDagilim.find(([k]) => k === ozellik)?.[1];
                const maliyetUSD = veri ? cagriUSDMaliyet(veri.input, veri.output) : 0;
                const maliyetTL = maliyetUSD * usdTl;
                return (
                  <div key={ozellik} className="bg-surface border border-line rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon name={OZELLIK_ICON[ozellik]} size={14} className="text-brand" />
                      <div className="text-[11px] tracking-[0.15em] uppercase text-ink-mute font-bold">
                        {OZELLIK_ETIKETI[ozellik]}
                      </div>
                    </div>
                    <div className="font-display text-2xl font-bold tracking-tight mb-1">
                      {veri?.cagri ?? 0} <span className="text-sm text-ink-mute font-semibold">çağrı</span>
                    </div>
                    <div className="text-[13px] text-ink-soft font-semibold">
                      {formatPara(maliyetTL)} <span className="text-ink-mute font-mono text-[11px]">(${maliyetUSD.toFixed(4)})</span>
                    </div>
                    <div className="text-[10px] text-ink-mute font-mono mt-1">
                      {formatToken(veri?.input ?? 0)} in · {formatToken(veri?.output ?? 0)} out
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Son 7 gün tablo */}
        <section>
          <h2 className="font-display text-xl font-bold tracking-tight mb-3">
            Son 7 gün
          </h2>
          {yukleniyor ? (
            <div className="text-sm text-ink-mute">Yükleniyor…</div>
          ) : gunlukOzet.length === 0 ? (
            <div className="text-sm text-ink-mute bg-surface border border-line rounded-xl p-6 text-center">
              Son 7 günde AI çağrısı yok.
            </div>
          ) : (
            <div className="bg-surface border border-line rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-2 text-[10px] tracking-[0.15em] uppercase text-ink-mute font-bold">
                  <tr>
                    <th className="text-left px-4 py-3">Gün</th>
                    <th className="text-right px-4 py-3">Çağrı</th>
                    <th className="text-right px-4 py-3">Input token</th>
                    <th className="text-right px-4 py-3">Output token</th>
                    <th className="text-right px-4 py-3">Net (ödenen)</th>
                    <th className="text-right px-4 py-3 text-ink-mute/70">Brüt token</th>
                  </tr>
                </thead>
                <tbody>
                  {gunlukOzet.map(([gun, v]) => {
                    const brutUSD = cagriUSDMaliyet(v.input, v.output);
                    const netUSD = gunlukNetMaliyetUSD(v.cagri, brutUSD);
                    const ucretsiz = v.cagri <= FREE_TIER_TOPLAM_GUNLUK;
                    return (
                      <tr key={gun} className="border-t border-line">
                        <td className="px-4 py-3 font-mono text-xs text-ink">{gun}</td>
                        <td className="px-4 py-3 text-right font-mono">{v.cagri}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink-soft">{formatToken(v.input)}</td>
                        <td className="px-4 py-3 text-right font-mono text-ink-soft">{formatToken(v.output)}</td>
                        <td className={`px-4 py-3 text-right font-semibold ${ucretsiz ? 'text-success' : 'text-ink'}`}>
                          {ucretsiz ? '0 ₺' : formatPara(netUSD * usdTl)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[11px] text-ink-mute">
                          {formatPara(brutUSD * usdTl)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Fiyatlandırma referansı */}
        <section>
          <h2 className="font-display text-xl font-bold tracking-tight mb-3">
            Fiyatlandırma referansı
          </h2>
          <div className="bg-surface border border-line rounded-2xl p-5 text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-ink-soft font-medium">Gemini 2.5 Flash — input</span>
              <span className="font-mono font-semibold">${FIYAT_INPUT_USD_PER_M.toFixed(2)} / 1M token</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-ink-soft font-medium">Gemini 2.5 Flash — output</span>
              <span className="font-mono font-semibold">${FIYAT_OUTPUT_USD_PER_M.toFixed(2)} / 1M token</span>
            </div>
            <div className="flex items-center justify-between border-t border-line pt-2 mt-2">
              <span className="text-ink-soft font-medium">Ücretsiz tier toplam (3 model)</span>
              <span className="font-mono font-semibold">{FREE_TIER_TOPLAM_GUNLUK.toLocaleString('tr-TR')} çağrı/gün</span>
            </div>
            <div className="text-[11px] text-ink-mute pt-2 space-y-1.5">
              <div>
                <strong className="text-ink-soft">Net (ödenen):</strong> Günlük çağrı sayısı 3.250'nin
                altındaysa <strong>0 ₺</strong> — ücretsiz tier dahilindedir, cebinden çıkmaz.
                Üstüne çıkılırsa sadece aşan kısmın oranı kadar token maliyeti hesaplanır.
              </div>
              <div>
                <strong className="text-ink-soft">Brüt token:</strong> "Ücretsiz tier olmasaydı bu kadar
                tutardı" — referans amaçlı, gerçek harcama değil.
              </div>
              <div>
                Stream çağrıları için token sayısı karakter/4 yaklaşımıyla tahmin edilir (gerçek ±%10).
                Pricing Google'ın güncel sayfasına göre değişebilir.
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};
