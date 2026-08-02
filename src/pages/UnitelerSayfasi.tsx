// İşletmeler ana sayfası — İşletme türü kartları, DB'den dinamik.
//
// Her işletme bir işletme türü kartı olarak çıkar. `aktif` bayrağı kullanıcının
// karta tıklayıp tıklayamayacağını belirler. Pasif kartlar "Yakında" rozetiyle
// görünür. Admin DB üzerinden aktif/pasif kontrol eder.

import { useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useUniteler } from '../contexts/UnitelerContext';

// İşletme ID → Lucide ikon eşlemesi. DB'deki thiings_icon alanı eski sistem
// için (Thiings 3D PNG'leri); kart görünümünde Lucide tercih ediyoruz.
const UNITE_ICON: Record<string, string> = {
  'mal-alis-satis': 'Store',
  'uretim-isletmesi': 'Factory',
  'hizmet-isletmesi': 'Briefcase',
  'insaat-taahhut': 'HardHat',
};

const ikonAdi = (uniteId: string, thiingsIcon: string | null): string => {
  if (UNITE_ICON[uniteId]) return UNITE_ICON[uniteId];
  // Fallback: thiings_icon alanı Lucide ikon adı olarak kullanılabilirse al
  // (örn. 'factory', 'briefcase') — capitalize et
  if (thiingsIcon) {
    return thiingsIcon.charAt(0).toUpperCase() + thiingsIcon.slice(1);
  }
  return 'Store';
};

export const UnitelerSayfasi = () => {
  const nav = useNavigate();
  const { uniteler } = useUniteler();

  // Sıraya göre listele (default sıra DB'den geliyor; aktif/pasif karışık)
  const sirali = [...uniteler].sort((a, b) => {
    // Önce aktif olanlar (yukarıda), sonra pasif olanlar
    if (a.aktif !== b.aktif) return a.aktif ? -1 : 1;
    return 0;
  });

  return (
    <main className="relative overflow-hidden">
      {/* HERO */}
      <header className="relative max-w-[1240px] mx-auto px-5 sm:px-8 pt-16 pb-10">
        <div className="font-mono text-[10.5px] tracking-[0.32em] uppercase text-ink-mute font-bold mb-4">
          İşletme türü seç
        </div>
        <h1
          className="font-display font-bold tracking-[-0.02em] text-ink leading-[0.95] max-w-[18ch]"
          style={{ fontSize: 'clamp(40px, 6vw, 80px)' }}
        >
          Hangi <span className="font-display-italic text-ink-soft font-normal">işletmeyle</span>{' '}
          başlamak istersin?
        </h1>
        <p
          className="font-display-italic text-ink-soft leading-snug max-w-[640px] mt-5"
          style={{ fontSize: 'clamp(14px, 1.2vw, 17px)' }}
        >
          Her işletme türü kendi senaryolarına, hesap planına ve özel kayıt akışına sahiptir.
          Aktif olanlar üzerinde çalışmaya başlayabilirsin; diğerlerinin müfredatı hazırlanıyor.
        </p>
      </header>

      {/* İŞLETME TÜRÜ KARTLARI — DB'den dinamik */}
      <section className="relative max-w-[1240px] mx-auto px-5 sm:px-8 pb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {sirali.map((u, i) => {
            const pasif = !u.aktif;
            return (
              <button
                key={u.id}
                onClick={() => !pasif && nav(`/isletmeler/${u.id}?overview=1`)}
                disabled={pasif}
                className={`relative text-left bg-surface border rounded-2xl p-5 transition group min-h-[200px] flex flex-col justify-between ${
                  pasif
                    ? 'border-line opacity-60 cursor-not-allowed'
                    : 'border-line hover:border-ink hover:-translate-y-0.5 hover:shadow-[0_10px_28px_-14px_rgba(15,23,42,0.4)] active:scale-[0.99]'
                }`}
              >
                {!pasif && (
                  <span
                    className="absolute left-0 top-5 bottom-5 w-[3px] bg-brand-deep rounded-r opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden
                  />
                )}

                <div className="flex items-start justify-between">
                  <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-ink-quiet font-bold">
                    {String(i + 1).padStart(2, '0')} / {String(sirali.length).padStart(2, '0')}
                  </span>
                  <Icon
                    name={ikonAdi(u.id, u.thiingsIcon)}
                    size={22}
                    className={pasif ? 'text-ink-quiet' : 'text-ink'}
                  />
                </div>

                <div className="mt-6">
                  <h3
                    className="font-display font-bold tracking-tight leading-[1.1] text-ink"
                    style={{ fontSize: 'clamp(18px, 1.6vw, 22px)' }}
                  >
                    {u.ad}
                  </h3>
                  <p className="text-[12.5px] text-ink-mute leading-snug mt-1.5 font-medium line-clamp-3">
                    {u.aciklama}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between">
                  {pasif ? (
                    <span className="font-mono text-[9.5px] tracking-[0.22em] uppercase font-bold text-premium-deep inline-flex items-center gap-1.5 bg-premium-soft/60 px-2 py-1 rounded">
                      <Icon name="Lock" size={10} />
                      Yakında
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] tracking-[0.22em] uppercase font-bold text-ink-mute inline-flex items-center gap-1.5 group-hover:text-brand-deep transition-colors">
                      Modülleri Aç
                      <Icon name="ArrowRight" size={11} />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {sirali.length === 0 && (
          <div className="bg-surface border border-dashed border-line-strong rounded-2xl px-6 py-16 text-center">
            <p className="text-sm text-ink-mute">
              Henüz işletme türü eklenmemiş. Admin panelinden ekleyebilirsin.
            </p>
          </div>
        )}
      </section>
    </main>
  );
};
