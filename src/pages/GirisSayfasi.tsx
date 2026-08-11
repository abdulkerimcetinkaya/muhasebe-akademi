import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { useAuth } from '../contexts/AuthContext';
import { girisYap, googleIleGiris, kayitOl } from '../lib/auth';
import { authDonusOku } from '../lib/auth-donus';
import {
  adYapisalKontrol,
  adUygunMu,
  oneriUret,
  uygunOnerileriBul,
} from '../lib/kullanici-adi';

type Mod = 'giris' | 'kayit';
type AdDurum = 'bos' | 'kontrol' | 'uygun' | 'kullanimda' | 'gecersiz';

export const GirisSayfasi = () => {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, yukleniyor: oturumYukleniyor } = useAuth();
  const [mod, setMod] = useState<Mod>(
    searchParams.get('mod') === 'kayit' ? 'kayit' : 'giris',
  );
  const [email, setEmail] = useState('');
  const [sifre, setSifre] = useState('');
  const [sifreTekrar, setSifreTekrar] = useState('');
  const [kullaniciAdi, setKullaniciAdi] = useState('');
  const [ad, setAd] = useState('');
  const [soyad, setSoyad] = useState('');
  // KVKK ve bülten — kayıt formunda implicit (kayıt butonuna basınca kabul edilmiş sayılır)
  // Disclaimer butonun altında gösterilir. State'e gerek yok, sabit true.
  const bultenIzni = true;

  const [adDurum, setAdDurum] = useState<AdDurum>('bos');
  const [adHata, setAdHata] = useState<string | null>(null);
  const [oneriler, setOneriler] = useState<string[]>([]);

  const [hata, setHata] = useState<string | null>(null);
  const [bilgi, setBilgi] = useState<string | null>(null);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [sifreGoster, setSifreGoster] = useState(false);

  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!oturumYukleniyor && user) {
      const donus = authDonusOku() ?? '/';
      nav(donus, { replace: true });
    }
  }, [user, oturumYukleniyor, nav]);

  // Kullanıcı adı debounced kontrolü (sadece kayıt modunda)
  useEffect(() => {
    if (mod !== 'kayit') return;
    const ad = kullaniciAdi.trim();

    if (ad.length === 0) {
      setAdDurum('bos');
      setAdHata(null);
      setOneriler([]);
      return;
    }

    const yapisal = adYapisalKontrol(ad);
    if (!yapisal.gecerli) {
      setAdDurum('gecersiz');
      setAdHata(yapisal.hata ?? null);
      setOneriler([]);
      return;
    }

    setAdDurum('kontrol');
    setAdHata(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      const uygun = await adUygunMu(ad);
      if (uygun) {
        setAdDurum('uygun');
        setOneriler([]);
      } else {
        setAdDurum('kullanimda');
        const aday = oneriUret(ad);
        const uygunOneriler = await uygunOnerileriBul(aday);
        setOneriler(uygunOneriler);
      }
    }, 450);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [kullaniciAdi, mod]);

  const sifreEsit = sifre.length > 0 && sifre === sifreTekrar;
  const sifreUyusmazlik = sifreTekrar.length > 0 && sifre !== sifreTekrar;

  const gonder = async (e: React.FormEvent) => {
    e.preventDefault();
    setHata(null);
    setBilgi(null);

    if (!email.trim() || !sifre) {
      setHata('E-posta ve şifre gerekli.');
      return;
    }

    if (mod === 'kayit') {
      if (!ad.trim() || !soyad.trim()) {
        setHata('Ad ve soyad zorunlu.');
        return;
      }
      const yapisal = adYapisalKontrol(kullaniciAdi);
      if (!yapisal.gecerli) {
        setHata(yapisal.hata ?? 'Kullanıcı adı geçersiz.');
        return;
      }
      if (adDurum === 'kullanimda') {
        setHata('Bu kullanıcı adı alınmış. Önerilenlerden birini seçebilirsin.');
        return;
      }
      if (sifre !== sifreTekrar) {
        setHata('Şifreler eşleşmiyor.');
        return;
      }
      // Şifre güçlülük kontrolü: min 8 karakter + en az 1 harf + en az 1 rakam
      const sifreGuclu = /^(?=.*[A-Za-zÇĞİÖŞÜçğıöşü])(?=.*\d).{8,}$/.test(sifre);
      if (!sifreGuclu) {
        setHata('Şifre en az 8 karakter olmalı, en az 1 harf ve 1 rakam içermeli.');
        return;
      }
    }

    setYukleniyor(true);
    const sonuc =
      mod === 'giris'
        ? await girisYap(email.trim(), sifre)
        : await kayitOl({
            email: email.trim(),
            sifre,
            kullaniciAdi: kullaniciAdi.trim(),
            ad: ad.trim(),
            soyad: soyad.trim(),
            bultenIzni,
          });
    setYukleniyor(false);

    if (!sonuc.basarili) {
      setHata(sonuc.hata ?? 'İşlem tamamlanamadı. Lütfen tekrar dene.');
      return;
    }
    if (mod === 'kayit' && !sonuc.user?.email_confirmed_at) {
      setBilgi('Hesap oluşturuldu. E-postanı doğrulamak için gelen kutunu kontrol et.');
      setSifre('');
      setSifreTekrar('');
      return;
    }
  };

  const modDegistir = (yeni: Mod) => {
    setMod(yeni);
    setHata(null);
    setBilgi(null);
    setSifreTekrar('');
    if (yeni === 'giris') {
      setKullaniciAdi('');
      setAd('');
      setSoyad('');
      setOneriler([]);
      setAdDurum('bos');
    }
  };

  const oneriyiSec = (oneri: string) => {
    setKullaniciAdi(oneri);
  };

  // ── Kullanıcı adı durum göstergesi (input sağ tarafı) ─────────────
  const adGosterge = () => {
    if (adDurum === 'kontrol')
      return <Icon name="Loader2" size={14} className="text-ink-quiet animate-spin" />;
    if (adDurum === 'uygun')
      return <Icon name="CheckCircle2" size={14} className="text-success" />;
    if (adDurum === 'kullanimda' || adDurum === 'gecersiz')
      return <Icon name="AlertCircle" size={14} className="text-danger" />;
    return null;
  };

  return (
    <main className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4 sm:px-6 py-12">
      <div className="w-full max-w-[440px]">
        {/* Marka çizgisi */}
        <div className="flex items-baseline justify-center gap-2 mb-10">
          <span className="font-display text-[28px] font-bold tracking-[-0.02em] text-ink leading-none">
            muhasebeakademi
          </span>
          <span
            className="font-serif italic text-[32px] leading-none"
            style={{ color: 'var(--copper)' }}
          >
            §
          </span>
        </div>

        {/* Kart */}
        <div className="surface p-7 sm:p-9 bg-surface">
          {/* Başlık */}
          <div className="mb-7">
            <div className="font-mono text-[10px] tracking-[0.3em] uppercase text-ink-mute mb-2">
              §&nbsp;{mod === 'giris' ? '01 · Giriş' : '01 · Kayıt'}
            </div>
            <h1 className="font-display text-[32px] sm:text-[36px] tracking-tight leading-[1.05] font-bold text-ink">
              {mod === 'giris' ? (
                <>
                  Hoş <span className="font-display-italic text-copper-deep">geldin</span>.
                </>
              ) : (
                <>
                  Hesap <span className="font-display-italic text-copper-deep">oluştur</span>.
                </>
              )}
            </h1>
            <p className="text-[14px] text-ink-soft leading-relaxed mt-2 font-medium">
              {mod === 'giris'
                ? 'Yevmiye kayıtlarına devam etmek için giriş yap.'
                : 'Ücretsiz hesabını oluştur, ilerlemeni bulutta sakla.'}
            </p>
          </div>

          {/* Mod sekmesi */}
          <div className="flex border border-line rounded-lg p-1 mb-6 bg-surface-2/40">
            <button
              type="button"
              onClick={() => modDegistir('giris')}
              className={`flex-1 py-2 text-[12px] font-bold tracking-wide rounded-md transition ${
 mod === 'giris'
 ? 'bg-ink text-paper shadow-sm'
 : 'text-ink-soft hover:text-ink'
 }`}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => modDegistir('kayit')}
              className={`flex-1 py-2 text-[12px] font-bold tracking-wide rounded-md transition ${
 mod === 'kayit'
 ? 'bg-ink text-paper shadow-sm'
 : 'text-ink-soft hover:text-ink'
 }`}
            >
              Kayıt Ol
            </button>
          </div>

          {/* Google ile giriş — formdan önce, primary alternatif */}
          <button
            type="button"
            onClick={async () => {
              setHata(null);
              setYukleniyor(true);
              const sonuc = await googleIleGiris();
              if (!sonuc.basarili) {
                setHata(sonuc.hata ?? 'Google ile giriş tamamlanamadı. Lütfen tekrar dene.');
                setYukleniyor(false);
              }
              // Başarılı olursa Google'a redirect olur, setYukleniyor(false) gerekmez
            }}
            disabled={yukleniyor}
            className="w-full flex items-center justify-center gap-3 py-2.5 mb-4 bg-surface border border-line-strong hover:border-ink rounded-lg text-[13px] font-semibold text-ink transition disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.95 4 4 12.95 4 24s8.95 20 20 20 20-8.95 20-20c0-1.34-.14-2.65-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.4-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.7 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.1 4.1-3.9 5.5l6.2 5.2c-.4.4 6.7-4.9 6.7-14.7 0-1.34-.14-2.65-.4-3.5z" />
            </svg>
            Google ile devam et
          </button>

          {/* "veya" ayırıcısı */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-line" />
            <span className="text-[10px] tracking-[0.25em] uppercase text-ink-mute font-mono font-bold">
              veya
            </span>
            <div className="flex-1 h-px bg-line" />
          </div>

          <form onSubmit={gonder} className="space-y-4">
            {mod === 'kayit' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1.5">
                    Ad
                  </label>
                  <input
                    type="text"
                    value={ad}
                    onChange={(e) => setAd(e.target.value)}
                    autoComplete="given-name"
                    required
                    maxLength={40}
                    className="w-full px-3 py-2.5 bg-surface-2/30 border border-line focus:border-ink-soft rounded-lg text-[14px] font-medium outline-none transition focus:ring-2 focus:ring-blue-500/15"
                    placeholder="Adın"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1.5">
                    Soyad
                  </label>
                  <input
                    type="text"
                    value={soyad}
                    onChange={(e) => setSoyad(e.target.value)}
                    autoComplete="family-name"
                    required
                    maxLength={40}
                    className="w-full px-3 py-2.5 bg-surface-2/30 border border-line focus:border-ink-soft rounded-lg text-[14px] font-medium outline-none transition focus:ring-2 focus:ring-blue-500/15"
                    placeholder="Soyadın"
                  />
                </div>
              </div>
            )}

            {mod === 'kayit' && (
              <div>
                <label className="block font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1.5">
                  Kullanıcı Adı
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={kullaniciAdi}
                    onChange={(e) => setKullaniciAdi(e.target.value)}
                    autoComplete="username"
                    required
                    minLength={2}
                    maxLength={30}
                    className={`w-full pl-3 pr-9 py-2.5 bg-surface-2/30 border rounded-lg text-[14px] font-medium outline-none transition focus:ring-2 focus:ring-blue-500/15 ${
 adDurum === 'kullanimda' || adDurum === 'gecersiz'
 ? 'border-danger-soft focus:border-danger'
 : adDurum === 'uygun'
 ? 'border-success-soft focus:border-success'
 : 'border-line focus:border-ink-soft'
 }`}
                    placeholder="ahmet, zeynep_28, muhasebe_kurdu..."
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">{adGosterge()}</div>
                </div>

                {adHata && (
                  <div className="mt-1.5 text-[12px] text-danger dark:text-danger font-medium">
                    {adHata}
                  </div>
                )}

                {adDurum === 'uygun' && (
                  <div className="mt-1.5 text-[12px] text-success dark:text-success font-medium">
                    Bu kullanıcı adı uygun.
                  </div>
                )}

                {adDurum === 'kullanimda' && (
                  <div className="mt-2">
                    <div className="text-[12px] text-danger dark:text-danger font-medium mb-1.5">
                      Bu kullanıcı adı alınmış.
                    </div>
                    {oneriler.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        <span className="font-mono text-[10px] tracking-wider uppercase text-ink-mute self-center">
                          Öneri:
                        </span>
                        {oneriler.map((o) => (
                          <button
                            key={o}
                            type="button"
                            onClick={() => oneriyiSec(o)}
                            className="text-[12px] font-mono px-2 py-0.5 bg-surface-2/60 hover:bg-surface-2 border border-line rounded-md transition text-ink"
                          >
                            {o}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {adDurum === 'bos' && (
                  <div className="mt-1.5 text-[11px] text-ink-mute font-medium">
                    2-30 karakter. Profilden değiştirebilirsin.
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1.5">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                className="w-full px-3 py-2.5 bg-surface-2/30 border border-line focus:border-ink-soft rounded-lg text-[14px] font-medium outline-none transition focus:ring-2 focus:ring-blue-500/15"
                placeholder="ornek@email.com"
              />
            </div>

            <div>
              <div className="flex items-baseline justify-between mb-1.5">
                <label className="block font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold">
                  Şifre
                </label>
                {mod === 'giris' && (
                  <button
                    type="button"
                    onClick={() => nav('/sifre-sifirla')}
                    className="text-[11px] text-brand dark:text-brand-mute hover:underline font-bold"
                  >
                    Şifremi unuttum
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={sifreGoster ? 'text' : 'password'}
                  value={sifre}
                  onChange={(e) => setSifre(e.target.value)}
                  autoComplete={mod === 'giris' ? 'current-password' : 'new-password'}
                  required
                  minLength={mod === 'kayit' ? 8 : 6}
                  className="w-full pl-3 pr-10 py-2.5 bg-surface-2/30 border border-line focus:border-ink-soft rounded-lg text-[14px] font-medium outline-none transition focus:ring-2 focus:ring-blue-500/15"
                  placeholder={mod === 'kayit' ? 'En az 8 karakter, harf + rakam' : 'Şifren'}
                />
                <button
                  type="button"
                  onClick={() => setSifreGoster((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-ink-mute hover:text-ink transition"
                  tabIndex={-1}
                >
                  <Icon name={sifreGoster ? 'EyeOff' : 'Eye'} size={14} />
                </button>
              </div>
            </div>

            {mod === 'kayit' && (
              <div>
                <label className="block font-mono text-[10px] tracking-[0.22em] uppercase text-ink-mute font-bold mb-1.5">
                  Şifre (Tekrar)
                </label>
                <div className="relative">
                  <input
                    type={sifreGoster ? 'text' : 'password'}
                    value={sifreTekrar}
                    onChange={(e) => setSifreTekrar(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    className={`w-full pl-3 pr-9 py-2.5 bg-surface-2/30 border rounded-lg text-[14px] font-medium outline-none transition focus:ring-2 focus:ring-blue-500/15 ${
 sifreUyusmazlik
 ? 'border-danger-soft focus:border-danger'
 : sifreEsit
 ? 'border-success-soft focus:border-success'
 : 'border-line focus:border-ink-soft'
 }`}
                    placeholder="Şifreyi tekrar gir"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {sifreUyusmazlik && (
                      <Icon name="AlertCircle" size={14} className="text-danger" />
                    )}
                    {sifreEsit && (
                      <Icon name="CheckCircle2" size={14} className="text-success" />
                    )}
                  </div>
                </div>
                {sifreUyusmazlik && (
                  <div className="mt-1.5 text-[12px] text-danger dark:text-danger font-medium">
                    Şifreler eşleşmiyor.
                  </div>
                )}
              </div>
            )}


            {hata && (
              <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
                <Icon name="AlertCircle" size={15} className="flex-shrink-0 mt-0.5" />
                <span>{hata}</span>
              </div>
            )}

            {bilgi && (
              <div className="flex items-start gap-2 p-3 bg-success-soft border border-success-soft rounded-lg text-[13px] text-success font-medium">
                <Icon name="CheckCircle2" size={15} className="flex-shrink-0 mt-0.5" />
                <span>{bilgi}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={yukleniyor}
              className="w-full py-2.5 bg-ink text-paper font-bold text-[12px] tracking-[0.18em] uppercase rounded-lg hover:opacity-90 active:scale-[0.99] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-5"
            >
              {yukleniyor && <Icon name="Loader2" size={14} className="animate-spin" />}
              {mod === 'giris' ? 'Giriş Yap' : 'Hesabı Oluştur'}
              {!yukleniyor && <Icon name="ArrowRight" size={13} />}
            </button>

            {/* Kayıt sekmesinde KVKK + bülten implicit kabul disclaimer'ı */}
            {mod === 'kayit' && (
              <p className="text-[11px] text-ink-mute leading-relaxed text-center mt-3 px-2">
                Hesabı Oluştur'a tıklayarak{' '}
                <button
                  type="button"
                  onClick={() => window.open('/kvkk', '_blank')}
                  className="text-brand-deep hover:underline font-semibold"
                >
                  KVKK Aydınlatma Metni
                </button>
                'ni kabul etmiş ve e-posta haberlerine abone olmuş sayılırsın.
              </p>
            )}
          </form>
        </div>

        {/* Alt şerit */}
        <div className="mt-5 text-center">
          <span className="font-mono text-[11px] text-ink-mute">
            {mod === 'giris' ? 'Hesabın yok mu?' : 'Zaten hesabın var mı?'}{' '}
          </span>
          <button
            onClick={() => modDegistir(mod === 'giris' ? 'kayit' : 'giris')}
            className="font-mono text-[11px] text-ink hover:text-copper-deep font-bold tracking-wide transition"
          >
            {mod === 'giris' ? 'Kayıt ol →' : '← Giriş yap'}
          </button>
        </div>
      </div>
    </main>
  );
};
