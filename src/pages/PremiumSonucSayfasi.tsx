import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { Thiings } from '../components/Thiings';
import { useAuth } from '../contexts/AuthContext';

// İyzico callback Edge Function bizi bu sayfaya yönlendirir.
// Query: ?durum=basarili | hata | iptal & detay=... & adet=N (kurum bulk için)
type SyncDurum = 'yukleniyor' | 'tamam' | 'hata';

const KURUM_EMAIL = 'kurum@muhasebeakademi.com';

export const PremiumSonucSayfasi = () => {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { user, premiumYenile } = useAuth();
  const durum = (params.get('durum') ?? 'hata') as 'basarili' | 'hata' | 'iptal';
  const detay = params.get('detay');
  const adet = Math.max(1, parseInt(params.get('adet') ?? '1', 10) || 1);
  const isBulk = adet > 1;
  const [syncDurum, setSyncDurum] = useState<SyncDurum>('yukleniyor');

  useEffect(() => {
    if (durum !== 'basarili') {
      setSyncDurum('tamam');
      return;
    }
    let aktif = true;
    setSyncDurum('yukleniyor');
    premiumYenile()
      .then(() => {
        if (aktif) setSyncDurum('tamam');
      })
      .catch(() => {
        if (aktif) setSyncDurum('hata');
      });
    return () => {
      aktif = false;
    };
  }, [durum, premiumYenile]);

  const yenidenDene = () => {
    setSyncDurum('yukleniyor');
    premiumYenile()
      .then(() => setSyncDurum('tamam'))
      .catch(() => setSyncDurum('hata'));
  };

  if (durum === 'basarili') {
    // Bulk/kurum ödeme: öğrenci listesini admin'e ileten mailto
    const bulkMailtoBody = `Merhaba,

MuhasebeAkademi kurum Premium ödememi tamamladım — ${adet} kullanıcı için.
Aşağıdaki öğrencilere Premium tanımlanmasını rica ederim:

(öğrenci email'lerini her satıra bir tane yapıştırın)
1. ad.soyad@example.com
2. ...

Ödeme yapan: ${user?.email ?? '—'}

Teşekkürler.`;
    const bulkMailto = `mailto:${KURUM_EMAIL}?subject=${encodeURIComponent(
      `Kurum Premium öğrenci listesi — ${adet} kullanıcı`,
    )}&body=${encodeURIComponent(bulkMailtoBody)}`;

    return (
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-premium-soft to-premium-soft mb-6">
          <Thiings name="trophy" size={48} />
        </div>
        <div className="text-[10px] tracking-[0.3em] uppercase text-premium-deep font-bold mb-3">
          Ödeme Başarılı
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight font-bold mb-4">
          {isBulk ? `${adet} kullanıcı için Premium alındı` : 'Premium üyeliğin aktif'}
        </h1>
        <p className="text-lg text-ink-soft leading-relaxed font-medium mb-6">
          {isBulk
            ? 'Ödeme tamamlandı. Premium erişimi tanımlamak için öğrenci listesini gönder.'
            : 'AI yanlış analizi, sınırsız asistan ve hesap kodu otomatik tamamlama kullanıma hazır.'}
        </p>

        {syncDurum === 'yukleniyor' && (
          <div className="inline-flex items-center gap-2 text-sm text-ink-mute font-medium mb-6">
            <Icon name="Loader2" size={14} className="animate-spin" />
            Üyelik bilgileri senkronlanıyor…
          </div>
        )}

        {syncDurum === 'hata' && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-premium-soft border border-premium-soft text-left">
            <div className="flex items-start gap-3">
              <Icon
                name="AlertCircle"
                size={18}
                className="text-premium-deep flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-premium-deep dark:text-premium-soft mb-1">
                  Üyelik bilgilerin senkronlanamadı
                </div>
                <div className="text-xs text-premium-deep dark:text-premium-soft/80 font-medium leading-relaxed mb-3">
                  Ödemen başarılı, fakat tarayıcına aktarılamadı. Premium özellikleri kullanmak
                  için yenile.
                </div>
                <button
                  onClick={yenidenDene}
                  className="inline-flex items-center gap-1.5 text-xs tracking-[0.2em] uppercase font-bold text-premium-deep dark:text-premium-soft bg-premium-soft/80 hover:bg-premium px-3 py-1.5 rounded-lg transition"
                >
                  <Icon name="RefreshCw" size={12} />
                  Yeniden Dene
                </button>
              </div>
            </div>
          </div>
        )}

        {isBulk && (
          <div className="max-w-md mx-auto mb-6 p-5 rounded-2xl bg-premium-soft border border-premium-soft text-left">
            <div className="flex items-start gap-3">
              <Icon
                name="Mail"
                size={20}
                className="text-premium-deep flex-shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <div className="font-display text-base font-bold text-premium-deep dark:text-premium-soft mb-1">
                  Öğrenci listeni gönder
                </div>
                <div className="text-[13px] text-premium-deep dark:text-premium-soft/90 font-medium leading-relaxed mb-4">
                  Premium’u tanımlayabilmemiz için <strong>{adet}</strong>{' '}
                  öğrencinin email adresini bize ileti olarak gönder. 1 iş günü
                  içinde her hesaba Premium tanımlanır.
                </div>
                <a
                  href={bulkMailto}
                  className="inline-flex items-center gap-2 bg-premium hover:bg-premium text-ink px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg transition"
                >
                  <Icon name="Mail" size={12} />
                  Öğrenci Listesi Hazırla
                </a>
                <div className="mt-2.5 text-[11px] text-premium-deep/80 font-mono">
                  {KURUM_EMAIL}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => nav(isBulk ? '/profil' : '/problemler')}
            className="inline-flex items-center gap-2 bg-ink text-bg px-6 py-3 text-xs tracking-[0.2em] uppercase font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition"
          >
            <Icon name={isBulk ? 'User' : 'ListChecks'} size={14} />
            {isBulk ? 'Profilim' : 'Soru Çöz'}
          </button>
          {!isBulk && (
            <Link
              to="/profil"
              className="inline-flex items-center gap-2 border border-line-strong px-6 py-3 text-xs tracking-[0.2em] uppercase font-bold rounded-xl hover:bg-surface-2 transition"
            >
              <Icon name="User" size={14} />
              Profilim
            </Link>
          )}
        </div>
      </main>
    );
  }

  const baslik = durum === 'iptal' ? 'Ödeme iptal edildi' : 'Ödeme tamamlanamadı';
  const mesaj =
    durum === 'iptal'
      ? 'Ödeme akışını iptal ettin. Hazır olduğunda yeniden deneyebilirsin.'
      : 'Bir aksilik oldu. Kart bilgilerini kontrol edip tekrar dene; ücret kesildiyse otomatik olarak iade edilecek.';

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 py-16 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-surface-2 mb-6">
        <Icon name="AlertTriangle" size={36} className="text-ink-soft" />
      </div>
      <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold mb-3">
        Ödeme {durum === 'iptal' ? 'İptal' : 'Hata'}
      </div>
      <h1 className="font-display text-3xl md:text-4xl tracking-tight font-bold mb-4">{baslik}</h1>
      <p className="text-base text-ink-soft leading-relaxed font-medium mb-2">
        {mesaj}
      </p>
      {detay && (
        <p className="text-xs text-ink-mute font-mono mb-6 bg-surface-2 inline-block px-3 py-1.5 rounded-lg">
          {detay}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
        <button
          onClick={() => nav('/premium')}
          className="inline-flex items-center gap-2 bg-ink text-bg px-6 py-3 text-xs tracking-[0.2em] uppercase font-bold rounded-xl hover:opacity-90 active:scale-[0.98] transition"
        >
          <Icon name="RefreshCw" size={14} />
          Yeniden Dene
        </button>
        <Link
          to="/"
          className="inline-flex items-center gap-2 border border-line-strong px-6 py-3 text-xs tracking-[0.2em] uppercase font-bold rounded-xl hover:bg-surface-2 transition"
        >
          <Icon name="Home" size={14} />
          Ana Sayfa
        </Link>
      </div>
    </main>
  );
};
