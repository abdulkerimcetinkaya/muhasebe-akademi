import { useEffect, useRef, useState } from 'react';
import { slugUret, sozlukListesi } from '../lib/sozluk';

interface PopoverState {
  aciklama: string;
  x: number;
  y: number;
}

/**
 * Konu anlatımı viewer'ında sözlük terimi (`span.bn-term`) için popover.
 * Tek instance — sayfa başına bir adet. IcerikGoruntuleyici tarafından render edilir.
 *
 * Davranış:
 *   - Mouse hover: 200 ms delay sonra açılır
 *   - Mouse leave (popover'a değil): 100 ms grace ile kapanır
 *   - Popover hover: hide timer iptal — popover okunabilir kalır
 *   - Click on term: anında açılır + "sticky" (kendiliğinden kapanmaz)
 *   - Click outside / ESC: kapanır
 *
 * Mobile: tap → mouseover (synthetic) → 200ms gecikme problem yaratabilir,
 * ama aynı tap'in click event'i sticky modda anında açar — sorun olmaz.
 *
 * Konumlandırma: tıklanan elemanın bottom-left köşesinin altına oturur.
 * Sağ taşma olursa sağ kenara hizalanır.
 */
export const SozlukPopover = () => {
  const [popover, setPopover] = useState<PopoverState | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sabitRef = useRef(false); // click ile açıldıysa true (hover-leave kapatmaz)
  // Yayındaki sözlük slug'ları — terimin metninden türetilen slug bu sette ise
  // tıklayınca küçük tooltip yerine geniş mevzuat paneli açılır.
  const sluglarRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let iptal = false;
    sozlukListesi()
      .then((liste) => {
        if (!iptal) sluglarRef.current = new Set(liste.map((t) => t.slug));
      })
      .catch(() => {});
    return () => {
      iptal = true;
    };
  }, []);

  useEffect(() => {
    const acTimer = (terim: HTMLElement, sabit: boolean) => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      const aciklama = terim.dataset.aciklama;
      if (!aciklama) return;

      const ac = () => {
        const rect = terim.getBoundingClientRect();
        setPopover({
          aciklama,
          x: rect.left + window.scrollX,
          y: rect.bottom + window.scrollY + 6,
        });
        sabitRef.current = sabit;
      };

      if (sabit) ac();
      else showTimer.current = setTimeout(ac, 200);
    };

    const kapatTimer = () => {
      if (sabitRef.current) return; // sticky popover hover-leave ile kapanmaz
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setPopover(null);
        sabitRef.current = false;
      }, 100);
    };

    const kapatHemen = () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setPopover(null);
      sabitRef.current = false;
    };

    const handleMouseOver = (e: MouseEvent) => {
      const hedef = e.target as HTMLElement | null;
      const terim = hedef?.closest<HTMLElement>('.bn-term');
      if (terim) acTimer(terim, false);
    };

    const handleMouseOut = (e: MouseEvent) => {
      const hedef = e.target as HTMLElement | null;
      if (!hedef?.closest('.bn-term')) return;
      // Popover'a ya da başka bir term'e geçiyorsa kapatma
      const related = e.relatedTarget as HTMLElement | null;
      if (related?.closest('.sozluk-popover') || related?.closest('.bn-term')) return;
      kapatTimer();
    };

    const handleClick = (e: MouseEvent) => {
      const hedef = e.target as HTMLElement | null;
      const terim = hedef?.closest<HTMLElement>('.bn-term');
      if (terim) {
        e.preventDefault();
        e.stopPropagation();
        // Terimin görünen metninden slug türet; yayındaki bir sözlük terimiyse
        // tooltip yerine geniş mevzuat panelini aç.
        const slug = slugUret((terim.textContent ?? '').trim());
        if (slug && sluglarRef.current.has(slug)) {
          kapatHemen();
          window.dispatchEvent(new CustomEvent('mevzuat-ac', { detail: { slug } }));
          return;
        }
        acTimer(terim, true);
        return;
      }
      // Popover dışına tıklama → kapat
      if (
        document.querySelector('.sozluk-popover') &&
        !hedef?.closest('.sozluk-popover')
      ) {
        kapatHemen();
      }
    };

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') kapatHemen();
    };

    document.addEventListener('mouseover', handleMouseOver);
    document.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      document.removeEventListener('mouseout', handleMouseOut);
      document.removeEventListener('click', handleClick, true);
      document.removeEventListener('keydown', handleEsc);
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  // Popover üzerine fare gelirse hide timer'ı iptal et
  const popoverEnter = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  };
  const popoverLeave = () => {
    if (sabitRef.current) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      setPopover(null);
      sabitRef.current = false;
    }, 100);
  };

  if (!popover) return null;

  const maxX = window.scrollX + window.innerWidth - 300 - 16;
  const xClamped = Math.min(popover.x, Math.max(16, maxX));

  return (
    <div
      className="sozluk-popover absolute z-50 max-w-[300px] bg-surface border border-line-strong rounded-xl shadow-lg px-4 py-3"
      style={{ top: popover.y, left: xClamped }}
      role="tooltip"
      onMouseEnter={popoverEnter}
      onMouseLeave={popoverLeave}
    >
      <p className="text-[13px] text-ink-soft leading-relaxed">
        {popover.aciklama}
      </p>
    </div>
  );
};
