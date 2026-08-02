import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import {
  adminLogYukle,
  ISLEM_ETIKETLERI,
  type AdminLogKaydi,
} from '../../lib/admin-log';

const tarihFormat = (s: string): string =>
  new Date(s).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const islemRengi = (islem: string): string => {
  if (islem.startsWith('admin_')) return 'amber';
  if (islem.includes('sil') || islem.includes('ban')) return 'rose';
  if (islem.includes('katkici')) return 'blue';
  return 'emerald';
};

const renkClass = (renk: string) => {
  switch (renk) {
    case 'amber':
      return 'bg-premium-soft text-premium-deep';
    case 'rose':
      return 'bg-danger-soft text-danger';
    case 'blue':
      return 'bg-brand-soft dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mute';
    default:
      return 'bg-success-soft text-success';
  }
};

export const AdminLogSayfasi = () => {
  const [list, setList] = useState<AdminLogKaydi[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [filtreIslem, setFiltreIslem] = useState<string>('');
  const [filtreAdmin, setFiltreAdmin] = useState<string>('');

  const yukle = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const data = await adminLogYukle(500);
      setList(data);
    } catch (e) {
      setHata((e as Error).message);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  const islemler = useMemo(
    () => Array.from(new Set(list.map((l) => l.islem))).sort(),
    [list],
  );

  const adminler = useMemo(
    () => Array.from(new Set(list.map((l) => l.admin_email))).sort(),
    [list],
  );

  const filtreli = useMemo(() => {
    return list.filter((l) => {
      if (filtreIslem && l.islem !== filtreIslem) return false;
      if (filtreAdmin && l.admin_email !== filtreAdmin) return false;
      return true;
    });
  }, [list, filtreIslem, filtreAdmin]);

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-6">
          <AdminSayfaBaslik
            baslik="Admin Log"
            aciklama={
              <>
                Hangi admin ne zaman ne yaptı? Son <strong>{filtreli.length}</strong> işlem
                {(filtreIslem || filtreAdmin) && ' (filtreli)'}.
              </>
            }
            aksiyon={
              <button
                onClick={yukle}
                disabled={yukleniyor}
                className="inline-flex items-center gap-2 border border-line-strong px-3 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:bg-bg-tint transition disabled:opacity-50"
              >
                <Icon name="RefreshCw" size={12} className={yukleniyor ? 'animate-spin' : ''} />
                Yenile
              </button>
            }
          />

          {/* Filtreler */}
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filtreIslem}
              onChange={(e) => setFiltreIslem(e.target.value)}
              className="px-3 py-2 bg-surface border border-line-strong rounded-lg text-[12px] outline-none focus:border-ink"
            >
              <option value="">Tüm işlemler</option>
              {islemler.map((i) => (
                <option key={i} value={i}>
                  {ISLEM_ETIKETLERI[i] ?? i}
                </option>
              ))}
            </select>
            <select
              value={filtreAdmin}
              onChange={(e) => setFiltreAdmin(e.target.value)}
              className="px-3 py-2 bg-surface border border-line-strong rounded-lg text-[12px] outline-none focus:border-ink"
            >
              <option value="">Tüm admin'ler</option>
              {adminler.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            {(filtreIslem || filtreAdmin) && (
              <button
                onClick={() => {
                  setFiltreIslem('');
                  setFiltreAdmin('');
                }}
                className="text-[12px] text-ink-mute hover:underline"
              >
                Filtreleri temizle
              </button>
            )}
          </div>

          {hata && (
            <div className="p-3 rounded-lg bg-danger-soft border border-danger-soft text-[13px] text-danger">
              {hata}
            </div>
          )}

          {yukleniyor ? (
            <div className="text-ink-mute text-sm">Yükleniyor…</div>
          ) : filtreli.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-ink-mute text-sm">
              Kayıt yok.
            </div>
          ) : (
            <div className="rounded-2xl border border-line overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-bg-tint text-[10px] tracking-[0.2em] uppercase text-ink-mute">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">Tarih</th>
                    <th className="text-left px-4 py-3 font-bold">Admin</th>
                    <th className="text-left px-4 py-3 font-bold">İşlem</th>
                    <th className="text-left px-4 py-3 font-bold">Hedef</th>
                    <th className="text-left px-4 py-3 font-bold">Detay</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filtreli.map((l) => {
                    const renk = islemRengi(l.islem);
                    return (
                      <tr
                        key={l.id}
                        className="hover:bg-bg-tint"
                      >
                        <td className="px-4 py-3 font-mono text-[12px] text-ink-soft whitespace-nowrap">
                          {tarihFormat(l.yapilan_at)}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px]">
                          {l.admin_email}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block text-[10px] tracking-[0.15em] uppercase font-bold px-2 py-0.5 rounded ${renkClass(renk)}`}
                          >
                            {ISLEM_ETIKETLERI[l.islem] ?? l.islem}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px] text-ink-soft">
                          {l.hedef_email ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-[11.5px] text-ink-mute max-w-[300px] truncate font-mono">
                          {l.detay ? JSON.stringify(l.detay) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
