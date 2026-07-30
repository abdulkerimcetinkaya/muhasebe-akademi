import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { SiteLoader } from './components/SiteLoader';
import { ProtectedAdminRoute } from './components/ProtectedAdminRoute';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RozetToast } from './components/RozetToast';
import { HesapPlaniModal } from './components/HesapPlaniModal';
import { HesapPlaniYanPanel } from './components/HesapPlaniYanPanel';

// Tüm route sayfaları lazy — initial JS bundle'ı 1MB+ küçülüyor (BlockNote pulled by
// UniteSayfasi/SoruEkrani/KonuSayfasi yalnızca o route'a girince yüklenir).
const AnaSayfa = lazy(() => import('./pages/AnaSayfa').then((m) => ({ default: m.AnaSayfa })));
const ProblemlerSayfasi = lazy(() => import('./pages/ProblemlerSayfasi').then((m) => ({ default: m.ProblemlerSayfasi })));
const SoruEkrani = lazy(() => import('./pages/SoruEkrani').then((m) => ({ default: m.SoruEkrani })));
const UnitelerSayfasi = lazy(() => import('./pages/UnitelerSayfasi').then((m) => ({ default: m.UnitelerSayfasi })));
const UniteSayfasi = lazy(() => import('./pages/UniteSayfasi').then((m) => ({ default: m.UniteSayfasi })));

const GirisSayfasi = lazy(() => import('./pages/GirisSayfasi').then((m) => ({ default: m.GirisSayfasi })));
const SifreSifirlaSayfasi = lazy(() => import('./pages/SifreSifirlaSayfasi').then((m) => ({ default: m.SifreSifirlaSayfasi })));
const SifreYenileSayfasi = lazy(() => import('./pages/SifreYenileSayfasi').then((m) => ({ default: m.SifreYenileSayfasi })));
const PremiumSayfasi = lazy(() => import('./pages/PremiumSayfasi').then((m) => ({ default: m.PremiumSayfasi })));
const PremiumSonucSayfasi = lazy(() => import('./pages/PremiumSonucSayfasi').then((m) => ({ default: m.PremiumSonucSayfasi })));
const KurumOdemeSayfasi = lazy(() => import('./pages/KurumOdemeSayfasi').then((m) => ({ default: m.KurumOdemeSayfasi })));
const ProfilSayfasi = lazy(() => import('./pages/ProfilSayfasi').then((m) => ({ default: m.ProfilSayfasi })));
const KvkkSayfasi = lazy(() => import('./pages/KvkkSayfasi').then((m) => ({ default: m.KvkkSayfasi })));
const KarneStubSayfasi = lazy(() => import('./pages/KarneStubSayfasi').then((m) => ({ default: m.KarneStubSayfasi })));
const LiderlikSayfasi = lazy(() => import('./pages/LiderlikSayfasi').then((m) => ({ default: m.LiderlikSayfasi })));
const AdminAnaSayfa = lazy(() => import('./pages/admin/AdminAnaSayfa').then((m) => ({ default: m.AdminAnaSayfa })));
const AdminSorularSayfasi = lazy(() => import('./pages/admin/AdminSorularSayfasi').then((m) => ({ default: m.AdminSorularSayfasi })));
const AdminYeniSoruSayfasi = lazy(() => import('./pages/admin/AdminYeniSoruSayfasi').then((m) => ({ default: m.AdminYeniSoruSayfasi })));
const AdminDuzenleSoruSayfasi = lazy(() => import('./pages/admin/AdminDuzenleSoruSayfasi').then((m) => ({ default: m.AdminDuzenleSoruSayfasi })));
const AdminTopluEkleSayfasi = lazy(() => import('./pages/admin/AdminTopluEkleSayfasi').then((m) => ({ default: m.AdminTopluEkleSayfasi })));
const AdminHatalarSayfasi = lazy(() => import('./pages/admin/AdminHatalarSayfasi').then((m) => ({ default: m.AdminHatalarSayfasi })));
const AdminUnitelerSayfasi = lazy(() => import('./pages/admin/AdminUnitelerSayfasi').then((m) => ({ default: m.AdminUnitelerSayfasi })));
const AdminIcerikSayfasi = lazy(() => import('./pages/admin/AdminIcerikSayfasi').then((m) => ({ default: m.AdminIcerikSayfasi })));
const AdminKonularSayfasi = lazy(() => import('./pages/admin/AdminKonularSayfasi').then((m) => ({ default: m.AdminKonularSayfasi })));
const AdminKonuIcerikSayfasi = lazy(() => import('./pages/admin/AdminKonuIcerikSayfasi').then((m) => ({ default: m.AdminKonuIcerikSayfasi })));
const AdminModullerSayfasi = lazy(() => import('./pages/admin/AdminModullerSayfasi').then((m) => ({ default: m.AdminModullerSayfasi })));
const AdminModulIcerikSayfasi = lazy(() => import('./pages/admin/AdminModulIcerikSayfasi').then((m) => ({ default: m.AdminModulIcerikSayfasi })));
const AdminAltBasliklarSayfasi = lazy(() => import('./pages/admin/AdminAltBasliklarSayfasi').then((m) => ({ default: m.AdminAltBasliklarSayfasi })));
const AdminAltBaslikIcerikSayfasi = lazy(() => import('./pages/admin/AdminAltBaslikIcerikSayfasi').then((m) => ({ default: m.AdminAltBaslikIcerikSayfasi })));
const AdminAtolyeSorulariSayfasi = lazy(() => import('./pages/admin/AdminAtolyeSorulariSayfasi').then((m) => ({ default: m.AdminAtolyeSorulariSayfasi })));
const AdminMevzuatSayfasi = lazy(() => import('./pages/admin/AdminMevzuatSayfasi').then((m) => ({ default: m.AdminMevzuatSayfasi })));
const AdminBildirimlerSayfasi = lazy(() => import('./pages/admin/AdminBildirimlerSayfasi').then((m) => ({ default: m.AdminBildirimlerSayfasi })));
const AdminSozlukSayfasi = lazy(() => import('./pages/admin/AdminSozlukSayfasi').then((m) => ({ default: m.AdminSozlukSayfasi })));
const AdminMuavinHesaplarSayfasi = lazy(() => import('./pages/admin/AdminMuavinHesaplarSayfasi').then((m) => ({ default: m.AdminMuavinHesaplarSayfasi })));
const AdminKullanicilarSayfasi = lazy(() => import('./pages/admin/AdminKullanicilarSayfasi').then((m) => ({ default: m.AdminKullanicilarSayfasi })));
const AdminKullaniciDetaySayfasi = lazy(() => import('./pages/admin/AdminKullaniciDetaySayfasi').then((m) => ({ default: m.AdminKullaniciDetaySayfasi })));
const AdminYetkilileriSayfasi = lazy(() => import('./pages/admin/AdminYetkilileriSayfasi').then((m) => ({ default: m.AdminYetkilileriSayfasi })));
const AdminIstatistiklerSayfasi = lazy(() => import('./pages/admin/AdminIstatistiklerSayfasi').then((m) => ({ default: m.AdminIstatistiklerSayfasi })));
const AdminKatkicilarSayfasi = lazy(() => import('./pages/admin/AdminKatkicilarSayfasi').then((m) => ({ default: m.AdminKatkicilarSayfasi })));
const AdminIndirimKodlariSayfasi = lazy(() => import('./pages/admin/AdminIndirimKodlariSayfasi').then((m) => ({ default: m.AdminIndirimKodlariSayfasi })));
const AdminLogSayfasi = lazy(() => import('./pages/admin/AdminLogSayfasi').then((m) => ({ default: m.AdminLogSayfasi })));
const AdminAIMaliyetSayfasi = lazy(() => import('./pages/admin/AdminAIMaliyetSayfasi').then((m) => ({ default: m.AdminAIMaliyetSayfasi })));
const KatkiciBasvuruSayfasi = lazy(() => import('./pages/KatkiciBasvuruSayfasi').then((m) => ({ default: m.KatkiciBasvuruSayfasi })));
const KatkiciSoruEkleSayfasi = lazy(() => import('./pages/KatkiciSoruEkleSayfasi').then((m) => ({ default: m.KatkiciSoruEkleSayfasi })));
const SozlukSayfasi = lazy(() => import('./pages/SozlukSayfasi').then((m) => ({ default: m.SozlukSayfasi })));
const SozlukTerimSayfasi = lazy(() => import('./pages/SozlukTerimSayfasi').then((m) => ({ default: m.SozlukTerimSayfasi })));
const KonuSayfasi = lazy(() => import('./pages/KonuSayfasi').then((m) => ({ default: m.KonuSayfasi })));
const ModulSayfasi = lazy(() => import('./pages/ModulSayfasi').then((m) => ({ default: m.ModulSayfasi })));
const AltBaslikSayfasi = lazy(() => import('./pages/AltBaslikSayfasi').then((m) => ({ default: m.AltBaslikSayfasi })));
const DashboardSayfasi = lazy(() => import('./pages/DashboardSayfasi').then((m) => ({ default: m.DashboardSayfasi })));
const MuhasebeyeGirisSayfasi = lazy(() => import('./pages/MuhasebeyeGirisSayfasi').then((m) => ({ default: m.MuhasebeyeGirisSayfasi })));
const KesfetSayfasi = lazy(() => import('./pages/KesfetSayfasi').then((m) => ({ default: m.KesfetSayfasi })));
const KesfetKartSayfasi = lazy(() => import('./pages/KesfetKartSayfasi').then((m) => ({ default: m.KesfetKartSayfasi })));
const KesfetItemSayfasi = lazy(() => import('./pages/KesfetItemSayfasi').then((m) => ({ default: m.KesfetItemSayfasi })));
const AdminKesfetSayfasi = lazy(() => import('./pages/admin/AdminKesfetSayfasi').then((m) => ({ default: m.AdminKesfetSayfasi })));
const AdminKesfetKartSayfasi = lazy(() => import('./pages/admin/AdminKesfetKartSayfasi').then((m) => ({ default: m.AdminKesfetKartSayfasi })));
const AdminKesfetItemIcerikSayfasi = lazy(() => import('./pages/admin/AdminKesfetItemIcerikSayfasi').then((m) => ({ default: m.AdminKesfetItemIcerikSayfasi })));

const SayfaYukleniyor = () => (
  <div className="min-h-[60vh] flex items-center justify-center text-ink-quiet text-sm">
    Yükleniyor…
  </div>
);
import { useAuth } from './contexts/AuthContext';
import { useUniteler } from './contexts/UnitelerContext';
import { ROZETLER } from './data/rozetler';
import { puanHesapla } from './data/sabitler';
import { bugununTarihi } from './lib/format';
import {
  ilerlemeKaydet,
  ilerlemeTemizle,
  ilerlemeYukle,
  istatistikHesapla,
  varsayilanIlerleme,
} from './lib/ilerleme';
import {
  gunlukGirisKaydetSupabase,
  ilerlemeYukleSupabase,
  profilKaydetSupabase,
  rozetKaydetSupabase,
  soruCozumKaydetSupabase,
  yanlisKaydetSupabase,
  type CozumYardim,
} from './lib/ilerleme-supabase';
import { supabase } from './lib/supabase';
import type { Ilerleme, Rozet, Soru } from './types';

/**
 * Recovery (şifre yenileme) guard.
 *
 * Onboarding flow tamamen kaldırıldı (kullanıcılar profil sayfasından
 * eğitim bilgilerini doldurabilir — bloklayıcı bir adım yok). Geride sadece
 * recovery yönlendirmesi kaldı: şifre sıfırlama linkine tıklayan kullanıcı
 * recovery oturumuyla giriş yapar; zorla /sifre-yenile sayfasına yönlendirilir.
 */
const RecoveryGuard = ({
  girisYapildi,
  oturumYukleniyor,
}: {
  girisYapildi: boolean;
  oturumYukleniyor: boolean;
}) => {
  const nav = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (oturumYukleniyor) return;
    if (!girisYapildi) return;
    if (sessionStorage.getItem('sifre_yenileme_modu') === '1') {
      if (pathname !== '/sifre-yenile') {
        nav('/sifre-yenile', { replace: true });
      }
    }
  }, [girisYapildi, oturumYukleniyor, pathname, nav]);
  return null;
};

// Route değişiminde sayfayı tepeye al — HashRouter scroll restoration default
// olarak browser'a bırakıyor, eski scroll konumu kalabiliyor.
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

/**
 * Catch-all route — hiçbir route eşleşmediğinde devreye girer.
 *
 * Supabase auth flow hatası (örn. süresi dolmuş şifre sıfırlama linki)
 * `https://muhasebeakademi.com/#/error=access_denied&error_code=otp_expired&...`
 * URL'iyle geri yönlendirir. HashRouter bu yolu route olarak match edemez,
 * burada yakalayıp kullanıcı dostu mesajla şifre sıfırlama sayfasına gönderiyoruz.
 *
 * Diğer eşleşmeyen URL'ler (typo, silinmiş sayfa) anasayfaya yönlendirilir.
 */
const RouteFallback = () => {
  const { pathname } = useLocation();
  if (pathname.startsWith('/error=')) {
    const params = new URLSearchParams(pathname.slice(1));
    const errorCode = params.get('error_code');
    let mesaj = 'Şifre sıfırlama linki geçersiz. Yeni bir link talep edebilirsin.';
    if (errorCode === 'otp_expired') {
      mesaj = 'Şifre sıfırlama linkinin süresi dolmuş. Yeni bir sıfırlama linki talep et.';
    } else if (errorCode === 'access_denied') {
      mesaj = 'Erişim reddedildi. Şifre sıfırlama linki geçersiz veya daha önce kullanılmış. Yeni bir link iste.';
    }
    return <Navigate to="/sifre-sifirla" replace state={{ supabaseError: mesaj }} />;
  }
  return <Navigate to="/" replace />;
};

const App = () => {
  const { user, yukleniyor: oturumYukleniyor } = useAuth();
  const {
    uniteler,
    tumSorular,
    yukleniyor: uniteYukleniyor,
    hata: uniteHata,
  } = useUniteler();
  const [ilerleme, setIlerleme] = useState<Ilerleme>(ilerlemeYukle);
  const [planAcik, setPlanAcik] = useState(false);
  const [yanPanelAcik, setYanPanelAcik] = useState(false);
  const [rozetKuyrugu, setRozetKuyrugu] = useState<Rozet[]>([]);
  const sonUserId = useRef<string | null>(null);
  const sonGirisKaydi = useRef<string | null>(null);
  /** Oturum içi ardışık doğru cevap sayacı — sayfa yenilenince sıfırlanır.
   *  Doğru cevap kutlamasında combo milestone'ları için kullanılır.
   *  useRef çünkü değişikliği render tetiklemiyor; SoruEkrani anlık değer
   *  okumak için getter prop alıyor. */
  const sessionComboRef = useRef(0);

  // Oturum durumu değişince veriyi doğru kaynaktan tekrar yükle.
  // Uniteler yüklenmeden ilerleme yüklenemez (zorluk lookup lazım).
  //
  // KRİTİK: Kullanıcı değişiminde (login/logout/farklı hesaba geçiş) önce
  // localStorage cache'i temizleriz. Aksi halde:
  //   - Önceki kullanıcının streak/puan/rozet'i UI'da kısa süre görünür
  //   - Daha kötüsü: localStorage'a yazılı eski veri yeni hesabın
  //     Supabase kayıtlarıyla karışır, kullanıcılar arası veri sızıntısı olur
  //
  // Eski "anonim → bulut migration" yolu kaldırıldı: artık tüm kullanıcılar
  // login zorunlu, localStorage→Supabase upload yapılmıyor (cross-account
  // leak'in kaynağıydı; CLAUDE.md notuna göre zaten devre dışıydı).
  useEffect(() => {
    if (oturumYukleniyor) return;
    if (uniteYukleniyor) return;
    if (user) {
      if (sonUserId.current === user.id) return;
      // Farklı kullanıcıya geçiş veya ilk login — eski cache'i sil
      ilerlemeTemizle();
      sonUserId.current = user.id;
      const bugun = bugununTarihi();
      sonGirisKaydi.current = bugun;
      // Önce login kaydını yaz, ki yukleme sırasında streak doğru hesaplansın
      gunlukGirisKaydetSupabase(user.id, bugun)
        .then(() => ilerlemeYukleSupabase(user.id, tumSorular))
        .then(setIlerleme)
        .catch((e) => console.error('İlerleme yüklenemedi', e));
    } else {
      // Çıkış — önceki kullanıcının cache'i kalmasın
      if (sonUserId.current !== null) {
        ilerlemeTemizle();
        setIlerleme(varsayilanIlerleme());
      } else {
        // Sayfa ilk açılış (hiç login yapılmamış guest) — legacy tema/dil için yükle
        setIlerleme(ilerlemeYukle());
      }
      sonUserId.current = null;
      sonGirisKaydi.current = null;
    }
  }, [user, oturumYukleniyor, uniteYukleniyor, tumSorular]);

  // Gün değişimini handle et — sayfa uzun süre açık kalırsa bile aktivite kaydı
  // ertesi gün yeniden yazılsın. visibilitychange ile tab'a dönüşte ve sayfa
  // odakta kalsa bile saatlik intervalle kontrol edilir.
  useEffect(() => {
    if (!user) return;
    if (uniteYukleniyor) return;

    const kontrol = async () => {
      if (document.hidden) return;
      const bugun = bugununTarihi();
      if (sonGirisKaydi.current === bugun) return;
      sonGirisKaydi.current = bugun;
      try {
        await gunlukGirisKaydetSupabase(user.id, bugun);
        const guncel = await ilerlemeYukleSupabase(user.id, tumSorular);
        setIlerleme(guncel);
      } catch (e) {
        console.error('Günlük giriş kayıt hatası', e);
      }
    };

    document.addEventListener('visibilitychange', kontrol);
    // Saatlik interval — kullanıcı tab'ı açık tutsa bile gün değişimini yakala
    const id = window.setInterval(kontrol, 60 * 60 * 1000);
    return () => {
      document.removeEventListener('visibilitychange', kontrol);
      window.clearInterval(id);
    };
  }, [user, uniteYukleniyor, tumSorular]);

  // localStorage cache + tema sınıfı her zaman güncel
  useEffect(() => {
    ilerlemeKaydet(ilerleme);
    document.body.classList.toggle('dark', ilerleme.tema === 'dark');
  }, [ilerleme]);

  // Şifre sıfırlama (PASSWORD_RECOVERY) event'ini globalde yakala.
  //
  // Supabase recovery linki kullanıcıyı tokenlarla geri yönlendiriyor; URL
  // formatı (#access_token=... veya başka hash kombinasyonları) HashRouter'ın
  // /sifre-yenile route'una doğrudan match etmiyor — kullanıcı / route'una
  // düşüyor ve recovery oturumu zaten aktif olduğu için "girişli" sayılıyor,
  // dashboard'a yönleniyor. Şifre yenileme formunu hiç görmüyor.
  //
  // Bu listener event'i yakalayıp:
  //   1) sessionStorage flag'i set eder (SifreYenileSayfasi okur)
  //   2) URL hash'ini /sifre-yenile'e yönlendirir
  // Böylece kullanıcı her zaman şifre değiştirme formuna düşer.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('sifre_yenileme_modu', '1');
        // BrowserRouter: path'e yönlendir (hash değil). Router dışındayız,
        // history + popstate ile React Router'ı reload'suz tetikle.
        if (window.location.pathname !== '/sifre-yenile') {
          window.history.pushState(null, '', '/sifre-yenile');
          window.dispatchEvent(new PopStateEvent('popstate'));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Yeni kazanılan rozetleri tespit et
  useEffect(() => {
    if (uniteYukleniyor) return;
    const stat = istatistikHesapla(ilerleme, uniteler, tumSorular);
    const yeniRozetler: Rozet[] = [];
    ROZETLER.forEach((r) => {
      if (!ilerleme.kazanilanRozetler[r.id] && r.kontrol(stat)) yeniRozetler.push(r);
    });
    if (yeniRozetler.length > 0) {
      setIlerleme((prev) => {
        const yeniKazanilan = { ...prev.kazanilanRozetler };
        yeniRozetler.forEach((r) => {
          yeniKazanilan[r.id] = bugununTarihi();
        });
        return { ...prev, kazanilanRozetler: yeniKazanilan };
      });
      setRozetKuyrugu((prev) => [...prev, ...yeniRozetler]);
      if (user) {
        yeniRozetler.forEach((r) =>
          rozetKaydetSupabase(user.id, r.id).catch((e) => console.error('Rozet kaydı', e)),
        );
      }
    }
  }, [ilerleme, user, uniteler, tumSorular, uniteYukleniyor]);

  const soruCozuldu = (soru: Soru, yardim: CozumYardim = {}) => {
    const bugun = bugununTarihi();
    const yeniPuan = puanHesapla(soru.zorluk, yardim);
    const eskiKayit = ilerleme.cozulenler[soru.id];
    const eskiPuan = eskiKayit?.puan ?? (eskiKayit ? puanHesapla(eskiKayit.zorluk) : 0);

    // Oturum combo — yalnızca ilk defa çözülen sorularda artar. Tekrar çözüm
    // combo'yu etkilemez (kullanıcı zaten bildiği soruyla "üst üste doğru"
    // ödülü kazanmamalı).
    if (!eskiKayit) {
      sessionComboRef.current += 1;
    }

    // Best-score: yeni puan eskiden büyükse güncelle, değilse atla.
    // İlk çözümde eskiKayit null, atlanmaz.
    if (eskiKayit && yeniPuan <= eskiPuan) {
      // Daha düşük/eşit skor — kayıt değişmesin, ama backend'e logla
      // (kullanıcı yardım kullanım istatistiğini takip edebilelim).
      if (user) {
        // Tekrar çözüm — aktivite sayacı artmasın (yeniCozum=false).
        soruCozumKaydetSupabase(user.id, soru.id, bugun, soru.zorluk, yardim, false).catch((e) =>
          console.error('Çözüm kaydı', e),
        );
      }
      return;
    }

    const yeniCozum = !eskiKayit;
    const puanFarki = yeniPuan - eskiPuan;
    const yeniAkt = { ...ilerleme.aktiviteTarihleri };
    // Aktivite yalnızca ilk çözümde artar (daha yüksek skorla tekrar çözüm
    // günlük hedefi/heatmap'i şişirmesin). Yerel ile DB tutarlı kalsın.
    if (yeniCozum) yeniAkt[bugun] = (yeniAkt[bugun] || 0) + 1;
    setIlerleme({
      ...ilerleme,
      cozulenler: {
        ...ilerleme.cozulenler,
        [soru.id]: {
          tarih: eskiKayit?.tarih ?? bugun, // ilk çözüm tarihini koru
          zorluk: soru.zorluk,
          puan: yeniPuan,
          yardim,
        },
      },
      puan: Math.max(0, ilerleme.puan + puanFarki),
      sonCozumTarihi: bugun,
      aktiviteTarihleri: yeniAkt,
    });
    if (user) {
      soruCozumKaydetSupabase(user.id, soru.id, bugun, soru.zorluk, yardim, yeniCozum).catch((e) =>
        console.error('Çözüm kaydı', e),
      );
    }
  };

  const yanlisKaydet = (soruId: string) => {
    // Yanlış cevap oturum combo'yu sıfırlar — "üst üste doğru" anlamı bozuluyor
    sessionComboRef.current = 0;
    setIlerleme((prev) => ({
      ...prev,
      yanlislar: { ...prev.yanlislar, [soruId]: (prev.yanlislar[soruId] || 0) + 1 },
    }));
    if (user) {
      yanlisKaydetSupabase(user.id, soruId).catch((e) => console.error('Yanlış kaydı', e));
    }
  };

  const ilerlemeSifirla = async () => {
    if (!confirm('Tüm ilerleme silinecek. Emin misiniz?')) return;
    if (user) {
      await Promise.all([
        supabase.from('ilerleme').delete().eq('user_id', user.id),
        supabase.from('aktivite').delete().eq('user_id', user.id),
        supabase.from('kazanilan_rozetler').delete().eq('user_id', user.id),
      ]);
    }
    setIlerleme({
      ...varsayilanIlerleme(),
      tema: ilerleme.tema,
      kullaniciAdi: ilerleme.kullaniciAdi,
    });
  };

  const temaDegistir = () => {
    setIlerleme((prev) => {
      const yeniTema = prev.tema === 'dark' ? 'light' : 'dark';
      if (user) profilKaydetSupabase(user.id, { tema: yeniTema }).catch(() => {});
      return { ...prev, tema: yeniTema };
    });
  };

  // Takma ad güncelleme — DB unique constraint (lower(kullanici_adi)) çakışırsa
  // throw eder; çağıran (HesapView) hatayı yakalayıp UI'da mesaj gösterir.
  // State güncellemesi sadece DB save başarılıysa yapılır (rollback derdi yok).
  const kullaniciAdiGuncelle = async (ad: string): Promise<void> => {
    if (user) {
      await profilKaydetSupabase(user.id, { kullanici_adi: ad });
    }
    setIlerleme((prev) => ({ ...prev, kullaniciAdi: ad }));
  };

  const stat = istatistikHesapla(ilerleme, uniteler, tumSorular);

  if (uniteYukleniyor && uniteler.length === 0) {
    return (
      <div className="min-h-screen bg-bg-tint text-ink flex items-center justify-center">
        <div className="text-sm text-ink-mute font-medium">
          İçerik yükleniyor…
        </div>
      </div>
    );
  }

  if (uniteHata && uniteler.length === 0) {
    return (
      <div className="min-h-screen bg-bg-tint text-ink flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="font-display text-xl font-bold mb-2">İçerik yüklenemedi</div>
          <p className="text-sm text-ink-soft font-medium">{uniteHata}</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <ScrollToTop />
      <SiteLoader />
      <div className="min-h-screen bg-bg-tint text-ink transition-colors">
        <Navbar
          ilerleme={ilerleme}
          onTemaDegistir={temaDegistir}
          onHesapPlaniAc={() => setPlanAcik(true)}
        />

        <RecoveryGuard
          girisYapildi={!!user}
          oturumYukleniyor={oturumYukleniyor}
        />

        <Suspense fallback={<SayfaYukleniyor />}>
          <Routes>
            <Route
              path="/"
              element={
                // Recovery modunda hiçbir yere gitme — direkt şifre yenilemeye
                sessionStorage.getItem('sifre_yenileme_modu') === '1' ? (
                  <Navigate to="/sifre-yenile" replace />
                ) : user ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <AnaSayfa ilerleme={ilerleme} stat={stat} />
                )
              }
            />
            <Route
              path="/dashboard"
              element={
                user ? (
                  <DashboardSayfasi ilerleme={ilerleme} stat={stat} />
                ) : (
                  <Navigate to="/" replace />
                )
              }
            />
            <Route path="/giris" element={<GirisSayfasi />} />
            <Route path="/sifre-sifirla" element={<SifreSifirlaSayfasi />} />
            <Route path="/sifre-yenile" element={<SifreYenileSayfasi />} />
            {/* /onboarding rotası kaldırıldı — profil sayfasında progressive completion var */}
            <Route path="/kvkk" element={<KvkkSayfasi />} />
            <Route path="/k/:karneId" element={<KarneStubSayfasi />} />
            <Route path="/liderlik" element={<LiderlikSayfasi />} />
            <Route path="/sozluk" element={<SozlukSayfasi />} />
            <Route path="/sozluk/:slug" element={<SozlukTerimSayfasi />} />
            <Route path="/muhasebeye-giris" element={<MuhasebeyeGirisSayfasi />} />
            <Route path="/kesfet" element={<KesfetSayfasi />} />
            <Route path="/kesfet/:kart" element={<KesfetKartSayfasi />} />
            <Route path="/kesfet/:kart/:item" element={<KesfetItemSayfasi />} />
            {/* İşletmeler (dönem simülasyonu) — aynı bileşenler, track pathname'den. */}
            <Route path="/isletmeler" element={<KesfetSayfasi />} />
            <Route path="/isletmeler/:kart" element={<KesfetKartSayfasi />} />
            <Route path="/isletmeler/:kart/:item" element={<KesfetItemSayfasi />} />
            <Route path="/premium" element={<PremiumSayfasi />} />
            <Route path="/premium/sonuc" element={<PremiumSonucSayfasi />} />
            <Route path="/premium/kurum-odeme" element={<KurumOdemeSayfasi />} />
            <Route path="/uniteler" element={<UnitelerSayfasi />} />
            <Route
              path="/uniteler/:uniteId"
              element={
                <ProtectedRoute>
                  <UniteSayfasi ilerleme={ilerleme} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uniteler/:uniteId/modul/:modulId"
              element={
                <ProtectedRoute>
                  <ModulSayfasi ilerleme={ilerleme} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uniteler/:uniteId/modul/:modulId/alt/:altBaslikId"
              element={
                <ProtectedRoute>
                  <AltBaslikSayfasi ilerleme={ilerleme} />
                </ProtectedRoute>
              }
            />
            <Route
              path="/uniteler/:uniteId/:konuId"
              element={
                <ProtectedRoute>
                  <KonuSayfasi ilerleme={ilerleme} />
                </ProtectedRoute>
              }
            />
            <Route path="/problemler" element={<ProblemlerSayfasi ilerleme={ilerleme} />} />
            <Route
              path="/problemler/:soruId"
              element={
                <SoruEkrani
                  ilerleme={ilerleme}
                  onCozuldu={soruCozuldu}
                  onYanlis={yanlisKaydet}
                  onHesapPlaniYanPanel={() => setYanPanelAcik(true)}
                  getSessionCombo={() => sessionComboRef.current}
                />
              }
            />
            <Route
              path="/profil"
              element={
                <ProfilSayfasi
                  ilerleme={ilerleme}
                  stat={stat}
                  onKullaniciAdiGuncelle={kullaniciAdiGuncelle}
                  onSifirla={ilerlemeSifirla}
                  onTemaDegistir={temaDegistir}
                />
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedAdminRoute>
                  <AdminAnaSayfa />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler"
              element={
                <ProtectedAdminRoute>
                  <AdminUnitelerSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/icerik"
              element={
                <ProtectedAdminRoute>
                  <AdminIcerikSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/konular"
              element={
                <ProtectedAdminRoute>
                  <AdminKonularSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/konular/:konuId/icerik"
              element={
                <ProtectedAdminRoute>
                  <AdminKonuIcerikSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/moduller"
              element={
                <ProtectedAdminRoute>
                  <AdminModullerSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/moduller/:modulId/icerik"
              element={
                <ProtectedAdminRoute>
                  <AdminModulIcerikSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/moduller/:modulId/alt-basliklar"
              element={
                <ProtectedAdminRoute>
                  <AdminAltBasliklarSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/moduller/:modulId/alt-basliklar/:altId/icerik"
              element={
                <ProtectedAdminRoute>
                  <AdminAltBaslikIcerikSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/uniteler/:uniteId/moduller/:modulId/alt-basliklar/:altId/sorular"
              element={
                <ProtectedAdminRoute>
                  <AdminAtolyeSorulariSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/mevzuat"
              element={
                <ProtectedAdminRoute>
                  <AdminMevzuatSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/bildirimler"
              element={
                <ProtectedAdminRoute>
                  <AdminBildirimlerSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/sozluk"
              element={
                <ProtectedAdminRoute>
                  <AdminSozlukSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/kesfet"
              element={
                <ProtectedAdminRoute>
                  <AdminKesfetSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/kesfet/:kartId"
              element={
                <ProtectedAdminRoute>
                  <AdminKesfetKartSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/kesfet/:kartId/item/:itemId"
              element={
                <ProtectedAdminRoute>
                  <AdminKesfetItemIcerikSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/muavin-hesaplar"
              element={
                <ProtectedAdminRoute>
                  <AdminMuavinHesaplarSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/kullanicilar"
              element={
                <ProtectedAdminRoute>
                  <AdminKullanicilarSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/kullanicilar/:id"
              element={
                <ProtectedAdminRoute>
                  <AdminKullaniciDetaySayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/yetkililer"
              element={
                <ProtectedAdminRoute>
                  <AdminYetkilileriSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/istatistikler"
              element={
                <ProtectedAdminRoute>
                  <AdminIstatistiklerSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/katkicilar"
              element={
                <ProtectedAdminRoute>
                  <AdminKatkicilarSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/indirim-kodlari"
              element={
                <ProtectedAdminRoute>
                  <AdminIndirimKodlariSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/log"
              element={
                <ProtectedAdminRoute>
                  <AdminLogSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/ai-maliyet"
              element={
                <ProtectedAdminRoute>
                  <AdminAIMaliyetSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route path="/katkici-basvuru" element={<KatkiciBasvuruSayfasi />} />
            <Route path="/katkici/soru/yeni" element={<KatkiciSoruEkleSayfasi />} />
            <Route
              path="/admin/sorular"
              element={
                <ProtectedAdminRoute>
                  <AdminSorularSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/sorular/yeni"
              element={
                <ProtectedAdminRoute>
                  <AdminYeniSoruSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/sorular/toplu-ekle"
              element={
                <ProtectedAdminRoute>
                  <AdminTopluEkleSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/hatalar"
              element={
                <ProtectedAdminRoute>
                  <AdminHatalarSayfasi />
                </ProtectedAdminRoute>
              }
            />
            <Route
              path="/admin/sorular/:soruId"
              element={
                <ProtectedAdminRoute>
                  <AdminDuzenleSoruSayfasi />
                </ProtectedAdminRoute>
              }
            />
            {/* Catch-all: auth hatası geliyorsa şifre sıfırlama sayfasına mesajla, değilse anasayfaya */}
            <Route path="*" element={<RouteFallback />} />
          </Routes>
        </Suspense>

        <Footer />

        {planAcik && <HesapPlaniModal onKapat={() => setPlanAcik(false)} />}
        <HesapPlaniYanPanel acik={yanPanelAcik} onKapat={() => setYanPanelAcik(false)} />

        {rozetKuyrugu[0] && (
          <RozetToast
            rozet={rozetKuyrugu[0]}
            onKapat={() => setRozetKuyrugu((prev) => prev.slice(1))}
          />
        )}

        <Analytics />
        <SpeedInsights />
      </div>
    </BrowserRouter>
  );
};

export default App;
