import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from './Icon';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { AdminRol } from '../lib/database.types';

interface MenuItem {
  to: string;
  etiket: string;
  icon: string;
  end: boolean;
  // null → her admin görür; spesifik rol → sadece o rol veya super görür
  rol: AdminRol | null;
  // aksiyon bekleyen sayaç rozeti
  rozet?: 'hata' | 'katkici';
}

interface Grup {
  baslik: string | null;
  items: MenuItem[];
}

const gruplar: Grup[] = [
  {
    baslik: null,
    items: [
      { to: '/admin', etiket: 'Genel Bakış', icon: 'LayoutDashboard', end: true, rol: null },
      { to: '/admin/istatistikler', etiket: 'İstatistikler', icon: 'BarChart3', end: true, rol: null },
    ],
  },
  {
    baslik: 'İçerik',
    items: [
      { to: '/admin/isletmeler', etiket: 'İşletmeler', icon: 'LayoutGrid', end: true, rol: 'icerik' },
      { to: '/admin/kesfet', etiket: 'Keşfet', icon: 'Search', end: false, rol: 'icerik' },
      { to: '/admin/sorular', etiket: 'Sorular', icon: 'FileText', end: true, rol: 'icerik' },
      { to: '/admin/sorular/yeni', etiket: 'Yeni Soru', icon: 'PlusCircle', end: true, rol: 'icerik' },
      { to: '/admin/sorular/toplu-ekle', etiket: 'Toplu Ekle (JSON)', icon: 'Upload', end: true, rol: 'icerik' },
      { to: '/admin/muavin-hesaplar', etiket: 'Muavin Hesaplar', icon: 'Wallet', end: true, rol: 'icerik' },
      { to: '/admin/mevzuat', etiket: 'Mevzuat (AI)', icon: 'Sparkles', end: true, rol: 'icerik' },
      { to: '/admin/sozluk', etiket: 'Mali Sözlük', icon: 'BookOpen', end: true, rol: 'icerik' },
    ],
  },
  {
    baslik: 'Operasyon',
    items: [
      { to: '/admin/kullanicilar', etiket: 'Kullanıcılar', icon: 'Users', end: false, rol: 'operasyon' },
      { to: '/admin/bildirimler', etiket: 'Bildirimler', icon: 'Megaphone', end: true, rol: 'operasyon' },
      { to: '/admin/hatalar', etiket: 'Hata Bildirimleri', icon: 'AlertCircle', end: true, rol: 'operasyon', rozet: 'hata' },
      { to: '/admin/katkicilar', etiket: 'Katkıcı Başvuruları', icon: 'BadgeCheck', end: true, rol: 'operasyon', rozet: 'katkici' },
      { to: '/admin/indirim-kodlari', etiket: 'İndirim Kodları', icon: 'Tag', end: true, rol: 'operasyon' },
    ],
  },
  {
    baslik: 'Sistem',
    items: [
      { to: '/admin/yetkililer', etiket: 'Yetkililer', icon: 'ShieldCheck', end: true, rol: 'super' },
      { to: '/admin/ai-maliyet', etiket: 'AI Maliyet', icon: 'DollarSign', end: true, rol: 'super' },
      { to: '/admin/log', etiket: 'Admin Log', icon: 'FileText', end: true, rol: 'super' },
    ],
  },
];

export const AdminYanMenu = () => {
  const { user } = useAuth();
  const [roller, setRoller] = useState<AdminRol[] | null>(null);
  const [sayac, setSayac] = useState<{ hata: number; katkici: number }>({ hata: 0, katkici: 0 });

  useEffect(() => {
    if (!user) {
      setRoller(null);
      return;
    }
    let aktif = true;
    supabase
      .from('adminler')
      .select('roller')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!aktif) return;
        setRoller((data?.roller as AdminRol[]) ?? []);
      });
    return () => {
      aktif = false;
    };
  }, [user]);

  // Aksiyon bekleyen sayaçları (rozetler)
  useEffect(() => {
    let aktif = true;
    Promise.all([
      supabase.from('soru_hatalari').select('id', { count: 'exact', head: true }).eq('durum', 'acik'),
      supabase.from('katkici_basvurulari').select('id', { count: 'exact', head: true }).eq('durum', 'beklemede'),
    ])
      .then(([hataR, katkiciR]) => {
        if (!aktif) return;
        setSayac({ hata: hataR.count ?? 0, katkici: katkiciR.count ?? 0 });
      })
      .catch(() => {
        /* sessizce yok say — rozet kritik değil */
      });
    return () => {
      aktif = false;
    };
  }, []);

  // Rol yetkisi kontrolü
  const yetkili = (rol: AdminRol | null): boolean => {
    if (rol === null) return true; // herkes görür
    if (!roller) return false;
    if (roller.includes('super')) return true;
    return roller.includes(rol);
  };

  // Yüklenmediyse her şeyi göster (UX gecikmesi olmasın)
  const goster = (item: MenuItem) => (roller === null ? true : yetkili(item.rol));

  const rozetSayi = (item: MenuItem): number =>
    item.rozet === 'hata' ? sayac.hata : item.rozet === 'katkici' ? sayac.katkici : 0;

  return (
    <aside className="w-56 shrink-0 border-r border-line pr-4">
      <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-3 px-3">
        Admin
      </div>
      <nav className="flex flex-col gap-5">
        {gruplar.map((grup, gi) => {
          const gorunenler = grup.items.filter(goster);
          if (gorunenler.length === 0) return null;
          return (
            <div key={gi} className="flex flex-col gap-1">
              {grup.baslik && (
                <div className="text-[9px] tracking-[0.22em] uppercase text-ink-quiet font-bold px-3 mb-0.5">
                  {grup.baslik}
                </div>
              )}
              {gorunenler.map((l) => {
                const sayi = rozetSayi(l);
                return (
                  <NavLink
                    key={l.to}
                    to={l.to}
                    end={l.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition ${
                        isActive ? 'bg-ink text-bg' : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                      }`
                    }
                  >
                    <Icon name={l.icon} size={14} className="flex-shrink-0" />
                    <span className="truncate">{l.etiket}</span>
                    {sayi > 0 && (
                      <span
                        className={`ml-auto flex-shrink-0 min-w-[18px] text-center text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none ${
                          l.rozet === 'hata'
                            ? 'bg-danger text-white'
                            : 'bg-premium text-white'
                        }`}
                      >
                        {sayi}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          );
        })}
      </nav>
    </aside>
  );
};
