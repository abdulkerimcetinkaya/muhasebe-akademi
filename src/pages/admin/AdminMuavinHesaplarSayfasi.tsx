import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { HESAP_PLANI } from '../../data/hesap-plani';
import {
  MUAVIN_SINIFLARI,
  TIP_ETIKETLERI,
  muavinGuncelle,
  muavinSil,
  muavinYarat,
  sonrakiMuavinKodu,
  tumMuavinleriYukle,
  type MuavinHesap,
  type YeniMuavin,
} from '../../lib/muavin';
import type { MuavinTip } from '../../lib/database.types';

const bos = (): YeniMuavin => ({
  kod: '',
  ana_kod: '',
  ad: '',
  tip: '10',
  aciklama: null,
  aktif: true,
});

export const AdminMuavinHesaplarSayfasi = () => {
  const [list, setList] = useState<MuavinHesap[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);

  const [duzenlenen, setDuzenlenen] = useState<string | null>(null); // kod — null = yeni
  const [form, setForm] = useState<YeniMuavin>(bos());
  const [kodManuel, setKodManuel] = useState(false); // ana_kod seçildikten sonra otomatik üretilir
  const [kaydediliyor, setKaydediliyor] = useState(false);

  // Filtre
  const [tipFiltresi, setTipFiltresi] = useState<MuavinTip | 'hepsi'>('hepsi');
  const [arama, setArama] = useState('');

  const yukle = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const data = await tumMuavinleriYukle();
      setList(data);
    } catch (e) {
      setHata(`Yüklenemedi: ${(e as Error).message}`);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  const anaHesapDegisti = async (yeniAnaKod: string) => {
    setForm((f) => ({ ...f, ana_kod: yeniAnaKod }));
    if (!kodManuel && yeniAnaKod && !duzenlenen) {
      try {
        const onerilen = await sonrakiMuavinKodu(yeniAnaKod);
        setForm((f) => ({ ...f, ana_kod: yeniAnaKod, kod: onerilen }));
      } catch {
        // sessizce geç — kullanıcı manuel yazabilir
      }
    }
  };

  const yeniBaslat = () => {
    setDuzenlenen(null);
    setForm(bos());
    setKodManuel(false);
    setBasarili(null);
    setHata(null);
  };

  const duzenleBaslat = (m: MuavinHesap) => {
    setDuzenlenen(m.kod);
    setForm({
      kod: m.kod,
      ana_kod: m.ana_kod,
      ad: m.ad,
      tip: m.tip,
      aciklama: m.aciklama,
      sira: m.sira,
      aktif: m.aktif,
    });
    setKodManuel(true);
    setBasarili(null);
    setHata(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.kod.trim() || !form.ana_kod.trim() || !form.ad.trim()) {
      setHata('Kod, ana hesap ve ad zorunlu.');
      return;
    }
    if (!/^[0-9]{3}(\.[0-9]+)+$/.test(form.kod)) {
      setHata("Kod sadece numerik olabilir (örn: 120.001 veya 120.001.001).");
      return;
    }
    if (!form.kod.startsWith(form.ana_kod + '.')) {
      setHata(`Kod, ana hesap (${form.ana_kod}) ile başlamalı (örn: ${form.ana_kod}.001).`);
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    setBasarili(null);
    try {
      if (duzenlenen) {
        // Kod değişmez (PK), diğer alanlar güncellenebilir
        const { kod: _kod, ...patch } = form;
        await muavinGuncelle(duzenlenen, patch);
        setBasarili('Muavin güncellendi.');
      } else {
        await muavinYarat(form);
        setBasarili('Muavin oluşturuldu.');
      }
      await yukle();
      yeniBaslat();
      setTimeout(() => setBasarili(null), 3000);
    } catch (e) {
      setHata(`Kaydedilemedi: ${(e as Error).message}`);
    } finally {
      setKaydediliyor(false);
    }
  };

  const aktifDegistir = async (m: MuavinHesap) => {
    try {
      await muavinGuncelle(m.kod, { aktif: !m.aktif });
      setList((p) =>
        p.map((x) => (x.kod === m.kod ? { ...x, aktif: !x.aktif } : x)),
      );
    } catch (e) {
      alert(`Güncellenemedi: ${(e as Error).message}`);
    }
  };

  const sil = async (kod: string) => {
    if (!confirm(`"${kod}" muavin hesabını kalıcı olarak silmek istiyor musun?\n\nNot: Eski sorularda bu kod referansı varsa veriler bozulabilir. Silmek yerine pasif yapmayı tercih et.`)) return;
    try {
      await muavinSil(kod);
      setList((p) => p.filter((x) => x.kod !== kod));
      if (duzenlenen === kod) yeniBaslat();
    } catch (e) {
      alert(`Silinemedi: ${(e as Error).message}`);
    }
  };

  const filtreli = useMemo(() => {
    return list.filter((m) => {
      if (tipFiltresi !== 'hepsi' && m.tip !== tipFiltresi) return false;
      if (arama.trim()) {
        const q = arama.toLowerCase();
        if (
          !m.kod.toLowerCase().includes(q) &&
          !m.ad.toLowerCase().includes(q) &&
          !m.ana_kod.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [list, tipFiltresi, arama]);

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-8">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Muavin Hesaplar
              </h1>
              <p className="text-[13.5px] text-ink-soft mt-1">
                Alt/yardımcı hesaplar — örn: <code className="font-mono">120.001 ABC Ticaret</code>.
                Bir ana hesabın muavini varsa, soru editörü ana hesap kullanımını uyaracak.
              </p>
            </div>
            {duzenlenen && (
              <button
                onClick={yeniBaslat}
                className="inline-flex items-center gap-2 px-3 py-2 text-[11px] tracking-[0.2em] uppercase font-bold border border-line-strong rounded-lg hover:bg-bg-tint transition"
              >
                <Icon name="Plus" size={12} />
                Yeni Muavin
              </button>
            )}
          </div>

          {/* Form */}
          <section className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold mb-4">
              {duzenlenen ? `Düzenle: ${form.kod}` : 'Yeni Muavin'}
            </h2>
            <form onSubmit={kaydet} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Ana Hesap
                  </label>
                  <select
                    value={form.ana_kod}
                    onChange={(e) => anaHesapDegisti(e.target.value)}
                    required
                    disabled={!!duzenlenen}
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink disabled:opacity-60"
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
                  <label className="flex items-baseline justify-between text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    <span>Muavin Kodu</span>
                    {!kodManuel && !duzenlenen && (
                      <button
                        type="button"
                        onClick={() => setKodManuel(true)}
                        className="text-[9px] text-brand dark:text-brand-mute hover:underline normal-case tracking-normal"
                      >
                        manuel düzenle
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.kod}
                    onChange={(e) => setForm((f) => ({ ...f, kod: e.target.value }))}
                    readOnly={!kodManuel && !duzenlenen}
                    disabled={!!duzenlenen}
                    required
                    placeholder="120.001"
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-mono outline-none focus:border-ink disabled:opacity-60"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Tip
                  </label>
                  <select
                    value={form.tip}
                    onChange={(e) => setForm((f) => ({ ...f, tip: e.target.value as MuavinTip }))}
                    required
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
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
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                  Ad
                </label>
                <input
                  type="text"
                  value={form.ad}
                  onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
                  required
                  placeholder="ABC Ticaret Ltd. Şti."
                  className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                  Açıklama (opsiyonel)
                </label>
                <textarea
                  value={form.aciklama ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, aciklama: e.target.value || null }))
                  }
                  rows={2}
                  placeholder="Tedarikçi olarak çalıştığımız tekstil firması, vs."
                  className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.aktif !== false}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, aktif: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-line-strong cursor-pointer"
                />
                <span className="text-sm font-medium">
                  Aktif (yeni sorular için seçilebilir)
                </span>
              </label>

              {hata && (
                <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
                  <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{hata}</span>
                </div>
              )}
              {basarili && (
                <div className="flex items-start gap-2 p-3 bg-success-soft border border-success-soft rounded-lg text-[13px] text-success font-medium">
                  <Icon name="CheckCircle2" size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{basarili}</span>
                </div>
              )}

              <div className="flex justify-end gap-2">
                {duzenlenen && (
                  <button
                    type="button"
                    onClick={yeniBaslat}
                    className="px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold border border-line-strong rounded-lg hover:bg-bg-tint transition"
                  >
                    Vazgeç
                  </button>
                )}
                <button
                  type="submit"
                  disabled={kaydediliyor}
                  className="inline-flex items-center gap-2 bg-ink text-bg px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Icon
                    name={kaydediliyor ? 'Loader2' : 'Save'}
                    size={12}
                    className={kaydediliyor ? 'animate-spin' : ''}
                  />
                  {kaydediliyor ? 'Kaydediliyor' : duzenlenen ? 'Güncelle' : 'Yarat'}
                </button>
              </div>
            </form>
          </section>

          {/* Filtre */}
          <section>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <h2 className="font-display text-lg font-bold">
                Tüm Muavinler ({filtreli.length}/{list.length})
              </h2>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={arama}
                  onChange={(e) => setArama(e.target.value)}
                  placeholder="Ara: kod, ad, ana hesap"
                  className="px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-[13px] font-medium outline-none focus:border-ink w-56"
                />
                <select
                  value={tipFiltresi}
                  onChange={(e) => setTipFiltresi(e.target.value as MuavinTip | 'hepsi')}
                  className="px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-[13px] font-medium outline-none focus:border-ink"
                >
                  <option value="hepsi">Tüm tipler</option>
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
            </div>

            {yukleniyor ? (
              <div className="text-sm text-ink-quiet">Yükleniyor…</div>
            ) : filtreli.length === 0 ? (
              <div className="text-sm text-ink-quiet text-center py-8 border border-dashed border-line-strong rounded-xl">
                {list.length === 0
                  ? 'Henüz muavin yok. Yukarıdaki formdan ilk muavini ekle.'
                  : 'Filtreyle eşleşen muavin yok.'}
              </div>
            ) : (
              <div className="space-y-2">
                {filtreli.map((m) => (
                  <div
                    key={m.kod}
                    className={`flex items-start gap-3 p-4 bg-surface border border-line rounded-xl ${
 !m.aktif ? 'opacity-60' : ''
 } ${duzenlenen === m.kod ? 'ring-2 ring-blue-500/30' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-mono font-bold text-[14px]">{m.kod}</span>
                        <span className="font-bold text-[14px]">{m.ad}</span>
                        <span className="text-[10px] tracking-wider uppercase font-mono font-bold text-ink-mute bg-surface-2 px-1.5 py-0.5 rounded">
                          {TIP_ETIKETLERI[m.tip]}
                        </span>
                        {!m.aktif && (
                          <span className="text-[10px] tracking-wider uppercase font-mono font-bold text-premium-deep bg-premium-soft px-1.5 py-0.5 rounded">
                            Pasif
                          </span>
                        )}
                        <span className="text-[11px] text-ink-quiet font-mono ml-auto">
                          ana: {m.ana_kod}
                        </span>
                      </div>
                      {m.aciklama && (
                        <div className="text-[12.5px] text-ink-soft leading-snug line-clamp-2">
                          {m.aciklama}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => aktifDegistir(m)}
                        title={m.aktif ? 'Pasifleştir' : 'Aktifleştir'}
                        className="p-2 hover:bg-surface-2 rounded-lg transition"
                      >
                        <Icon name={m.aktif ? 'EyeOff' : 'Eye'} size={14} />
                      </button>
                      <button
                        onClick={() => duzenleBaslat(m)}
                        title="Düzenle"
                        className="p-2 hover:bg-surface-2 rounded-lg transition"
                      >
                        <Icon name="Pencil" size={14} />
                      </button>
                      <button
                        onClick={() => sil(m.kod)}
                        title="Sil (kalıcı)"
                        className="p-2 hover:bg-danger-soft text-danger dark:text-danger rounded-lg transition"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
};
