import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from './Icon';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { useEsc } from '../lib/hooks/use-esc';

interface Props {
  soruId: string;
  soruBaslik: string;
  onKapat: () => void;
}

type Durum = 'form' | 'gonderiliyor' | 'gonderildi' | 'hata';

export const HataBildirModal = ({ soruId, soruBaslik, onKapat }: Props) => {
  const { user } = useAuth();
  const [aciklama, setAciklama] = useState('');
  const [durum, setDurum] = useState<Durum>('form');
  const [hataMesaj, setHataMesaj] = useState('');

  useEsc(onKapat);

  useEffect(() => {
    if (durum !== 'gonderildi') return;
    const t = setTimeout(onKapat, 2200);
    return () => clearTimeout(t);
  }, [durum, onKapat]);

  const gonder = async () => {
    if (!user) return;
    const metin = aciklama.trim();
    if (metin.length < 10) {
      setHataMesaj('En az 10 karakter yaz.');
      return;
    }
    setDurum('gonderiliyor');
    setHataMesaj('');
    try {
      const insertPromise = supabase.from('soru_hatalari').insert({
        soru_id: soruId,
        user_id: user.id,
        aciklama: metin,
      });
      const timeoutPromise = new Promise<{ error: { message: string } }>((resolve) =>
        setTimeout(
          () => resolve({ error: { message: 'Bildirim gönderilemedi. İnternet bağlantını kontrol edip tekrar dene.' } }),
          15000,
        ),
      );
      const { error } = await Promise.race([insertPromise, timeoutPromise]);
      if (error) {
        setDurum('hata');
        setHataMesaj(error.message);
        return;
      }
      setDurum('gonderildi');
    } catch (e) {
      setDurum('hata');
      setHataMesaj(e instanceof Error ? e.message : 'Bildirim gönderilemedi. Lütfen tekrar dene.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 flex items-center justify-center p-4"
      onClick={onKapat}
    >
      <div
        className="bg-bg-tint max-w-lg w-full rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-ink/10 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="AlertCircle" size={18} className="text-danger" />
            <div>
              <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold">
                Hata bildir
              </div>
              <div className="font-display text-lg font-bold tracking-tight truncate max-w-[24rem]">
                {soruBaslik}
              </div>
            </div>
          </div>
          <button
            onClick={onKapat}
            className="text-ink-mute hover:text-ink"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="p-6">
          {!user ? (
            <div className="text-center py-4">
              <p className="text-sm text-ink-soft font-medium mb-4">
                Hata bildirmek için giriş yapman gerekiyor.
              </p>
              <Link
                to="/giris"
                onClick={onKapat}
                className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 active:scale-[0.98] transition"
              >
                <Icon name="LogIn" size={14} />
                Giriş yap
              </Link>
            </div>
          ) : durum === 'gonderildi' ? (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-success-soft mb-3">
                <Icon
                  name="CheckCircle2"
                  size={24}
                  className="text-success dark:text-success"
                />
              </div>
              <div className="font-display text-lg font-bold tracking-tight mb-1">
                Bildirim alındı
              </div>
              <p className="text-sm text-ink-soft font-medium">
                Bildirimi inceleme listesine ekledik.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-ink-soft font-medium mb-3 leading-relaxed">
                Fark ettiğin hatayı yaz. Örneğin yanlış hesap kodunu, KDV tutarını veya eksik açıklamayı belirt.
              </p>
              <textarea
                value={aciklama}
                onChange={(e) => setAciklama(e.target.value)}
                rows={5}
                maxLength={1000}
                placeholder="Örn: 391 hesabı yerine 191 olmalı, çünkü..."
                className="w-full px-3 py-2 bg-surface border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded-lg font-medium resize-none"
                disabled={durum === 'gonderiliyor'}
              />
              <div className="flex items-center justify-between mt-1">
                <div className="text-[10px] text-ink-quiet font-mono">
                  {aciklama.length} / 1000
                </div>
                {hataMesaj && (
                  <div className="text-xs text-danger dark:text-danger font-semibold">
                    {hataMesaj}
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={onKapat}
                  className="flex-1 px-4 py-2.5 border border-line-strong hover:border-ink text-sm font-bold rounded-lg transition"
                  disabled={durum === 'gonderiliyor'}
                >
                  İptal
                </button>
                <button
                  onClick={gonder}
                  disabled={durum === 'gonderiliyor' || aciklama.trim().length < 10}
                  className="flex-1 bg-ink text-bg px-4 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {durum === 'gonderiliyor' ? (
                    <>
                      <Icon name="Loader2" size={14} className="animate-spin" />
                      Gönderiliyor…
                    </>
                  ) : (
                    <>
                      <Icon name="Send" size={14} />
                      Gönder
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
