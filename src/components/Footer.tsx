import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * LeetCode tarzı minimal footer — tek satır.
 * Sol: copyright. Sağ: yatay sıralı küçük linkler.
 * Logo, tagline, çoklu sütun yok.
 */
export const Footer = () => {
  const nav = useNavigate();
  const { user } = useAuth();
  const yil = new Date().getFullYear();

  const linkClass =
    'text-[12px] text-ink-mute dark:text-paper/55 hover:text-ink dark:hover:text-paper transition whitespace-nowrap';

  return (
    <footer className="footer-dark mt-12 border-t border-ink/8 dark:border-paper/10">
      <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <span className="text-[12px] text-ink-mute dark:text-paper/55 whitespace-nowrap">
          © {yil} MuhasebeAkademi
        </span>

        <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <button onClick={() => nav('/isletmeler')} className={linkClass}>
            İşletmeler
          </button>
          <button onClick={() => nav('/problemler')} className={linkClass}>
            Sorular
          </button>
          <button onClick={() => nav('/sozluk')} className={linkClass}>
            Sözlük
          </button>
          {user && (
            <button onClick={() => nav('/liderlik')} className={linkClass}>
              Liderlik
            </button>
          )}
          {!user && (
            <button onClick={() => nav('/giris')} className={linkClass}>
              Giriş
            </button>
          )}
          <button
            onClick={() => nav('/premium')}
            className="text-[12px] hover:opacity-80 transition whitespace-nowrap"
            style={{ color: 'var(--copper)' }}
          >
            Premium
          </button>
          <button onClick={() => nav('/katkici-basvuru')} className={linkClass}>
            Katkıcı
          </button>
          <a href="/kvkk.html" className={linkClass}>
            KVKK
          </a>
        </nav>
      </div>
    </footer>
  );
};
