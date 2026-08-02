import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import { paraFormat } from '../../lib/format';
import { supabase } from '../../lib/supabase';

interface Istatistik {
  toplamKullanici: number;
  premiumAktif: number;
  banli: number;
  son7Aktif: number;
  son30Aktif: number;
  bugunCozum: number;
  son7Cozum: number;
  son30Cozum: number;
  toplamCozum: number;
  toplamGelir: number;
  son30Gelir: number;
  // Çözüm trendi (son 30 gün, gün bazında)
  trend: { tarih: string; sayi: number }[];
}

const tarihStr = (g: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - g);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
};

const ydunYukle = async (): Promise<Istatistik> => {
  const bugun = tarihStr(0);
  const son7 = tarihStr(7);
  const son30 = tarihStr(30);
  const simdi = new Date().toISOString();

  const [kullaniciR, ilerlemeR, aktiviteR, odemelerR] = await Promise.all([
    supabase.from('kullanicilar').select('id, premium_bitis, banli'),
    supabase.from('ilerleme').select('created_at'),
    supabase.from('aktivite').select('user_id, tarih, cozulen_sayi'),
    supabase.from('odemeler').select('tutar, durum, basarili_tarih, created_at'),
  ]);

  if (kullaniciR.error) throw kullaniciR.error;
  if (ilerlemeR.error) throw ilerlemeR.error;
  if (aktiviteR.error) throw aktiviteR.error;
  if (odemelerR.error) throw odemelerR.error;

  const kullanicilar = kullaniciR.data ?? [];
  const ilerlemeler = ilerlemeR.data ?? [];
  const aktiviteler = aktiviteR.data ?? [];
  const odemeler = odemelerR.data ?? [];

  const premiumAktif = kullanicilar.filter(
    (k) => k.premium_bitis && k.premium_bitis > simdi,
  ).length;
  const banli = kullanicilar.filter((k) => k.banli).length;

  const son7Aktif = new Set(
    aktiviteler.filter((a) => a.tarih >= son7).map((a) => a.user_id),
  ).size;
  const son30Aktif = new Set(
    aktiviteler.filter((a) => a.tarih >= son30).map((a) => a.user_id),
  ).size;

  const bugunCozum = aktiviteler
    .filter((a) => a.tarih === bugun)
    .reduce((acc, a) => acc + a.cozulen_sayi, 0);
  const son7Cozum = aktiviteler
    .filter((a) => a.tarih >= son7)
    .reduce((acc, a) => acc + a.cozulen_sayi, 0);
  const son30Cozum = aktiviteler
    .filter((a) => a.tarih >= son30)
    .reduce((acc, a) => acc + a.cozulen_sayi, 0);

  const basariliOdemeler = odemeler.filter((o) => o.durum === 'basarili');
  const toplamGelir = basariliOdemeler.reduce(
    (acc, o) => acc + Number(o.tutar),
    0,
  );
  const son30Gelir = basariliOdemeler
    .filter((o) => (o.basarili_tarih ?? o.created_at) >= son30)
    .reduce((acc, o) => acc + Number(o.tutar), 0);

  // Trend: son 30 gün, gün başı çözüm sayısı
  const trendMap = new Map<string, number>();
  for (let g = 29; g >= 0; g--) {
    trendMap.set(tarihStr(g), 0);
  }
  aktiviteler.forEach((a) => {
    if (trendMap.has(a.tarih)) {
      trendMap.set(a.tarih, (trendMap.get(a.tarih) ?? 0) + a.cozulen_sayi);
    }
  });

  return {
    toplamKullanici: kullanicilar.length,
    premiumAktif,
    banli,
    son7Aktif,
    son30Aktif,
    bugunCozum,
    son7Cozum,
    son30Cozum,
    toplamCozum: ilerlemeler.length,
    toplamGelir,
    son30Gelir,
    trend: Array.from(trendMap.entries()).map(([tarih, sayi]) => ({
      tarih,
      sayi,
    })),
  };
};

export const AdminIstatistiklerSayfasi = () => {
  const [data, setData] = useState<Istatistik | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    setYukleniyor(true);
    setHata(null);
    ydunYukle()
      .then(setData)
      .catch((e) => setHata(`Yüklenemedi: ${(e as Error).message}`))
      .finally(() => setYukleniyor(false));
  }, []);

  const trendMaks = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, ...data.trend.map((t) => t.sayi));
  }, [data]);

  const premiumOran = useMemo(() => {
    if (!data || data.toplamKullanici === 0) return 0;
    return Math.round((data.premiumAktif / data.toplamKullanici) * 100);
  }, [data]);

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-6">
          <AdminSayfaBaslik
            baslik="İstatistikler"
            aciklama="Gerçek zamanlı kullanıcı, ödeme ve çözüm metrikleri"
          />

          {hata && (
            <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
              <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
              <span>{hata}</span>
            </div>
          )}

          {yukleniyor ? (
            <div className="text-sm text-ink-quiet">Yükleniyor…</div>
          ) : data ? (
            <>
              {/* Kullanıcılar */}
              <section>
                <h2 className="font-display text-lg font-bold mb-3">Kullanıcılar</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Kart
                    etiket="Toplam"
                    deger={data.toplamKullanici}
                    icon="Users"
                  />
                  <Kart
                    etiket="Premium Aktif"
                    deger={data.premiumAktif}
                    altMetin={`%${premiumOran} dönüşüm`}
                    icon="Sparkles"
                    renk="emerald"
                  />
                  <Kart
                    etiket="Son 7 Gün Aktif"
                    deger={data.son7Aktif}
                    icon="Flame"
                    renk="amber"
                  />
                  <Kart
                    etiket="Son 30 Gün Aktif"
                    deger={data.son30Aktif}
                    icon="Calendar"
                    renk="blue"
                  />
                </div>
                {data.banli > 0 && (
                  <div className="mt-2 text-[12px] text-danger dark:text-danger">
                    <Icon name="Lock" size={11} className="inline mr-1" />
                    {data.banli} banlı kullanıcı
                  </div>
                )}
              </section>

              {/* Çözümler */}
              <section>
                <h2 className="font-display text-lg font-bold mb-3">Çözümler</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Kart etiket="Bugün" deger={data.bugunCozum} icon="Zap" />
                  <Kart etiket="Son 7 Gün" deger={data.son7Cozum} icon="Flame" />
                  <Kart etiket="Son 30 Gün" deger={data.son30Cozum} icon="Calendar" />
                  <Kart
                    etiket="Tüm Zamanlar"
                    deger={data.toplamCozum}
                    icon="Trophy"
                  />
                </div>
              </section>

              {/* Çözüm trendi */}
              <section>
                <h2 className="font-display text-lg font-bold mb-3">
                  Çözüm Trendi (son 30 gün)
                </h2>
                <div className="bg-surface border border-line rounded-xl p-4">
                  <div className="flex items-end gap-1 h-32">
                    {data.trend.map((t) => (
                      <div
                        key={t.tarih}
                        className="flex-1 bg-brand rounded-t hover:bg-brand transition relative group min-h-[2px]"
                        style={{ height: `${(t.sayi / trendMaks) * 100}%` }}
                        title={`${new Date(t.tarih).toLocaleDateString('tr-TR')}: ${t.sayi} çözüm`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] text-ink-quiet font-mono mt-2">
                    <span>{new Date(data.trend[0]?.tarih ?? '').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
                    <span>bugün</span>
                  </div>
                </div>
              </section>

              {/* Gelir */}
              <section>
                <h2 className="font-display text-lg font-bold mb-3">Gelir</h2>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-3">
                  <Kart
                    etiket="Toplam Gelir"
                    deger={`${paraFormat(data.toplamGelir)} ₺`}
                    icon="Wallet"
                    renk="emerald"
                  />
                  <Kart
                    etiket="Son 30 Gün"
                    deger={`${paraFormat(data.son30Gelir)} ₺`}
                    icon="TrendingDown"
                    renk="blue"
                  />
                </div>
              </section>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
};

interface KartProps {
  etiket: string;
  deger: number | string;
  altMetin?: string;
  icon: string;
  renk?: 'emerald' | 'blue' | 'amber' | 'stone';
}

const Kart = ({ etiket, deger, altMetin, icon, renk = 'stone' }: KartProps) => {
  const renkler = {
    emerald: 'text-success dark:text-success',
    blue: 'text-brand dark:text-brand-mute',
    amber: 'text-premium-deep',
    stone: 'text-ink-soft',
  };
  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
          {etiket}
        </div>
        <Icon name={icon} size={14} className={renkler[renk]} />
      </div>
      <div className="text-2xl font-display font-bold mt-1">{deger}</div>
      {altMetin && (
        <div className="text-[11px] text-ink-mute mt-0.5">
          {altMetin}
        </div>
      )}
    </div>
  );
};
