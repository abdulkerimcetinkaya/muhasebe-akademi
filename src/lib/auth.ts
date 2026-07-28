import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { authDonusTemizle } from './auth-donus';
import { ilerlemeTemizle } from './ilerleme';
import { kesfetCacheTemizle } from './kesfet-ilerleme';

export interface AuthSonuc {
  basarili: boolean;
  hata?: string;
  user?: User | null;
}

const cevirHata = (mesaj: string): string => {
  if (mesaj.includes('Invalid login credentials')) return 'E-posta veya şifre hatalı.';
  if (mesaj.includes('User already registered')) return 'Bu e-posta ile bir hesap zaten var.';
  if (mesaj.includes('Email not confirmed')) return 'E-posta adresini önce doğrulamalısın.';
  if (mesaj.includes('Password should be at least'))
    return 'Şifre en az 6 karakter olmalı.';
  if (mesaj.includes('Unable to validate email address'))
    return 'Geçerli bir e-posta adresi gir.';
  if (mesaj.toLowerCase().includes('provider is not enabled'))
    return 'Google ile giriş şu an aktif değil. Lütfen e-posta + şifre ile dene.';
  return mesaj;
};

export interface KayitBilgileri {
  email: string;
  sifre: string;
  kullaniciAdi: string;
  ad: string;
  soyad: string;
  bultenIzni: boolean;
}

export const kayitOl = async (kayit: KayitBilgileri): Promise<AuthSonuc> => {
  const { data, error } = await supabase.auth.signUp({
    email: kayit.email,
    password: kayit.sifre,
    options: {
      data: {
        kullanici_adi: kayit.kullaniciAdi.trim(),
        ad: kayit.ad.trim(),
        soyad: kayit.soyad.trim(),
        bulten_izni: kayit.bultenIzni,
      },
    },
  });
  if (error) return { basarili: false, hata: cevirHata(error.message) };
  return { basarili: true, user: data.user };
};

export const girisYap = async (email: string, sifre: string): Promise<AuthSonuc> => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: sifre });
  if (error) return { basarili: false, hata: cevirHata(error.message) };
  return { basarili: true, user: data.user };
};

/**
 * Google OAuth ile giriş — PKCE flow.
 *
 * Implicit flow (default) tokenları URL fragment'ine yazıyordu
 * (`#access_token=...`), HashRouter bunu route olarak yorumlayıp tüketiyor;
 * kullanıcı giriş ekranına geri düşüyordu. PKCE flow `?code=...` query
 * param'ı kullanır — HashRouter dokunmaz, Supabase JS otomatik exchange eder.
 *
 * `redirectTo` hash'siz: HashRouter sayfayı yüklerken default `/` route'una
 * düşer, AnaSayfa kullanıcıyı user durumuna göre dashboard'a yönlendirir.
 *
 * Supabase Dashboard → Auth → Providers → Google enable + Client ID/Secret
 * + Auth → URL Configuration → Redirect URLs içine `${origin}/` eklenmeli.
 */
export const googleIleGiris = async (): Promise<AuthSonuc> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
  if (error) return { basarili: false, hata: cevirHata(error.message) };
  return { basarili: true };
};

export const cikisYap = async (): Promise<AuthSonuc> => {
  authDonusTemizle();
  // Önceki kullanıcının ilerleme cache'ini sil — aynı tarayıcıda farklı
  // kullanıcı giriş yaptığında eski streak/puan/rozet UI'da görünmesin
  // ve migration yoluyla yeni hesaba sızmasın.
  ilerlemeTemizle();
  kesfetCacheTemizle();
  // Recovery modunda iken logout edildiyse flag temizle, aksi halde
  // sonraki normal girişlerde takılı kalıp /sifre-yenile'ye yönlendirir.
  sessionStorage.removeItem('sifre_yenileme_modu');
  const { error } = await supabase.auth.signOut();
  if (error) return { basarili: false, hata: cevirHata(error.message) };
  return { basarili: true };
};

/**
 * Kullanıcıya şifre sıfırlama e-postası yollar. Link kullanıcıyı
 * `${origin}/?recovery=1` rotasına götürür; supabase.ts module-init
 * bu query param'ı görüp recovery flag set ediyor ve OnboardingGuard
 * kullanıcıyı /sifre-yenile sayfasına yönlendiriyor.
 *
 * Eskiden redirectTo `${origin}/#/sifre-yenile` idi ama PKCE flow bu URL'i
 * malforme şekilde işliyordu (hash + query param karışıyor) — sonuçta
 * kullanıcı /onboarding'e düşüyordu. Query param tabanlı marker güvenilir.
 */
export const sifreSifirlamaIste = async (email: string): Promise<AuthSonuc> => {
  const redirectTo = `${window.location.origin}/?recovery=1`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { basarili: false, hata: cevirHata(error.message) };
  return { basarili: true };
};

/**
 * Recovery oturumu açıkken kullanıcının yeni şifresini set eder.
 * SifreYenileSayfasi'nda kullanılır.
 */
export const sifreyiYenile = async (yeniSifre: string): Promise<AuthSonuc> => {
  const { data, error } = await supabase.auth.updateUser({ password: yeniSifre });
  if (error) return { basarili: false, hata: cevirHata(error.message) };
  return { basarili: true, user: data.user };
};

export const oturumAl = async (): Promise<Session | null> => {
  const { data } = await supabase.auth.getSession();
  return data.session;
};

export const oturumDinle = (cb: (session: Session | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return () => data.subscription.unsubscribe();
};
