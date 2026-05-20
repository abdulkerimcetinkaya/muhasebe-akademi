import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonSatirlar } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import { aiBelgeUret } from '../../lib/ai';
import type {
  SoruDurum,
  SorularRow,
  UniteKonusuRow,
  UnitesRow,
  Zorluk,
} from '../../lib/database.types';

type DurumFiltre = 'hepsi' | SoruDurum;
type ZorlukFiltre = 'hepsi' | Zorluk;
// Konu filtresi: 'hepsi' (tümü), 'baglanti-yok' (sadece konuya bağlı olmayanlar), veya konu id
type KonuFiltre = 'hepsi' | 'baglanti-yok' | string;

const DURUM_RENK: Record<SoruDurum, string> = {
  taslak: 'bg-premium-soft text-premium-deep',
  inceleme: 'bg-brand-soft text-brand-deep dark:bg-brand/20 dark:text-brand-mute',
  onayli: 'bg-success-soft text-success',
  arsiv: 'bg-line-soft text-ink-soft  ',
};

const ZORLUK_RENK: Record<Zorluk, string> = {
  kolay: 'text-success dark:text-success',
  orta: 'text-premium',
  zor: 'text-danger dark:text-danger',
};

export const AdminSorularSayfasi = () => {
  const [sorular, setSorular] = useState<SorularRow[]>([]);
  const [uniteler, setUniteler] = useState<UnitesRow[]>([]);
  const [konular, setKonular] = useState<UniteKonusuRow[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [durumFiltre, setDurumFiltre] = useState<DurumFiltre>('hepsi');
  const [zorlukFiltre, setZorlukFiltre] = useState<ZorlukFiltre>('hepsi');
  const [uniteFiltre, setUniteFiltre] = useState<string>('hepsi');
  const [konuFiltre, setKonuFiltre] = useState<KonuFiltre>('hepsi');
  const [topluUretiliyor, setTopluUretiliyor] = useState(false);
  const [topluProgress, setTopluProgress] = useState({ tamamlanan: 0, hedef: 0 });
  const [topluHatalar, setTopluHatalar] = useState<{ id: string; mesaj: string }[]>([]);

  const yukle = async () => {
    setYukleniyor(true);
    const [soruR, uniteR, konuR] = await Promise.all([
      supabase.from('sorular').select('*').order('created_at', { ascending: false }),
      supabase.from('unites').select('*').order('sira'),
      supabase.from('unite_konulari').select('*').order('sira'),
    ]);
    if (soruR.error) {
      setHata(soruR.error.message);
    } else {
      setSorular(soruR.data ?? []);
    }
    if (uniteR.data) setUniteler(uniteR.data);
    if (konuR.data) setKonular(konuR.data);
    setYukleniyor(false);
  };

  useEffect(() => {
    let iptal = false;
    yukle().catch((e) => {
      if (iptal) return;
      console.error('Sorular yüklenemedi', e);
      setHata(String(e));
      setYukleniyor(false);
    });
    return () => {
      iptal = true;
    };
  }, []);

  const uniteAdMap = useMemo(() => {
    const m: Record<string, string> = {};
    uniteler.forEach((u) => {
      m[u.id] = u.ad;
    });
    return m;
  }, [uniteler]);

  const konuAdMap = useMemo(() => {
    const m: Record<string, string> = {};
    konular.forEach((k) => {
      m[k.id] = k.ad;
    });
    return m;
  }, [konular]);

  // Ünite filtresi seçiliyse o ünitenin konuları, değilse tüm konular
  const konuSecenekleri = useMemo(() => {
    if (uniteFiltre === 'hepsi') return konular;
    return konular.filter((k) => k.unite_id === uniteFiltre);
  }, [konular, uniteFiltre]);

  // Ünite değişince konu filtresi geçersizse sıfırla
  useEffect(() => {
    if (konuFiltre === 'hepsi' || konuFiltre === 'baglanti-yok') return;
    if (!konuSecenekleri.some((k) => k.id === konuFiltre)) {
      setKonuFiltre('hepsi');
    }
  }, [konuSecenekleri, konuFiltre]);

  const filtreli = useMemo(() => {
    const q = arama.trim().toLowerCase();
    return sorular.filter((s) => {
      if (durumFiltre !== 'hepsi' && s.durum !== durumFiltre) return false;
      if (zorlukFiltre !== 'hepsi' && s.zorluk !== zorlukFiltre) return false;
      if (uniteFiltre !== 'hepsi' && s.unite_id !== uniteFiltre) return false;
      if (konuFiltre === 'baglanti-yok' && s.konu_id !== null) return false;
      if (
        konuFiltre !== 'hepsi' &&
        konuFiltre !== 'baglanti-yok' &&
        s.konu_id !== konuFiltre
      ) {
        return false;
      }
      if (q && !s.baslik.toLowerCase().includes(q) && !s.id.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [sorular, arama, durumFiltre, zorlukFiltre, uniteFiltre, konuFiltre]);

  const filtreliBelgesizler = useMemo(
    () =>
      filtreli.filter(
        (s) => !Array.isArray(s.belgeler) || (s.belgeler as unknown[]).length === 0,
      ),
    [filtreli],
  );

  const topluBelgeUret = async () => {
    const hedefler = filtreliBelgesizler;
    if (hedefler.length === 0) {
      alert('Filtrelenmiş sorularda zaten belge var.');
      return;
    }
    if (
      !confirm(
        `${hedefler.length} soru için AI ile belge üretilecek. Devam et?\n\nİşlem birkaç dakika sürer ve AI maliyeti vardır.`,
      )
    ) {
      return;
    }

    setTopluUretiliyor(true);
    setTopluProgress({ tamamlanan: 0, hedef: hedefler.length });
    setTopluHatalar([]);
    const hatalar: { id: string; mesaj: string }[] = [];

    for (const soru of hedefler) {
      try {
        const { data: cozumlerData } = await supabase
          .from('cozumler')
          .select('kod, borc, alacak')
          .eq('soru_id', soru.id)
          .order('sira');

        if (!cozumlerData || cozumlerData.length === 0) {
          hatalar.push({ id: soru.id, mesaj: 'Çözüm satırları bulunamadı' });
          setTopluProgress((p) => ({ ...p, tamamlanan: p.tamamlanan + 1 }));
          continue;
        }

        const { belgeler: yeniler } = await aiBelgeUret({
          soruBaslik: soru.baslik,
          senaryo: soru.senaryo,
          aciklama: soru.aciklama ?? undefined,
          cozum: cozumlerData,
        });

        if (!yeniler || yeniler.length === 0) {
          hatalar.push({ id: soru.id, mesaj: 'AI belge üretemedi' });
          setTopluProgress((p) => ({ ...p, tamamlanan: p.tamamlanan + 1 }));
          continue;
        }

        const { error } = await supabase
          .from('sorular')
          .update({ belgeler: yeniler })
          .eq('id', soru.id);

        if (error) {
          hatalar.push({ id: soru.id, mesaj: error.message });
        }
      } catch (e) {
        hatalar.push({ id: soru.id, mesaj: (e as Error).message });
      }
      setTopluProgress((p) => ({ ...p, tamamlanan: p.tamamlanan + 1 }));
    }

    setTopluHatalar(hatalar);
    setTopluUretiliyor(false);
    await yukle();
  };

  const sil = async (id: string, baslik: string) => {
    if (!confirm(`"${baslik}" silinecek. Çözümleri ve kullanıcı ilerlemesi de silinir. Emin misin?`)) {
      return;
    }
    const { error } = await supabase.from('sorular').delete().eq('id', id);
    if (error) {
      alert('Silinemedi: ' + error.message);
      return;
    }
    setSorular((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Sorular</h1>
            <p className="text-sm text-ink-soft font-medium mt-1">
              {filtreli.length} / {sorular.length} soru görüntüleniyor
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={topluBelgeUret}
              disabled={topluUretiliyor || filtreliBelgesizler.length === 0}
              className="flex items-center gap-2 bg-surface border border-line-strong text-ink px-4 py-2 rounded-lg text-sm font-bold hover:border-ink active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Filtrelenmiş, belgesi olmayan sorular için AI ile belge üretir"
            >
              {topluUretiliyor ? (
                <>
                  <Icon name="Loader" size={14} className="animate-spin" />
                  Üretiliyor {topluProgress.tamamlanan}/{topluProgress.hedef}
                </>
              ) : (
                <>
                  <Icon name="FileText" size={14} />
                  Belgesizler için Üret ({filtreliBelgesizler.length})
                </>
              )}
            </button>
            <Link
              to="/admin/sorular/yeni"
              className="flex items-center gap-2 bg-ink text-bg px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 active:scale-[0.98] transition"
            >
              <Icon name="Plus" size={14} />
              Yeni Soru
            </Link>
          </div>
        </div>

        {topluHatalar.length > 0 && (
          <div className="bg-danger-soft border border-danger-soft rounded-xl p-4 mb-4">
            <div className="text-sm font-bold text-danger mb-2">
              {topluHatalar.length} soruda hata oluştu
            </div>
            <ul className="text-xs text-ink-soft space-y-1 max-h-32 overflow-auto">
              {topluHatalar.map((h, i) => (
                <li key={i} className="font-mono">
                  {h.id}: {h.mesaj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Filtreler */}
        <div className="bg-surface border border-line rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Icon
              name="Search"
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-quiet"
            />
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Başlık veya ID ile ara…"
              className="w-full pl-9 pr-3 py-2 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded-lg font-medium"
            />
          </div>

          <select
            value={durumFiltre}
            onChange={(e) => setDurumFiltre(e.target.value as DurumFiltre)}
            className="px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
          >
            <option value="hepsi">Tüm durumlar</option>
            <option value="taslak">Taslak</option>
            <option value="inceleme">İnceleme</option>
            <option value="onayli">Onaylı</option>
            <option value="arsiv">Arşiv</option>
          </select>

          <select
            value={zorlukFiltre}
            onChange={(e) => setZorlukFiltre(e.target.value as ZorlukFiltre)}
            className="px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
          >
            <option value="hepsi">Tüm zorluklar</option>
            <option value="kolay">Kolay</option>
            <option value="orta">Orta</option>
            <option value="zor">Zor</option>
          </select>

          <select
            value={uniteFiltre}
            onChange={(e) => setUniteFiltre(e.target.value)}
            className="px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
          >
            <option value="hepsi">Tüm üniteler</option>
            {uniteler.map((u) => (
              <option key={u.id} value={u.id}>
                {u.ad}
              </option>
            ))}
          </select>

          <select
            value={konuFiltre}
            onChange={(e) => setKonuFiltre(e.target.value as KonuFiltre)}
            className="px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
          >
            <option value="hepsi">Tüm konular</option>
            <option value="baglanti-yok">— Konu bağlantısı yok —</option>
            {konuSecenekleri.map((k) => (
              <option key={k.id} value={k.id}>
                {uniteFiltre === 'hepsi'
                  ? `${uniteAdMap[k.unite_id] ?? k.unite_id} · ${k.ad}`
                  : k.ad}
              </option>
            ))}
          </select>
        </div>

        {/* Hata / Yükleniyor */}
        {hata && (
          <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger font-medium mb-4">
            <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
            <span>{hata}</span>
          </div>
        )}

        {yukleniyor ? (
          <SkeletonSatirlar satirSayisi={6} />
        ) : filtreli.length === 0 ? (
          <EmptyState
            ikon="Search"
            baslik="Filtreyle eşleşen soru yok"
            aciklama="Aramayı temizleyebilir veya farklı bir filtre uygulayabilirsin."
          />
        ) : (
          <div className="bg-surface border border-line rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-bg-tint border-b border-line">
                <tr className="text-left text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                  <th className="px-4 py-3">Başlık</th>
                  <th className="px-4 py-3">Ünite</th>
                  <th className="px-4 py-3">Konu</th>
                  <th className="px-4 py-3">Zorluk</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {filtreli.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-line-soft last:border-0 hover:bg-bg-tint transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-ink">
                        {s.baslik}
                      </div>
                      <div className="text-xs text-ink-mute font-mono mt-0.5">
                        {s.id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink-soft font-medium">
                      {uniteAdMap[s.unite_id] ?? s.unite_id}
                    </td>
                    <td className="px-4 py-3">
                      {s.konu_id ? (
                        <span className="text-ink-soft font-medium">
                          {konuAdMap[s.konu_id] ?? s.konu_id}
                        </span>
                      ) : (
                        <span className="text-[11px] tracking-[0.18em] uppercase text-ink-quiet font-bold">
                          —
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold uppercase ${ZORLUK_RENK[s.zorluk]}`}>
                        {s.zorluk}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] tracking-wider uppercase font-bold px-2 py-1 rounded ${DURUM_RENK[s.durum]}`}
                      >
                        {s.durum}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/sorular/${s.id}`}
                          className="p-1.5 hover:bg-line-soft rounded transition"
                          title="Düzenle"
                        >
                          <Icon name="Edit3" size={14} />
                        </Link>
                        <button
                          onClick={() => sil(s.id, s.baslik)}
                          className="p-1.5 hover:bg-danger-soft text-danger dark:text-danger rounded transition"
                          title="Sil"
                        >
                          <Icon name="Trash2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
};
