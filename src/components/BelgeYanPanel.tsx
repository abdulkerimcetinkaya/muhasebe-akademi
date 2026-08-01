import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { BelgeGovde } from './BelgeModal';
import type { Belge } from '../types';

const BELGE_ETIKET: Record<Belge['tur'], string> = {
  fatura: 'Fatura',
  'perakende-fis': 'Perakende Fişi',
  cek: 'Çek',
  senet: 'Senet',
  dekont: 'Dekont',
};

interface Props {
  acik: boolean;
  belgeler: Belge[];
  onKapat: () => void;
  onTamEkran?: () => void;
}

export const BelgeYanPanel = ({ acik, belgeler, onKapat, onTamEkran }: Props) => {
  const [aktif, setAktif] = useState(0);

  // Panel açıldığında ilk belgeye dön
  useEffect(() => {
    if (acik) setAktif(0);
  }, [acik]);

  if (!acik || belgeler.length === 0) return null;

  const belge = belgeler[Math.min(aktif, belgeler.length - 1)];

  return (
    <>
      <div
        onClick={onKapat}
        className="fixed inset-0 bg-ink/30 dark:bg-black/50 backdrop-blur-sm z-40 transition-opacity"
      />
      <aside className="fixed top-0 right-0 h-full w-full sm:w-[560px] lg:w-[600px] bg-bg-tint border-l border-line z-50 flex flex-col shadow-2xl">
        {/* Başlık */}
        <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-gradient-to-r from-line-soft/60 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-line-soft flex items-center justify-center">
              <Icon name="FileText" size={14} className="text-ink-soft" />
            </div>
            <div>
              <div className="font-display font-bold text-sm tracking-tight">Belge</div>
              <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute">
                Sorunun dayanağı
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {onTamEkran && (
              <button
                onClick={onTamEkran}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-brand-deep hover:gap-2 transition-all px-2 py-1.5 rounded-lg hover:bg-line-soft"
              >
                Tam ekran <Icon name="Eye" size={12} />
              </button>
            )}
            <button onClick={onKapat} className="p-1.5 rounded-lg hover:bg-line-soft transition">
              <Icon name="X" size={16} />
            </button>
          </div>
        </div>

        {/* Sekmeler — birden fazla belge varsa */}
        {belgeler.length > 1 && (
          <div className="flex items-center gap-1 px-3 py-2 border-b border-line overflow-x-auto bg-bg-tint/60">
            {belgeler.map((b, i) => (
              <button
                key={i}
                onClick={() => setAktif(i)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition ${
                  i === aktif
                    ? 'bg-ink text-white'
                    : 'text-ink-soft hover:bg-line-soft'
                }`}
              >
                {BELGE_ETIKET[b.tur]}
              </button>
            ))}
          </div>
        )}

        {/* Belge gövdesi */}
        <div className="flex-1 overflow-auto bg-line-soft/25">
          <div className="p-4" style={{ zoom: 0.82 }}>
            <BelgeGovde belge={belge} />
          </div>
        </div>
      </aside>
    </>
  );
};
