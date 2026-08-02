import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';

interface Props {
  baslik: string;
  /** Başlığın altındaki kısa açıklama / sayaç (opsiyonel) */
  aciklama?: ReactNode;
  /** Sağa yaslı aksiyon(lar) — buton vb. (opsiyonel) */
  aksiyon?: ReactNode;
  /** Üstte geri dön bağlantısı (opsiyonel) */
  geriDon?: { to: string; etiket: string };
}

/**
 * Tüm admin sayfalarında ortak başlık bloğu.
 * Sol: başlık + açıklama · Sağ: aksiyon(lar). Altında ince ayraç.
 */
export const AdminSayfaBaslik = ({ baslik, aciklama, aksiyon, geriDon }: Props) => (
  <div className="mb-6">
    {geriDon && (
      <Link
        to={geriDon.to}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-mute hover:text-ink font-semibold mb-3"
      >
        <Icon name="ArrowLeft" size={13} />
        {geriDon.etiket}
      </Link>
    )}
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-tight">{baslik}</h1>
        {aciklama != null && aciklama !== '' && (
          <p className="text-sm text-ink-soft font-medium mt-1">{aciklama}</p>
        )}
      </div>
      {aksiyon && <div className="flex items-center gap-2 flex-shrink-0">{aksiyon}</div>}
    </div>
    <div className="hairline mt-5" />
  </div>
);
