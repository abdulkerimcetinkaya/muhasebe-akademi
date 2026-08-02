import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonSatirlar } from '../../components/Skeleton';
import { useUniteler } from '../../contexts/UnitelerContext';
import { supabase } from '../../lib/supabase';
import type {
  ModulAltBaslikRow,
  UniteModuluRow,
  UnitesRow,
} from '../../lib/database.types';

interface AltBaslikIstatistik extends ModulAltBaslikRow {
  soruSayisi: number;
  atolyeSoruSayisi: number;
}

interface FormDurum {
  acik: boolean;
  duzenleniyor: ModulAltBaslikRow | null;
}

/**
 * Bir modülün alt başlıklarını yönetir (CRUD + sıralama).
 * URL: /admin/isletmeler/:uniteId/moduller/:modulId/alt-basliklar
 */
export const AdminAltBasliklarSayfasi = () => {
  const { uniteId, modulId } = useParams<{ uniteId: string; modulId: string }>();
  const nav = useNavigate();
  const { yenile: unitelerYenile } = useUniteler();

  const [unite, setUnite] = useState<UnitesRow | null>(null);
  const [modul, setModul] = useState<UniteModuluRow | null>(null);
  const [altBasliklar, setAltBasliklar] = useState<AltBaslikIstatistik[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [form, setForm] = useState<FormDurum>({ acik: false, duzenleniyor: null });

  const yukle = async () => {
    if (!uniteId || !modulId) return;
    setYukleniyor(true);
    const [uniteR, modulR, altR, soruR, atolyeR] = await Promise.all([
      supabase.from('isletmeler').select('*').eq('id', uniteId).maybeSingle(),
      supabase.from('isletme_modulleri').select('*').eq('id', modulId).maybeSingle(),
      supabase
        .from('modul_alt_basliklari')
        .select('*')
        .eq('modul_id', modulId)
        .order('sira'),
      supabase.from('sorular').select('alt_baslik_id'),
      supabase.from('atolye_sorulari').select('alt_baslik_id'),
    ]);
    if (uniteR.error) {
      setHata(uniteR.error.message);
      setYukleniyor(false);
      return;
    }
    if (modulR.error) {
      setHata(modulR.error.message);
      setYukleniyor(false);
      return;
    }
    if (!uniteR.data || !modulR.data) {
      setHata('İşletme veya modül bulunamadı');
      setYukleniyor(false);
      return;
    }
    if (altR.error) {
      setHata(altR.error.message);
      setYukleniyor(false);
      return;
    }
    setUnite(uniteR.data as UnitesRow);
    setModul(modulR.data as UniteModuluRow);

    const dagilim: Record<string, number> = {};
    (soruR.data ?? []).forEach((r) => {
      if (r.alt_baslik_id) dagilim[r.alt_baslik_id] = (dagilim[r.alt_baslik_id] ?? 0) + 1;
    });
    const atolyeDagilim: Record<string, number> = {};
    (atolyeR.data ?? []).forEach((r) => {
      atolyeDagilim[r.alt_baslik_id] = (atolyeDagilim[r.alt_baslik_id] ?? 0) + 1;
    });
    setAltBasliklar(
      (altR.data ?? []).map((a) => ({
        ...(a as ModulAltBaslikRow),
        soruSayisi: dagilim[a.id] ?? 0,
        atolyeSoruSayisi: atolyeDagilim[a.id] ?? 0,
      })),
    );
    setHata(null);
    setYukleniyor(false);
  };

  useEffect(() => {
    yukle().catch((e) => {
      console.error('Alt başlıklar yüklenemedi', e);
      setHata(String(e));
      setYukleniyor(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniteId, modulId]);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    if (!q) return altBasliklar;
    return altBasliklar.filter(
      (a) => a.id.toLowerCase().includes(q) || a.baslik.toLowerCase().includes(q),
    );
  }, [altBasliklar, arama]);

  const sil = async (a: AltBaslikIstatistik) => {
    if (a.soruSayisi > 0) {
      if (
        !confirm(
          `"${a.baslik}" alt başlığında ${a.soruSayisi} soru bağlı. Sildiğinde sorular işletme seviyesinde kalır (alt_baslik_id null olur). Devam edelim mi?`,
        )
      ) {
        return;
      }
    } else if (!confirm(`"${a.baslik}" alt başlığını silmek istediğinden emin misin?`)) {
      return;
    }
    const r = await supabase.from('modul_alt_basliklari').delete().eq('id', a.id);
    if (r.error) {
      alert('Silme hatası: ' + r.error.message);
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  const siraDegistir = async (a: ModulAltBaslikRow, yeniSira: number) => {
    if (yeniSira === a.sira) return;
    const r = await supabase
      .from('modul_alt_basliklari')
      .update({ sira: yeniSira })
      .eq('id', a.id);
    if (r.error) {
      alert('Sıra güncelleme hatası: ' + r.error.message);
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  const karmaToggle = async (a: ModulAltBaslikRow) => {
    const r = await supabase
      .from('modul_alt_basliklari')
      .update({ karma: !a.karma })
      .eq('id', a.id);
    if (r.error) {
      alert('Güncelleme hatası: ' + r.error.message);
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
          onClick={() => nav(`/admin/isletmeler/${uniteId}/moduller`)}
          className="inline-flex items-center gap-2 text-[12px] text-ink-mute hover:text-ink font-semibold mb-3 transition"
        >
          <Icon name="ArrowLeft" size={12} />
          Modüller
        </button>

        <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
          <div className="min-w-0">
            <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1">
              Alt Başlıklar · Modül {modul?.sira ?? '?'}
            </div>
            <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">
              {modul?.baslik ?? 'Modül'}
            </h1>
            <div className="text-sm text-ink-mute font-medium mt-1">
              {unite?.ad}
            </div>
          </div>
          <button
            onClick={() => setForm({ acik: true, duzenleniyor: null })}
            className="btn btn-primary"
          >
            <Icon name="PlusCircle" size={14} />
            Yeni Alt Başlık
          </button>
        </div>

        <p className="text-sm text-ink-soft font-medium mb-6 mt-3 max-w-3xl">
          Modülü atölye birimlerine böl. Her alt başlık 1+ senaryo (soru) içerir.
          "Karma" alt başlık birden çok kavramı birleştiren bütünleşik vakayı işaretler
          (UI'da yıldız ile vurgulanır).
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
              placeholder="Başlık veya ID ara…"
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
            baslik="Alt başlık yok"
            aciklama={
              arama
                ? 'Aramana uygun alt başlık yok.'
                : 'Bu modül için henüz alt başlık yok. "Yeni Alt Başlık" ile başla.'
            }
          />
        ) : (
          <div className="border border-line rounded-xl overflow-hidden bg-surface">
            <div className="grid grid-cols-[64px_1fr_90px_120px_360px] gap-3 px-4 py-2.5 bg-bg-tint border-b border-line text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
              <div>Sıra</div>
              <div>Alt Başlık</div>
              <div>Karma</div>
              <div className="text-right" title="Havuz: konu etiketli toplam soru / Müfredat: bu atölyede gösterilen">Havuz / Müfredat</div>
              <div className="text-right">İşlem</div>
            </div>
            {filtreli.map((a) => (
              <div
                key={a.id}
                className="grid grid-cols-[64px_1fr_90px_120px_360px] gap-3 px-4 py-3 items-center border-b border-line last:border-b-0 hover:bg-bg-tint/60 transition"
              >
                <div>
                  <input
                    type="number"
                    defaultValue={a.sira}
                    onBlur={(e) => siraDegistir(a, parseInt(e.target.value, 10) || a.sira)}
                    className="w-12 px-2 py-1 text-sm font-mono bg-surface border border-line rounded text-center focus:outline-none focus:border-ink"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-[14.5px] text-ink truncate flex items-center gap-2">
                    {a.baslik}
                    {a.karma && (
                      <Icon
                        name="Star"
                        size={12}
                        className="text-premium-deep dark:text-premium flex-shrink-0"
                      />
                    )}
                    {!a.aktif && (
                      <span className="text-[9px] tracking-[0.18em] uppercase font-bold px-1.5 py-0.5 rounded bg-premium-soft text-premium-deep">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-ink-quiet mt-0.5">
                    {a.id}
                  </div>
                </div>
                <div>
                  <button
                    onClick={() => karmaToggle(a)}
                    className={`text-[10px] tracking-[0.18em] uppercase font-bold px-2 py-1 rounded border transition ${
                      a.karma
                        ? 'bg-premium-soft text-premium-deep border-premium-soft dark:bg-premium-soft/30 dark:text-premium dark:border-premium-deep/40'
                        : 'bg-surface text-ink-mute border-line hover:border-ink-mute'
                    }`}
                    title="Karma (bütünleşik) alt başlık olarak işaretle"
                  >
                    {a.karma ? 'Karma' : 'Tek'}
                  </button>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 font-mono text-[13px] tabular-nums">
                    <span
                      className="font-bold text-ink-soft"
                      title="Bu alt başlığa etiketli toplam soru (Problemler sayfası filtresi)"
                    >
                      {a.soruSayisi}
                    </span>
                    <span className="text-ink-quiet">/</span>
                    <span
                      className="font-bold text-blue-deep"
                      title="Bu atölyenin müfredatında gösterilen soru sayısı"
                    >
                      {a.atolyeSoruSayisi}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() =>
                      nav(
                        `/admin/isletmeler/${uniteId}/moduller/${modulId}/alt-basliklar/${a.id}/icerik`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line hover:border-ink text-[11.5px] font-bold tracking-wide transition"
                    title="Alt başlığın konu anlatımını düzenle (BlockNote)"
                  >
                    <Icon name="BookOpen" size={12} />
                    İçerik
                  </button>
                  <button
                    onClick={() =>
                      nav(
                        `/admin/isletmeler/${uniteId}/moduller/${modulId}/alt-basliklar/${a.id}/sorular`,
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line hover:border-ink text-[11.5px] font-bold tracking-wide transition"
                    title="Atölye müfredatını düzenle — havuzdan soru ekle/kaldır/sırala"
                  >
                    <Icon name="ListChecks" size={12} />
                    Müfredat
                  </button>
                  <button
                    onClick={() => nav(`/admin/sorular/yeni?alt=${a.id}`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ink text-bg text-[11.5px] font-bold tracking-wide hover:opacity-90 transition"
                    title="Bu alt başlığa yeni senaryo ekle (otomatik olarak müfredatın sonuna eklenir)"
                  >
                    <Icon name="PlusCircle" size={12} />
                    Senaryo
                  </button>
                  <button
                    onClick={() => setForm({ acik: true, duzenleniyor: a })}
                    className="p-2 hover:bg-surface-2 rounded transition"
                    title="Düzenle"
                  >
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button
                    onClick={() => sil(a)}
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

        {form.acik && modulId && (
          <AltBaslikForm
            modulId={modulId}
            duzenleniyor={form.duzenleniyor}
            onKapat={() => setForm({ acik: false, duzenleniyor: null })}
            onKaydet={async () => {
              setForm({ acik: false, duzenleniyor: null });
              await unitelerYenile().catch(() => {});
              yukle();
            }}
            mevcutSiralar={altBasliklar.map((a) => a.sira)}
          />
        )}
      </div>
    </main>
  );
};

interface AltBaslikFormProps {
  modulId: string;
  duzenleniyor: ModulAltBaslikRow | null;
  onKapat: () => void;
  onKaydet: () => void;
  mevcutSiralar: number[];
}

const AltBaslikForm = ({
  modulId,
  duzenleniyor,
  onKapat,
  onKaydet,
  mevcutSiralar,
}: AltBaslikFormProps) => {
  const yeni = !duzenleniyor;
  const [id, setId] = useState(duzenleniyor?.id ?? '');
  const [baslik, setBaslik] = useState(duzenleniyor?.baslik ?? '');
  const [sira, setSira] = useState(
    duzenleniyor?.sira ?? Math.max(0, ...mevcutSiralar) + 1,
  );
  const [karma, setKarma] = useState(duzenleniyor?.karma ?? false);
  const [aktif, setAktif] = useState(duzenleniyor?.aktif ?? true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const idGecerli = /^[a-z0-9-]+$/.test(id);

  const kaydet = async () => {
    if (!baslik.trim()) {
      setHata('Alt başlık adı zorunlu');
      return;
    }
    if (yeni && !idGecerli) {
      setHata('ID küçük harf, rakam ve tire içerebilir (örn: mal-alis-satis-1-1)');
      return;
    }
    setKaydediyor(true);
    setHata(null);
    if (yeni) {
      const r = await supabase.from('modul_alt_basliklari').insert({
        id: id.trim(),
        modul_id: modulId,
        sira,
        baslik: baslik.trim(),
        karma,
        aktif,
      });
      setKaydediyor(false);
      if (r.error) {
        setHata(r.error.message);
        return;
      }
    } else {
      const r = await supabase
        .from('modul_alt_basliklari')
        .update({
          baslik: baslik.trim(),
          sira,
          karma,
          aktif,
        })
        .eq('id', duzenleniyor!.id);
      setKaydediyor(false);
      if (r.error) {
        setHata(r.error.message);
        return;
      }
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
              {yeni ? 'Yeni Alt Başlık' : duzenleniyor.baslik}
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
                ? "URL'de ve veritabanında kullanılır. Sonradan değiştirilemez. Örnek: mal-alis-satis-1-1"
                : "Mevcut alt başlığın ID'si — değiştirilemez."
            }
          >
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={!yeni}
              placeholder="mal-alis-satis-1-1"
              className="w-full px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg disabled:opacity-60 focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="Başlık *">
            <input
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="İlk Alış (Kasadan Ödeme)"
              className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
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

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={karma}
              onChange={(e) => setKarma(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-ink"
            />
            <span className="text-[13px] leading-snug">
              <span className="font-semibold text-ink">Karma alt başlık</span>
              <span className="block text-[11.5px] text-ink-mute mt-0.5">
                Birden çok kavramı birleştiren bütünleşik vaka. UI'da yıldız ile vurgulanır.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={aktif}
              onChange={(e) => setAktif(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-ink"
            />
            <span className="text-[13px] leading-snug">
              <span className="font-semibold text-ink">Aktif</span>
              <span className="block text-[11.5px] text-ink-mute mt-0.5">
                Pasif alt başlık kullanıcı tarafında "Yakında" rozetiyle gösterilir
                ve tıklanamaz. Soru içerikleri silinmez.
              </span>
            </span>
          </label>

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
            disabled={kaydediyor || !baslik.trim()}
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
