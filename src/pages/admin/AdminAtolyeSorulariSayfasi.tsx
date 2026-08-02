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
  SorularRow,
  UniteModuluRow,
  UnitesRow,
  Zorluk,
  SoruDurum,
} from '../../lib/database.types';

interface AtanmisSoru {
  soru: SorularRow;
  sira: number;
}

/**
 * Atölye müfredatı yönetimi — bir alt başlığa (atölye) hangi soruların
 * gösterileceğini admin tıkla-ekle ile seçer ve sıralar.
 *
 * Anlamsal not:
 *   - `sorular.alt_baslik_id` artık sadece "konu havuzu etiketi" (Problemler
 *     sayfasında filtre için). Aynı kalır.
 *   - `atolye_sorulari` junction'ı ise "atölyenin müfredatı". Bu sayfa onu yönetir.
 *
 * URL: /admin/isletmeler/:uniteId/moduller/:modulId/alt-basliklar/:altId/sorular
 */
export const AdminAtolyeSorulariSayfasi = () => {
  const { uniteId, modulId, altId } = useParams<{
    uniteId: string;
    modulId: string;
    altId: string;
  }>();
  const nav = useNavigate();
  const { yenile: unitelerYenile } = useUniteler();

  const [unite, setUnite] = useState<UnitesRow | null>(null);
  const [modul, setModul] = useState<UniteModuluRow | null>(null);
  const [altBaslik, setAltBaslik] = useState<ModulAltBaslikRow | null>(null);

  const [atanmislar, setAtanmislar] = useState<AtanmisSoru[]>([]);
  const [havuz, setHavuz] = useState<SorularRow[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  // Havuz filtreleri
  const [arama, setArama] = useState('');
  const [zorlukFiltre, setZorlukFiltre] = useState<Zorluk | 'hepsi'>('hepsi');
  const [durumFiltre, setDurumFiltre] = useState<SoruDurum | 'hepsi'>('onayli');
  const [kapsam, setKapsam] = useState<'unite' | 'tumu'>('unite');

  const yukle = async () => {
    if (!uniteId || !modulId || !altId) return;
    setYukleniyor(true);

    const [uniteR, modulR, altR] = await Promise.all([
      supabase.from('isletmeler').select('*').eq('id', uniteId).maybeSingle(),
      supabase.from('isletme_modulleri').select('*').eq('id', modulId).maybeSingle(),
      supabase
        .from('modul_alt_basliklari')
        .select('*')
        .eq('id', altId)
        .maybeSingle(),
    ]);

    if (uniteR.error || modulR.error || altR.error) {
      setHata(uniteR.error?.message ?? modulR.error?.message ?? altR.error?.message ?? 'Bilinmeyen hata');
      setYukleniyor(false);
      return;
    }
    if (!uniteR.data || !modulR.data || !altR.data) {
      setHata('İşletme, modül veya alt başlık bulunamadı.');
      setYukleniyor(false);
      return;
    }

    setUnite(uniteR.data as UnitesRow);
    setModul(modulR.data as UniteModuluRow);
    setAltBaslik(altR.data as ModulAltBaslikRow);

    // Atanmış sorular: junction'dan sıralı çek
    const { data: junctionData, error: jErr } = await supabase
      .from('atolye_sorulari')
      .select('soru_id, sira, sorular:soru_id(*)')
      .eq('alt_baslik_id', altId)
      .order('sira');

    if (jErr) {
      setHata('Junction yüklenemedi: ' + jErr.message);
      setYukleniyor(false);
      return;
    }

    const atanmis: AtanmisSoru[] = [];
    const atanmisIds = new Set<string>();
    (junctionData ?? []).forEach((r: any) => {
      if (r.sorular) {
        atanmis.push({ soru: r.sorular as SorularRow, sira: r.sira });
        atanmisIds.add(r.soru_id);
      }
    });
    setAtanmislar(atanmis);

    // Havuz: kapsama göre sorular (atanmamış olanlar)
    let havuzQuery = supabase.from('sorular').select('*').order('id');
    if (kapsam === 'unite') havuzQuery = havuzQuery.eq('isletme_id', uniteId);
    const { data: tumSorular, error: hErr } = await havuzQuery;
    if (hErr) {
      setHata('Havuz yüklenemedi: ' + hErr.message);
      setYukleniyor(false);
      return;
    }
    setHavuz((tumSorular ?? []).filter((s) => !atanmisIds.has(s.id)) as SorularRow[]);

    setHata(null);
    setYukleniyor(false);
  };

  useEffect(() => {
    yukle().catch((e) => {
      console.error('Atölye soruları yüklenemedi', e);
      setHata(String(e));
      setYukleniyor(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uniteId, modulId, altId, kapsam]);

  const havuzFiltreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    return havuz.filter((s) => {
      if (zorlukFiltre !== 'hepsi' && s.zorluk !== zorlukFiltre) return false;
      if (durumFiltre !== 'hepsi' && s.durum !== durumFiltre) return false;
      if (q) {
        const hay = `${s.id} ${s.baslik} ${s.senaryo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [havuz, arama, zorlukFiltre, durumFiltre]);

  const ekle = async (soruId: string) => {
    if (!altId) return;
    const yeniSira = (atanmislar.at(-1)?.sira ?? 0) + 1;
    const r = await supabase.from('atolye_sorulari').insert({
      alt_baslik_id: altId,
      soru_id: soruId,
      sira: yeniSira,
    });
    if (r.error) {
      alert('Ekleme hatası: ' + r.error.message);
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  const kaldir = async (soruId: string) => {
    if (!altId) return;
    if (!confirm('Bu soruyu atölyeden kaldırmak istiyor musun? (Soru silinmez, sadece müfredattan çıkar.)')) {
      return;
    }
    const r = await supabase
      .from('atolye_sorulari')
      .delete()
      .eq('alt_baslik_id', altId)
      .eq('soru_id', soruId);
    if (r.error) {
      alert('Kaldırma hatası: ' + r.error.message);
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  const siraDegistir = async (index: number, yon: 'yukari' | 'asagi') => {
    if (!altId) return;
    const hedefIndex = yon === 'yukari' ? index - 1 : index + 1;
    if (hedefIndex < 0 || hedefIndex >= atanmislar.length) return;

    const a = atanmislar[index];
    const b = atanmislar[hedefIndex];

    // İki update — sira değerlerini swap et
    const [r1, r2] = await Promise.all([
      supabase
        .from('atolye_sorulari')
        .update({ sira: b.sira })
        .eq('alt_baslik_id', altId)
        .eq('soru_id', a.soru.id),
      supabase
        .from('atolye_sorulari')
        .update({ sira: a.sira })
        .eq('alt_baslik_id', altId)
        .eq('soru_id', b.soru.id),
    ]);

    if (r1.error || r2.error) {
      alert('Sıra güncellenemedi: ' + (r1.error?.message ?? r2.error?.message));
      return;
    }
    await unitelerYenile().catch(() => {});
    yukle();
  };

  const tumunuTemizle = async () => {
    if (!altId || atanmislar.length === 0) return;
    if (!confirm(`${atanmislar.length} soru atölyeden çıkarılacak. Emin misin?`)) return;
    const r = await supabase
      .from('atolye_sorulari')
      .delete()
      .eq('alt_baslik_id', altId);
    if (r.error) {
      alert('Temizleme hatası: ' + r.error.message);
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
          onClick={() =>
            nav(`/admin/isletmeler/${uniteId}/moduller/${modulId}/alt-basliklar`)
          }
          className="inline-flex items-center gap-2 text-[12px] text-ink-mute hover:text-ink font-semibold mb-3 transition"
        >
          <Icon name="ArrowLeft" size={12} />
          Alt Başlıklar
        </button>

        <div className="mb-2">
          <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1">
            Atölye Müfredatı · Modül {modul?.sira ?? '?'}
          </div>
          <h1 className="font-display text-3xl font-bold tracking-tight leading-tight">
            {altBaslik?.baslik ?? 'Atölye'}
          </h1>
          <div className="text-sm text-ink-mute font-medium mt-1">
            {unite?.ad} → {modul?.baslik}
          </div>
        </div>

        <p className="text-sm text-ink-soft font-medium mb-6 mt-3 max-w-3xl leading-relaxed">
          Bu atölyede hangi soruların gösterileceğini seç ve sırala. Havuzdaki
          soruların alt başlık etiketi değişmez — sadece müfredata dahil edilirler.
          Bir önceki modülden tekrar pekiştirme için de soru ekleyebilirsin.
        </p>

        {hata && (
          <div className="mb-4 p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger">
            {hata}
          </div>
        )}

        {yukleniyor ? (
          <SkeletonSatirlar satirSayisi={6} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* SOL: Atanmış sorular (müfredat) */}
            <section className="border border-line rounded-xl bg-surface overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-bg-tint">
                <div>
                  <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
                    Müfredat
                  </div>
                  <div className="text-[15px] font-bold text-ink mt-0.5">
                    {atanmislar.length} soru atandı
                  </div>
                </div>
                {atanmislar.length > 0 && (
                  <button
                    onClick={tumunuTemizle}
                    className="text-[11px] font-bold tracking-wide text-danger hover:underline"
                  >
                    Tümünü Temizle
                  </button>
                )}
              </div>
              {atanmislar.length === 0 ? (
                <EmptyState
                  ikon="ListChecks"
                  baslik="Henüz soru yok"
                  aciklama="Sağdaki havuzdan bu atölyeye soru ekle."
                />
              ) : (
                <div className="divide-y divide-line">
                  {atanmislar.map((a, i) => (
                    <div
                      key={a.soru.id}
                      className="px-4 py-3 hover:bg-bg-tint/60 transition"
                    >
                      <div className="flex items-start gap-3">
                        <span className="font-mono text-[11px] font-bold text-ink-mute tabular-nums w-6 flex-shrink-0 mt-0.5">
                          {i + 1}.
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[13.5px] text-ink leading-snug truncate">
                            {a.soru.baslik}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono text-[10px] text-ink-quiet">
                              {a.soru.id}
                            </span>
                            <ZorlukRozet zorluk={a.soru.zorluk} />
                            <DurumRozet durum={a.soru.durum} />
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => siraDegistir(i, 'yukari')}
                            disabled={i === 0}
                            className="p-1.5 hover:bg-surface-2 rounded disabled:opacity-25 disabled:cursor-not-allowed transition"
                            title="Yukarı taşı"
                          >
                            <Icon name="ChevronUp" size={14} />
                          </button>
                          <button
                            onClick={() => siraDegistir(i, 'asagi')}
                            disabled={i === atanmislar.length - 1}
                            className="p-1.5 hover:bg-surface-2 rounded disabled:opacity-25 disabled:cursor-not-allowed transition"
                            title="Aşağı taşı"
                          >
                            <Icon name="ChevronDown" size={14} />
                          </button>
                          <button
                            onClick={() => kaldir(a.soru.id)}
                            className="p-1.5 hover:bg-danger-soft rounded text-danger transition"
                            title="Müfredattan kaldır"
                          >
                            <Icon name="X" size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SAĞ: Havuz */}
            <section className="border border-line rounded-xl bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-line bg-bg-tint">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
                      Havuz
                    </div>
                    <div className="text-[15px] font-bold text-ink mt-0.5">
                      {havuzFiltreli.length} soru uygun
                    </div>
                  </div>
                  <div className="flex bg-surface border border-line rounded-md p-0.5">
                    <button
                      onClick={() => setKapsam('unite')}
                      className={`px-2.5 py-1 text-[11px] font-bold tracking-wide rounded transition ${
                        kapsam === 'unite'
                          ? 'bg-ink text-bg'
                          : 'text-ink-mute hover:text-ink'
                      }`}
                    >
                      Bu İşletme
                    </button>
                    <button
                      onClick={() => setKapsam('tumu')}
                      className={`px-2.5 py-1 text-[11px] font-bold tracking-wide rounded transition ${
                        kapsam === 'tumu'
                          ? 'bg-ink text-bg'
                          : 'text-ink-mute hover:text-ink'
                      }`}
                    >
                      Tümü
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <Icon
                      name="Search"
                      size={12}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-quiet"
                    />
                    <input
                      value={arama}
                      onChange={(e) => setArama(e.target.value)}
                      placeholder="Başlık, ID veya senaryo ara…"
                      className="w-full pl-8 pr-3 py-1.5 text-[12.5px] bg-surface border border-line rounded-md focus:outline-none focus:border-ink"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={zorlukFiltre}
                      onChange={(e) =>
                        setZorlukFiltre(e.target.value as Zorluk | 'hepsi')
                      }
                      className="flex-1 px-2 py-1.5 text-[12px] bg-surface border border-line rounded-md focus:outline-none focus:border-ink"
                    >
                      <option value="hepsi">Zorluk: Hepsi</option>
                      <option value="kolay">Kolay</option>
                      <option value="orta">Orta</option>
                      <option value="zor">Zor</option>
                    </select>
                    <select
                      value={durumFiltre}
                      onChange={(e) =>
                        setDurumFiltre(e.target.value as SoruDurum | 'hepsi')
                      }
                      className="flex-1 px-2 py-1.5 text-[12px] bg-surface border border-line rounded-md focus:outline-none focus:border-ink"
                    >
                      <option value="hepsi">Durum: Hepsi</option>
                      <option value="onayli">Onaylı</option>
                      <option value="inceleme">İnceleme</option>
                      <option value="taslak">Taslak</option>
                      <option value="arsiv">Arşiv</option>
                    </select>
                  </div>
                </div>
              </div>
              {havuzFiltreli.length === 0 ? (
                <EmptyState
                  ikon="Search"
                  baslik="Uygun soru yok"
                  aciklama={
                    havuz.length === 0
                      ? 'Bu işletmede henüz soru yok veya hepsi atanmış.'
                      : 'Filtreleri değiştirmeyi dene.'
                  }
                />
              ) : (
                <div className="divide-y divide-line max-h-[640px] overflow-y-auto">
                  {havuzFiltreli.map((s) => (
                    <div
                      key={s.id}
                      className="px-4 py-3 hover:bg-bg-tint/60 transition"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-[13.5px] text-ink leading-snug truncate">
                            {s.baslik}
                          </div>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <span className="font-mono text-[10px] text-ink-quiet">
                              {s.id}
                            </span>
                            <ZorlukRozet zorluk={s.zorluk} />
                            <DurumRozet durum={s.durum} />
                          </div>
                        </div>
                        <button
                          onClick={() => ekle(s.id)}
                          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-md bg-ink text-bg text-[11px] font-bold tracking-wide hover:opacity-90 transition flex-shrink-0"
                          title="Müfredata ekle"
                        >
                          <Icon name="Plus" size={12} />
                          Ekle
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

const ZorlukRozet = ({ zorluk }: { zorluk: Zorluk }) => {
  const stil = {
    kolay: 'bg-ok-soft text-ok-deep',
    orta: 'bg-premium-soft text-premium-deep',
    zor: 'bg-danger-soft text-danger',
  }[zorluk];
  return (
    <span
      className={`text-[9px] tracking-[0.18em] uppercase font-bold px-1.5 py-0.5 rounded ${stil}`}
    >
      {zorluk}
    </span>
  );
};

const DurumRozet = ({ durum }: { durum: SoruDurum }) => {
  if (durum === 'onayli') return null;
  const stil = {
    taslak: 'bg-surface-2 text-ink-mute',
    inceleme: 'bg-premium-soft text-premium-deep',
    arsiv: 'bg-surface-2 text-ink-quiet',
    onayli: '',
  }[durum];
  return (
    <span
      className={`text-[9px] tracking-[0.18em] uppercase font-bold px-1.5 py-0.5 rounded ${stil}`}
    >
      {durum}
    </span>
  );
};
