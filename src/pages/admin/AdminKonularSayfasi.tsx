import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Thiings } from '../../components/Thiings';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonSatirlar } from '../../components/Skeleton';
import { useUniteler } from '../../contexts/UnitelerContext';
import { supabase } from '../../lib/supabase';
import type { UniteKonusuRow, UnitesRow } from '../../lib/database.types';

interface KonuIstatistik extends UniteKonusuRow {
  soruSayisi: number;
}

interface FormDurum {
  acik: boolean;
  duzenleniyor: UniteKonusuRow | null;
}

/**
 * Bir işletmenin alt-konularını yönetir (CRUD + sıralama).
 * URL: /admin/uniteler/:uniteId/konular
 */
export const AdminKonularSayfasi = () => {
  const { uniteId } = useParams<{ uniteId: string }>();
  const nav = useNavigate();
  const { yenile: unitelerYenile } = useUniteler();

  const [unite, setUnite] = useState<UnitesRow | null>(null);
  const [konular, setKonular] = useState<KonuIstatistik[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [form, setForm] = useState<FormDurum>({ acik: false, duzenleniyor: null });

  const yukle = async () => {
    if (!uniteId) return;
    setYukleniyor(true);
    const [uniteR, konuR, soruR] = await Promise.all([
      supabase.from('unites').select('*').eq('id', uniteId).maybeSingle(),
      supabase.from('unite_konulari').select('*').eq('unite_id', uniteId).order('sira'),
      supabase.from('sorular').select('konu_id').eq('unite_id', uniteId),
    ]);
    if (uniteR.error) {
      setHata(uniteR.error.message);
      setYukleniyor(false);
      return;
    }
    if (!uniteR.data) {
      setHata('İşletme bulunamadı');
      setYukleniyor(false);
      return;
    }
    if (konuR.error) {
      setHata(konuR.error.message);
      setYukleniyor(false);
      return;
    }
    setUnite(uniteR.data as UnitesRow);

    const dagilim: Record<string, number> = {};
    (soruR.data ?? []).forEach((r) => {
      if (r.konu_id) dagilim[r.konu_id] = (dagilim[r.konu_id] ?? 0) + 1;
    });
    setKonular(
      (konuR.data ?? []).map((k) => ({
        ...(k as UniteKonusuRow),
        soruSayisi: dagilim[k.id] ?? 0,
      })),
    );
    setHata(null);
    setYukleniyor(false);
  };

  useEffect(() => {
    yukle().catch((e) => {
      console.error('Konular yüklenemedi', e);
      setHata(String(e));
      setYukleniyor(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniteId]);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    if (!q) return konular;
    return konular.filter(
      (k) =>
        k.id.toLowerCase().includes(q) ||
        k.ad.toLowerCase().includes(q) ||
        (k.aciklama ?? '').toLowerCase().includes(q),
    );
  }, [konular, arama]);

  const sil = async (k: KonuIstatistik) => {
    if (k.soruSayisi > 0) {
      if (
        !confirm(
          `"${k.ad}" konusunda ${k.soruSayisi} soru bağlı. Sildiğinde sorular işletme seviyesinde kalır (konu_id null olur). Devam edelim mi?`,
        )
      ) {
        return;
      }
    } else if (!confirm(`"${k.ad}" konusunu silmek istediğinden emin misin?`)) {
      return;
    }
    const r = await supabase.from('unite_konulari').delete().eq('id', k.id);
    if (r.error) {
      alert('Silme hatası: ' + r.error.message);
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  const siraDegistir = async (k: UniteKonusuRow, yeniSira: number) => {
    if (yeniSira === k.sira) return;
    const r = await supabase.from('unite_konulari').update({ sira: yeniSira }).eq('id', k.id);
    if (r.error) {
      alert('Sıra güncelleme hatası: ' + r.error.message);
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <button
          onClick={() => nav('/admin/uniteler')}
          className="inline-flex items-center gap-2 text-[12px] text-ink-mute hover:text-ink font-semibold mb-3 transition"
        >
          <Icon name="ArrowLeft" size={12} />
          İşletmeler
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <div className="flex items-center gap-4 min-w-0">
            {unite?.thiings_icon && <Thiings name={unite.thiings_icon} size={44} />}
            <div className="min-w-0">
              <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1">
                Konular
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                {unite?.ad ?? 'İşletme'}
              </h1>
            </div>
          </div>
          <button
            onClick={() => setForm({ acik: true, duzenleniyor: null })}
            className="btn btn-primary"
          >
            <Icon name="PlusCircle" size={14} />
            Yeni Konu
          </button>
        </div>

        <p className="text-sm text-ink-soft font-medium mb-6 mt-3 max-w-3xl">
          İşletmeyi mikro alt-konulara böl. Her konunun kendi anlatımı (BlockNote) ve
          sıralı soruları olur. Sol navigasyon kullanıcı tarafında bunu listeler.
        </p>

        <div className="mb-4">
          <div className="relative max-w-md">
            <Icon
              name="Search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-quiet"
            />
            <input
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ad, ID veya açıklama ara…"
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
            />
          </div>
        </div>

        {hata && (
          <div className="mb-4 p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger">
            {hata}
          </div>
        )}

        {yukleniyor ? (
          <SkeletonSatirlar satirSayisi={5} />
        ) : filtreli.length === 0 ? (
          <EmptyState
            ikon="LayoutList"
            baslik="Konu yok"
            aciklama={
              arama
                ? 'Aramana uygun konu yok.'
                : 'Bu işletme için henüz alt-konu yok. "Yeni Konu" ile başla.'
            }
          />
        ) : (
          <div className="border border-line rounded-xl overflow-hidden bg-surface">
            <div className="grid grid-cols-[64px_1fr_120px_180px] gap-3 px-4 py-2.5 bg-bg-tint border-b border-line text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
              <div>Sıra</div>
              <div>Konu</div>
              <div className="text-right">Soru</div>
              <div className="text-right">İşlem</div>
            </div>
            {filtreli.map((k) => (
              <div
                key={k.id}
                className="grid grid-cols-[64px_1fr_120px_180px] gap-3 px-4 py-3 items-center border-b border-line last:border-b-0 hover:bg-bg-tint/60 transition"
              >
                <div>
                  <input
                    type="number"
                    defaultValue={k.sira}
                    onBlur={(e) => siraDegistir(k, parseInt(e.target.value, 10) || k.sira)}
                    className="w-12 px-2 py-1 text-sm font-mono bg-surface border border-line rounded text-center focus:outline-none focus:border-ink"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-[15px] tracking-tight text-ink truncate">
                    {k.ad}
                  </div>
                  <div className="font-mono text-[11px] text-ink-quiet mt-0.5">
                    {k.id}
                  </div>
                  {k.aciklama && (
                    <div className="text-[12.5px] text-ink-mute line-clamp-1 mt-1 max-w-2xl">
                      {k.aciklama}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-mono text-[14px] font-bold text-ink-soft tabular-nums">
                    {k.soruSayisi}
                  </span>
                  {k.icerik ? (
                    <div className="text-[9.5px] tracking-[0.2em] uppercase text-success dark:text-success font-bold mt-0.5">
                      İçerik var
                    </div>
                  ) : (
                    <div className="text-[9.5px] tracking-[0.2em] uppercase text-premium-deep font-bold mt-0.5">
                      İçerik yok
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => nav(`/admin/uniteler/${uniteId}/konular/${k.id}/icerik`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ink text-bg text-[11.5px] font-bold tracking-wide hover:opacity-90 transition"
                    title="Konunun BlockNote içeriğini düzenle"
                  >
                    <Icon name="FileText" size={12} />
                    İçerik
                  </button>
                  <button
                    onClick={() => setForm({ acik: true, duzenleniyor: k })}
                    className="p-2 hover:bg-surface-2 rounded transition"
                    title="Üst meta düzenle (ad, açıklama, sıra)"
                  >
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button
                    onClick={() => sil(k)}
                    className="p-2 hover:bg-danger-soft rounded transition text-danger dark:text-danger"
                    title="Sil"
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {form.acik && uniteId && (
          <KonuForm
            uniteId={uniteId}
            duzenleniyor={form.duzenleniyor}
            onKapat={() => setForm({ acik: false, duzenleniyor: null })}
            onKaydet={async () => {
              setForm({ acik: false, duzenleniyor: null });
              await unitelerYenile().catch(() => {});
              yukle();
            }}
            mevcutSiralar={konular.map((k) => k.sira)}
          />
        )}
      </div>
    </main>
  );
};

interface KonuFormProps {
  uniteId: string;
  duzenleniyor: UniteKonusuRow | null;
  onKapat: () => void;
  onKaydet: () => void;
  mevcutSiralar: number[];
}

const KonuForm = ({
  uniteId,
  duzenleniyor,
  onKapat,
  onKaydet,
  mevcutSiralar,
}: KonuFormProps) => {
  const yeni = !duzenleniyor;
  const [id, setId] = useState(duzenleniyor?.id ?? '');
  const [ad, setAd] = useState(duzenleniyor?.ad ?? '');
  const [aciklama, setAciklama] = useState(duzenleniyor?.aciklama ?? '');
  const [sira, setSira] = useState(
    duzenleniyor?.sira ?? Math.max(0, ...mevcutSiralar) + 1,
  );
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const idGecerli = /^[a-z0-9-]+$/.test(id);

  const kaydet = async () => {
    if (!ad.trim()) {
      setHata('Konu adı zorunlu');
      return;
    }
    if (yeni && !idGecerli) {
      setHata('ID küçük harf, rakam ve tire içerebilir (örn: mal-alis)');
      return;
    }
    setKaydediyor(true);
    setHata(null);
    const veri = {
      id: id.trim(),
      unite_id: uniteId,
      ad: ad.trim(),
      aciklama: aciklama.trim() || null,
      sira,
    };
    const r = yeni
      ? await supabase.from('unite_konulari').insert(veri)
      : await supabase
          .from('unite_konulari')
          .update({
            ad: veri.ad,
            aciklama: veri.aciklama,
            sira: veri.sira,
          })
          .eq('id', duzenleniyor!.id);
    setKaydediyor(false);
    if (r.error) {
      setHata(r.error.message);
      return;
    }
    onKaydet();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-ink/55 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 sm:p-8"
      onClick={onKapat}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-surface border border-line-strong rounded-2xl shadow-2xl my-auto"
      >
        <div className="flex items-center justify-between p-5 border-b border-line">
          <div>
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1">
              {yeni ? 'Yeni' : 'Düzenle'}
            </div>
            <h2 className="font-display text-xl font-bold tracking-tight">
              {yeni ? 'Yeni Konu' : duzenleniyor.ad}
            </h2>
          </div>
          <button
            onClick={onKapat}
            className="p-2 hover:bg-surface-2 rounded-lg transition"
          >
            <Icon name="X" size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <Alan
            etiket="ID (slug)"
            yardim={
              yeni
                ? "URL'de ve veritabanında kullanılır. Sonradan değiştirilemez. Örnek: mal-alis"
                : "Mevcut konunun ID'si — değiştirilemez."
            }
          >
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={!yeni}
              placeholder="mal-alis"
              className="w-full px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg disabled:opacity-60 focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="Konu Adı *">
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Mal Alış"
              className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="Açıklama" yardim="Sol navigasyonda ve konu kartında satır altında görünür.">
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              placeholder="153 borç, 191 borç, 320 alacak — alış faturasından kayıt"
              className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg resize-none focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="Sıra">
            <input
              type="number"
              value={sira}
              onChange={(e) => setSira(parseInt(e.target.value, 10) || 0)}
              className="w-32 px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
            />
          </Alan>

          {hata && (
            <div className="p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger">
              {hata}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-line">
          <button onClick={onKapat} className="btn" disabled={kaydediyor}>
            İptal
          </button>
          <button
            onClick={kaydet}
            disabled={kaydediyor || !ad.trim()}
            className="btn btn-primary"
          >
            {kaydediyor ? 'Kaydediliyor…' : yeni ? 'Ekle' : 'Güncelle'}
          </button>
        </div>
      </div>
    </div>
  );
};

const Alan = ({
  etiket,
  yardim,
  children,
}: {
  etiket: string;
  yardim?: string;
  children: React.ReactNode;
}) => (
  <label className="block">
    <span className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-1.5 block">
      {etiket}
    </span>
    {children}
    {yardim && (
      <span className="block text-[11.5px] text-ink-mute mt-1.5 leading-snug">
        {yardim}
      </span>
    )}
  </label>
);
