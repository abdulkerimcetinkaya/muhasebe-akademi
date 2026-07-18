import { Icon } from './Icon';

type AnimateKind = 'float' | 'float-2' | 'float-3' | 'float-4' | null;

interface Props {
  name: string;
  size?: number;
  className?: string;
  animate?: AnimateKind;
}

/**
 * Eski Thiings 3D PNG ikonları yerine Lucide thin-line ikonlar.
 * Aynı API: <Thiings name="kasa" size={48} />.
 * `animate` prop kabul ediliyor ama elite tasarımda hareket yok (no-op).
 */

const ICON_MAP: Record<string, string> = {
  // Yeni 15 işletme (Yevmiye Kayıt Müfredatı)
  acilis: 'Rocket',
  'hazir-degerler': 'Wallet',
  'mal-alis': 'Package',
  'mal-satis': 'Banknote',
  'ticari-alacaklar': 'FileSignature',
  'ticari-borclar': 'Receipt',
  kdv: 'Percent',
  personel: 'Users',
  mdv: 'Package',
  amortisman: 'TrendingDown',
  'reeskont-karsilik': 'Hourglass',
  'stok-degerleme': 'Archive',
  'yabanci-kaynaklar': 'Landmark',
  'gelir-tablosu': 'BarChart3',
  'donem-sonu-kapanis': 'CalendarCheck',

  // UI / dekoratif
  calculator: 'Calculator',
  rocket: 'Rocket',
  trophy: 'Trophy',
  chart: 'BarChart3',
  dolar: 'DollarSign',
  tl: 'Banknote',
  euro: 'Euro',
  yen: 'JapaneseYen',
};

export const Thiings = ({ name, size = 48, className = '' }: Props) => {
  const lucide = ICON_MAP[name] ?? 'Square';
  // İkon iç boyutu: tile'ın ~%48'i — refined oran
  const inner = Math.max(14, Math.round(size * 0.48));
  const radius = size <= 28 ? 6 : size <= 44 ? 8 : size <= 80 ? 10 : 14;

  return (
    <span
      className={`thiings-tile ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
      aria-label={name}
    >
      <Icon name={lucide} size={inner} />
    </span>
  );
};
