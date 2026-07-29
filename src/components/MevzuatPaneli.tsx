import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { MevzuatGovde } from './MevzuatGovde';
import { sozlukTerimYukle, type SozlukTerimi } from '../lib/sozluk';

/**
 * Ders metnindeki bir terime (span.bn-term[data-slug]) tıklanınca sağdan açılan
 * çekmece. İçerik: terim tanımı → "Kanun ne diyor?" (maddeler, lafzıyla) →
 * "Özet / Pratik". SozlukPopover, data-slug'lı bir terim tıklanınca
 * `mevzuat-ac` custom event'i ile bu paneli tetikler.
 *
 * Not: prod'da bu bileşen yoksa (deploy gecikmesi) terim yalnızca hover
 * tooltip'i gösterir — kademeli iyileştirme, kırılma yok.
 */
export const MevzuatPaneli = () => {
  const navigate = useNavigate();
  const [slug, setSlug] = useState<string | null>(null);
  const [terim, setTerim] = useState<SozlukTerimi | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);

  useEffect(() => {
    const ac = (e: Event) => {
      const detay = (e as CustomEvent<{ slug: string }>).detail;
      if (detay?.slug) setSlug(detay.slug);
    };
    window.addEventListener('mevzuat-ac', ac as EventListener);
    return () => window.removeEventListener('mevzuat-ac', ac as EventListener);
  }, []);

  useEffect(() => {
    if (!slug) return;
    let iptal = false;
    setYukleniyor(true);
    setTerim(null);
    sozlukTerimYukle(slug)
      .then((t) => {
        if (!iptal) setTerim(t);
      })
      .catch(() => {})
      .finally(() => {
        if (!iptal) setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSlug(null);
    };
    window.addEventListener('keydown', h);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [slug]);

  if (!slug) return null;

  return (
    <div className="mvz-overlay" onClick={() => setSlug(null)}>
      <aside className="mvz-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Mevzuat">
        <div className="mvz-ust">
          <span className="mvz-etiket">Sözlük · Mevzuat</span>
          <button className="mvz-kapat" onClick={() => setSlug(null)} aria-label="Kapat">
            <Icon name="X" size={18} />
          </button>
        </div>

        {yukleniyor && <div className="mvz-yukleniyor">Yükleniyor…</div>}

        {!yukleniyor && !terim && (
          <div className="mvz-yukleniyor">Bu terim için içerik bulunamadı.</div>
        )}

        {terim && (
          <div className="mvz-govde">
            <h2 className="mvz-baslik">{terim.baslik}</h2>
            {terim.kisa_aciklama && <p className="mvz-kisa">{terim.kisa_aciklama}</p>}
            {terim.uzun_icerik && <p className="mvz-uzun">{terim.uzun_icerik}</p>}

            <MevzuatGovde mevzuat={terim.mevzuat} />

            <button
              type="button"
              className="mvz-tam"
              onClick={() => {
                const s = terim.slug;
                setSlug(null);
                navigate(`/sozluk/${s}`);
              }}
            >
              Sözlükte tam sayfada aç
              <Icon name="ArrowRight" size={15} />
            </button>
            <p className="mvz-uyari">
              Kanun metinleri bilgilendirme amaçlıdır; güncel mevzuatı esas alın.
            </p>
          </div>
        )}
      </aside>
    </div>
  );
};
