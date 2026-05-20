import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { HESAP_PLANI } from '../data/hesap-plani';
import {
  MUAVIN_SINIFLARI,
  TIP_LISTESI,
  muavinYarat,
  sonrakiMuavinKodu,
  type MuavinHesap,
} from '../lib/muavin';
import type { MuavinTip } from '../lib/database.types';

interface Props {
  /** Modal açıldığında ön-seçili olacak ana hesap kodu (örn: 120). */
  anaKod: string;
  onKapat: () => void;
  onEklendi: (yeni: MuavinHesap) => void;
}

/** Ana hesap kodunun ilk 2 hanesinden TDHP grup kodunu türetir (120 → '12'). */
const tipTahmini = (anaKod: string): MuavinTip => {
  const prefix = anaKod.slice(0, 2);
  if ((TIP_LISTESI as string[]).includes(prefix)) return prefix as MuavinTip;
  return '10'; // fallback: Hazır Değerler
};

export const YeniMuavinModal = ({ anaKod: anaKodInit, onKapat, onEklendi }: Props) => {
  const [anaKod, setAnaKod] = useState(anaKodInit);
  const [kod, setKod] = useState('');
  const [ad, setAd] = useState('');
  const [tip, setTip] = useState<MuavinTip>(tipTahmini(anaKodInit));
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Ana hesap değişince kod ve tipi yeniden öner
  useEffect(() => {
    let iptal = false;
    if (!anaKod) {
      setKod('');
      return;
    }
    setTip(tipTahmini(anaKod));
    sonrakiMuavinKodu(anaKod)
      .then((onerilen) => {
        if (!iptal) setKod(onerilen);
      })
      .catch(() => {
        if (!iptal) setKod(`${anaKod}.001`);
      });
    return () => {
      iptal = true;
    };
  }, [anaKod]);

  // ESC ile kapatma
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onKapat();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onKapat]);

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anaKod || !kod || !ad.trim()) {
      setHata('Ana hesap, kod ve ad zorunlu.');
      return;
    }
    if (!/^[0-9]{3}(\.[0-9]+)+$/.test(kod)) {
      setHata('Kod sadece numerik olabilir (örn: 120.001).');
      return;
    }
    if (!kod.startsWith(anaKod + '.')) {
      setHata(`Kod, ana hesap (${anaKod}) ile başlamalı.`);
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const yeni = await muavinYarat({
        kod,
        ana_kod: anaKod,
        ad: ad.trim(),
        tip,
        aciklama: aciklama.trim() || null,
      });
      onEklendi(yeni);
    } catch (err) {
      setHata(`Eklenemedi: ${(err as Error).message}`);
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      onClick={onKapat}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-line rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              Yeni Muavin Ekle
            </h2>
            <p className="text-[12px] text-ink-mute mt-0.5">
              Bu cariyi/alt hesabı bir kez ekle, tüm sorularda kullanabil.
            </p>
          </div>
          <button
            onClick={onKapat}
            className="p-1.5 hover:bg-surface-2 rounded-lg transition"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <form onSubmit={kaydet} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                Ana Hesap
              </label>
              <select
                value={anaKod}
                onChange={(e) => setAnaKod(e.target.value)}
                required
                className="w-full px-2.5 py-2 bg-bg-tint border border-line-strong rounded-lg text-[13px] font-medium outline-none focus:border-ink"
              >
                <option value="">— seç —</option>
                {HESAP_PLANI.map((h) => (
                  <option key={h.kod} value={h.kod}>
                    {h.kod} — {h.ad}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                Muavin Kodu
              </label>
              <input
                type="text"
                value={kod}
                onChange={(e) => setKod(e.target.value)}
                required
                placeholder="120.001"
                className="w-full px-2.5 py-2 bg-bg-tint border border-line-strong rounded-lg text-[13px] font-mono outline-none focus:border-ink"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
              Ad
            </label>
            <input
              type="text"
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              autoFocus
              required
              placeholder="ABC Ticaret Ltd. Şti."
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
              Tip
            </label>
            <select
              value={tip}
              onChange={(e) => setTip(e.target.value as MuavinTip)}
              required
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
            >
              {MUAVIN_SINIFLARI.map((s) => (
                <optgroup key={s.sinif} label={s.etiket}>
                  {s.gruplar.map((g) => (
                    <option key={g.kod} value={g.kod}>
                      {g.etiket}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
              Açıklama (opsiyonel)
            </label>
            <input
              type="text"
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              placeholder="Vergi no: 1234567890, vb."
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-[13px] font-medium outline-none focus:border-ink"
            />
          </div>

          {hata && (
            <div className="flex items-start gap-2 p-2.5 bg-danger-soft border border-danger-soft rounded-lg text-[12px] text-danger font-medium">
              <Icon name="AlertCircle" size={14} className="flex-shrink-0 mt-0.5" />
              <span>{hata}</span>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onKapat}
              className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold border border-line-strong rounded-lg hover:bg-bg-tint transition"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={kaydediliyor}
              className="inline-flex items-center gap-2 bg-ink text-bg px-5 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
            >
              <Icon
                name={kaydediliyor ? 'Loader2' : 'Plus'}
                size={12}
                className={kaydediliyor ? 'animate-spin' : ''}
              />
              {kaydediliyor ? 'Ekleniyor' : 'Ekle ve Seç'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
