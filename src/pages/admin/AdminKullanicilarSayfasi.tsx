import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import {
  tumKullanicilariYukle,
  type KullaniciOzet,
} from '../../lib/admin-kullanicilar';

type TipFiltresi = 'hepsi' | 'premium' | 'free' | 'banli';

const tarihFormat = (s: string | null): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const AdminKullanicilarSayfasi = () => {
  const [list, setList] = useState<KullaniciOzet[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [arama, setArama] = useState('');
  const [tipFiltresi, setTipFiltresi] = useState<TipFiltresi>('hepsi');

  useEffect(() => {
    setYukleniyor(true);
    setHata(null);
    tumKullanicilariYukle()
      .then(setList)
      .catch((e) => setHata(`Yüklenemedi: ${(e as Error).message}`))
      .finally(() => setYukleniyor(false));
  }, []);

  const filtreli = useMemo(() => {
    return list.filter((k) => {
      if (tipFiltresi === 'premium' && !k.premium_aktif) return false;
      if (tipFiltresi === 'free' && k.premium_aktif) return false;
      if (tipFiltresi === 'banli' && !k.banli) return false;
      if (arama.trim()) {
        const q = arama.toLowerCase();
        if (
          !k.kullanici_adi.toLowerCase().includes(q) &&
          !(k.email ?? '').toLowerCase().includes(q) &&
          !(k.universite ?? '').toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [list, arama, tipFiltresi]);

  const premiumSayisi = list.filter((k) => k.premium_aktif).length;
  const banliSayisi = list.filter((k) => k.banli).length;

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-6">
          <AdminSayfaBaslik
            baslik="Kullanıcılar"
            aciklama={
              <>
                Toplam <strong>{list.length}</strong> kullanıcı —{' '}
                <strong>{premiumSayisi}</strong> aktif premium
                {banliSayisi > 0 && (
                  <>
                    {' '}
                    · <strong className="text-danger dark:text-danger">
                      {banliSayisi}
                    </strong> banlı
                  </>
                )}
              </>
            }
          />

          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={arama}
              onChange={(e) => setArama(e.target.value)}
              placeholder="Ara: kullanıcı adı, email, üniversite"
              className="px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-[13px] font-medium outline-none focus:border-ink flex-1 min-w-[220px]"
            />
            <select
              value={tipFiltresi}
              onChange={(e) => setTipFiltresi(e.target.value as TipFiltresi)}
              className="px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-[13px] font-medium outline-none focus:border-ink"
            >
              <option value="hepsi">Tüm kullanıcılar</option>
              <option value="premium">Sadece premium</option>
              <option value="free">Sadece free</option>
              <option value="banli">Sadece banlı</option>
            </select>
          </div>

          {hata && (
            <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
              <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
              <span>{hata}</span>
            </div>
          )}

          {yukleniyor ? (
            <div className="text-sm text-ink-quiet">Yükleniyor…</div>
          ) : filtreli.length === 0 ? (
            <div className="text-sm text-ink-quiet text-center py-8 border border-dashed border-line-strong rounded-xl">
              {list.length === 0 ? 'Henüz kayıtlı kullanıcı yok.' : 'Filtreyle eşleşen kullanıcı yok.'}
            </div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-xl">
              <table className="w-full text-[13px]">
                <thead className="bg-bg-tint text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute">
                  <tr>
                    <th className="text-left p-3">Kullanıcı</th>
                    <th className="text-left p-3">Email</th>
                    <th className="text-center p-3">Premium</th>
                    <th className="text-right p-3">Çözüm</th>
                    <th className="text-right p-3">Rozet</th>
                    <th className="text-left p-3">Kayıt</th>
                    <th className="text-left p-3">Son Akt.</th>
                    <th className="w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtreli.map((k) => (
                    <tr
                      key={k.id}
                      className={`border-t border-line hover:bg-bg-tint transition ${k.banli ? 'opacity-60' : ''}`}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{k.kullanici_adi}</span>
                          {k.banli && (
                            <span className="inline-flex items-center text-[9px] tracking-wider uppercase font-mono font-bold text-danger dark:text-danger bg-danger-soft border border-danger-soft px-1.5 py-0.5 rounded">
                              Banlı
                            </span>
                          )}
                        </div>
                        {k.universite && (
                          <div className="text-[11px] text-ink-mute">
                            {k.universite}
                          </div>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[12px] text-ink-soft">
                        {k.email ?? '—'}
                      </td>
                      <td className="p-3 text-center">
                        {k.premium_aktif ? (
                          <span className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase font-mono font-bold text-success dark:text-success bg-success-soft px-1.5 py-0.5 rounded">
                            <Icon name="Sparkles" size={10} />
                            Premium
                          </span>
                        ) : (
                          <span className="text-[10px] text-ink-quiet">
                            Free
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right font-mono">{k.cozum_sayisi}</td>
                      <td className="p-3 text-right font-mono">{k.rozet_sayisi}</td>
                      <td className="p-3 text-ink-soft">
                        {tarihFormat(k.created_at)}
                      </td>
                      <td className="p-3 text-ink-soft">
                        {tarihFormat(k.son_aktivite_tarihi)}
                      </td>
                      <td className="p-3">
                        <Link
                          to={`/admin/kullanicilar/${k.id}`}
                          title="Detay"
                          className="p-2 hover:bg-surface-2 rounded-lg transition inline-flex"
                        >
                          <Icon name="ArrowRight" size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
