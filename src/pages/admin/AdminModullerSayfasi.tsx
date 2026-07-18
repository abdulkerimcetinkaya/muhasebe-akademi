import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { Thiings } from '../../components/Thiings';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonSatirlar } from '../../components/Skeleton';
import { useUniteler } from '../../contexts/UnitelerContext';
import { MODUL_ZORLUK_AD, MODUL_ZORLUK_BADGE } from '../../data/sabitler';
import { supabase } from '../../lib/supabase';
import type {
  ModulZorlukDb,
  UniteModuluRow,
  UnitesRow,
} from '../../lib/database.types';

interface ModulIstatistik extends UniteModuluRow {
  altBaslikSayisi: number;
  soruSayisi: number;
}

interface FormDurum {
  acik: boolean;
  duzenleniyor: UniteModuluRow | null;
}

/**
 * Bir işletmenin atölye modüllerini yönetir (CRUD + sıralama).
 * URL: /admin/uniteler/:uniteId/moduller
 */
export const AdminModullerSayfasi = () => {
  const { uniteId } = useParams<{ uniteId: string }>();
  const nav = useNavigate();
  const { yenile: unitelerYenile } = useUniteler();

  const [unite, setUnite] = useState<UnitesRow | null>(null);
  const [moduller, setModuller] = useState<ModulIstatistik[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [form, setForm] = useState<FormDurum>({ acik: false, duzenleniyor: null });

  const yukle = async () => {
    if (!uniteId) return;
    setYukleniyor(true);
    const [uniteR, modulR, altR, soruR] = await Promise.all([
      supabase.from('unites').select('*').eq('id', uniteId).maybeSingle(),
      supabase.from('unite_modulleri').select('*').eq('unite_id', uniteId).order('sira'),
      supabase.from('modul_alt_basliklari').select('id, modul_id'),
      supabase.from('sorular').select('alt_baslik_id').eq('unite_id', uniteId),
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
    if (modulR.error) {
      setHata(modulR.error.message);
      setYukleniyor(false);
      return;
    }
    setUnite(uniteR.data as UnitesRow);

    // modul başına alt başlık sayısı
    const altByModul: Record<string, string[]> = {};
    (altR.data ?? []).forEach((a) => {
      if (!altByModul[a.modul_id]) altByModul[a.modul_id] = [];
      altByModul[a.modul_id].push(a.id);
    });

    // alt başlık başına soru sayısı
    const soruByAlt: Record<string, number> = {};
    (soruR.data ?? []).forEach((s) => {
      if (s.alt_baslik_id) soruByAlt[s.alt_baslik_id] = (soruByAlt[s.alt_baslik_id] ?? 0) + 1;
    });

    setModuller(
      (modulR.data ?? []).map((m) => {
        const altIds = altByModul[m.id] ?? [];
        const soruSayi = altIds.reduce((acc, id) => acc + (soruByAlt[id] ?? 0), 0);
        return {
          ...(m as UniteModuluRow),
          altBaslikSayisi: altIds.length,
          soruSayisi: soruSayi,
        };
      }),
    );
    setHata(null);
    setYukleniyor(false);
  };

  useEffect(() => {
    yukle().catch((e) => {
      console.error('Modüller yüklenemedi', e);
      setHata(String(e));
      setYukleniyor(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniteId]);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    if (!q) return moduller;
    return moduller.filter(
      (m) =>
        m.id.toLowerCase().includes(q) ||
        m.baslik.toLowerCase().includes(q) ||
        (m.aciklama ?? '').toLowerCase().includes(q),
    );
  }, [moduller, arama]);

  const sil = async (m: ModulIstatistik) => {
    if (m.altBaslikSayisi > 0) {
      if (
        !confirm(
          `"${m.baslik}" modülünde ${m.altBaslikSayisi} alt başlık var. Sildiğinde alt başlıklar ve bağlı soru ilişkileri silinir (sorular işletmede kalır). Devam edelim mi?`,
        )
      ) {
        return;
      }
    } else if (!confirm(`"${m.baslik}" modülünü silmek istediğinden emin misin?`)) {
      return;
    }
    const r = await supabase.from('unite_modulleri').delete().eq('id', m.id);
    if (r.error) {
      alert('Silme hatası: ' + r.error.message);
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  const siraDegistir = async (m: UniteModuluRow, yeniSira: number) => {
    if (yeniSira === m.sira) return;
    const r = await supabase.from('unite_modulleri').update({ sira: yeniSira }).eq('id', m.id);
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
                Atölye Modülleri
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
            Yeni Modül
          </button>
        </div>

        <p className="text-sm text-ink-soft font-medium mb-6 mt-3 max-w-3xl">
          İşletmeyi sıralı modüllere böl. Her modülde 1+ alt başlık olur, her alt başlığa senaryolar
          bağlanır. Modül 1 her zaman açık, sonraki modüller kilitle açılır. Opsiyonel modüller
          (örn. ileri vakalar) kilit akışında atlanır.
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
              placeholder="Başlık, ID veya açıklama ara…"
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
            baslik="Modül yok"
            aciklama={
              arama
                ? 'Aramana uygun modül yok.'
                : 'Bu işletme için henüz modül yok. "Yeni Modül" ile başla.'
            }
          />
        ) : (
          <div className="border border-line rounded-xl overflow-hidden bg-surface">
            <div className="grid grid-cols-[64px_1fr_120px_120px_260px] gap-3 px-4 py-2.5 bg-bg-tint border-b border-line text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
              <div>Sıra</div>
              <div>Modül</div>
              <div>Zorluk</div>
              <div className="text-right">Alt / Soru</div>
              <div className="text-right">İşlem</div>
            </div>
            {filtreli.map((m) => (
              <div
                key={m.id}
                className="grid grid-cols-[64px_1fr_120px_120px_260px] gap-3 px-4 py-3 items-center border-b border-line last:border-b-0 hover:bg-bg-tint/60 transition"
              >
                <div>
                  <input
                    type="number"
                    defaultValue={m.sira}
                    onBlur={(e) => siraDegistir(m, parseInt(e.target.value, 10) || m.sira)}
                    className="w-12 px-2 py-1 text-sm font-mono bg-surface border border-line rounded text-center focus:outline-none focus:border-ink"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-[15px] tracking-tight text-ink truncate flex items-center gap-2">
                    {m.baslik}
                    {!m.aktif && (
                      <span className="text-[9px] tracking-[0.18em] uppercase font-bold px-1.5 py-0.5 rounded bg-premium-soft text-premium-deep">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="font-mono text-[11px] text-ink-quiet mt-0.5">
                    {m.id}
                  </div>
                  {m.aciklama && (
                    <div className="text-[12.5px] text-ink-mute line-clamp-1 mt-1 max-w-2xl">
                      {m.aciklama}
                    </div>
                  )}
                </div>
                <div>
                  <span
                    className={`inline-block text-[9px] tracking-[0.18em] uppercase font-bold px-2 py-0.5 rounded border ${MODUL_ZORLUK_BADGE[m.zorluk_seviyesi]}`}
                  >
                    {MODUL_ZORLUK_AD[m.zorluk_seviyesi]}
                  </span>
                  {m.opsiyonel && (
                    <div className="text-[9.5px] tracking-[0.2em] uppercase text-premium-deep dark:text-premium font-bold mt-1 flex items-center gap-1">
                      <Icon name="Star" size={9} />
                      Opsiyonel
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-mono text-[14px] font-bold text-ink-soft tabular-nums">
                    {m.altBaslikSayisi}
                    <span className="text-ink-quiet font-medium"> / </span>
                    {m.soruSayisi}
                  </div>
                  <div className="text-[9.5px] tracking-[0.2em] uppercase text-ink-mute font-bold mt-0.5">
                    alt / soru
                  </div>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() =>
                      nav(`/admin/uniteler/${uniteId}/moduller/${m.id}/icerik`)
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line hover:border-ink text-[11.5px] font-bold tracking-wide transition"
                    title="Modülün Genel Bakış içeriğini düzenle (BlockNote)"
                  >
                    <Icon name="BookOpen" size={12} />
                    İçerik
                  </button>
                  <button
                    onClick={() =>
                      nav(`/admin/uniteler/${uniteId}/moduller/${m.id}/alt-basliklar`)
                    }
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-ink text-bg text-[11.5px] font-bold tracking-wide hover:opacity-90 transition"
                    title="Alt başlıkları yönet"
                  >
                    <Icon name="ListChecks" size={12} />
                    Alt
                  </button>
                  <button
                    onClick={() => setForm({ acik: true, duzenleniyor: m })}
                    className="p-2 hover:bg-surface-2 rounded transition"
                    title="Üst meta düzenle (başlık, zorluk, opsiyonel)"
                  >
                    <Icon name="Pencil" size={14} />
                  </button>
                  <button
                    onClick={() => sil(m)}
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
          <ModulForm
            uniteId={uniteId}
            duzenleniyor={form.duzenleniyor}
            onKapat={() => setForm({ acik: false, duzenleniyor: null })}
            onKaydet={async () => {
              setForm({ acik: false, duzenleniyor: null });
              await unitelerYenile().catch(() => {});
              yukle();
            }}
            mevcutSiralar={moduller.map((m) => m.sira)}
          />
        )}
      </div>
    </main>
  );
};

interface ModulFormProps {
  uniteId: string;
  duzenleniyor: UniteModuluRow | null;
  onKapat: () => void;
  onKaydet: () => void;
  mevcutSiralar: number[];
}

const ModulForm = ({
  uniteId,
  duzenleniyor,
  onKapat,
  onKaydet,
  mevcutSiralar,
}: ModulFormProps) => {
  const yeni = !duzenleniyor;
  const [id, setId] = useState(duzenleniyor?.id ?? '');
  const [baslik, setBaslik] = useState(duzenleniyor?.baslik ?? '');
  const [aciklama, setAciklama] = useState(duzenleniyor?.aciklama ?? '');
  const [sira, setSira] = useState(
    duzenleniyor?.sira ?? Math.max(0, ...mevcutSiralar) + 1,
  );
  const [zorlukSeviyesi, setZorlukSeviyesi] = useState<ModulZorlukDb>(
    duzenleniyor?.zorluk_seviyesi ?? 'baslangic',
  );
  const [opsiyonel, setOpsiyonel] = useState(duzenleniyor?.opsiyonel ?? false);
  const [aktif, setAktif] = useState(duzenleniyor?.aktif ?? true);
  const [kaydediyor, setKaydediyor] = useState(false);
  const [hata, setHata] = useState<string | null>(null);

  const idGecerli = /^[a-z0-9-]+$/.test(id);

  const kaydet = async () => {
    if (!baslik.trim()) {
      setHata('Modül başlığı zorunlu');
      return;
    }
    if (yeni && !idGecerli) {
      setHata('ID küçük harf, rakam ve tire içerebilir (örn: mal-alis-satis-m1)');
      return;
    }
    setKaydediyor(true);
    setHata(null);
    if (yeni) {
      const r = await supabase.from('unite_modulleri').insert({
        id: id.trim(),
        unite_id: uniteId,
        sira,
        baslik: baslik.trim(),
        aciklama: aciklama.trim() || null,
        zorluk_seviyesi: zorlukSeviyesi,
        opsiyonel,
        aktif,
      });
      setKaydediyor(false);
      if (r.error) {
        setHata(r.error.message);
        return;
      }
    } else {
      const r = await supabase
        .from('unite_modulleri')
        .update({
          baslik: baslik.trim(),
          aciklama: aciklama.trim() || null,
          sira,
          zorluk_seviyesi: zorlukSeviyesi,
          opsiyonel,
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
              {yeni ? 'Yeni Modül' : duzenleniyor.baslik}
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
                ? "URL'de ve veritabanında kullanılır. Sonradan değiştirilemez. Örnek: mal-alis-satis-m1"
                : "Mevcut modülün ID'si — değiştirilemez."
            }
          >
            <input
              value={id}
              onChange={(e) => setId(e.target.value)}
              disabled={!yeni}
              placeholder="mal-alis-satis-m1"
              className="w-full px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg disabled:opacity-60 focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="Başlık *">
            <input
              value={baslik}
              onChange={(e) => setBaslik(e.target.value)}
              placeholder="Isınma: İlk Kayıtlar"
              className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
            />
          </Alan>

          <Alan etiket="Açıklama" yardim="Modül kartında 1-2 cümle.">
            <textarea
              value={aciklama}
              onChange={(e) => setAciklama(e.target.value)}
              rows={3}
              placeholder="KDV'siz, peşin, 2-3 hesaplı basit yevmiyeler."
              className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg resize-none focus:outline-none focus:border-ink"
            />
          </Alan>

          <div className="grid grid-cols-2 gap-4">
            <Alan etiket="Sıra">
              <input
                type="number"
                value={sira}
                onChange={(e) => setSira(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-2 text-sm font-mono bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
              />
            </Alan>

            <Alan etiket="Zorluk Seviyesi">
              <select
                value={zorlukSeviyesi}
                onChange={(e) => setZorlukSeviyesi(e.target.value as ModulZorlukDb)}
                className="w-full px-3 py-2 text-sm bg-surface border border-line rounded-lg focus:outline-none focus:border-ink"
              >
                <option value="baslangic">Başlangıç</option>
                <option value="orta">Orta</option>
                <option value="ileri">İleri</option>
                <option value="sinav">Sınav</option>
              </select>
            </Alan>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={opsiyonel}
              onChange={(e) => setOpsiyonel(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-ink"
            />
            <span className="text-[13px] leading-snug">
              <span className="font-semibold text-ink">Opsiyonel modül</span>
              <span className="block text-[11.5px] text-ink-mute mt-0.5">
                İşaretlenirse bu modül sonraki modülün kilidini açma akışında atlanır
                (öğrenci tamamlamadan da sonraki modüle geçebilir).
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
                Pasif modül kullanıcı tarafında "Yakında" rozetiyle gösterilir
                ve tıklanamaz. Alt başlık ve soru içerikleri silinmez.
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
