import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import { Thiings } from '../../components/Thiings';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonSatirlar } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import type { UnitesRow } from '../../lib/database.types';

interface UniteIstatistik extends UnitesRow {
  soruSayisi: number;
}

const IKON_SECENEK = [
  'acilis',
  'hazir-degerler',
  'mal-alis',
  'mal-satis',
  'ticari-alacaklar',
  'ticari-borclar',
  'kdv',
  'personel',
  'mdv',
  'amortisman',
  'reeskont-karsilik',
  'stok-degerleme',
  'yabanci-kaynaklar',
  'gelir-tablosu',
  'donem-sonu-kapanis',
  // Yedek/dekoratif
  'calculator',
  'rocket',
  'trophy',
  'chart',
  'tl',
  'dolar',
  'euro',
];

interface FormDurum {
  acik: boolean;
  duzenleniyor: UnitesRow | null;
}

export const AdminUnitelerSayfasi = () => {
  const nav = useNavigate();
  const [uniteler, setUniteler] = useState<UniteIstatistik[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [form, setForm] = useState<FormDurum>({ acik: false, duzenleniyor: null });

  const yukle = async () => {
    setYukleniyor(true);
    const uniteR = await supabase.from('isletmeler').select('*').order('sira');
    if (uniteR.error) {
      setHata(uniteR.error.message);
      setYukleniyor(false);
      return;
    }
    const sayim = await supabase.from('sorular').select('isletme_id');
    const dagilim: Record<string, number> = {};
    (sayim.data ?? []).forEach((r) => {
      dagilim[r.isletme_id] = (dagilim[r.isletme_id] ?? 0) + 1;
    });
    setUniteler(
      (uniteR.data ?? []).map((u) => ({ ...u, soruSayisi: dagilim[u.id] ?? 0 })),
    );
    setHata(null);
    setYukleniyor(false);
  };

  useEffect(() => {
    yukle().catch((e) => {
      console.error('İşletmeler yüklenemedi', e);
      setHata(String(e));
      setYukleniyor(false);
    });
  }, []);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    if (!q) return uniteler;
    return uniteler.filter(
      (u) =>
        u.id.toLowerCase().includes(q) ||
        u.ad.toLowerCase().includes(q) ||
        (u.aciklama ?? '').toLowerCase().includes(q),
    );
  }, [uniteler, arama]);

  const sil = async (u: UnitesRow, soruSayisi: number) => {
    if (soruSayisi > 0) {
      alert(
        `"${u.ad}" işletmesinde ${soruSayisi} soru var. Önce bu soruları başka işletmeye taşı veya sil, sonra tekrar dene.`,
      );
      return;
    }
    if (!confirm(`"${u.ad}" işletmesini silmek istediğinden emin misin?`)) return;
    const r = await supabase.from('isletmeler').delete().eq('id', u.id);
    if (r.error) {
      alert('Silme hatası: ' + r.error.message);
      return;
    }
    yukle();
  };

  const siraDegistir = async (u: UnitesRow, yeniSira: number) => {
    if (yeniSira === u.sira) return;
    const r = await supabase.from('isletmeler').update({ sira: yeniSira }).eq('id', u.id);
    if (r.error) {
      alert('Sıra güncelleme hatası: ' + r.error.message);
      return;
    }
    yukle();
  };


  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <AdminSayfaBaslik
          baslik="İşletmeler"
          aciklama="İşletmeleri ekle, düzenle, sil ve sıralarını değiştir. Sorular bağlı olan işletmeler silinemez."
          aksiyon={
            <button
              onClick={() => setForm({ acik: true, duzenleniyor: null })}
              className="btn btn-primary"
            >
              <Icon name="PlusCircle" size={14} />
              Yeni İşletme
            </button>
          }
        />

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
          <SkeletonSatirlar satirSayisi={6} />
        ) : filtreli.length === 0 ? (
          <EmptyState
            ikon="Package"
            baslik="İşletme bulunamadı"
            aciklama={arama ? 'Aramana uygun işletme yok.' : 'Henüz hiç işletme yok. Yeni İşletme ile başla.'}
          />
        ) : (
          <div className="border border-line rounded-xl overflow-hidden bg-surface">
            <div className="grid grid-cols-[64px_56px_1fr_120px_240px] gap-3 px-4 py-2.5 bg-bg-tint border-b border-line text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
              <div>Sıra</div>
              <div>İkon</div>
              <div>İşletme</div>
              <div className="text-right">Soru</div>
              <div className="text-right">İşlem</div>
            </div>
            {filtreli.map((u) => (
              <div
                key={u.id}
                className="grid grid-cols-[64px_56px_1fr_120px_240px] gap-3 px-4 py-3 items-center border-b border-line last:border-b-0 hover:bg-bg-tint/60 transition"
              >
                <div>
                  <input
                    type="number"
                    defaultValue={u.sira}
                    onBlur={(e) => siraDegistir(u, parseInt(e.target.value, 10) || u.sira)}
                    className="w-12 px-2 py-1 text-sm font-mono bg-surface border border-line rounded text-center focus:outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <Thiings name={u.thiings_icon ?? 'square'} size={36} />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-[15px] tracking-tight text-ink truncate flex items-center gap-2">
                    {u.ad}
                    {!u.aktif && (
                      <span className="text-[9px] tracking-[0.18em] uppercase font-bold px-1.5 py-0.5 rounded bg-premium-soft text-premium-deep">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-ink-quiet mt-0.5">
                    {u.id}
                  </div>
                  {u.aciklama && (
                    <div className="text-[12.5px] text-ink-mute line-clamp-1 mt-1 max-w-2xl">
                      {u.aciklama}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-mono text-[14px] font-bold text-ink-soft tabular-nums">
                    {u.soruSayisi}
                  </span>
                  {u.soruSayisi === 0 && (
                    <div className="text-[9.5px] tracking-[0.2em] uppercase text-premium-deep font-bold mt-0.5">
                      Boş
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => nav(`/admin/isletmeler/${u.id}/moduller`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-surface-2 text-ink text-[11.5px] font-bold tracking-wide hover:bg-line-soft transition"
                    title="Atölye modülleri (sıralı atölye yapısı)"
                  >
                    <Icon name="ListChecks" size={12} />
                    Modüller
                  </button>
                  <button
                    onClick={() => nav(`/admin/isletmeler/${u.id}/icerik`)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ink text-bg text-[11.5px] font-bold tracking-wide hover:opacity-90 transition"
                    title="Notion-tarzı işletme içerik editörü"
                  >
                    <Icon name="FileText" size={12} />
                    İçerik
                  </button>
                  <button
                    onClick={() => setForm({ acik: true, duzenleniyor: u })}
                    className="p-2 hover:bg-surface-2 rounded transition"
                    title="Üst meta düzenle (ad, ikon, sıra)"
                  >
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button
                    onClick={() => sil(u, u.soruSayisi)}
                    disabled={u.soruSayisi > 0}
                    className="p-2 hover:bg-danger-soft rounded transition text-danger dark:text-danger disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    title={u.soruSayisi > 0 ? `${u.soruSayisi} soru bağlı, silemezsin` : 'Sil'}
                  >
                    <Icon name="Trash2" size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {form.acik && (
          <UniteForm
            duzenleniyor={form.duzenleniyor}
            onKapat={() => setForm({ acik: false, duzenleniyor: null })}
            onKaydet={() => {
              setForm({ acik: false, duzenleniyor: null });
              yukle();
            }}
            mevcutSiralar={uniteler.map((u) => u.sira)}
          />
        )}
      </div>
    </main>
  );
};

interface UniteFormProps {
  duzenleniyor: UnitesRow | null;
  onKapat: () => void;
  onKaydet: () => void;
  mevcutSiralar: number[];
}

const UniteForm = ({ duzenleniyor, onKapat, onKaydet, mevcutSiralar }: UniteFormProps) => {
  const yeni = !duzenleniyor;
  const [id, setId] = useState(duzenleniyor?.id ?? '');
  const [ad, setAd] = useState(duzenleniyor?.ad ?? '');
  const [aciklama, setAciklama] = useState(duzenleniyor?.aciklama ?? '');
  const [thiingsIcon, setThiingsIcon] = useState(duzenleniyor?.thiings_icon ?? 'rocket');
  const [sira, setSira] = useState(
    duzenleniyor?.sira ?? Math.max(0, ...mevcutSiralar) + 1,
  );
  const [aktif, setAktif] = useState(duzenleniyor?.aktif ?? true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const idGecerli = /^[a-z0-9-]+$/.test(id);

  const kaydet = async () => {
    if (!ad.trim()) {
      setHata('İşletme adı zorunlu');
      return;
    }
    if (yeni && !idGecerli) {
      setHata('ID küçük harf, rakam ve tire içerebilir (örn: hazir-degerler)');
      return;
    }
    setKaydediyor(true);
    setHata(null);
    const veri = {
      id: id.trim(),
      ad: ad.trim(),
      aciklama: aciklama.trim() || null,
      thiings_icon: thiingsIcon,
      sira,
      aktif,
    };
    const r = yeni
      ? await supabase.from('isletmeler').insert(veri)
      : await supabase.from('isletmeler').update(veri).eq('id', duzenleniyor!.id);
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
              {yeni ? 'Yeni İşletme' : duzenleniyor.ad}
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
                ? 'URL\'de ve veritabanında kullanılır. Sonradan değiştirilemez. Örnek: hazir-degerler'
                : 'Mevcut işletmenin ID\'si — değiştirilemez.'
            }
          >
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={!yeni}
              placeholder="hazir-degerler"
              className="w-full px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg disabled:opacity-60 focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="İşletme Adı *">
            <input
              value={ad}
              onChange={(e) => setAd(e.target.value)}
              placeholder="Hazır Değerler (Kasa, Banka, Çekler)"
              className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="Açıklama" yardim="İşletmeler sayfasında satır altında görünür.">
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              placeholder="100, 101, 102, 103, 108 hesapları — günlük tahsilat ve ödemeler…"
              className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg resize-none focus:outline-none focus:border-ink"
            />
          </Alan>

          <div className="grid grid-cols-2 gap-3">
            <Alan etiket="Sıra">
              <input
                type="number"
                value={sira}
                onChange={(e) => setSira(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
              />
            </Alan>

            <Alan etiket="İkon">
              <div className="flex items-center gap-2">
                <select
                  value={thiingsIcon}
                  onChange={(e) => setThiingsIcon(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
                >
                  {IKON_SECENEK.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
                <Thiings name={thiingsIcon} size={36} />
              </div>
            </Alan>
          </div>

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
                Pasif işletme kullanıcı tarafında "Yakında" rozetiyle gösterilir
                ve tıklanamaz. Modül/alt başlık/soru içerikleri silinmez.
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
          <button
            onClick={onKapat}
            className="btn"
            disabled={kaydediyor}
          >
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
