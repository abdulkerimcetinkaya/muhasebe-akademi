import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { HESAP_PLANI } from '../data/hesap-plani';
import {
  muavinYarat,
  sonrakiMuavinKodu,
  cariGerektirir,
  type MuavinHesap,
} from '../lib/muavin';
import { aktifCarileriYukle, CARI_TIP_ETIKETLERI, type CariKart } from '../lib/cari';

interface Props {
  /** Modal açıldığında ön-seçili olacak ana hesap kodu (örn: 120). */
  anaKod: string;
  onKapat: () => void;
  onEklendi: (yeni: MuavinHesap) => void;
}

export const YeniMuavinModal = ({ anaKod: anaKodInit, onKapat, onEklendi }: Props) => {
  const [anaKod, setAnaKod] = useState(anaKodInit);
  const [kod, setKod] = useState('');
  const [ad, setAd] = useState('');
  const [cariId, setCariId] = useState('');
  const [cariler, setCariler] = useState<CariKart[]>([]);
  const [aciklama, setAciklama] = useState('');
  const [hata, setHata] = useState<string | null>(null);
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const cariZorunlu = cariGerektirir(anaKod);

  // Cari kartları bir kez yükle (cari seçici için)
  useEffect(() => {
    aktifCarileriYukle()
      .then(setCariler)
      .catch(() => {
        // sessizce geç — cari yoksa seçici boş kalır
      });
  }, []);

  // Ana hesap değişince kodu yeniden öner
  useEffect(() => {
    let iptal = false;
    if (!anaKod) {
      setKod('');
      return;
    }
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
    if (cariZorunlu && !cariId) {
      setHata(`Ana hesap ${anaKod} cari gerektirir — bir cari kart seç.`);
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const yeni = await muavinYarat({
        kod,
        ana_kod: anaKod,
        ad: ad.trim(),
        cari_id: cariId || null,
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

          {cariZorunlu && (
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                Cari Kart <span className="text-danger">*</span>
              </label>
              <select
                value={cariId}
                onChange={(e) => setCariId(e.target.value)}
                required
                className="w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
              >
                <option value="">— cari seç —</option>
                {cariler.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.unvan} ({CARI_TIP_ETIKETLERI[c.tip]})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-ink-mute mt-1">
                Bu ana hesap ({anaKod}) cari kart bağı gerektirir.
              </p>
            </div>
          )}

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
