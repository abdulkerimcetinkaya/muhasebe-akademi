import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { supabase } from '../../lib/supabase';
import { useHasAdminRol } from '../../contexts/AuthContext';
import { bakimModuGetir, bakimModuAyarla } from '../../lib/bakim';

interface Sayilar {
  toplam: number;
  taslak: number;
  inceleme: number;
  onayli: number;
  arsiv: number;
  kullanici: number;
  hata: number;
  katkici: number;
}

const baslangic: Sayilar = {
  toplam: 0,
  taslak: 0,
  inceleme: 0,
  onayli: 0,
  arsiv: 0,
  kullanici: 0,
  hata: 0,
  katkici: 0,
};

export const AdminAnaSayfa = () => {
  const [s, setS] = useState<Sayilar>(baslangic);
  const [yukleniyor, setYukleniyor] = useState(true);

  // Site bakım/çok-yakında modu — yalnızca super admin
  const superAdmin = useHasAdminRol('super');
  const [bakim, setBakim] = useState<boolean | null>(null);
  const [bakimKaydediliyor, setBakimKaydediliyor] = useState(false);
  const [bakimHata, setBakimHata] = useState(false);

  useEffect(() => {
    if (!superAdmin) return;
    bakimModuGetir()
      .then(setBakim)
      .catch(() => setBakim(false));
  }, [superAdmin]);

  const bakimToggle = async () => {
    if (bakim === null || bakimKaydediliyor) return;
    const yeni = !bakim;
    setBakim(yeni);
    setBakimKaydediliyor(true);
    setBakimHata(false);
    try {
      await bakimModuAyarla(yeni);
    } catch {
      setBakim(!yeni);
      setBakimHata(true);
    } finally {
      setBakimKaydediliyor(false);
    }
  };

  useEffect(() => {
    const yukle = async () => {
      const [toplamR, taslakR, incelemeR, onayliR, arsivR, kullaniciR, hataR, katkiciR] =
        await Promise.all([
          supabase.from('sorular').select('id', { count: 'exact', head: true }),
          supabase.from('sorular').select('id', { count: 'exact', head: true }).eq('durum', 'taslak'),
          supabase.from('sorular').select('id', { count: 'exact', head: true }).eq('durum', 'inceleme'),
          supabase.from('sorular').select('id', { count: 'exact', head: true }).eq('durum', 'onayli'),
          supabase.from('sorular').select('id', { count: 'exact', head: true }).eq('durum', 'arsiv'),
          supabase.from('kullanicilar').select('id', { count: 'exact', head: true }).eq('admin_only', false),
          supabase.from('soru_hatalari').select('id', { count: 'exact', head: true }).eq('durum', 'acik'),
          supabase.from('katkici_basvurulari').select('id', { count: 'exact', head: true }).eq('durum', 'beklemede'),
        ]);
      setS({
        toplam: toplamR.count ?? 0,
        taslak: taslakR.count ?? 0,
        inceleme: incelemeR.count ?? 0,
        onayli: onayliR.count ?? 0,
        arsiv: arsivR.count ?? 0,
        kullanici: kullaniciR.count ?? 0,
        hata: hataR.count ?? 0,
        katkici: katkiciR.count ?? 0,
      });
      setYukleniyor(false);
    };
    yukle().catch((e) => {
      console.error('Admin istatistik', e);
      setYukleniyor(false);
    });
  }, []);

  const g = (n: number) => (yukleniyor ? '—' : n);

  // Aksiyon bekleyenler
  const aksiyonlar = [
    {
      sayi: s.hata,
      etiket: 'Açık hata bildirimi',
      to: '/admin/hatalar',
      icon: 'AlertCircle',
      renk: 'danger',
    },
    {
      sayi: s.katkici,
      etiket: 'Bekleyen katkıcı başvurusu',
      to: '/admin/katkicilar',
      icon: 'BadgeCheck',
      renk: 'premium',
    },
    {
      sayi: s.taslak + s.inceleme,
      etiket: 'Yayına hazır olmayan soru',
      to: '/admin/sorular',
      icon: 'Edit3',
      renk: 'brand',
    },
  ].filter((a) => yukleniyor || a.sayi > 0);

  // Hızlı işlemler
  const islemler = [
    { etiket: 'Yeni Soru', to: '/admin/sorular/yeni', icon: 'PlusCircle' },
    { etiket: 'Toplu Ekle', to: '/admin/sorular/toplu-ekle', icon: 'Upload' },
    { etiket: 'Bildirim Gönder', to: '/admin/bildirimler', icon: 'Megaphone' },
    { etiket: 'Hataları İncele', to: '/admin/hatalar', icon: 'AlertCircle' },
  ];

  const statKart = (etiket: string, sayi: number | string, icon: string, renk: string) => (
    <div className="bg-surface border border-line rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
          {etiket}
        </div>
        <Icon name={icon} size={16} className={renk} />
      </div>
      <div className="font-display text-3xl font-bold tracking-tight">{sayi}</div>
    </div>
  );

  const aksiyonRenk = (renk: string) =>
    renk === 'danger'
      ? 'border-danger/40 hover:border-danger bg-danger-soft/40'
      : renk === 'premium'
        ? 'border-premium/40 hover:border-premium bg-premium-soft/40'
        : 'border-brand/40 hover:border-brand bg-blue-soft/30';

  const aksiyonIkonRenk = (renk: string) =>
    renk === 'danger' ? 'text-danger' : renk === 'premium' ? 'text-premium-deep' : 'text-brand-deep';

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Genel Bakış</h1>
        <p className="text-sm text-ink-soft font-medium mb-8">
          İçeriği yönet, aksiyon bekleyenleri gör, hızlıca işlem yap.
        </p>

        {/* Site durumu — yalnızca super admin */}
        {superAdmin && (
          <section className="mb-8">
            <div
              className={`flex items-center gap-4 rounded-xl border px-5 py-4 transition-colors ${
                bakim
                  ? 'border-premium/50 bg-premium-soft/40'
                  : 'border-success/40 bg-success-soft/40'
              }`}
            >
              <Icon
                name={bakim ? 'Lock' : 'Globe'}
                size={20}
                className={bakim ? 'text-premium-deep' : 'text-success'}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-base tracking-tight">
                    Site {bakim === null ? '…' : bakim ? 'kapalı' : 'yayında'}
                  </span>
                  <span
                    className={`text-[9px] tracking-[0.2em] uppercase font-bold px-2 py-0.5 rounded ${
                      bakim ? 'bg-premium-soft text-premium-deep' : 'bg-success-soft text-success'
                    }`}
                  >
                    {bakim === null ? '—' : bakim ? 'Çok yakında' : 'Canlı'}
                  </span>
                </div>
                <p className="text-[13px] text-ink-soft font-medium mt-0.5">
                  {bakim
                    ? 'Ziyaretçiler "çok yakında" ekranını görüyor; sadece adminler siteyi kullanabiliyor. Kayıt/giriş açık.'
                    : 'Site herkese açık. Kapatırsan ziyaretçilere "çok yakında" ekranı gösterilir.'}
                  {bakimHata && (
                    <span className="text-danger font-semibold"> · Güncellenemedi, tekrar dene.</span>
                  )}
                </p>
              </div>
              {/* Switch */}
              <button
                type="button"
                role="switch"
                aria-checked={!!bakim}
                onClick={bakimToggle}
                disabled={bakim === null || bakimKaydediliyor}
                title={bakim ? 'Siteyi yayına al' : 'Siteyi kapat (çok yakında)'}
                className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${
                  bakim ? 'bg-premium' : 'bg-line-strong'
                }`}
              >
                <span
                  className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    bakim ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </section>
        )}

        {/* Aksiyon bekleyenler */}
        <section className="mb-8">
          <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-3">
            Aksiyon Bekleyenler
          </div>
          {aksiyonlar.length === 0 ? (
            <div className="flex items-center gap-2.5 bg-success-soft/50 border border-success/30 rounded-xl px-5 py-4 text-sm font-semibold text-success">
              <Icon name="CheckCircle2" size={16} />
              Her şey yolunda — bekleyen bir işlem yok.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {aksiyonlar.map((a) => (
                <Link
                  key={a.to + a.etiket}
                  to={a.to}
                  className={`flex items-center gap-4 border rounded-xl px-5 py-4 transition ${aksiyonRenk(a.renk)}`}
                >
                  <Icon name={a.icon} size={20} className={aksiyonIkonRenk(a.renk)} />
                  <div className="min-w-0 flex-1">
                    <div className="font-display text-2xl font-bold tracking-tight leading-none">
                      {g(a.sayi)}
                    </div>
                    <div className="text-[12px] text-ink-soft font-medium mt-1 truncate">
                      {a.etiket}
                    </div>
                  </div>
                  <Icon name="ArrowRight" size={16} className="text-ink-mute flex-shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Hızlı işlemler */}
        <section className="mb-8">
          <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-3">
            Hızlı İşlemler
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {islemler.map((i) => (
              <Link
                key={i.to + i.etiket}
                to={i.to}
                className="flex items-center gap-2.5 bg-surface border border-line hover:border-ink rounded-xl px-4 py-3 text-sm font-semibold transition active:scale-[0.99]"
              >
                <Icon name={i.icon} size={15} className="flex-shrink-0" />
                <span className="truncate">{i.etiket}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* İçerik istatistikleri */}
        <section className="mb-8">
          <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-3">
            İçerik
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statKart('Toplam Soru', g(s.toplam), 'FileText', 'text-ink-mute')}
            {statKart('Onaylı', g(s.onayli), 'CheckCircle2', 'text-success')}
            {statKart('Taslak', g(s.taslak), 'Edit3', 'text-premium')}
            {statKart('İnceleme', g(s.inceleme), 'Eye', 'text-brand')}
            {statKart('Arşiv', g(s.arsiv), 'Archive', 'text-ink-quiet')}
          </div>
        </section>

        {/* Topluluk */}
        <section>
          <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-3">
            Topluluk
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {statKart('Kullanıcı', g(s.kullanici), 'Users', 'text-brand')}
            <Link
              to="/admin/katkicilar"
              className="bg-surface border border-line hover:border-premium rounded-xl p-5 transition"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
                  Bekleyen Başvuru
                </div>
                <Icon name="BadgeCheck" size={16} className="text-premium" />
              </div>
              <div className="font-display text-3xl font-bold tracking-tight">{g(s.katkici)}</div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
};
