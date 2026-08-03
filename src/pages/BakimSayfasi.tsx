import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

/**
 * Site "çok yakında" ekranı — bakım modu açıkken admin olmayan herkese gösterilir.
 * Tam ekran, ortalanmış. Kayıt/giriş akışı hâlâ erişilebilir (erken erişim).
 */
export const BakimSayfasi = () => (
  <main className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-bg-tint text-ink px-6">
    {/* Yumuşak arka plan */}
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-soft/40 via-transparent to-transparent" />

    <div className="relative w-full max-w-xl text-center">
      {/* Logo işareti — T hesabı */}
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-deep mb-8 shadow-lg">
        <svg width="30" height="30" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M12 16 H36 M24 16 V34" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="text-[11px] tracking-[0.35em] uppercase text-brand-deep font-bold mb-4">
        MuhasebeAkademi
      </div>

      <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.05] mb-5">
        Çok yakında{' '}
        <span className="font-display-italic font-normal text-ink-soft">buradayız</span>
      </h1>

      <p className="text-[16px] sm:text-[17px] text-ink-soft font-medium leading-relaxed max-w-md mx-auto mb-9">
        Muhasebeyi senaryo tabanlı, gerçek belgelerle çözerek öğreten platform son
        hazırlıklarında. Şimdi kaydol, açılışta{' '}
        <strong className="text-ink">ilk kullanıcılara özel avantajlardan</strong> yararlan.
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/giris?mod=kayit"
          className="inline-flex items-center gap-2 bg-ink text-bg px-6 py-3.5 rounded-xl text-sm font-bold tracking-wide uppercase hover:bg-ink-soft active:scale-[0.99] transition shadow-lg"
        >
          Kayıt Ol
          <Icon name="ArrowRight" size={15} />
        </Link>
        <Link
          to="/giris"
          className="text-sm font-semibold text-ink-soft hover:text-ink transition px-2 py-2"
        >
          Zaten hesabın var mı? Giriş yap
        </Link>
      </div>

      <div className="mt-12 text-[12px] text-ink-quiet font-medium">
        © 2026 MuhasebeAkademi
      </div>
    </div>
  </main>
);
