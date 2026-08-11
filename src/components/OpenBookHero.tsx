import { motion } from 'framer-motion';
import { SlideInWords } from './SlideInWords';

interface Props {
  onProblemler: () => void;
  onGiris: () => void;
}

/**
 * Hero — viewport-dolduran ortalı tipografi.
 * Üç satır italik başlık, altta merkezli CTA + canlı işaret.
 */
export const OpenBookHero = ({ onProblemler, onGiris }: Props) => {
  return (
    <section
      className="relative overflow-hidden border-b border-line"
      style={{
        minHeight: 'calc(100vh - 65px)',
        background: 'var(--bg)',
      }}
    >
      {/* Ana başlık alanı */}
      <div
        className="relative px-5 sm:px-8 flex items-center justify-center"
        style={{ minHeight: 'calc(100vh - 65px - 64px - 100px)', paddingTop: 'clamp(48px, 8vh, 96px)', paddingBottom: 'clamp(48px, 8vh, 96px)' }}
      >
        <div className="max-w-[1400px] mx-auto w-full text-center">
          <h1
            className="font-display-italic text-ink leading-[0.96] tracking-tight mx-auto"
            style={{ fontSize: 'clamp(44px, 9vw, 132px)' }}
          >
            <span className="block">
              <SlideInWords trigger="mount" delay={0.2} stagger={0.06}>
                Kayıt tutmayı
              </SlideInWords>
            </span>
            <span className="block">
              <SlideInWords
                trigger="mount"
                delay={0.4}
                stagger={0.05}
                highlightWords={[
                  { index: 1, color: 'var(--copper-deep)' },
                ]}
              >
                yevmiye kaydı yaparak öğren.
              </SlideInWords>
            </span>
          </h1>

          {/* Alt — CTA + canlı işaret (ortalı) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.6 }}
            className="mt-12 sm:mt-16 lg:mt-20 flex flex-wrap items-baseline justify-center gap-5"
          >
            <button onClick={onProblemler} className="btn btn-primary btn-lg">
              Soruları aç
            </button>
            <button
              onClick={onGiris}
              className="ml-link inline-flex items-baseline gap-1.5 text-[14px] font-medium text-ink"
            >
              <span>Hesap oluştur</span>
              <span className="ml-arrow font-mono text-[13px]">→</span>
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 0.7 }}
            className="mt-10 inline-flex items-center gap-2"
          >
            <span
              className="inline-block w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: 'var(--success, #5d8a6f)' }}
            />
            <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute">
              Fatura ve dekont senaryoları · Anında kontrol · AI hata analizi
            </span>
          </motion.div>
        </div>
      </div>

    </section>
  );
};
