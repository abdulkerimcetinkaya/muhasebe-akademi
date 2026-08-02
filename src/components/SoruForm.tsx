import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { HesapKoduInput } from './HesapKoduInput';
import { BelgeEditor } from './BelgeEditor';
import { supabase } from '../lib/supabase';
import { aktifMuavinleriYukle, type MuavinHesap } from '../lib/muavin';
import { hesapAdiBul } from '../lib/hesap';
import type {
  ModulAltBaslikRow,
  SoruDurum,
  UniteModuluRow,
  UnitesRow,
  Zorluk,
} from '../lib/database.types';
import type { Belge } from '../types';

export interface SoruFormDegerleri {
  id: string;
  isletme_id: string;
  konu_id: string;
  alt_baslik_id: string;
  baslik: string;
  zorluk: Zorluk;
  senaryo: string;
  ipucu: string;
  aciklama: string;
  durum: SoruDurum;
  kaynak: string;
  cozumler: { kod: string; borc: string; alacak: string }[];
  belgeler: Belge[];
}

export const bosForm = (): SoruFormDegerleri => ({
  id: '',
  isletme_id: '',
  konu_id: '',
  alt_baslik_id: '',
  baslik: '',
  zorluk: 'kolay',
  senaryo: '',
  ipucu: '',
  aciklama: '',
  durum: 'taslak',
  kaynak: 'manuel',
  cozumler: [
    { kod: '', borc: '', alacak: '' },
    { kod: '', borc: '', alacak: '' },
  ],
  belgeler: [],
});

interface Props {
  baslangic: SoruFormDegerleri;
  duzenleme: boolean;
  onKaydet: (degerler: SoruFormDegerleri) => Promise<void>;
  onIptal: () => void;
}

export const SoruForm = ({ baslangic, duzenleme, onKaydet, onIptal }: Props) => {
  const [d, setD] = useState<SoruFormDegerleri>(baslangic);
  const [uniteler, setUniteler] = useState<UnitesRow[]>([]);
  const [moduller, setModuller] = useState<UniteModuluRow[]>([]);
  const [altBasliklar, setAltBasliklar] = useState<ModulAltBaslikRow[]>([]);
  const [muavinler, setMuavinler] = useState<MuavinHesap[]>([]);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('isletmeler')
      .select('*')
      .order('sira')
      .then(({ data }) => {
        if (data) setUniteler(data);
      });
    aktifMuavinleriYukle()
      .then(setMuavinler)
      .catch(() => {
        // sessizce geç — muavin yoksa form yine çalışır
      });
  }, []);

  const muavinEklendi = (yeni: MuavinHesap) => {
    setMuavinler((p) => [...p, yeni].sort((a, b) => a.kod.localeCompare(b.kod)));
  };

  // İşletme değişince modülleri + alt başlıkları yükle. alt_baslik_id işletme ile uyumsuzsa sıfırla.
  useEffect(() => {
    if (!d.isletme_id) {
      setModuller([]);
      setAltBasliklar([]);
      if (d.alt_baslik_id) setD((p) => ({ ...p, alt_baslik_id: '' }));
      return;
    }
    let iptal = false;
    (async () => {
      const { data: modData } = await supabase
        .from('isletme_modulleri')
        .select('*')
        .eq('isletme_id', d.isletme_id)
        .order('sira');
      if (iptal) return;
      const modList = (modData ?? []) as UniteModuluRow[];
      setModuller(modList);
      if (modList.length === 0) {
        setAltBasliklar([]);
        if (d.alt_baslik_id) setD((p) => ({ ...p, alt_baslik_id: '' }));
        return;
      }
      const { data: altData } = await supabase
        .from('modul_alt_basliklari')
        .select('*')
        .in('modul_id', modList.map((m) => m.id))
        .order('sira');
      if (iptal) return;
      const altList = (altData ?? []) as ModulAltBaslikRow[];
      setAltBasliklar(altList);
      if (d.alt_baslik_id && !altList.some((a) => a.id === d.alt_baslik_id)) {
        setD((p) => ({ ...p, alt_baslik_id: '' }));
      }
    })();
    return () => {
      iptal = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.isletme_id]);

  const toplamBorc = useMemo(
    () => d.cozumler.reduce((acc, c) => acc + (parseFloat(c.borc) || 0), 0),
    [d.cozumler],
  );
  const toplamAlacak = useMemo(
    () => d.cozumler.reduce((acc, c) => acc + (parseFloat(c.alacak) || 0), 0),
    [d.cozumler],
  );
  const dengeli = toplamBorc > 0 && Math.abs(toplamBorc - toplamAlacak) < 0.01;

  const guncelleCozum = (idx: number, alan: 'kod' | 'borc' | 'alacak', deger: string) => {
    setD((p) => ({
      ...p,
      cozumler: p.cozumler.map((c, i) => (i === idx ? { ...c, [alan]: deger } : c)),
    }));
  };

  const ekleSatir = () => {
    setD((p) => ({ ...p, cozumler: [...p.cozumler, { kod: '', borc: '', alacak: '' }] }));
  };

  const silSatir = (idx: number) => {
    if (d.cozumler.length <= 2) return;
    setD((p) => ({ ...p, cozumler: p.cozumler.filter((_, i) => i !== idx) }));
  };

  const dogrula = (): string | null => {
    if (duzenleme && !d.id.trim()) return 'ID gerekli.';
    if (!d.isletme_id) return 'İşletme seç.';
    if (!d.baslik.trim()) return 'Başlık gerekli.';
    if (!d.senaryo.trim()) return 'Senaryo gerekli.';
    const dolular = d.cozumler.filter((c) => c.kod.trim());
    if (dolular.length < 2) return 'En az 2 çözüm satırı gerekli.';
    // Muavin format zorunlu: ana hesaba (örn "153") doğrudan kayıt yasak.
    // Sadece muavin kodları (153.001, 120.002...) kabul edilir.
    const muavinFormat = /^[0-9]{3}(\.[0-9]+)+$/;
    for (const c of dolular) {
      const kod = c.kod.trim();
      if (!muavinFormat.test(kod)) {
        return `${kod}: Ana hesaba kayıt yapılamaz. Muavin kodu kullan (örn. ${kod}.001).`;
      }
      const b = parseFloat(c.borc) || 0;
      const a = parseFloat(c.alacak) || 0;
      if (b > 0 && a > 0) return `${kod}: bir satır ya borç ya alacak olur.`;
      if (b === 0 && a === 0) return `${kod}: borç veya alacak girmelisin.`;
    }
    if (!dengeli) return `Borç (${toplamBorc}) ve alacak (${toplamAlacak}) eşit değil.`;
    return null;
  };

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    const v = dogrula();
    if (v) {
      setHata(v);
      return;
    }
    setKaydediliyor(true);
    try {
      await onKaydet(d);
    } catch (err) {
      setHata(err instanceof Error ? err.message : String(err));
    } finally {
      setKaydediliyor(false);
    }
  };

  return (
    <form onSubmit={gonder} className="space-y-6">
      {/* Üst meta */}
      <div className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className={`grid grid-cols-1 ${duzenleme ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4`}>
          {duzenleme && (
            <div>
              <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
                ID
              </label>
              <input
                type="text"
                value={d.id}
                disabled
                className="w-full px-3 py-2 bg-surface-2 border border-line-strong outline-none text-sm rounded-lg font-mono opacity-70"
              />
            </div>
          )}
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
              İşletme *
            </label>
            <select
              value={d.isletme_id}
              onChange={(e) => setD({ ...d, isletme_id: e.target.value })}
              required
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded-lg font-medium"
            >
              <option value="">— Seç —</option>
              {uniteler.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.ad}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
              Zorluk
            </label>
            <select
              value={d.zorluk}
              onChange={(e) => setD({ ...d, zorluk: e.target.value as Zorluk })}
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
            >
              <option value="kolay">Kolay</option>
              <option value="orta">Orta</option>
              <option value="zor">Zor</option>
            </select>
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
            Atölye Alt Başlığı{' '}
            <span className="text-ink-quiet font-normal normal-case tracking-normal">
              (opsiyonel — yeni atölye yapısı, sıralı modül akışı)
            </span>
          </label>
          <select
            value={d.alt_baslik_id}
            onChange={(e) => setD({ ...d, alt_baslik_id: e.target.value })}
            disabled={!d.isletme_id || altBasliklar.length === 0}
            className="w-full px-3 py-2 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded-lg font-medium disabled:opacity-50"
          >
            <option value="">
              {!d.isletme_id
                ? '— Önce işletme seç —'
                : moduller.length === 0
                  ? '— Bu işletmede modül yok —'
                  : '— Alt başlık seçme (işletme seviyesinde kalsın) —'}
            </option>
            {moduller.map((m) => {
              const modulAltlari = altBasliklar.filter((a) => a.modul_id === m.id);
              if (modulAltlari.length === 0) return null;
              return (
                <optgroup
                  key={m.id}
                  label={`Modül ${m.sira} — ${m.baslik}${m.opsiyonel ? ' (opsiyonel)' : ''}`}
                >
                  {modulAltlari.map((a) => (
                    <option key={a.id} value={a.id}>
                      {m.sira}.{a.sira} {a.baslik}
                      {a.karma ? ' ★' : ''}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
            Başlık *
          </label>
          <input
            type="text"
            value={d.baslik}
            onChange={(e) => setD({ ...d, baslik: e.target.value })}
            required
            className="w-full px-3 py-2 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded-lg font-medium"
            placeholder="Peşin Mal Satışı"
          />
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
            Senaryo *
          </label>
          <textarea
            value={d.senaryo}
            onChange={(e) => setD({ ...d, senaryo: e.target.value })}
            required
            rows={4}
            className="w-full px-3 py-2 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded-lg font-medium leading-relaxed"
            placeholder="İşletme 10.000 TL'lik mal satmıştır..."
          />
        </div>

        <div>
          <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
            Açıklama (doğru kayıt sonrası gösterilir)
          </label>
          <textarea
            value={d.aciklama}
            onChange={(e) => setD({ ...d, aciklama: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded-lg font-medium"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
              Durum
            </label>
            <select
              value={d.durum}
              onChange={(e) => setD({ ...d, durum: e.target.value as SoruDurum })}
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
            >
              <option value="taslak">Taslak (yayında değil)</option>
              <option value="inceleme">İnceleme</option>
              <option value="onayli">Onaylı (yayında)</option>
              <option value="arsiv">Arşiv</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-2">
              Kaynak
            </label>
            <select
              value={d.kaynak}
              onChange={(e) => setD({ ...d, kaynak: e.target.value })}
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
            >
              <option value="manuel">Manuel</option>
              <option value="ai">AI</option>
              <option value="kullanici">Kullanıcı katkısı</option>
            </select>
          </div>
        </div>
      </div>

      {/* Çözüm satırları */}
      <div className="bg-surface border border-line rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold tracking-tight">Yevmiye Kaydı</h3>
          <div
            className={`text-xs font-bold ${dengeli ? 'text-success dark:text-success' : 'text-danger dark:text-danger'}`}
          >
            Borç {toplamBorc.toFixed(2)} / Alacak {toplamAlacak.toFixed(2)}
            {dengeli && <span className="ml-2">✓ dengeli</span>}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
              <th className="pb-2 w-44">Hesap Kodu</th>
              <th className="pb-2">Hesap Adı</th>
              <th className="pb-2 w-32">Borç</th>
              <th className="pb-2 w-32">Alacak</th>
              <th className="pb-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {d.cozumler.map((c, i) => (
              <tr key={i}>
                <td className="py-1 pr-2">
                  <HesapKoduInput
                    value={c.kod}
                    onChange={(v) => guncelleCozum(i, 'kod', v)}
                    rowIndex={i}
                    muavinler={muavinler}
                    yeniMuavinEkleyebilir
                    onMuavinEklendi={muavinEklendi}
                  />
                </td>
                <td className="py-1 pr-2 text-[12.5px] text-ink-soft font-medium truncate">
                  {hesapAdiBul(c.kod, muavinler) || (
                    <span className="text-ink-quiet">—</span>
                  )}
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={c.borc}
                    onChange={(e) => guncelleCozum(i, 'borc', e.target.value)}
                    data-row={i}
                    data-col="borc"
                    className="w-full font-mono text-sm px-2 py-1.5 bg-bg-tint border border-transparent focus:border-ink focus:bg-surface outline-none rounded text-right"
                  />
                </td>
                <td className="py-1 pr-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={c.alacak}
                    onChange={(e) => guncelleCozum(i, 'alacak', e.target.value)}
                    className="w-full font-mono text-sm px-2 py-1.5 bg-bg-tint border border-transparent focus:border-ink focus:bg-surface outline-none rounded text-right"
                  />
                </td>
                <td className="py-1">
                  <button
                    type="button"
                    onClick={() => silSatir(i)}
                    disabled={d.cozumler.length <= 2}
                    className="p-1.5 text-ink-quiet hover:text-danger hover:bg-danger-soft disabled:opacity-30 disabled:cursor-not-allowed rounded transition"
                    title="Satırı sil"
                  >
                    <Icon name="X" size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          type="button"
          onClick={ekleSatir}
          className="mt-3 flex items-center gap-2 text-sm text-ink-soft hover:text-ink font-semibold"
        >
          <Icon name="Plus" size={14} />
          Satır ekle
        </button>
      </div>

      <BelgeEditor
        belgeler={d.belgeler}
        onChange={(yeni) => setD({ ...d, belgeler: yeni })}
        baglam={{
          soruBaslik: d.baslik,
          senaryo: d.senaryo,
          aciklama: d.aciklama,
          cozum: d.cozumler.map((c) => ({
            kod: c.kod,
            borc: parseFloat(c.borc) || 0,
            alacak: parseFloat(c.alacak) || 0,
          })),
        }}
      />

      {hata && (
        <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger font-medium">
          <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
          <span>{hata}</span>
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onIptal}
          className="px-4 py-2 text-sm font-bold text-ink-soft hover:text-ink transition"
        >
          İptal
        </button>
        <button
          type="submit"
          disabled={kaydediliyor}
          className="flex items-center gap-2 px-5 py-2 bg-ink text-bg rounded-lg text-sm font-bold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
        >
          {kaydediliyor && <Icon name="Loader2" size={14} className="animate-spin" />}
          {duzenleme ? 'Güncelle' : 'Kaydet'}
        </button>
      </div>
    </form>
  );
};
