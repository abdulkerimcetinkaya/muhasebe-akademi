import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import {
  adminCikar,
  adminEkle,
  adminRolleriGuncelle,
  tumAdminleriYukle,
  tumKullanicilariYukle,
  type Admin,
  type KullaniciOzet,
} from '../../lib/admin-kullanicilar';
import type { AdminRol } from '../../lib/database.types';
import { useAuth } from '../../contexts/AuthContext';

const ROL_ETIKETLERI: Record<AdminRol, { ad: string; aciklama: string }> = {
  super: {
    ad: 'Süper',
    aciklama: 'Her şey + admin atama/çıkarma',
  },
  icerik: {
    ad: 'İçerik',
    aciklama: 'Sorular, işletmeler, mevzuat, sözlük, hesap planı',
  },
  operasyon: {
    ad: 'Operasyon',
    aciklama: 'Premium, ban, hata, katkıcı, bildirim, indirim',
  },
};
const TUM_ROLLER: AdminRol[] = ['super', 'icerik', 'operasyon'];

const tarihFormat = (s: string): string =>
  new Date(s).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

export const AdminYetkilileriSayfasi = () => {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  const [ekleModalAcik, setEkleModalAcik] = useState(false);
  const [aramaQ, setAramaQ] = useState('');
  const [kullaniciList, setKullaniciList] = useState<KullaniciOzet[]>([]);
  const [kullaniciYukleniyor, setKullaniciYukleniyor] = useState(false);
  // Yeni admin için seçilen kullanıcı + roller
  const [seciliK, setSeciliK] = useState<KullaniciOzet | null>(null);
  const [seciliRoller, setSeciliRoller] = useState<AdminRol[]>(['operasyon']);
  // Mevcut admin'in rolünü düzenleme modalı
  const [duzenleAdmin, setDuzenleAdmin] = useState<Admin | null>(null);
  const [duzenleRoller, setDuzenleRoller] = useState<AdminRol[]>([]);

  const yukle = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const data = await tumAdminleriYukle();
      setAdmins(data);
    } catch (e) {
      setHata(`Yüklenemedi: ${(e as Error).message}`);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  useEffect(() => {
    if (ekleModalAcik && kullaniciList.length === 0 && !kullaniciYukleniyor) {
      setKullaniciYukleniyor(true);
      tumKullanicilariYukle()
        .then(setKullaniciList)
        .catch(() => setKullaniciList([]))
        .finally(() => setKullaniciYukleniyor(false));
    }
  }, [ekleModalAcik, kullaniciList.length, kullaniciYukleniyor]);

  const adminUserIdSet = useMemo(
    () => new Set(admins.map((a) => a.user_id)),
    [admins],
  );

  const filtreliKullanici = useMemo(() => {
    let list = kullaniciList.filter((k) => !adminUserIdSet.has(k.id));
    if (aramaQ.trim()) {
      const q = aramaQ.toLowerCase();
      list = list.filter(
        (k) =>
          k.kullanici_adi.toLowerCase().includes(q) ||
          (k.email ?? '').toLowerCase().includes(q),
      );
    }
    return list.slice(0, 30);
  }, [kullaniciList, adminUserIdSet, aramaQ]);

  const yetkiVer = async () => {
    if (!seciliK || seciliRoller.length === 0) return;
    try {
      await adminEkle(seciliK.id, seciliRoller);
      await yukle();
      setEkleModalAcik(false);
      setAramaQ('');
      setSeciliK(null);
      setSeciliRoller(['operasyon']);
    } catch (e) {
      alert(`Eklenemedi: ${(e as Error).message}`);
    }
  };

  const rolToggle = (rol: AdminRol, current: AdminRol[], setter: (r: AdminRol[]) => void) => {
    if (current.includes(rol)) {
      setter(current.filter((r) => r !== rol));
    } else {
      setter([...current, rol]);
    }
  };

  const rolKaydet = async () => {
    if (!duzenleAdmin || duzenleRoller.length === 0) return;
    try {
      await adminRolleriGuncelle(duzenleAdmin.user_id, duzenleRoller);
      await yukle();
      setDuzenleAdmin(null);
    } catch (e) {
      alert(`Güncellenemedi: ${(e as Error).message}`);
    }
  };

  const yetkiKaldir = async (admin: Admin) => {
    const kendiMi = admin.user_id === user?.id;
    const onayMetni = kendiMi
      ? 'Kendi admin yetkini kaldırmak üzeresin. Bunu yaparsan bu sayfaya bir daha giremezsin (başka bir admin eklemediysen).\n\nDevam edilsin mi?'
      : `${admin.email} kullanıcısının admin yetkisi kaldırılsın mı?`;
    if (!confirm(onayMetni)) return;
    try {
      await adminCikar(admin.user_id);
      await yukle();
    } catch (e) {
      alert(`Kaldırılamadı: ${(e as Error).message}`);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-6">
          <div className="flex items-baseline justify-between flex-wrap gap-2">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Admin Yetkilileri
              </h1>
              <p className="text-[13.5px] text-ink-soft mt-1">
                Toplam <strong>{admins.length}</strong> admin · admin tüm içerik ve kullanıcı yönetimi yetkisine sahip
              </p>
            </div>
            <button
              onClick={() => setEkleModalAcik(true)}
              className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 active:scale-[0.98] transition"
            >
              <Icon name="UserPlus" size={12} />
              Admin Ekle
            </button>
          </div>

          {hata && (
            <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
              <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
              <span>{hata}</span>
            </div>
          )}

          {yukleniyor ? (
            <div className="text-sm text-ink-quiet">Yükleniyor…</div>
          ) : (
            <div className="overflow-x-auto border border-line rounded-xl">
              <table className="w-full text-[13px]">
                <thead className="bg-bg-tint text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute">
                  <tr>
                    <th className="text-left p-3">Email</th>
                    <th className="text-left p-3">Roller</th>
                    <th className="text-left p-3">Eklenen Tarih</th>
                    <th className="text-center p-3">Sen?</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {admins.map((a) => {
                    const benMi = a.user_id === user?.id;
                    const sonAdmin = admins.length === 1;
                    const roller = (a.roller ?? []) as AdminRol[];
                    return (
                      <tr
                        key={a.user_id}
                        className="border-t border-line"
                      >
                        <td className="p-3 font-mono">{a.email}</td>
                        <td className="p-3">
                          <div className="flex gap-1 flex-wrap">
                            {roller.length === 0 ? (
                              <span className="text-[11px] text-ink-quiet">—</span>
                            ) : (
                              roller.map((r) => (
                                <span
                                  key={r}
                                  className={`text-[10px] tracking-[0.15em] uppercase font-bold px-1.5 py-0.5 rounded ${
 r === 'super'
 ? 'bg-premium-soft text-premium-deep'
 : r === 'icerik'
 ? 'bg-brand-soft dark:bg-brand-deep/30 text-brand-deep dark:text-brand-mute'
 : 'bg-success-soft text-success'
 }`}
                                >
                                  {ROL_ETIKETLERI[r].ad}
                                </span>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-ink-soft">
                          {tarihFormat(a.eklenen_at)}
                        </td>
                        <td className="p-3 text-center">
                          {benMi && (
                            <span className="inline-flex items-center text-[10px] tracking-wider uppercase font-mono font-bold text-brand dark:text-brand-mute bg-brand-soft px-1.5 py-0.5 rounded">
                              sen
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => {
                                setDuzenleAdmin(a);
                                setDuzenleRoller(roller.length ? roller : ['operasyon']);
                              }}
                              title="Rolleri düzenle"
                              className="p-2 hover:bg-surface-2 text-ink-soft rounded-lg transition"
                            >
                              <Icon name="Pencil" size={13} />
                            </button>
                            <button
                              onClick={() => yetkiKaldir(a)}
                              disabled={sonAdmin}
                              title={
                                sonAdmin
                                  ? 'Son admin çıkarılamaz'
                                  : benMi
                                    ? 'Kendi yetkini kaldır'
                                    : 'Yetkiyi kaldır'
                              }
                              className="p-2 hover:bg-danger-soft text-danger dark:text-danger rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Icon name="X" size={13} />
                            </button>
                          </div>
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

      {/* Yeni admin ekle modalı (2 adım: kullanıcı seç + rol seç) */}
      {ekleModalAcik && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          onClick={() => {
            setEkleModalAcik(false);
            setSeciliK(null);
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">
                  {seciliK ? 'Rol Seç' : 'Admin Ekle'}
                </h2>
                <p className="text-[12px] text-ink-mute mt-0.5">
                  {seciliK
                    ? `${seciliK.kullanici_adi} (${seciliK.email}) için rolleri seç`
                    : 'Aramadan kullanıcı seç → ardından rolleri belirle'}
                </p>
              </div>
              <button
                onClick={() => {
                  setEkleModalAcik(false);
                  setSeciliK(null);
                }}
                className="p-1.5 hover:bg-surface-2 rounded-lg transition"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            {!seciliK ? (
              <>
                <input
                  type="text"
                  value={aramaQ}
                  onChange={(e) => setAramaQ(e.target.value)}
                  autoFocus
                  placeholder="Kullanıcı adı veya email"
                  className="w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink"
                />

                <div className="border border-line rounded-lg max-h-72 overflow-auto">
                  {kullaniciYukleniyor ? (
                    <div className="text-[13px] text-ink-quiet p-3">
                      Yükleniyor…
                    </div>
                  ) : filtreliKullanici.length === 0 ? (
                    <div className="text-[13px] text-ink-quiet p-3">
                      Eşleşen kullanıcı yok.
                    </div>
                  ) : (
                    filtreliKullanici.map((k) => (
                      <button
                        key={k.id}
                        onClick={() => setSeciliK(k)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-bg-tint border-b last:border-b-0 border-line-soft"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-[13px]">{k.kullanici_adi}</div>
                          <div className="text-[11px] font-mono text-ink-mute truncate">
                            {k.email ?? '—'}
                          </div>
                        </div>
                        <Icon name="ArrowRight" size={14} className="flex-shrink-0 text-ink-quiet" />
                      </button>
                    ))
                  )}
                </div>
              </>
            ) : (
              <>
                <RolSeciciler
                  secili={seciliRoller}
                  onChange={setSeciliRoller}
                  toggle={(rol) => rolToggle(rol, seciliRoller, setSeciliRoller)}
                />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setSeciliK(null)}
                    className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg border border-line-strong hover:bg-surface-2 transition"
                  >
                    Geri
                  </button>
                  <button
                    onClick={yetkiVer}
                    disabled={seciliRoller.length === 0}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-ink text-bg px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="UserPlus" size={12} />
                    Admin Yap
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Admin rol düzenleme modalı */}
      {duzenleAdmin && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setDuzenleAdmin(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight">
                  Rolleri Düzenle
                </h2>
                <p className="text-[12px] text-ink-mute mt-0.5 font-mono">
                  {duzenleAdmin.email}
                </p>
              </div>
              <button
                onClick={() => setDuzenleAdmin(null)}
                className="p-1.5 hover:bg-surface-2 rounded-lg transition"
              >
                <Icon name="X" size={16} />
              </button>
            </div>

            <RolSeciciler
              secili={duzenleRoller}
              onChange={setDuzenleRoller}
              toggle={(rol) => rolToggle(rol, duzenleRoller, setDuzenleRoller)}
            />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDuzenleAdmin(null)}
                className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg border border-line-strong hover:bg-surface-2 transition"
              >
                İptal
              </button>
              <button
                onClick={rolKaydet}
                disabled={duzenleRoller.length === 0}
                className="flex-1 bg-ink text-bg px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Rol multi-select bileşeni
const RolSeciciler = ({
  secili,
  toggle,
}: {
  secili: AdminRol[];
  onChange: (r: AdminRol[]) => void;
  toggle: (rol: AdminRol) => void;
}) => (
  <div className="space-y-2">
    <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute">
      Roller (en az 1)
    </div>
    {TUM_ROLLER.map((rol) => {
      const aktif = secili.includes(rol);
      const meta = ROL_ETIKETLERI[rol];
      return (
        <label
          key={rol}
          className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition ${
 aktif
 ? 'border-ink bg-bg-tint '
 : 'border-line hover:border-line-strong '
 }`}
        >
          <input
            type="checkbox"
            checked={aktif}
            onChange={() => toggle(rol)}
            className="mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-sm tracking-tight">
              {meta.ad}
              {rol === 'super' && (
                <span className="ml-2 text-[10px] tracking-[0.15em] uppercase font-bold text-premium-deep bg-premium-soft px-1.5 py-0.5 rounded">
                  her şey
                </span>
              )}
            </div>
            <div className="text-[12px] text-ink-soft font-medium leading-relaxed mt-0.5">
              {meta.aciklama}
            </div>
          </div>
        </label>
      );
    })}
  </div>
);
