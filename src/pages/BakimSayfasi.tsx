/**
 * Site "çok yakında" ekranı — bakım modu açıkken admin olmayan herkese gösterilir.
 * Sade: tam ekran, ortalanmış, büyük başlık. (Giriş/kayıt yolları hâlâ URL'den
 * erişilebilir; adminler /giris veya /admin ile giriş yapar.)
 */
export const BakimSayfasi = () => (
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

      <div className="mt-14 text-[12px] text-ink-quiet font-medium">
        © 2026 MuhasebeAkademi
      </div>
    </div>
  </main>
);
