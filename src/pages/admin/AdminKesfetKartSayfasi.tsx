import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import type { KesfetBolum, KesfetItem, KesfetKart } from '../../data/kesfet';
import {
  bolumGuncelle,
  bolumOlustur,
  bolumSil,
  itemGuncelle,
  itemOlustur,
  itemSil,
  tumKartlariYukle,
} from '../../lib/kesfet';

export const AdminKesfetKartSayfasi = () => {
  const nav = useNavigate();
  const { kartId } = useParams();
  const [kart, setKart] = useState<KesfetKart | null | undefined>(undefined); // undefined=yükleniyor, null=bulunamadı
  const [yeniBolum, setYeniBolum] = useState('');
  const [yeniItem, setYeniItem] = useState<Record<string, string>>({});
  const [duzenId, setDuzenId] = useState<string | null>(null);
  const [duzenAd, setDuzenAd] = useState('');

  const yukle = async () => {
    try {
      const kartlar = await tumKartlariYukle();
      setKart(kartlar.find((k) => k.id === kartId) ?? null);
    } catch {
      setKart(null);
    }
  };

  useEffect(() => {
    void yukle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kartId]);

  const hataYut = (fn: () => Promise<void>) => async () => {
    try {
      await fn();
      await yukle();
    } catch (e) {
      alert((e as Error).message);
    }
  };

  // ── Bölüm işlemleri ──
  const bolumEkle = hataYut(async () => {
    if (!kart || !yeniBolum.trim()) return;
    await bolumOlustur(kart.id, yeniBolum.trim(), kart.bolumler.length);
    setYeniBolum('');
  });
  const bolumSiraDegistir = (b: KesfetBolum, yon: -1 | 1) =>
    hataYut(async () => {
      if (!kart) return;
      const komsu = kart.bolumler[kart.bolumler.indexOf(b) + yon];
      if (!komsu) return;
      await Promise.all([
        bolumGuncelle(b.id, { sira: komsu.sira }),
        bolumGuncelle(komsu.id, { sira: b.sira }),
      ]);
    })();
  const bolumSilOnay = (b: KesfetBolum) =>
    hataYut(async () => {
      if (!confirm(`"${b.ad}" bölümünü ve içindeki dersleri sil?`)) return;
      await bolumSil(b.id);
    })();

  // ── Item işlemleri ──
  const itemEkle = (b: KesfetBolum) =>
    hataYut(async () => {
      const ad = (yeniItem[b.id] ?? '').trim();
      if (!ad) return;
      await itemOlustur(b.id, ad, 'ders', b.itemlar.length);
      setYeniItem((m) => ({ ...m, [b.id]: '' }));
    })();
  const itemTipDegistir = (it: KesfetItem, tip: 'ders' | 'alistirma') =>
    hataYut(async () => {
      await itemGuncelle(it.id, { tip });
    })();
  const itemSiraDegistir = (b: KesfetBolum, it: KesfetItem, yon: -1 | 1) =>
    hataYut(async () => {
      const komsu = b.itemlar[b.itemlar.indexOf(it) + yon];
      if (!komsu) return;
      const iSira = b.itemlar.indexOf(it);
      const kSira = b.itemlar.indexOf(komsu);
      await Promise.all([
        itemGuncelle(it.id, { sira: kSira }),
        itemGuncelle(komsu.id, { sira: iSira }),
      ]);
    })();
  const itemSilOnay = (it: KesfetItem) =>
    hataYut(async () => {
      if (!confirm(`"${it.ad}" dersini sil?`)) return;
      await itemSil(it.id);
    })();

  // ── Inline ad düzenleme (bölüm veya item) ──
  const duzenBaslat = (id: string, ad: string) => {
    setDuzenId(id);
    setDuzenAd(ad);
  };
  const adKaydet = (tur: 'bolum' | 'item') =>
    hataYut(async () => {
      if (!duzenId || !duzenAd.trim()) {
        setDuzenId(null);
        return;
      }
      if (tur === 'bolum') await bolumGuncelle(duzenId, { ad: duzenAd.trim() });
      else await itemGuncelle(duzenId, { ad: duzenAd.trim() });
      setDuzenId(null);
    })();

  if (kart === undefined) {
    return (
      <div className="flex items-center justify-center py-32">
        <Icon name="Loader2" size={20} className="animate-spin text-ink-mute" />
      </div>
    );
  }

  const inputCls =
    'px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink';

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <div className="flex-1 min-w-0">
          <button
            onClick={() => nav('/admin/kesfet')}
            className="inline-flex items-center gap-1.5 text-[13px] text-ink-soft hover:text-ink mb-5 transition"
          >
            <Icon name="ArrowLeft" size={15} /> Keşfet Kartları
          </button>

          {kart === null ? (
            <p className="text-ink-mute text-sm">Kart bulunamadı.</p>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold tracking-tight text-ink mb-1">
                {kart.ad}
              </h1>
              <p className="text-[13px] text-ink-mute mb-8 tnum">
                /{kart.slug} · {kart.bolumler.length} bölüm
              </p>

              <div className="flex flex-col gap-5">
                {kart.bolumler.map((b, bi) => (
                  <section key={b.id} className="bg-surface border border-line rounded-xl overflow-hidden">
                    {/* Bölüm başlığı */}
                    <div className="flex items-center gap-2 px-4 py-3 bg-bg-tint border-b border-line-soft">
                      <span className="font-mono text-[11px] text-ink-quiet tnum">
                        {String(bi + 1).padStart(2, '0')}
                      </span>
                      {duzenId === b.id ? (
                        <input
                          autoFocus
                          className={`${inputCls} flex-1`}
                          value={duzenAd}
                          onChange={(e) => setDuzenAd(e.target.value)}
                          onBlur={() => adKaydet('bolum')}
                          onKeyDown={(e) => e.key === 'Enter' && adKaydet('bolum')}
                        />
                      ) : (
                        <button
                          onClick={() => duzenBaslat(b.id, b.ad)}
                          className="flex-1 text-left font-semibold text-ink text-[15px] hover:text-brand-deep transition"
                        >
                          {b.ad}
                        </button>
                      )}
                      <button onClick={() => bolumSiraDegistir(b, -1)} disabled={bi === 0} className="p-1 text-ink-mute hover:text-ink disabled:opacity-25" title="Yukarı">
                        <Icon name="ChevronUp" size={15} />
                      </button>
                      <button onClick={() => bolumSiraDegistir(b, 1)} disabled={bi === kart.bolumler.length - 1} className="p-1 text-ink-mute hover:text-ink disabled:opacity-25" title="Aşağı">
                        <Icon name="ChevronDown" size={15} />
                      </button>
                      <button onClick={() => bolumSilOnay(b)} className="p-1 text-ink-mute hover:text-danger" title="Bölümü sil">
                        <Icon name="Trash2" size={14} />
                      </button>
                    </div>

                    {/* Item'lar */}
                    <div className="divide-y divide-line-soft">
                      {b.itemlar.map((it, ii) => (
                        <div key={it.id} className="flex items-center gap-2.5 px-4 py-2.5">
                          <Icon
                            name={it.tip === 'ders' ? 'BookOpen' : 'Pencil'}
                            size={14}
                            className="text-ink-quiet flex-none"
                          />
                          {duzenId === it.id ? (
                            <input
                              autoFocus
                              className={`${inputCls} flex-1`}
                              value={duzenAd}
                              onChange={(e) => setDuzenAd(e.target.value)}
                              onBlur={() => adKaydet('item')}
                              onKeyDown={(e) => e.key === 'Enter' && adKaydet('item')}
                            />
                          ) : (
                            <button
                              onClick={() => duzenBaslat(it.id, it.ad)}
                              className="flex-1 text-left text-[14px] text-ink hover:text-brand-deep transition truncate"
                            >
                              {it.ad}
                            </button>
                          )}
                          <select
                            value={it.tip}
                            onChange={(e) => itemTipDegistir(it, e.target.value as 'ders' | 'alistirma')}
                            className="text-[12px] px-2 py-1 bg-bg-tint border border-line-strong rounded-md outline-none"
                          >
                            <option value="ders">Ders</option>
                            <option value="alistirma">Alıştırma</option>
                          </select>
                          <button onClick={() => itemSiraDegistir(b, it, -1)} disabled={ii === 0} className="p-1 text-ink-mute hover:text-ink disabled:opacity-25" title="Yukarı">
                            <Icon name="ChevronUp" size={14} />
                          </button>
                          <button onClick={() => itemSiraDegistir(b, it, 1)} disabled={ii === b.itemlar.length - 1} className="p-1 text-ink-mute hover:text-ink disabled:opacity-25" title="Aşağı">
                            <Icon name="ChevronDown" size={14} />
                          </button>
                          <button onClick={() => itemSilOnay(it)} className="p-1 text-ink-mute hover:text-danger" title="Sil">
                            <Icon name="Trash2" size={13} />
                          </button>
                        </div>
                      ))}

                      {/* Yeni item */}
                      <div className="flex items-center gap-2 px-4 py-2.5">
                        <Icon name="Plus" size={14} className="text-ink-quiet flex-none" />
                        <input
                          className={`${inputCls} flex-1`}
                          placeholder="Yeni ders/alıştırma adı…"
                          value={yeniItem[b.id] ?? ''}
                          onChange={(e) => setYeniItem((m) => ({ ...m, [b.id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && itemEkle(b)}
                        />
                        <button onClick={() => itemEkle(b)} className="btn btn-soft btn-sm">
                          Ekle
                        </button>
                      </div>
                    </div>
                  </section>
                ))}
              </div>

              {/* Yeni bölüm */}
              <div className="flex items-center gap-2 mt-5">
                <input
                  className={`${inputCls} flex-1`}
                  placeholder="Yeni bölüm adı…"
                  value={yeniBolum}
                  onChange={(e) => setYeniBolum(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && bolumEkle()}
                />
                <button onClick={bolumEkle} className="btn btn-primary btn-sm">
                  Bölüm Ekle
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
