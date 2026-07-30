import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { InitialsAvatar } from './InitialsAvatar';
import { BildirimDropdown } from './BildirimDropdown';
import { useAuth, useIsAdmin, useIsPremium } from '../contexts/AuthContext';
import { cikisYap } from '../lib/auth';
import type { Ilerleme } from '../types';

interface Props {
  ilerleme: Ilerleme;
  onTemaDegistir: () => void;
  onHesapPlaniAc: () => void;
}

/**
 * Üst navigasyon barı. Sağ üstte kullanıcı dropdown'ı var; Profilim,
 * Premium, Admin, Tema, Çıkış gibi maddeler buraya toplanmış durumda
 * (eski dağınık iconlar yerine). Streak/puan badge'ları kullanıcı
 * tercihi gereği dropdown'ın DIŞINDA, her zaman görünür kalıyor.
 */
export const Navbar = ({ ilerleme, onTemaDegistir, onHesapPlaniAc }: Props) => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const isPremium = useIsPremium();
  const [mobilMenuAcik, setMobilMenuAcik] = useState(false);
  const [userMenuAcik, setUserMenuAcik] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const cikis = async () => {
    setUserMenuAcik(false);
    await cikisYap();
    nav('/');
  };

  // Dropdown açıkken dış tıklama → kapat (BildirimDropdown'daki pattern aynısı)
  useEffect(() => {
    if (!userMenuAcik) return;
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuAcik(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [userMenuAcik]);

  const goruntuAd =
    [ilerleme.ad, ilerleme.soyad].filter(Boolean).join(' ').trim() ||
    ilerleme.kullaniciAdi ||
    user?.email?.split('@')[0] ||
    'Kullanıcı';

  const aktifKesfet = pathname === '/kesfet' || pathname.startsWith('/kesfet/');
  const aktifIsletme = pathname === '/isletmeler' || pathname.startsWith('/isletmeler/');
  const aktifProblem = pathname === '/problemler' || pathname.startsWith('/problemler/');
  const aktifSozluk = pathname === '/sozluk' || pathname.startsWith('/sozluk/');
  const aktifLiderlik = pathname === '/liderlik';
  const aktifAdmin = pathname.startsWith('/admin');

  // Logo zaten anasayfaya götürüyor; nav sade tutuluyor:
  // Keşfet (öğren) · İşletmeler (uygula) · Problemler (pekiştir) · Sözlük (başvur).
  const linkler = [
    { id: '/kesfet', ad: 'Keşfet', aktif: aktifKesfet },
    { id: '/isletmeler', ad: 'İşletmeler', aktif: aktifIsletme },
    { id: '/problemler', ad: 'Problemler', aktif: aktifProblem },
    { id: '/sozluk', ad: 'Sözlük', aktif: aktifSozluk },
  ];

  const dropdownGit = (yol: string) => {
    setUserMenuAcik(false);
    nav(yol);
  };

  return (
    <header className="sticky top-0 z-40 bg-bg/85 backdrop-blur-md border-b border-line">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8">
        <div className="flex items-center justify-between gap-4 py-3.5">
          {/* Logo */}
          <button
            onClick={() => nav('/')}
            className="flex items-baseline gap-2.5 group"
            aria-label="Anasayfa"
          >
            <span className="font-display text-[24px] leading-none text-ink tracking-tight">
              MuhasebeAkademi
            </span>
          </button>

          {/* Orta nav */}
          <nav className="hidden md:flex items-center">
            {linkler.map((l, i) => (
              <span key={l.id} className="flex items-center">
                {i > 0 && <span className="text-ink-quiet mx-3.5 text-[12px]">·</span>}
                <button
                  onClick={() => nav(l.id)}
                  className={`relative text-[13.5px] font-medium tracking-tight transition py-1 ${
                    l.aktif ? 'text-ink' : 'text-ink-soft hover:text-ink'
                  }`}
                >
                  {l.ad}
                  {l.aktif && (
                    <span className="absolute -bottom-0.5 left-0 right-0 h-px bg-ink" />
                  )}
                </button>
              </span>
            ))}
          </nav>

          {/* Sağ */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Streak / puan — sadece girişli kullanıcılar için (kullanıcı tercihi: her zaman dış) */}
            {user && (ilerleme.streak > 0 || ilerleme.puan > 0) && (
              <div className="hidden sm:flex items-center gap-3 mr-1 pr-3 border-r border-line">
                {ilerleme.streak > 0 && (
                  <div className="flex items-baseline gap-1.5" title="Seri">
                    <span className="font-mono tnum text-[13px] text-ink">{ilerleme.streak}</span>
                    <span className="text-[10px] text-ink-mute uppercase tracking-wider font-mono">seri</span>
                  </div>
                )}
                {ilerleme.streak > 0 && ilerleme.puan > 0 && (
                  <span className="w-px h-3 bg-line" />
                )}
                {ilerleme.puan > 0 && (
                  <div className="flex items-baseline gap-1.5" title="Puan">
                    <span className="font-mono tnum text-[13px] text-ink">{ilerleme.puan}</span>
                    <span className="text-[10px] text-ink-mute uppercase tracking-wider font-mono">puan</span>
                  </div>
                )}
              </div>
            )}

            {user && <BildirimDropdown />}

            {!user && (
              <button
                onClick={() => nav('/giris')}
                className="hidden md:flex btn btn-primary btn-sm"
              >
                Giriş Yap
              </button>
            )}

            {/* Kullanıcı dropdown — Profil, Premium, Admin, Tema, Çıkış */}
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuAcik(!userMenuAcik)}
                  className="hidden md:flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-surface-2/50 transition"
                  aria-label="Kullanıcı menüsü"
                  aria-expanded={userMenuAcik}
                >
                  <InitialsAvatar ad={goruntuAd} size={28} />
                  <Icon
                    name="ChevronDown"
                    size={12}
                    className={`text-ink-mute transition ${userMenuAcik ? 'rotate-180' : ''}`}
                  />
                </button>

                {userMenuAcik && (
                  <div className="absolute right-0 top-full mt-1.5 w-64 bg-surface border border-line rounded-xl shadow-xl py-1.5 z-50 overflow-hidden">
                    {/* Header */}
                    <div className="px-3.5 py-3 border-b border-line-soft flex items-center gap-3">
                      <InitialsAvatar ad={goruntuAd} size={36} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13.5px] font-semibold text-ink truncate">
                          {goruntuAd}
                        </div>
                        <div className="text-[11.5px] text-ink-mute truncate">
                          {user.email}
                        </div>
                      </div>
                    </div>

                    {/* Menü maddeleri */}
                    <button
                      onClick={() => dropdownGit('/profil')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink-soft hover:bg-surface-2/70 hover:text-ink transition"
                    >
                      <Icon name="User" size={14} />
                      <span>Profilim</span>
                    </button>

                    <button
                      onClick={() => dropdownGit('/liderlik')}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-surface-2/70 hover:text-ink transition ${
                        aktifLiderlik ? 'text-ink font-medium' : 'text-ink-soft'
                      }`}
                    >
                      <Icon name="Trophy" size={14} />
                      <span>Liderlik</span>
                    </button>

                    <button
                      onClick={() => dropdownGit('/premium')}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink-soft hover:bg-surface-2/70 hover:text-ink transition"
                    >
                      <Icon
                        name={isPremium ? 'BadgeCheck' : 'Sparkles'}
                        size={14}
                        className={isPremium ? 'text-premium-deep' : ''}
                      />
                      <span>{isPremium ? 'Premium (aktif)' : 'Premium'}</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => dropdownGit('/admin')}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] hover:bg-surface-2/70 hover:text-ink transition ${
                          aktifAdmin ? 'text-ink font-medium' : 'text-ink-soft'
                        }`}
                      >
                        <Icon name="Shield" size={14} />
                        <span>Admin paneli</span>
                      </button>
                    )}

                    <div className="h-px bg-line-soft my-1" />

                    <button
                      onClick={() => {
                        onHesapPlaniAc();
                        setUserMenuAcik(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink-soft hover:bg-surface-2/70 hover:text-ink transition"
                    >
                      <Icon name="BookOpen" size={14} />
                      <span>Hesap Planı</span>
                    </button>

                    <button
                      onClick={() => {
                        onTemaDegistir();
                        // tema değişikliği için menüyü kapatmıyoruz — kullanıcı sonucu görsün
                      }}
                      className="w-full flex items-center justify-between gap-2.5 px-3.5 py-2 text-[13px] text-ink-soft hover:bg-surface-2/70 hover:text-ink transition"
                    >
                      <span className="flex items-center gap-2.5">
                        <Icon name={ilerleme.tema === 'dark' ? 'Sun' : 'Moon'} size={14} />
                        <span>{ilerleme.tema === 'dark' ? 'Açık tema' : 'Karanlık tema'}</span>
                      </span>
                    </button>

                    <div className="h-px bg-line-soft my-1" />

                    <button
                      onClick={cikis}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink-soft hover:bg-danger-soft hover:text-danger transition"
                    >
                      <Icon name="LogOut" size={14} />
                      <span>Çıkış yap</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setMobilMenuAcik(!mobilMenuAcik)}
              className="md:hidden p-1.5 rounded border border-line text-ink"
              aria-label="Menü"
            >
              <Icon name={mobilMenuAcik ? 'X' : 'Menu'} size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobil menü */}
      {mobilMenuAcik && (
        <div className="md:hidden border-t border-line bg-surface">
          <div className="max-w-[1240px] mx-auto px-5 py-2">
            {/* Kullanıcı header (mobil) */}
            {user && (
              <div className="flex items-center gap-3 py-3 border-b border-line-soft mb-1">
                <InitialsAvatar ad={goruntuAd} size={36} />
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-semibold text-ink truncate">
                    {goruntuAd}
                  </div>
                  <div className="text-[12px] text-ink-mute truncate">{user.email}</div>
                </div>
              </div>
            )}

            {linkler.map((l) => (
              <button
                key={l.id}
                onClick={() => {
                  nav(l.id);
                  setMobilMenuAcik(false);
                }}
                className={`w-full px-2 py-3 text-left text-[15px] flex items-center justify-between border-b border-line-soft last:border-b-0 ${
                  l.aktif ? 'text-ink font-medium' : 'text-ink-soft'
                }`}
              >
                <span>{l.ad}</span>
                {l.aktif && <span className="folio">●</span>}
              </button>
            ))}
            {user && (
              <button
                onClick={() => {
                  nav('/profil');
                  setMobilMenuAcik(false);
                }}
                className="w-full px-2 py-3 text-left text-[14px] text-ink-soft flex items-center gap-2.5 border-b border-line-soft"
              >
                <Icon name="User" size={14} />
                Profilim
              </button>
            )}
            {user && (
              <button
                onClick={() => {
                  nav('/liderlik');
                  setMobilMenuAcik(false);
                }}
                className="w-full px-2 py-3 text-left text-[14px] text-ink-soft flex items-center gap-2.5 border-b border-line-soft"
              >
                <Icon name="Trophy" size={14} />
                Liderlik
              </button>
            )}
            <div className="hairline my-2" />
            <button
              onClick={() => {
                onHesapPlaniAc();
                setMobilMenuAcik(false);
              }}
              className="w-full px-2 py-3 text-left text-[14px] text-ink-soft flex items-center gap-2.5"
            >
              <Icon name="BookOpen" size={14} />
              Hesap Planı
            </button>
            <button
              onClick={() => {
                onTemaDegistir();
                setMobilMenuAcik(false);
              }}
              className="w-full px-2 py-3 text-left text-[14px] text-ink-soft flex items-center gap-2.5"
            >
              <Icon name={ilerleme.tema === 'dark' ? 'Sun' : 'Moon'} size={14} />
              {ilerleme.tema === 'dark' ? 'Açık tema' : 'Karanlık tema'}
            </button>
            {user && (
              <button
                onClick={() => {
                  nav('/premium');
                  setMobilMenuAcik(false);
                }}
                className="w-full px-2 py-3 text-left text-[14px] text-premium-deep flex items-center gap-2.5"
              >
                <Icon name={isPremium ? 'BadgeCheck' : 'Sparkles'} size={14} />
                {isPremium ? 'Premium (Aktif)' : 'Premium'}
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => {
                  nav('/admin');
                  setMobilMenuAcik(false);
                }}
                className={`w-full px-2 py-3 text-left text-[14px] flex items-center gap-2.5 ${
                  aktifAdmin ? 'text-ink font-medium' : 'text-ink-soft'
                }`}
              >
                <Icon name="Shield" size={14} />
                Admin
              </button>
            )}
            {user ? (
              <button
                onClick={() => {
                  cikis();
                  setMobilMenuAcik(false);
                }}
                className="w-full px-2 py-3 text-left text-[14px] text-ink-soft flex items-center gap-2.5"
              >
                <Icon name="LogOut" size={14} />
                <span className="truncate">Çıkış yap</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  nav('/giris');
                  setMobilMenuAcik(false);
                }}
                className="w-full mt-2 btn btn-primary"
              >
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
