import { cikisYap } from '../lib/auth';

/**
 * Site "çok yakında" ekranı — bakım modu açıkken GİRİŞ YAPMIŞ ama admin olmayan
 * kullanıcıya gösterilir (kayıt duvarı: anonimler önce /giris'e yönlenir).
 * Sade: tam ekran, ortalanmış, büyük başlık.
 */
export const BakimSayfasi = () => {
  const cikis = async () => {
    await cikisYap();
    window.location.href = '/giris';
  };

  return (
    <main className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-bg-tint text-ink px-6">
      {/* Yumuşak arka plan */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-soft/40 via-transparent to-transparent" />

      <div className="relative text-center">
        <div className="font-display text-xl sm:text-2xl tracking-tight text-brand-deep mb-6">
          MuhasebeAkademi
        </div>

        <h1 className="font-display font-bold tracking-tight leading-[1.02] text-5xl sm:text-7xl lg:text-8xl">
          Çok yakında{' '}
          <span className="font-display-italic font-normal text-ink-soft">buradayız</span>
        </h1>

        <p className="mt-7 text-[15px] sm:text-[16px] text-ink-soft font-medium max-w-md mx-auto">
          Kaydın alındı. Açılış tarihini e-postayla bildireceğiz.
        </p>
      </div>

      {/* En altta sabit telif + ince çıkış */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-3 text-[12px] text-ink-quiet font-medium">
        <span>© 2026 MuhasebeAkademi</span>
        <span aria-hidden>·</span>
        <button onClick={cikis} className="hover:text-ink transition">
          Çıkış yap
        </button>
      </div>
    </main>
  );
};
