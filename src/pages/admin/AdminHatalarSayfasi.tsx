import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import { EmptyState } from '../../components/EmptyState';
import { SkeletonSatirlar } from '../../components/Skeleton';
import { supabase } from '../../lib/supabase';
import type { SoruHataRow } from '../../lib/database.types';

type HataDurum = SoruHataRow['durum'];
type DurumFiltre = 'hepsi' | HataDurum;

interface ZenginHata extends SoruHataRow {
  soru_baslik: string;
  kullanici_email: string | null;
  kullanici_ad: string | null;
}

const DURUM_RENK: Record<HataDurum, string> = {
  acik: 'bg-danger-soft text-danger',
  incelemede: 'bg-premium-soft text-premium-deep',
  duzeltildi: 'bg-success-soft text-success',
  reddedildi: 'bg-line-soft text-ink-soft  ',
};

const DURUM_AD: Record<HataDurum, string> = {
  acik: 'Açık',
  incelemede: 'İnceleniyor',
  duzeltildi: 'Düzeltildi',
  reddedildi: 'Reddedildi',
};

const tarihFormat = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const AdminHatalarSayfasi = () => {
  const [hatalar, setHatalar] = useState<ZenginHata[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hataMesaj, setHataMesaj] = useState<string | null>(null);
  const [durumFiltre, setDurumFiltre] = useState<DurumFiltre>('acik');

  const yukle = async () => {
    setYukleniyor(true);
    setHataMesaj(null);
    const { data, error } = await supabase
      .from('soru_hatalari')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setHataMesaj(error.message);
      setYukleniyor(false);
      return;
    }
    const ham = data ?? [];
    if (ham.length === 0) {
      setHatalar([]);
      setYukleniyor(false);
      return;
    }

    const soruIds = Array.from(new Set(ham.map((h) => h.soru_id)));
    const userIds = Array.from(
      new Set(ham.map((h) => h.user_id).filter((x): x is string => !!x)),
    );

    const [soruR, userR] = await Promise.all([
      supabase.from('sorular').select('id, baslik').in('id', soruIds),
      userIds.length > 0
        ? supabase.from('kullanicilar').select('id, kullanici_adi, email').in('id', userIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const soruMap: Record<string, string> = {};
    (soruR.data ?? []).forEach((s) => {
      soruMap[s.id] = s.baslik;
    });
    const userMap: Record<string, { ad: string; email: string | null }> = {};
    (userR.data ?? []).forEach((u) => {
      userMap[u.id] = { ad: u.kullanici_adi, email: u.email };
    });

    const zengin: ZenginHata[] = ham.map((h) => ({
      ...h,
      soru_baslik: soruMap[h.soru_id] ?? '(silinmiş soru)',
      kullanici_email: h.user_id ? (userMap[h.user_id]?.email ?? null) : null,
      kullanici_ad: h.user_id ? (userMap[h.user_id]?.ad ?? null) : null,
    }));
    setHatalar(zengin);
    setYukleniyor(false);
  };

  useEffect(() => {
    yukle().catch((e) => {
      console.error('Hatalar yüklenemedi', e);
      setHataMesaj(String(e));
      setYukleniyor(false);
    });
  }, []);

  const filtreli = useMemo(() => {
    if (durumFiltre === 'hepsi') return hatalar;
    return hatalar.filter((h) => h.durum === durumFiltre);
  }, [hatalar, durumFiltre]);

  const sayilar = useMemo(() => {
    const s: Record<HataDurum | 'hepsi', number> = {
      hepsi: hatalar.length,
      acik: 0,
      incelemede: 0,
      duzeltildi: 0,
      reddedildi: 0,
    };
    hatalar.forEach((h) => {
      s[h.durum] += 1;
    });
    return s;
  }, [hatalar]);

  const durumGuncelle = async (id: string, yeniDurum: HataDurum) => {
    const eskisi = hatalar.find((h) => h.id === id)?.durum;
    setHatalar((prev) => prev.map((h) => (h.id === id ? { ...h, durum: yeniDurum } : h)));
    const { error } = await supabase
      .from('soru_hatalari')
      .update({ durum: yeniDurum })
      .eq('id', id);
    if (error) {
      alert('Güncellenemedi: ' + error.message);
      if (eskisi) {
        setHatalar((prev) => prev.map((h) => (h.id === id ? { ...h, durum: eskisi } : h)));
      }
    }
  };

  const sil = async (id: string) => {
    if (!confirm('Bu bildirim silinecek. Emin misin?')) return;
    const { error } = await supabase.from('soru_hatalari').delete().eq('id', id);
    if (error) {
      alert('Silinemedi: ' + error.message);
      return;
    }
    setHatalar((prev) => prev.filter((h) => h.id !== id));
  };

  const filtreButon = (deger: DurumFiltre, etiket: string) => {
    const aktif = durumFiltre === deger;
    const sayi = sayilar[deger];
    return (
      <button
        onClick={() => setDurumFiltre(deger)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-2 ${
 aktif
 ? 'bg-ink text-bg '
 : 'bg-surface-2 text-ink-soft hover:bg-line-soft '
 }`}
      >
        {etiket}
        <span className={`text-[10px] font-mono ${aktif ? 'opacity-70' : 'opacity-50'}`}>
          {sayi}
        </span>
      </button>
    );
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <AdminSayfaBaslik
          baslik="Hata Bildirimleri"
          aciklama="Kullanıcıların bildirdiği soru hatalarını incele ve durum güncelle."
        />

        <div className="flex flex-wrap gap-2 mb-4">
          {filtreButon('acik', 'Açık')}
          {filtreButon('incelemede', 'İnceleniyor')}
          {filtreButon('duzeltildi', 'Düzeltildi')}
          {filtreButon('reddedildi', 'Reddedildi')}
          {filtreButon('hepsi', 'Tümü')}
        </div>

        {hataMesaj && (
          <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger font-medium mb-4">
            <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
            <span>{hataMesaj}</span>
          </div>
        )}

        {yukleniyor ? (
          <SkeletonSatirlar satirSayisi={4} />
        ) : filtreli.length === 0 ? (
          <EmptyState
            ikon="CheckCircle2"
            baslik={durumFiltre === 'acik' ? 'Açık bildirim yok' : 'Bu filtrede bildirim yok'}
            aciklama={
              durumFiltre === 'acik'
                ? 'Hepsi temiz. Yeni bildirim geldiğinde burada görünecek.'
                : 'Filtreyi değiştirip diğer durumları kontrol edebilirsin.'
            }
          />
        ) : (
          <div className="space-y-3">
            {filtreli.map((h) => (
              <div
                key={h.id}
                className="bg-surface border border-line rounded-xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] tracking-wider uppercase font-bold px-2 py-0.5 rounded ${DURUM_RENK[h.durum]}`}
                      >
                        {DURUM_AD[h.durum]}
                      </span>
                      <span className="text-xs text-ink-mute font-medium">
                        {tarihFormat(h.created_at)}
                      </span>
                    </div>
                    <Link
                      to={`/admin/sorular/${h.soru_id}`}
                      className="font-display text-lg font-bold tracking-tight hover:underline block truncate"
                    >
                      {h.soru_baslik}
                    </Link>
                    <div className="text-xs text-ink-mute font-mono mt-0.5">
                      {h.soru_id}
                      {h.kullanici_email && (
                        <span className="ml-3 font-sans">
                          · {h.kullanici_ad ?? '—'} ({h.kullanici_email})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <select
                      value={h.durum}
                      onChange={(e) => durumGuncelle(h.id, e.target.value as HataDurum)}
                      className="px-2 py-1.5 bg-bg-tint border border-line-strong outline-none text-xs rounded font-semibold"
                    >
                      <option value="acik">Açık</option>
                      <option value="incelemede">İnceleniyor</option>
                      <option value="duzeltildi">Düzeltildi</option>
                      <option value="reddedildi">Reddedildi</option>
                    </select>
                    <Link
                      to={`/admin/sorular/${h.soru_id}`}
                      className="p-1.5 hover:bg-line-soft rounded transition"
                      title="Soruyu Düzenle"
                    >
                      <Icon name="Edit3" size={14} />
                    </Link>
                    <button
                      onClick={() => sil(h.id)}
                      className="p-1.5 hover:bg-danger-soft text-danger dark:text-danger rounded transition"
                      title="Sil"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-ink-soft leading-relaxed font-medium whitespace-pre-wrap break-words">
                  {h.aciklama}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
