import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { SoruForm, bosForm } from '../../components/SoruForm';
import type { SoruFormDegerleri } from '../../components/SoruForm';
import { useUniteler } from '../../contexts/UnitelerContext';
import { supabase } from '../../lib/supabase';

// 8 haneli rastgele alfanumerik ID. 36^8 ≈ 2.8 trilyon kombinasyon.
const ID_KARAKTERLER = 'abcdefghijkmnpqrstuvwxyz23456789'; // 0,1,l,o yok (karışıklık)

const idUret = (): string => {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  let s = '';
  for (let i = 0; i < 8; i++) s += ID_KARAKTERLER[buf[i] % ID_KARAKTERLER.length];
  return s;
};

// Çok düşük ihtimal ama çakışma olursa yeniden dene.
const benzersizId = async (): Promise<string> => {
  for (let i = 0; i < 5; i++) {
    const aday = idUret();
    const { count } = await supabase
      .from('sorular')
      .select('id', { count: 'exact', head: true })
      .eq('id', aday);
    if ((count ?? 0) === 0) return aday;
  }
  throw new Error('Benzersiz ID üretilemedi (5 deneme).');
};

export const AdminYeniSoruSayfasi = () => {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { yenile } = useUniteler();
  const [baslangic, setBaslangic] = useState<SoruFormDegerleri | null>(null);

  // URL ?alt=<alt-baslik-id> ile geldiyse, o alt başlığın işletmesini bulup
  // formu pre-fill et. (Alt başlık → modül → işletme zinciri ile.)
  useEffect(() => {
    const altId = params.get('alt');
    if (!altId) {
      setBaslangic(bosForm());
      return;
    }
    (async () => {
      const { data: alt } = await supabase
        .from('modul_alt_basliklari')
        .select('modul_id')
        .eq('id', altId)
        .maybeSingle();
      let uniteId = '';
      if (alt?.modul_id) {
        const { data: mod } = await supabase
          .from('unite_modulleri')
          .select('unite_id')
          .eq('id', alt.modul_id)
          .maybeSingle();
        uniteId = mod?.unite_id ?? '';
      }
      setBaslangic({
        ...bosForm(),
        unite_id: uniteId,
        alt_baslik_id: altId,
      });
    })();
  }, [params]);

  const kaydet = async (d: SoruFormDegerleri) => {
    const dolular = d.cozumler.filter((c) => c.kod.trim());
    const simdi = new Date().toISOString();
    const yeniId = await benzersizId();

    const { error: soruErr } = await supabase.from('sorular').insert({
      id: yeniId,
      unite_id: d.unite_id,
      konu_id: d.konu_id || null,
      alt_baslik_id: d.alt_baslik_id || null,
      baslik: d.baslik,
      zorluk: d.zorluk,
      senaryo: d.senaryo,
      ipucu: d.ipucu || null,
      aciklama: d.aciklama || null,
      durum: d.durum,
      kaynak: d.kaynak || null,
      yayinlanma_tarihi: d.durum === 'onayli' ? simdi : null,
      belgeler: d.belgeler,
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

    // Alt başlık seçildiyse atölye müfredatına da otomatik ekle (en sona).
    // Junction sırası mevcut max + 1; admin sonra Atölye Soruları sayfasından
    // sürükleyip yeniden sıralayabilir veya kaldırabilir.
    if (d.alt_baslik_id) {
      const { data: mevcut } = await supabase
        .from('atolye_sorulari')
        .select('sira')
        .eq('alt_baslik_id', d.alt_baslik_id)
        .order('sira', { ascending: false })
        .limit(1)
        .maybeSingle();
      const yeniSira = (mevcut?.sira ?? 0) + 1;
      await supabase.from('atolye_sorulari').insert({
        alt_baslik_id: d.alt_baslik_id,
        soru_id: yeniId,
        sira: yeniSira,
      });
    }

    // Public sayfaların güncel veriyi göstermesi için context cache'ini yenile
    await yenile();
    nav('/admin/sorular');
  };

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <h1 className="font-display text-3xl font-bold tracking-tight mb-1">Yeni Soru</h1>
        <p className="text-sm text-ink-soft font-medium mb-6">
          Manuel soru ekleme. Onaylı durumda kaydedilirse hemen yayında olur.
        </p>
        {baslangic && (
          <SoruForm
            baslangic={baslangic}
            duzenleme={false}
            onKaydet={kaydet}
            onIptal={() => nav('/admin/sorular')}
          />
        )}
      </div>
    </main>
  );
};
