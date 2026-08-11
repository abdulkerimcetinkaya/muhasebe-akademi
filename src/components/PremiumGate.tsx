import { useNavigate } from 'react-router-dom';
import { useIsPremium } from '../contexts/AuthContext';
import { Icon } from './Icon';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  ozellikAdi?: string;
  aciklama?: string;
  kompakt?: boolean;
}

export const PremiumGate = ({ children, ozellikAdi, aciklama, kompakt }: Props) => {
  const isPremium = useIsPremium();
  const nav = useNavigate();

  if (isPremium) return <>{children}</>;

  if (kompakt) {
    return (
      <button
        onClick={() => nav('/premium')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-premium-soft to-premium-soft border border-premium/60 dark:border-premium-deep/40 text-premium-deep dark:text-premium-soft text-[11px] font-bold tracking-wide uppercase hover:opacity-90 active:scale-[0.98] transition"
        title={ozellikAdi ? `${ozellikAdi} — Premium özellik` : 'Premium özellik'}
      >
        <Icon name="Sparkles" size={12} />
        Premium
      </button>
    );
  }

  return (
    <div className="relative rounded-2xl border-2 border-dashed border-premium/70 dark:border-premium-deep/40 bg-gradient-to-br from-premium-soft to-bg p-8 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-premium-soft to-premium-soft mb-3">
        <Icon name="Sparkles" size={20} className="text-premium-deep" />
      </div>
      <div className="text-[10px] tracking-[0.3em] uppercase text-premium-deep font-bold mb-2">
        Premium Özellik
      </div>
      {ozellikAdi && (
        <h3 className="font-display text-xl font-bold tracking-tight mb-2">{ozellikAdi}</h3>
      )}
      {aciklama && (
        <p className="text-sm text-ink-soft font-medium max-w-sm mx-auto mb-5">
          {aciklama}
        </p>
      )}
      <button
        onClick={() => nav('/premium')}
        className="inline-flex items-center gap-2 bg-ink text-bg px-6 py-2.5 text-xs tracking-wide uppercase font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition shadow-md"
      >
        <Icon name="Sparkles" size={13} />
        Premium’u incele
      </button>
    </div>
  );
};
