import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { SoruForm, bosForm, type SoruFormDegerleri } from '../components/SoruForm';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { onayliKatkiSayisi } from '../lib/katkici';

const ID_KARAKTERLER = 'abcdefghijkmnpqrstuvwxyz23456789';

const idUret = (): string => {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 8; i++) s += ID_KARAKTERLER[buf[i] % ID_KARAKTERLER.length];
  return s;
};

const benzersizId = async (): Promise<string> => {
  for (let i = 0; i < 5; i++) {
    const aday = idUret();
    const { count } = await supabase
      .from('sorular')
      .select('id', { count: 'exact', head: true })
      .eq('id', aday);
    if ((count ?? 0) === 0) return aday;
  }
  throw new Error('Benzersiz ID üretilemedi.');
};

export const KatkiciSoruEkleSayfasi = () => {
  const { user } = useAuth();
  const nav = useNavigate();
  const [katkiSayisi, setKatkiSayisi] = useState<number | null>(null);
  const [yetkiKontrolu, setYetkiKontrolu] = useState<'kontrol' | 'yetkili' | 'yetkisiz'>('kontrol');

  useEffect(() => {
    if (!user) {
      nav('/giris?redirect=/katkici/soru/yeni', { replace: true });
      return;
    }
    // is_katkici alanını DB'den çek
    supabase
      .from('kullanicilar')
      .select('is_katkici')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.is_katkici) {
          setYetkiKontrolu('yetkili');
          onayliKatkiSayisi(user.id).then(setKatkiSayisi).catch(() => setKatkiSayisi(null));
        } else {
          setYetkiKontrolu('yetkisiz');
        }
      });
  }, [user, nav]);

  const kaydet = async (d: SoruFormDegerleri) => {
    if (!user) throw new Error('Oturum yok');

    const dolular = d.cozumler.filter((c) => c.kod.trim());
    const yeniId = await benzersizId();

    const { error: soruErr } = await supabase.from('sorular').insert({
      id: yeniId,
      isletme_id: d.isletme_id,
      konu_id: d.konu_id || null,
      alt_baslik_id: d.alt_baslik_id || null,
      baslik: d.baslik,
      zorluk: d.zorluk,
      senaryo: d.senaryo,
      ipucu: d.ipucu || null,
      aciklama: d.aciklama || null,
      // Katkıcı olarak gönderilen sorular her zaman inceleme durumunda
      durum: 'inceleme',
      kaynak: 'katkici',
      yayinlanma_tarihi: null,
      belgeler: d.belgeler,
      ekleyen_id: user.id,
    });

    if (soruErr) throw new Error('Soru eklenemedi: ' + soruErr.message);

    const cozumSatirlari = dolular.map((c, i) => ({
      soru_id: yeniId,
      sira: i + 1,
      kod: c.kod.trim(),
      borc: parseFloat(c.borc) || 0,
      alacak: parseFloat(c.alacak) || 0,
    }));

    const { error: cozErr } = await supabase.from('cozumler').insert(cozumSatirlari);
    if (cozErr) {
      await supabase.from('sorular').delete().eq('id', yeniId);
      throw new Error('Çözüm eklenemedi: ' + cozErr.message);
    }

    alert('Sorun gönderildi. Admin inceleme tamamlanınca yayına çıkacak.');
    nav('/katkici-basvuru');
  };

  if (yetkiKontrolu === 'kontrol') {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 text-ink-quiet">
        Yetki kontrol ediliyor…
      </div>
    );
  }

  if (yetkiKontrolu === 'yetkisiz') {
    return (
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-12 text-center">
        <Icon name="Lock" size={32} className="text-ink-quiet mx-auto" />
        <h1 className="font-display text-2xl font-bold mt-4">Bu sayfa katkıcılara özel</h1>
        <p className="text-ink-soft mt-2">
          Soru ekleyebilmek için Katkıcı Programı'na başvurman gerekiyor.
        </p>
        <Link
          to="/katkici-basvuru"
          className="inline-flex items-center gap-2 bg-ink text-bg px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg mt-6"
        >
          <Icon name="UserPlus" size={12} />
          Başvuru Sayfasına Git
        </Link>
      </div>
    );
  }

  return (
    <main className="max-w-5xl mx-auto px-5 sm:px-8 py-8">
      <Link
        to="/katkici-basvuru"
        className="inline-flex items-center gap-1.5 text-[12px] tracking-[0.2em] uppercase font-bold text-ink-mute hover:text-ink transition mb-4"
      >
        <Icon name="ArrowLeft" size={12} />
        Katkıcı Profilim
      </Link>

      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Yeni Soru Öner
        </h1>
        {katkiSayisi !== null && (
          <div className="text-[12px] text-ink-soft">
            <strong>{katkiSayisi}</strong> / 5 onaylı katkı{' '}
            {katkiSayisi >= 5 ? (
              <span className="text-success dark:text-success font-bold">
                · 1 yıl Premium hediye edildi 🎉
              </span>
            ) : (
              <span>· 5'inci katkıdan sonra 1 yıl Premium</span>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-ink-soft font-medium mt-2 mb-6">
        Sorun otomatik olarak <strong>inceleme</strong> durumunda admin moderatörlere
        gider. Onaylanınca adına atfen yayında görünür.
      </p>

      <SoruForm
        baslangic={bosForm()}
        duzenleme={false}
        onKaydet={kaydet}
        onIptal={() => nav('/katkici-basvuru')}
      />
    </main>
  );
};
