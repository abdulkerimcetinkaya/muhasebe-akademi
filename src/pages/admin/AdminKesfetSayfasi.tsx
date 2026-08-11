import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import { kartDersSayisi, type KesfetKart } from '../../data/kesfet';
import {
  KESFET_HEDEF_KARTLAR,
  OGRENME_ZINCIRI,
  dersZinciri,
  eksikHedefKartlar,
} from '../../data/kesfet-mufredat-hedefi';
import {
  kartGuncelle,
  kartOlustur,
  kartSil,
  kartYayinSorunlariniBul,
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
  uzmanlik_turu: null,
  on_kosul_sluglari: [],
  onerilen_on_kosul_sluglari: [],
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
      setKartlar(await tumKartlariYukle(undefined, true));
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
      uzmanlik_turu: k.uzmanlik_turu,
      on_kosul_sluglari: k.on_kosul_sluglari ?? [],
      onerilen_on_kosul_sluglari: k.onerilen_on_kosul_sluglari ?? [],
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
    const mevcutKart = duzenlenen ? kartlar.find((kart) => kart.id === duzenlenen) : null;
    if (form.durum === 'acik') {
      if (!mevcutKart) {
        setHata('Yeni kartı önce Yakında veya Gizli olarak oluştur; içerik ve bağlantılar tamamlandıktan sonra aç.');
        return;
      }
      try {
        const sorunlar = await kartYayinSorunlariniBul(mevcutKart);
        if (sorunlar.length) {
          setHata(`Kart yayınlanamaz: ${sorunlar.join(' · ')}`);
          return;
        }
      } catch (e) {
        setHata(`Yayın kontrolü çalışmadı: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
        return;
      }
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

  const yayinKontrolu = async (kart: KesfetKart) => {
    try {
      const sorunlar = await kartYayinSorunlariniBul(kart);
      alert(sorunlar.length ? `Yayın sorunları:\n\n${sorunlar.join('\n')}` : 'Yayın kontrolü tamam: kartın yayınlanmış içerikleri hazır.');
    } catch (e) {
      alert(`Yayın kontrolü çalışmadı: ${e instanceof Error ? e.message : 'Bilinmeyen hata'}`);
    }
  };

  const inputCls =
    'w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink';
  const labelCls = 'block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5';

  const kesfetKartlari = kartlar.filter((k) => k.tip === 'kesfet');
  const tumBolumler = kesfetKartlari.flatMap((k) => k.bolumler.map((b) => ({ kart: k, bolum: b })));
  const tumItemlar = tumBolumler.flatMap(({ kart, bolum }) =>
    bolum.itemlar.map((item) => ({ kart, bolum, item })),
  );
  const icerikVar = (icerik: unknown): boolean => Array.isArray(icerik) && icerik.length > 0;
  // V4 üretim şablonu imzası: bu ikili yalnız 20260809000005'in ders_icerigi()
  // çıktısında birlikte geçer. Şablon ≠ yazılmış ders — ayrı sayılır.
  const sablonMu = (icerik: unknown): boolean => {
    if (!icerikVar(icerik)) return false;
    const metin = JSON.stringify(icerik);
    return metin.includes('Bu derste ne çözeceksin?') && metin.includes('Mavi Kırtasiye');
  };
  const etkilesimliBlokSayisi = (icerik: unknown): number =>
    Array.isArray(icerik)
      ? icerik.filter((blok) => {
          const tip = (blok as { type?: string })?.type;
          return tip === 'kontrol' || tip === 'kayit';
        }).length
      : 0;
  const sablonItem = tumItemlar.filter(({ item }) => sablonMu(item.icerik)).length;
  const gercekItem = tumItemlar.filter(
    ({ item }) => icerikVar(item.icerik) && !sablonMu(item.icerik),
  ).length;
  const etkilesimliItem = tumItemlar.filter(({ item }) => etkilesimliBlokSayisi(item.icerik) > 0).length;
  const kullaniciyaAcik = tumItemlar.filter(({ kart, item }) =>
    kart.durum === 'acik' && icerikVar(item.icerik),
  ).length;
  const mevcutSluglar = new Set(kesfetKartlari.map((k) => k.slug));
  const mufredatEksikleri = eksikHedefKartlar(mevcutSluglar);

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <div className="flex-1 min-w-0">
          <AdminSayfaBaslik
            baslik="Keşfet Kartları"
            aksiyon={<span className="text-[12px] text-ink-mute tnum">{kartlar.length} kart</span>}
          />

          {!yukleniyor && (
            <section className="mb-8 border-y border-line py-4" aria-label="Keşfet içerik özeti">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-x-5 gap-y-4">
                {[
                  ['Kart', kesfetKartlari.length],
                  ['Bölüm', tumBolumler.length],
                  ['Item', tumItemlar.length],
                  ['Gerçek içerik', gercekItem],
                  ['Şablon', sablonItem],
                  ['Boş', tumItemlar.length - gercekItem - sablonItem],
                  ['Etkileşimli', etkilesimliItem],
                  ['Kullanıcıya açık', kullaniciyaAcik],
                  ['Yakında kart', kesfetKartlari.filter((k) => k.durum === 'yakinda').length],
                ].map(([etiket, deger]) => (
                  <div key={etiket}>
                    <div className="font-display text-xl font-bold text-ink tnum">{deger}</div>
                    <div className="font-mono text-[9px] tracking-[0.14em] uppercase text-ink-mute mt-0.5">{etiket}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

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
                    setForm((f) => ({ ...f, durum: e.target.value as 'acik' | 'yakinda' | 'gizli' }))
                  }
                >
                  <option value="acik">Açık</option>
                  <option value="yakinda">Yakında</option>
                  <option value="gizli">Gizli</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Uzmanlık alt türü</label>
                <select className={inputCls} value={form.uzmanlik_turu ?? ''} onChange={(e) => setForm((f) => ({ ...f, uzmanlik_turu: (e.target.value || null) as 'fonksiyonel' | 'sektorel' | null }))}>
                  <option value="">Uygulanmaz</option>
                  <option value="fonksiyonel">Fonksiyonel</option>
                  <option value="sektorel">Sektörel</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Zorunlu ön koşul slugları</label>
                <input className={inputCls} value={(form.on_kosul_sluglari ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, on_kosul_sluglari: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))} placeholder="muhasebe-temelleri, gunluk-muhasebe-operasyonlari" />
              </div>
              <div className="md:col-span-2">
                <label className={labelCls}>Önerilen ön koşul slugları</label>
                <input className={inputCls} value={(form.onerilen_on_kosul_sluglari ?? []).join(', ')} onChange={(e) => setForm((f) => ({ ...f, onerilen_on_kosul_sluglari: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) }))} placeholder="finansal-raporlama" />
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
                        {k.durum === 'acik' ? 'Açık' : k.durum === 'yakinda' ? 'Yakında' : 'Gizli'}
                      </span>
                      {k.uzmanlik_turu && <span className="chip">{k.uzmanlik_turu === 'fonksiyonel' ? 'Fonksiyonel' : 'Sektörel'}</span>}
                    </div>
                    <div className="text-[11.5px] text-ink-mute mt-0.5 tnum">
                      /{k.slug} · {k.kategori} · {k.bolumler.length} bölüm · {kartDersSayisi(k)} ders
                    </div>
                    {((k.on_kosul_sluglari?.length ?? 0) > 0 || (k.onerilen_on_kosul_sluglari?.length ?? 0) > 0) && (
                      <div className="text-[10.5px] text-ink-mute mt-1">
                        {(k.on_kosul_sluglari?.length ?? 0) > 0 && <>Zorunlu: {k.on_kosul_sluglari?.join(', ')}</>}
                        {(k.onerilen_on_kosul_sluglari?.length ?? 0) > 0 && <> · Önerilen: {k.onerilen_on_kosul_sluglari?.join(', ')}</>}
                      </div>
                    )}
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
                    <button onClick={() => void yayinKontrolu(k)} className="btn btn-soft btn-sm" title="Olay, belge, çözüm, yetkinlik ve mevzuat bağlarını denetle">
                      Yayın kontrolü
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

          {!yukleniyor && tumItemlar.length > 0 && (
            <section className="mt-10">
              <div className="flex items-end justify-between gap-4 mb-3">
                <div>
                  <h2 className="font-display text-xl font-bold tracking-tight text-ink">İçerik denetimi</h2>
                  <p className="text-[12px] text-ink-mute mt-1">Kullanıcı görünürlüğü kart durumundan; içerik durumu item bloklarından hesaplanır.</p>
                </div>
                <span className="font-mono text-[10px] text-ink-mute tnum">{tumItemlar.length} item</span>
              </div>
              <div className="border-t border-line-strong">
                {tumItemlar.map(({ kart, bolum, item }) => {
                  const dolu = icerikVar(item.icerik);
                  const sablon = sablonMu(item.icerik);
                  const acik = kart.durum === 'acik' && dolu;
                  const zincir = dersZinciri(item.icerik);
                  return (
                    <div key={item.id} className="grid lg:grid-cols-[1fr_auto] gap-3 py-3 border-b border-line-soft items-center">
                      <div className="min-w-0 flex items-start gap-3">
                        <Icon name={item.tip === 'ders' ? 'BookOpen' : 'Pencil'} size={14} className="text-ink-quiet mt-0.5 flex-none" />
                        <div className="min-w-0">
                          <div className="text-[13px] font-semibold text-ink truncate">{item.ad}</div>
                          <div className="text-[10.5px] text-ink-mute mt-0.5 truncate">{kart.ad} · {bolum.ad}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap lg:justify-end">
                        <span className={`chip ${dolu && !sablon ? 'chip-success' : ''}`}>
                          {!dolu ? 'İçerik boş' : sablon ? 'Şablon' : 'İçerik var'}
                        </span>
                        <span className={`chip ${(item.sorular?.length ?? 0) > 0 ? 'chip-success' : ''}`}>
                          {(item.sorular?.length ?? 0) > 0 ? `${item.sorular?.length} ölçümlü soru` : 'Ölçümlü soru yok'}
                        </span>
                        <span className={`chip ${etkilesimliBlokSayisi(item.icerik) > 0 ? 'chip-success' : ''}`}>
                          {etkilesimliBlokSayisi(item.icerik)} etkileşim
                        </span>
                        <span className={`chip ${zincir.length >= 6 ? 'chip-success' : ''}`} title={`Karşılanan: ${zincir.join(', ') || 'yok'}\nEksik: ${OGRENME_ZINCIRI.map(([ad]) => ad).filter((ad) => !zincir.includes(ad)).join(', ')}`}>
                          Zincir {zincir.length}/{OGRENME_ZINCIRI.length}
                        </span>
                        <span className="chip">{item.tip === 'ders' ? 'Ders' : 'Alıştırma'}</span>
                        <span className={`chip ${!item.yayin_durumu || item.yayin_durumu === 'yayinlandi' ? 'chip-success' : ''}`}>
                          {!item.yayin_durumu || item.yayin_durumu === 'yayinlandi' ? 'Yayınlandı' : item.yayin_durumu === 'incelemede' ? 'İncelemede' : item.yayin_durumu === 'arsiv' ? 'Arşiv' : 'Taslak'}
                        </span>
                        <span className={`chip ${acik ? 'chip-success' : ''}`}>{acik ? 'Kullanıcıya açık' : kart.durum === 'yakinda' ? 'Kart yakında' : kart.durum === 'gizli' ? 'Yalnız admin' : 'İçerik eksik'}</span>
                        <button onClick={() => nav(`/admin/kesfet/${kart.id}/item/${item.id}`)} className="btn btn-soft btn-sm">Düzenle</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {!yukleniyor && (
            <section className="mt-10 bg-surface border border-line rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-bold text-ink">Müfredat denetimi</h2>
                  <p className="text-[12px] text-ink-mute mt-1">ADR-005 hedef yapısı ({KESFET_HEDEF_KARTLAR.length} kart) canlı kayıtlarla karşılaştırılır.</p>
                </div>
                <span className={`chip ${mufredatEksikleri.length === 0 ? 'chip-success' : ''}`}>
                  {KESFET_HEDEF_KARTLAR.length - mufredatEksikleri.length}/{KESFET_HEDEF_KARTLAR.length} mevcut
                </span>
              </div>
              {mufredatEksikleri.length > 0 ? (
                <div className="mt-4 border-t border-line-soft divide-y divide-line-soft">
                  {mufredatEksikleri.map((hedef) => (
                    <div key={hedef.slug} className="py-3 flex items-center gap-3">
                      <span className="font-mono text-[10px] text-danger tnum w-6">{String(hedef.sira).padStart(2, '0')}</span>
                      <div className="flex-1"><span className="text-[13px] font-semibold text-ink">{hedef.ad}</span><span className="block text-[10.5px] text-ink-mute">{hedef.kategori} · {hedef.slug}</span></div>
                      <span className="chip">Kart eksik</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px] text-success mt-4">Hedef yapıdaki {KESFET_HEDEF_KARTLAR.length} kartın tamamı canlıda mevcut.</p>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};
