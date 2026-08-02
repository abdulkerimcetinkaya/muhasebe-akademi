import { Icon } from './Icon';
import { paraFormat } from '../lib/format';
import { useEsc } from '../lib/hooks/use-esc';
import { THesaplari, hesapAdBul } from './THesabi';
import type { Soru } from '../types';

interface Props {
  soru: Soru;
  onKapat: () => void;
}

// Hesap sınıfı + tarafından kısa gerekçe türet (Altın Kurallar mantığı)
const satirGerekce = (kod: string, borc: number): string => {
  const borcTarafi = borc > 0;
  const s = kod.charAt(0);
  const iki = kod.slice(0, 2);
  if (kod.startsWith('191')) return 'Alışta yüklenilen KDV indirilir → borç';
  if (kod.startsWith('391')) return 'Satışta hesaplanan KDV → alacak';
  if (s === '1' || s === '2')
    return borcTarafi ? 'Varlık (aktif) arttı → borç' : 'Varlık azaldı → alacak';
  if (s === '3' || s === '4')
    return borcTarafi
      ? 'Yükümlülük azaldı / ödendi → borç'
      : 'Yükümlülük (kaynak) arttı → alacak';
  if (s === '5')
    return borcTarafi ? 'Özkaynak azaldı → borç' : 'Özkaynak arttı → alacak';
  if (s === '6') {
    const gelir = ['60', '64', '67'].includes(iki);
    if (gelir) return 'Gelir doğdu → alacak';
    return borcTarafi ? 'Gider oluştu → borç' : 'Gider düzeltmesi → alacak';
  }
  if (s === '7')
    return borcTarafi ? 'Maliyet / gider → borç' : 'Maliyet yansıtma → alacak';
  return borcTarafi ? 'Borç tarafına yazılır' : 'Alacak tarafına yazılır';
};

export const CozumModal = ({ soru, onKapat }: Props) => {
  useEsc(onKapat);
  const toplamBorc = soru.cozum.reduce((a, k) => a + (+k.borc || 0), 0);
  const toplamAlacak = soru.cozum.reduce((a, k) => a + (+k.alacak || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4"
      onClick={onKapat}
    >
      <div
        className="bg-bg-tint max-w-3xl w-full max-h-[90vh] overflow-auto rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-bg-tint border-b border-ink/10 px-8 py-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-1 font-bold">
              Resmi Çözüm
            </div>
            <div className="font-display text-2xl tracking-tight font-bold">{soru.baslik}</div>
          </div>
          <button
            onClick={onKapat}
            className="text-ink-mute hover:text-ink"
          >
            <Icon name="X" size={20} />
          </button>
        </div>
        <div className="p-8">
          {/* T-Hesabı görünümü — kaydın büyük deftere yansıması */}
          <div className="mb-6">
            <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-3 font-bold">
              T-Hesabı Görünümü
            </div>
            <THesaplari satirlar={soru.cozum} />
          </div>

          <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-2 font-bold">
            Yevmiye Kaydı
          </div>
          <div className="bg-surface border border-ink/20 mb-6 rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-ink/20 bg-bg-tint text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
              <div className="col-span-2">Kod</div>
              <div className="col-span-5">Hesap</div>
              <div className="col-span-2 text-right">Borç</div>
              <div className="col-span-3 text-right">Alacak</div>
            </div>
            {soru.cozum.map((k, i) => {
              const ad = hesapAdBul(k.kod);
              return (
                <div key={i} className="border-b border-ink/5">
                  <div className="grid grid-cols-12 gap-2 px-4 pt-3 pb-1 text-sm">
                    <div className="col-span-2 font-mono font-bold">{k.kod}</div>
                    <div className="col-span-5 font-medium">{ad}</div>
                    <div className="col-span-2 text-right font-mono font-semibold">
                      {k.borc > 0 ? paraFormat(k.borc) : ''}
                    </div>
                    <div className="col-span-3 text-right font-mono font-semibold">
                      {k.alacak > 0 ? paraFormat(k.alacak) : ''}
                    </div>
                  </div>
                  <div className="px-4 pb-2.5 flex items-center gap-1.5 text-[11px] text-ink-mute">
                    <Icon name="ArrowRight" size={10} className="flex-shrink-0" />
                    <span className="italic">{satirGerekce(k.kod, k.borc)}</span>
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-bg-tint font-mono text-sm">
              <div className="col-span-7 text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                Toplam
              </div>
              <div className="col-span-2 text-right font-bold">{paraFormat(toplamBorc)}</div>
              <div className="col-span-3 text-right font-bold">{paraFormat(toplamAlacak)}</div>
            </div>
          </div>
          <div className="border-l-4 border-ink pl-5 py-1">
            <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-2 font-bold">
              Açıklama
            </div>
            <p className="leading-relaxed font-medium whitespace-pre-line">{soru.aciklama}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
