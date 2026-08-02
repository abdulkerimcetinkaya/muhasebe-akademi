import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import { SoruForm } from '../../components/SoruForm';
import type { SoruFormDegerleri } from '../../components/SoruForm';
import { useUniteler } from '../../contexts/UnitelerContext';
import { supabase } from '../../lib/supabase';
import type { Belge } from '../../types';

export const AdminDuzenleSoruSayfasi = () => {
  const { soruId } = useParams<{ soruId: string }>();
  const nav = useNavigate();
  const { yenile } = useUniteler();
  const [baslangic, setBaslangic] = useState<SoruFormDegerleri | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    if (!soruId) return;
    const yukle = async () => {
      const [soruR, cozR] = await Promise.all([
        supabase.from('sorular').select('*').eq('id', soruId).maybeSingle(),
        supabase.from('cozumler').select('*').eq('soru_id', soruId).order('sira'),
      ]);
      if (soruR.error) {
        setHata(soruR.error.message);
        return;
      }
      if (!soruR.data) {
        setHata('Soru bulunamadı.');
        return;
      }
      const s = soruR.data;
      setBaslangic({
        id: s.id,
        unite_id: s.unite_id,
        konu_id: s.konu_id ?? '',
        alt_baslik_id: s.alt_baslik_id ?? '',
        baslik: s.baslik,
        zorluk: s.zorluk,
        senaryo: s.senaryo,
        ipucu: s.ipucu ?? '',
        aciklama: s.aciklama ?? '',
        durum: s.durum,
        kaynak: s.kaynak ?? 'manuel',
        cozumler:
          (cozR.data ?? []).map((c) => ({
            kod: c.kod,
            borc: c.borc > 0 ? String(c.borc) : '',
            alacak: c.alacak > 0 ? String(c.alacak) : '',
          })) || [],
        belgeler: Array.isArray(s.belgeler) ? (s.belgeler as Belge[]) : [],
      });
    };
    yukle().catch((e) => setHata(String(e)));
  }, [soruId]);

  const kaydet = async (d: SoruFormDegerleri) => {
    const dolular = d.cozumler.filter((c) => c.kod.trim());

    // Soru güncelle
    const yayinTarihi = d.durum === 'onayli' ? new Date().toISOString() : null;
    const { error: soruErr } = await supabase
      .from('sorular')
      .update({
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
        yayinlanma_tarihi: yayinTarihi,
        belgeler: d.belgeler,
      })
      .eq('id', d.id);

    if (soruErr) throw new Error('Soru güncellenemedi: ' + soruErr.message);

    // Çözümleri sil + yeniden ekle (basit ve hatasız strateji)
    const { error: silErr } = await supabase.from('cozumler').delete().eq('soru_id', d.id);
    if (silErr) throw new Error('Eski çözümler silinemedi: ' + silErr.message);

    const cozumSatirlari = dolular.map((c, i) => ({
      soru_id: d.id,
      sira: i + 1,
      kod: c.kod.trim(),
      borc: parseFloat(c.borc) || 0,
      alacak: parseFloat(c.alacak) || 0,
    }));
    const { error: ekleErr } = await supabase.from('cozumler').insert(cozumSatirlari);
    if (ekleErr) throw new Error('Yeni çözümler eklenemedi: ' + ekleErr.message);

    // Public sayfaların güncel veriyi göstermesi için context cache'ini yenile
    await yenile();
    nav('/admin/sorular');
  };

  if (hata) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        <AdminYanMenu />
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-sm text-danger font-medium">
            <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
            <span>{hata}</span>
          </div>
        </div>
      </main>
    );
  }

  if (!baslangic) {
    return (
      <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
        <AdminYanMenu />
        <div className="flex-1 min-w-0 flex items-center justify-center py-16">
          <Icon name="Loader2" size={20} className="animate-spin text-ink-mute" />
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-6 py-8 flex gap-8">
      <AdminYanMenu />
      <div className="flex-1 min-w-0">
        <AdminSayfaBaslik
          baslik="Soruyu Düzenle"
          aciklama={<span className="font-mono">{baslangic.id}</span>}
        />
        <SoruForm
          baslangic={baslangic}
          duzenleme={true}
          onKaydet={kaydet}
          onIptal={() => nav('/admin/sorular')}
        />
      </div>
    </main>
  );
};
