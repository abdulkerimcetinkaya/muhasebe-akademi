import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { kartDersSayisi, type KesfetKart } from '../../data/kesfet';
import {
  kartGuncelle,
  kartOlustur,
  kartSil,
  tumKartlariYukle,
  type YeniKart,
} from '../../lib/kesfet';

const bosForm = (): YeniKart => ({
  slug: '',
  ad: '',
  aciklama: '',
  ikon: 'Rocket',
  kategori: 'Temeller',
  durum: 'yakinda',
  sira: 0,
});

export const AdminKesfetSayfasi = () => {
  const nav = useNavigate();
  const [kartlar, setKartlar] = useState<KesfetKart[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null); // id — null = yeni
  const [form, setForm] = useState<YeniKart>(bosForm());
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = async () => {
    try {
      setKartlar(await tumKartlariYukle());
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Yüklenemedi');
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    void yukle();
  }, []);

  const yeniBaslat = () => {
    setDuzenlenen(null);
    setForm({ ...bosForm(), sira: kartlar.length });
  };

  const duzenleBaslat = (k: KesfetKart) => {
    setDuzenlenen(k.id);
    setForm({
      slug: k.slug,
      ad: k.ad,
      aciklama: k.aciklama,
      ikon: k.ikon,
      kategori: k.kategori,
      durum: k.durum,
      sira: k.sira,
    });
    window.scrollTo(0, 0);
  };

  const kaydet = async () => {
    setHata(null);
    if (!form.slug.trim() || !form.ad.trim()) {
      setHata('Slug ve ad zorunludur.');
      return;
    }
    if (!/^[a-z0-9-]+$/.test(form.slug)) {
      setHata('Slug yalnızca küçük harf, rakam ve tire içerebilir (örn: ticari-isletme).');
      return;
    }
    setKaydediliyor(true);
    try {
      if (duzenlenen) await kartGuncelle(duzenlenen, form);
      else await kartOlustur(form);
      await yukle();
      yeniBaslat();
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Kaydedilemedi');
    } finally {
      setKaydediliyor(false);
    }
  };

  const sil = async (k: KesfetKart) => {
    if (!confirm(`"${k.ad}" kartını ve tüm bölüm/derslerini kalıcı olarak silmek istiyor musun?`)) return;
    try {
      await kartSil(k.id);
      await yukle();
      if (duzenlenen === k.id) yeniBaslat();
    } catch (e) {
      alert(`Silinemedi: ${(e as Error).message}`);
    }
  };

  const siraDegistir = async (k: KesfetKart, yon: -1 | 1) => {
    const komsu = kartlar[kartlar.indexOf(k) + yon];
    if (!komsu) return;
    try {
      await Promise.all([
        kartGuncelle(k.id, { sira: komsu.sira }),
        kartGuncelle(komsu.id, { sira: k.sira }),
      ]);
      await yukle();
    } catch (e) {
      alert(`Sıra değiştirilemedi: ${(e as Error).message}`);
    }
  };

  const inputCls =
    'w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink';
  const labelCls = 'block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5';

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-6">
            <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Keşfet Kartları</h1>
            <span className="text-[12px] text-ink-mute tnum">{kartlar.length} kart</span>
          </div>

          {/* Form */}
          <div className="bg-surface border border-line rounded-xl p-5 mb-8">
            <div className="text-[11px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-4">
              {duzenlenen ? 'Kartı Düzenle' : 'Yeni Kart'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Ad</label>
                <input
                  className={inputCls}
                  value={form.ad}
                  onChange={(e) => setForm((f) => ({ ...f, ad: e.target.value }))}
                  placeholder="Ticari İşletme"
                />
              </div>
              <div>
                <label className={labelCls}>Slug (URL)</label>
                <input
                  className={inputCls}
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  placeholder="ticari-isletme"
                />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Açıklama</label>
                <textarea
                  className={`${inputCls} resize-none`}
                  rows={2}
                  value={form.aciklama}
                  onChange={(e) => setForm((f) => ({ ...f, aciklama: e.target.value }))}
                  placeholder="Kısa tanıtım metni…"
                />
              </div>
              <div>
                <label className={labelCls}>Kategori</label>
                <input
                  className={inputCls}
                  value={form.kategori}
                  onChange={(e) => setForm((f) => ({ ...f, kategori: e.target.value }))}
                  placeholder="Temeller"
                />
              </div>
              <div>
                <label className={labelCls}>İkon (lucide adı)</label>
                <input
                  className={inputCls}
                  value={form.ikon}
                  onChange={(e) => setForm((f) => ({ ...f, ikon: e.target.value }))}
                  placeholder="Rocket"
                />
              </div>
              <div>
                <label className={labelCls}>Durum</label>
                <select
                  className={inputCls}
                  value={form.durum}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, durum: e.target.value as 'acik' | 'yakinda' }))
                  }
                >
                  <option value="acik">Açık</option>
                  <option value="yakinda">Yakında</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Sıra</label>
                <input
                  type="number"
                  className={inputCls}
                  value={form.sira}
                  onChange={(e) => setForm((f) => ({ ...f, sira: Number(e.target.value) }))}
                />
              </div>
            </div>

            {hata && <p className="text-[12px] text-danger mt-3">{hata}</p>}

            <div className="flex items-center gap-2 mt-4">
              <button onClick={kaydet} disabled={kaydediliyor} className="btn btn-primary btn-sm">
                {kaydediliyor ? 'Kaydediliyor…' : duzenlenen ? 'Güncelle' : 'Ekle'}
              </button>
              {duzenlenen && (
                <button onClick={yeniBaslat} className="btn btn-soft btn-sm">
                  İptal
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          {yukleniyor ? (
            <div className="flex items-center justify-center py-16">
              <Icon name="Loader2" size={20} className="animate-spin text-ink-mute" />
            </div>
          ) : kartlar.length === 0 ? (
            <p className="text-ink-mute text-sm py-8 text-center">Henüz kart yok.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {kartlar.map((k, i) => (
                <div
                  key={k.id}
                  className="bg-surface border border-line rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <span className="w-9 h-9 rounded-lg bg-brand-soft text-brand-deep grid place-items-center flex-none">
                    <Icon name={k.ikon} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-ink text-sm truncate">{k.ad}</span>
                      <span className={`chip ${k.durum === 'acik' ? 'chip-success' : ''}`}>
                        {k.durum === 'acik' ? 'Açık' : 'Yakında'}
                      </span>
                    </div>
                    <div className="text-[11.5px] text-ink-mute mt-0.5 tnum">
                      /{k.slug} · {k.kategori} · {k.bolumler.length} bölüm · {kartDersSayisi(k)} ders
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-none">
                    <button
                      onClick={() => siraDegistir(k, -1)}
                      disabled={i === 0}
                      className="p-1.5 text-ink-mute hover:text-ink disabled:opacity-25 transition"
                      title="Yukarı"
                    >
                      <Icon name="ChevronUp" size={16} />
                    </button>
                    <button
                      onClick={() => siraDegistir(k, 1)}
                      disabled={i === kartlar.length - 1}
                      className="p-1.5 text-ink-mute hover:text-ink disabled:opacity-25 transition"
                      title="Aşağı"
                    >
                      <Icon name="ChevronDown" size={16} />
                    </button>
                    <button
                      onClick={() => nav(`/admin/kesfet/${k.id}`)}
                      className="btn btn-soft btn-sm ml-1"
                    >
                      Bölümler
                    </button>
                    <button
                      onClick={() => duzenleBaslat(k)}
                      className="p-1.5 text-ink-mute hover:text-ink transition"
                      title="Düzenle"
                    >
                      <Icon name="Pencil" size={15} />
                    </button>
                    <button
                      onClick={() => sil(k)}
                      className="p-1.5 text-ink-mute hover:text-danger transition"
                      title="Sil"
                    >
                      <Icon name="Trash2" size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
