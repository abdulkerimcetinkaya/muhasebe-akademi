import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import {
  slugUret,
  sozlukTerimSil,
  sozlukTerimYarat,
  sozlukTerimGuncelle,
  tumTerimleriYukleAdmin,
  type SozlukTerimi,
  type YeniSozlukTerimi,
  type MevzuatKatmani,
} from '../../lib/sozluk';

const bosMevzuat = (): Required<MevzuatKatmani> => ({ maddeler: [], ozet: [] });

const bos = (): YeniSozlukTerimi => ({
  slug: '',
  baslik: '',
  kisa_aciklama: '',
  uzun_icerik: '',
  ornek: null,
  ilgili_terimler: [],
  ilgili_unite_ids: [],
  ilgili_hesap_kodlari: [],
  yayinda: true,
  mevzuat: bosMevzuat(),
});

// Kaydetmeden önce boş satır/madde/grupları temizle.
const mevzuatTemizle = (m: MevzuatKatmani | undefined): MevzuatKatmani => ({
  maddeler: (m?.maddeler ?? [])
    .map((x) => ({
      kanun: x.kanun.trim(),
      madde: x.madde.trim(),
      baslik: x.baslik.trim(),
      lafiz: x.lafiz.trim(),
    }))
    .filter((x) => x.kanun || x.madde || x.lafiz),
  ozet: (m?.ozet ?? [])
    .map((g) => ({
      baslik: g.baslik.trim(),
      maddeler: g.maddeler.map((s) => s.trim()).filter(Boolean),
    }))
    .filter((g) => g.baslik || g.maddeler.length > 0),
});

export const AdminSozlukSayfasi = () => {
  const [list, setList] = useState<SozlukTerimi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [basarili, setBasarili] = useState<string | null>(null);

  // Form
  const [duzenlenen, setDuzenlenen] = useState<string | null>(null); // slug — null = yeni
  const [form, setForm] = useState<YeniSozlukTerimi>(bos());
  const [slugManuel, setSlugManuel] = useState(false); // başlıktan otomatik mi?
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const yukle = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const data = await tumTerimleriYukleAdmin();
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

  const baslikDegisti = (yeni: string) => {
    setForm((f) => ({
      ...f,
      baslik: yeni,
      slug: slugManuel ? f.slug : slugUret(yeni),
    }));
  };

  const yeniBaslat = () => {
    setDuzenlenen(null);
    setForm(bos());
    setSlugManuel(false);
    setBasarili(null);
    setHata(null);
  };

  const duzenleBaslat = (t: SozlukTerimi) => {
    setDuzenlenen(t.slug);
    setForm({
      slug: t.slug,
      baslik: t.baslik,
      kisa_aciklama: t.kisa_aciklama,
      uzun_icerik: t.uzun_icerik,
      ornek: t.ornek,
      ilgili_terimler: t.ilgili_terimler,
      ilgili_unite_ids: t.ilgili_unite_ids,
      ilgili_hesap_kodlari: t.ilgili_hesap_kodlari,
      yayinda: t.yayinda,
      mevzuat: {
        maddeler: t.mevzuat?.maddeler ?? [],
        ozet: t.mevzuat?.ozet ?? [],
      },
    });
    setSlugManuel(true);
    setBasarili(null);
    setHata(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const kaydet = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.baslik.trim() || !form.slug.trim() || !form.kisa_aciklama.trim()) {
      setHata('Başlık, slug ve kısa açıklama zorunlu.');
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    setBasarili(null);
    try {
      const temizForm = { ...form, mevzuat: mevzuatTemizle(form.mevzuat) };
      if (duzenlenen) {
        await sozlukTerimGuncelle(duzenlenen, temizForm);
        setBasarili('Terim güncellendi.');
      } else {
        await sozlukTerimYarat(temizForm);
        setBasarili('Terim yaratıldı.');
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

  const sil = async (slug: string) => {
    if (!confirm(`"${slug}" terimini silmek istiyor musun?`)) return;
    try {
      await sozlukTerimSil(slug);
      setList((p) => p.filter((t) => t.slug !== slug));
      if (duzenlenen === slug) yeniBaslat();
    } catch (e) {
      alert(`Silinemedi: ${(e as Error).message}`);
    }
  };

  const maddeler = form.mevzuat?.maddeler ?? [];
  const ozet = form.mevzuat?.ozet ?? [];
  const setMev = (patch: Partial<MevzuatKatmani>) =>
    setForm((f) => ({
      ...f,
      mevzuat: { maddeler: f.mevzuat?.maddeler ?? [], ozet: f.mevzuat?.ozet ?? [], ...patch },
    }));

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-8">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Mali Sözlük
              </h1>
              <p className="text-[13.5px] text-ink-soft mt-1">
                SEO için her terim ayrı sayfa. Türkçe karakter slug'da otomatik
                ASCII'ye çevrilir.
              </p>
            </div>
            {duzenlenen && (
              <button
                onClick={yeniBaslat}
                className="inline-flex items-center gap-2 px-3 py-2 text-[11px] tracking-[0.2em] uppercase font-bold border border-line-strong rounded-lg hover:bg-bg-tint transition"
              >
                <Icon name="Plus" size={12} />
                Yeni Terim
              </button>
            )}
          </div>

          {/* Form */}
          <section className="bg-surface border border-line rounded-2xl p-6">
            <h2 className="font-display text-lg font-bold mb-4">
              {duzenlenen ? `Düzenle: ${form.baslik}` : 'Yeni Terim'}
            </h2>
            <form onSubmit={kaydet} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Başlık
                  </label>
                  <input
                    type="text"
                    value={form.baslik}
                    onChange={(e) => baslikDegisti(e.target.value)}
                    required
                    placeholder="Örn: Amortisman"
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="flex items-baseline justify-between text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    <span>Slug (URL)</span>
                    {!slugManuel && (
                      <button
                        type="button"
                        onClick={() => setSlugManuel(true)}
                        className="text-[9px] text-brand dark:text-brand-mute hover:underline normal-case tracking-normal"
                      >
                        manuel düzenle
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    readOnly={!slugManuel}
                    disabled={!!duzenlenen}
                    required
                    placeholder="amortisman"
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-mono outline-none focus:border-ink disabled:opacity-60"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                  Kısa Açıklama (meta description için, max 158 karakter önerilir)
                </label>
                <textarea
                  value={form.kisa_aciklama}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, kisa_aciklama: e.target.value }))
                  }
                  required
                  rows={2}
                  maxLength={300}
                  className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink resize-none"
                />
                <div className="text-[10px] text-ink-quiet mt-1 text-right font-mono">
                  {form.kisa_aciklama.length} / 300
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                  Uzun İçerik (Markdown destekli: **kalın**, `kod`, satır başı{' '}
                  <code className="text-[10px]">## Başlık</code>,{' '}
                  <code className="text-[10px]">- liste</code>)
                </label>
                <textarea
                  value={form.uzun_icerik}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, uzun_icerik: e.target.value }))
                  }
                  required
                  rows={10}
                  className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink resize-y font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                  Örnek (opsiyonel)
                </label>
                <textarea
                  value={form.ornek ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ornek: e.target.value || null }))
                  }
                  rows={3}
                  placeholder="Örn: 60.000 TL''lik taşıt 5 yıl boyunca eşit amortismana tabi..."
                  className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink resize-none"
                />
              </div>

              {/* ── Mevzuat: terime tıklayınca açılan panel/tam sayfa içeriği ── */}
              <div className="border-t border-line pt-5 space-y-5">
                <div>
                  <div className="text-[11px] tracking-[0.16em] uppercase font-bold text-copper">
                    Mevzuat · Kanun ne diyor?
                  </div>
                  <p className="text-[11px] text-ink-quiet mt-1">
                    İlgili kanun maddelerini <strong>lafzıyla</strong> gir. Terime tıklanınca panelde
                    ve sözlük sayfasında bu kartlar görünür.
                  </p>
                </div>

                {maddeler.map((m, i) => (
                  <div key={i} className="rounded-xl border border-line-strong bg-bg-tint p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={m.kanun}
                        onChange={(e) =>
                          setMev({ maddeler: maddeler.map((x, j) => (j === i ? { ...x, kanun: e.target.value } : x)) })
                        }
                        placeholder="VUK"
                        className="w-24 px-2.5 py-2 bg-surface border border-line-strong rounded-lg text-sm font-mono outline-none focus:border-ink"
                      />
                      <input
                        value={m.madde}
                        onChange={(e) =>
                          setMev({ maddeler: maddeler.map((x, j) => (j === i ? { ...x, madde: e.target.value } : x)) })
                        }
                        placeholder="md. no (231/5)"
                        className="w-32 px-2.5 py-2 bg-surface border border-line-strong rounded-lg text-sm font-mono outline-none focus:border-ink"
                      />
                      <input
                        value={m.baslik}
                        onChange={(e) =>
                          setMev({ maddeler: maddeler.map((x, j) => (j === i ? { ...x, baslik: e.target.value } : x)) })
                        }
                        placeholder="Başlık (Faturanın tarifi)"
                        className="flex-1 min-w-0 px-2.5 py-2 bg-surface border border-line-strong rounded-lg text-sm outline-none focus:border-ink"
                      />
                      <button
                        type="button"
                        onClick={() => setMev({ maddeler: maddeler.filter((_, j) => j !== i) })}
                        title="Maddeyi sil"
                        className="p-2 text-danger hover:bg-danger-soft rounded-lg transition flex-none"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                    <textarea
                      value={m.lafiz}
                      onChange={(e) =>
                        setMev({ maddeler: maddeler.map((x, j) => (j === i ? { ...x, lafiz: e.target.value } : x)) })
                      }
                      rows={3}
                      placeholder="Kanun metni (birebir lafız)…"
                      className="w-full px-2.5 py-2 bg-surface border border-line-strong rounded-lg text-sm leading-relaxed outline-none focus:border-ink resize-y"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setMev({ maddeler: [...maddeler, { kanun: '', madde: '', baslik: '', lafiz: '' }] })
                  }
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.12em] uppercase font-bold border border-dashed border-line-strong rounded-lg hover:bg-bg-tint transition"
                >
                  <Icon name="Plus" size={12} />
                  Madde ekle
                </button>

                <div className="pt-2">
                  <div className="text-[11px] tracking-[0.16em] uppercase font-bold text-copper">
                    Özet · Pratik grupları
                  </div>
                  <p className="text-[11px] text-ink-quiet mt-1">
                    Başlıklı gruplar (Tanım, Süreler, Saklama…). Her satır bir madde olarak alt alta gösterilir.
                  </p>
                </div>

                {ozet.map((g, i) => (
                  <div key={i} className="rounded-xl border border-line-strong bg-bg-tint p-3 space-y-2">
                    <div className="flex gap-2">
                      <input
                        value={g.baslik}
                        onChange={(e) =>
                          setMev({ ozet: ozet.map((x, j) => (j === i ? { ...x, baslik: e.target.value } : x)) })
                        }
                        placeholder="Grup başlığı (Süreler)"
                        className="flex-1 min-w-0 px-2.5 py-2 bg-surface border border-line-strong rounded-lg text-sm font-semibold outline-none focus:border-ink"
                      />
                      <button
                        type="button"
                        onClick={() => setMev({ ozet: ozet.filter((_, j) => j !== i) })}
                        title="Grubu sil"
                        className="p-2 text-danger hover:bg-danger-soft rounded-lg transition flex-none"
                      >
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>
                    <textarea
                      value={g.maddeler.join('\n')}
                      onChange={(e) =>
                        setMev({
                          ozet: ozet.map((x, j) =>
                            j === i ? { ...x, maddeler: e.target.value.split('\n') } : x,
                          ),
                        })
                      }
                      rows={4}
                      placeholder={'Her satır bir madde:\nFatura en geç 7 gün içinde düzenlenir.\nSüresinde düzenlenmeyen fatura hiç düzenlenmemiş sayılır.'}
                      className="w-full px-2.5 py-2 bg-surface border border-line-strong rounded-lg text-sm leading-relaxed outline-none focus:border-ink resize-y"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setMev({ ozet: [...ozet, { baslik: '', maddeler: [] }] })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] tracking-[0.12em] uppercase font-bold border border-dashed border-line-strong rounded-lg hover:bg-bg-tint transition"
                >
                  <Icon name="Plus" size={12} />
                  Grup ekle
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    İlgili Terimler (slug'ları virgülle ayır)
                  </label>
                  <input
                    type="text"
                    value={form.ilgili_terimler.join(', ')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ilgili_terimler: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="kdv, yevmiye-kaydi"
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-mono outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    İlgili TDHP Hesap Kodları (virgülle)
                  </label>
                  <input
                    type="text"
                    value={form.ilgili_hesap_kodlari.join(', ')}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        ilgili_hesap_kodlari: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      }))
                    }
                    placeholder="100, 153, 191"
                    className="w-full px-3 py-2.5 bg-bg-tint border border-line-strong rounded-lg text-sm font-mono outline-none focus:border-ink"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.yayinda}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, yayinda: e.target.checked }))
                  }
                  className="w-4 h-4 rounded border-line-strong cursor-pointer"
                />
                <span className="text-sm font-medium">
                  Yayında (siteye anında çıksın)
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

          {/* Liste */}
          <section>
            <h2 className="font-display text-lg font-bold mb-4">
              Tüm Terimler ({list.length})
            </h2>
            {yukleniyor ? (
              <div className="text-sm text-ink-quiet">Yükleniyor…</div>
            ) : list.length === 0 ? (
              <div className="text-sm text-ink-quiet">Henüz terim yok.</div>
            ) : (
              <div className="space-y-2">
                {list.map((t) => (
                  <div
                    key={t.slug}
                    className={`flex items-start gap-3 p-4 bg-surface border border-line rounded-xl ${
 !t.yayinda ? 'opacity-60' : ''
 } ${duzenlenen === t.slug ? 'ring-2 ring-blue-500/30' : ''}`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-[14px]">{t.baslik}</span>
                        <span className="font-mono text-[10px] text-ink-quiet">
                          /{t.slug}
                        </span>
                        {!t.yayinda && (
                          <span className="text-[10px] tracking-wider uppercase font-mono font-bold text-premium-deep bg-premium-soft px-1.5 py-0.5 rounded">
                            Taslak
                          </span>
                        )}
                        <span className="text-[10px] text-ink-quiet font-mono ml-auto">
                          {t.goruntuleme_sayisi} görüntüleme
                        </span>
                      </div>
                      <div className="text-[12.5px] text-ink-soft leading-snug line-clamp-2">
                        {t.kisa_aciklama}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link
                        to={`/sozluk/${t.slug}`}
                        target="_blank"
                        title="Public sayfayı aç"
                        className="p-2 hover:bg-surface-2 rounded-lg transition"
                      >
                        <Icon name="ArrowRight" size={14} />
                      </Link>
                      <button
                        onClick={() => duzenleBaslat(t)}
                        title="Düzenle"
                        className="p-2 hover:bg-surface-2 rounded-lg transition"
                      >
                        <Icon name="Pencil" size={14} />
                      </button>
                      <button
                        onClick={() => sil(t.slug)}
                        title="Sil"
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
