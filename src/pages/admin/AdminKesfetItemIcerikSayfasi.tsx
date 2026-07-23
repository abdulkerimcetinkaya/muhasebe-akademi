// AdminKesfetItemIcerikSayfasi — bir Keşfet item'ının (ders/alıştırma) konu
// anlatımını BlockNote ile düzenler. `kesfet_itemler.icerik` alanına yazar.
// Alt başlık editörüyle aynı desen; ek olarak "eski içerikten aktar" seçici
// (unite_modulleri/modul_alt_basliklari geçiş dönemi havuzu).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Block } from '@blocknote/core';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { IcerikEditor } from '../../components/IcerikEditor';
import {
  eskiIceriklerYukle,
  itemIcerikKaydet,
  itemIcerikYukle,
  type EskiIcerik,
} from '../../lib/kesfet';

type KayitDurum = 'bos' | 'degisiyor' | 'kaydediliyor' | 'kaydedildi' | 'hata';

const DURUM_ETIKET: Record<KayitDurum, string> = {
  bos: 'Henüz değişiklik yok',
  degisiyor: 'Kaydedilmedi',
  kaydediliyor: 'Kaydediliyor…',
  kaydedildi: 'Kaydedildi',
  hata: 'Kayıt başarısız',
};

const DURUM_RENK: Record<KayitDurum, string> = {
  bos: 'text-ink-mute',
  degisiyor: 'text-premium-deep',
  kaydediliyor: 'text-ink-soft',
  kaydedildi: 'text-success',
  hata: 'text-danger',
};

export const AdminKesfetItemIcerikSayfasi = () => {
  const { kartId, itemId } = useParams<{ kartId: string; itemId: string }>();
  const nav = useNavigate();

  const [item, setItem] = useState<{ ad: string; tip: 'ders' | 'alistirma' } | null>(null);
  const [icerik, setIcerik] = useState<unknown | null>(null);
  const [editorKey, setEditorKey] = useState(0); // içe aktarımda editörü remount eder
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yuklemeHata, setYuklemeHata] = useState<string | null>(null);
  const [durum, setDurum] = useState<KayitDurum>('bos');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  // Eski içerik havuzu (aktarma seçicisi)
  const [havuzAcik, setHavuzAcik] = useState(false);
  const [eskiler, setEskiler] = useState<EskiIcerik[] | null>(null);
  const [havuzAra, setHavuzAra] = useState('');

  const sonBloklarRef = useRef<Block[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!itemId) return;
    let iptal = false;
    setYukleniyor(true);
    itemIcerikYukle(itemId)
      .then((data) => {
        if (iptal) return;
        if (!data) {
          setYuklemeHata('Item bulunamadı.');
          setYukleniyor(false);
          return;
        }
        setItem({ ad: data.ad, tip: data.tip });
        setIcerik(data.icerik);
        setEditorKey((k) => k + 1);
        setYuklemeHata(null);
        setYukleniyor(false);
      })
      .catch((e) => {
        if (iptal) return;
        setYuklemeHata(e instanceof Error ? e.message : 'Yükleme başarısız');
        setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [itemId]);

  const kaydet = async (bloklar: Block[]) => {
    if (!itemId) return;
    setDurum('kaydediliyor');
    setHataMesaji(null);
    try {
      await itemIcerikKaydet(itemId, bloklar);
      setDurum('kaydedildi');
    } catch (e) {
      setDurum('hata');
      setHataMesaji(e instanceof Error ? e.message : 'Kayıt başarısız');
    }
  };

  const elleKaydet = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (sonBloklarRef.current) kaydet(sonBloklarRef.current);
  };

  const editorDegisti = (bloklar: Block[]) => {
    sonBloklarRef.current = bloklar;
    setDurum('degisiyor');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (sonBloklarRef.current) kaydet(sonBloklarRef.current);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ── Eski içerikten aktar ──
  const havuzAc = async () => {
    setHavuzAcik(true);
    if (eskiler) return;
    try {
      setEskiler(await eskiIceriklerYukle());
    } catch (e) {
      setEskiler([]);
      alert((e as Error).message);
    }
  };

  const aktar = (e: EskiIcerik) => {
    if (!confirm(`"${e.baslik}" içeriğini bu item'a aktar? Mevcut içerik değişir.`)) return;
    setIcerik(e.icerik);
    setEditorKey((k) => k + 1); // editörü yeni içerikle remount et
    sonBloklarRef.current = e.icerik as Block[];
    setHavuzAcik(false);
    kaydet(e.icerik as Block[]);
  };

  const filtreli = useMemo(() => {
    if (!eskiler) return [];
    const q = havuzAra.trim().toLocaleLowerCase('tr');
    if (!q) return eskiler;
    return eskiler.filter((e) => e.baslik.toLocaleLowerCase('tr').includes(q));
  }, [eskiler, havuzAra]);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />

        <div className="flex-1 min-w-0">
          <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <button
                onClick={() => nav(`/admin/kesfet/${kartId}`)}
                className="inline-flex items-center gap-2 text-[12px] text-ink-mute hover:text-ink font-semibold mb-3 transition"
              >
                <Icon name="ArrowLeft" size={12} />
                Karta dön
              </button>

              {yukleniyor ? (
                <div className="text-[14px] text-ink-soft font-mono tracking-[0.16em] uppercase">
                  yükleniyor…
                </div>
              ) : yuklemeHata ? (
                <div className="text-[14px] text-danger font-semibold">{yuklemeHata}</div>
              ) : item ? (
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold mb-1">
                    {item.tip === 'ders' ? 'Ders' : 'Alıştırma'} · Konu Anlatımı
                  </div>
                  <h1 className="font-display text-[28px] sm:text-[34px] font-bold tracking-tight text-ink leading-tight">
                    {item.ad}
                  </h1>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <button
                onClick={havuzAc}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-line-strong text-[12px] font-bold tracking-wide text-ink-soft hover:text-ink hover:border-ink transition"
              >
                <Icon name="Download" size={12} />
                Eski içerikten aktar
              </button>
              <div
                className={`flex items-center gap-2 text-[11px] font-mono tracking-[0.16em] uppercase font-bold ${DURUM_RENK[durum]}`}
              >
                {durum === 'kaydediliyor' && <Icon name="Loader2" size={12} className="animate-spin" />}
                {durum === 'kaydedildi' && <Icon name="Check" size={12} />}
                {durum === 'hata' && <Icon name="AlertCircle" size={12} />}
                {durum === 'degisiyor' && <span className="w-1.5 h-1.5 rounded-full bg-premium" />}
                <span>{DURUM_ETIKET[durum]}</span>
              </div>
              <button
                onClick={elleKaydet}
                disabled={durum === 'kaydediliyor' || !sonBloklarRef.current}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-ink text-bg text-[12px] font-bold tracking-wide hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="Save" size={12} />
                Şimdi kaydet
              </button>
            </div>
          </div>

          {hataMesaji && (
            <div className="mb-4 px-4 py-3 rounded-lg border border-danger-soft bg-danger-soft text-[13px] text-danger">
              <span className="font-bold">Kayıt hatası:</span> {hataMesaji}
            </div>
          )}

          <div className="mb-4 px-4 py-3 rounded-lg border border-line bg-surface-2/40 text-[12.5px] text-ink-soft leading-relaxed">
            <span className="font-bold text-ink">Notion-tarzı yazım:</span>{' '}
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-bg border border-line">/</kbd>{' '}
            ile blok ekle. Yazım durunca otomatik kaydedilir. Hazır bir metni almak için{' '}
            <span className="font-bold text-ink">Eski içerikten aktar</span>.
          </div>

          <div className="border border-line rounded-2xl bg-bg overflow-hidden">
            {!yukleniyor && item && (
              <IcerikEditor key={editorKey} initialContent={icerik} onChange={editorDegisti} />
            )}
          </div>
        </div>
      </div>

      {/* Eski içerik havuzu — aktarma seçicisi */}
      {havuzAcik && (
        <div
          className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-start justify-center p-4 sm:p-8"
          onClick={() => setHavuzAcik(false)}
        >
          <div
            className="bg-bg border border-line rounded-2xl w-full max-w-xl max-h-[80vh] flex flex-col overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-line-soft">
              <div>
                <h2 className="font-display text-[18px] font-bold text-ink">Eski içerikten aktar</h2>
                <p className="text-[12px] text-ink-mute mt-0.5">
                  Eski modül/alt başlık sisteminden dolu içerikler. Seçince bu item'a kopyalanır.
                </p>
              </div>
              <button onClick={() => setHavuzAcik(false)} className="p-1.5 text-ink-mute hover:text-ink">
                <Icon name="X" size={18} />
              </button>
            </div>

            <div className="px-5 py-3 border-b border-line-soft">
              <input
                autoFocus
                value={havuzAra}
                onChange={(e) => setHavuzAra(e.target.value)}
                placeholder="Başlığa göre ara…"
                className="w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm outline-none focus:border-ink"
              />
            </div>

            <div className="overflow-y-auto p-3 flex flex-col gap-1.5">
              {eskiler === null ? (
                <div className="py-10 text-center text-ink-mute text-sm">
                  <Icon name="Loader2" size={16} className="animate-spin inline mr-2" />
                  Yükleniyor…
                </div>
              ) : filtreli.length === 0 ? (
                <div className="py-10 text-center text-ink-mute text-sm">
                  {eskiler.length === 0 ? 'Aktarılacak dolu içerik yok.' : 'Eşleşen içerik yok.'}
                </div>
              ) : (
                filtreli.map((e) => (
                  <button
                    key={`${e.kaynak}:${e.id}`}
                    onClick={() => aktar(e)}
                    className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-line hover:border-ink hover:bg-surface-2/50 text-left transition"
                  >
                    <span className="flex-none w-8 h-8 rounded-lg bg-brand-soft text-brand-deep grid place-items-center">
                      <Icon name={e.kaynak === 'modul' ? 'LayoutGrid' : 'FileText'} size={15} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[14px] font-semibold text-ink truncate">{e.baslik}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wide text-ink-mute">
                        {e.kaynak === 'modul' ? 'Modül genel bakış' : 'Alt başlık'} · {e.id}
                      </span>
                    </span>
                    <Icon name="ArrowRight" size={15} className="flex-none text-ink-quiet" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
