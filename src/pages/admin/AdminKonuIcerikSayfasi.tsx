import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Block } from '@blocknote/core';
import { Icon } from '../../components/Icon';
import { Thiings } from '../../components/Thiings';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { IcerikEditor } from '../../components/IcerikEditor';
import { useUniteler } from '../../contexts/UnitelerContext';
import { supabase } from '../../lib/supabase';
import type { UniteKonusuRow, UnitesRow } from '../../lib/database.types';

type KayitDurum = 'bos' | 'degisiyor' | 'kaydediliyor' | 'kaydedildi' | 'hata';

const DURUM_ETIKET: Record<KayitDurum, string> = {
  bos: 'Henüz değişiklik yok',
  degisiyor: 'Kaydedilmedi',
  kaydediliyor: 'Kaydediliyor…',
  kaydedildi: 'Kaydedildi',
  hata: 'Kayıt başarısız',
};

const DURUM_RENK: Record<KayitDurum, string> = {
  bos: 'text-ink-mute',
  degisiyor: 'text-premium-deep',
  kaydediliyor: 'text-ink-soft',
  kaydedildi: 'text-success',
  hata: 'text-danger',
};

/**
 * Konu içerik editörü — bir alt-konunun BlockNote dökümanını düzenler.
 * URL: /admin/uniteler/:uniteId/konular/:konuId/icerik
 */
export const AdminKonuIcerikSayfasi = () => {
  const { uniteId, konuId } = useParams<{ uniteId: string; konuId: string }>();
  const nav = useNavigate();
  const { yenile: unitelerYenile } = useUniteler();

  const [unite, setUnite] = useState<UnitesRow | null>(null);
  const [konu, setKonu] = useState<UniteKonusuRow | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yuklemeHata, setYuklemeHata] = useState<string | null>(null);
  const [durum, setDurum] = useState<KayitDurum>('bos');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  const sonBloklarRef = useRef<Block[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!uniteId || !konuId) return;
    let iptal = false;
    setYukleniyor(true);
    Promise.all([
      supabase.from('unites').select('*').eq('id', uniteId).maybeSingle(),
      supabase.from('unite_konulari').select('*').eq('id', konuId).maybeSingle(),
    ]).then(([uniteR, konuR]) => {
      if (iptal) return;
      if (uniteR.error) {
        setYuklemeHata(uniteR.error.message);
        setYukleniyor(false);
        return;
      }
      if (konuR.error) {
        setYuklemeHata(konuR.error.message);
        setYukleniyor(false);
        return;
      }
      if (!uniteR.data || !konuR.data) {
        setYuklemeHata('Konu veya işletme bulunamadı.');
        setYukleniyor(false);
        return;
      }
      setUnite(uniteR.data as UnitesRow);
      setKonu(konuR.data as UniteKonusuRow);
      setYuklemeHata(null);
      setYukleniyor(false);
    });
    return () => {
      iptal = true;
    };
  }, [uniteId, konuId]);

  const kaydet = async (bloklar: Block[]) => {
    if (!konuId) return;
    setDurum('kaydediliyor');
    setHataMesaji(null);
    const { error } = await supabase
      .from('unite_konulari')
      .update({
        icerik: bloklar,
        icerik_guncellendi: new Date().toISOString(),
      })
      .eq('id', konuId);
    if (error) {
      setDurum('hata');
      setHataMesaji(error.message);
      return;
    }
    try {
      await unitelerYenile();
    } catch {
      // sessizce geç — kayıt zaten başarılı
    }
    setDurum('kaydedildi');
  };

  const elleKaydet = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (sonBloklarRef.current) kaydet(sonBloklarRef.current);
  };

  const editorDegisti = (bloklar: Block[]) => {
    sonBloklarRef.current = bloklar;
    setDurum('degisiyor');
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (sonBloklarRef.current) kaydet(sonBloklarRef.current);
    }, 1200);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />

        <div className="flex-1 min-w-0">
          <div className="mb-6 flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <button
                onClick={() => nav(`/admin/uniteler/${uniteId}/konular`)}
                className="inline-flex items-center gap-2 text-[12px] text-ink-mute hover:text-ink font-semibold mb-3 transition"
              >
                <Icon name="ArrowLeft" size={12} />
                Konular
              </button>

              {yukleniyor ? (
                <div className="text-[14px] text-ink-soft font-mono tracking-[0.16em] uppercase">
                  yükleniyor…
                </div>
              ) : yuklemeHata ? (
                <div className="text-[14px] text-danger font-semibold">{yuklemeHata}</div>
              ) : unite && konu ? (
                <div className="flex items-center gap-4">
                  {unite.thiings_icon && <Thiings name={unite.thiings_icon} size={48} />}
                  <div className="min-w-0">
                    <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold mb-1">
                      {unite.ad} · Konu içeriği
                    </div>
                    <h1 className="font-display text-[28px] sm:text-[34px] font-bold tracking-tight text-ink leading-tight">
                      {konu.ad}
                    </h1>
                    {konu.aciklama && (
                      <p className="text-[13px] text-ink-soft leading-relaxed mt-1 max-w-2xl">
                        {konu.aciklama}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <div
                className={`flex items-center gap-2 text-[11px] font-mono tracking-[0.16em] uppercase font-bold ${DURUM_RENK[durum]}`}
              >
                {durum === 'kaydediliyor' && (
                  <Icon name="Loader2" size={12} className="animate-spin" />
                )}
                {durum === 'kaydedildi' && <Icon name="Check" size={12} />}
                {durum === 'hata' && <Icon name="AlertCircle" size={12} />}
                {durum === 'degisiyor' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-premium" />
                )}
                <span>{DURUM_ETIKET[durum]}</span>
              </div>
              <button
                onClick={elleKaydet}
                disabled={durum === 'kaydediliyor' || !sonBloklarRef.current}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-ink text-bg text-[12px] font-bold tracking-wide hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Icon name="Save" size={12} />
                Şimdi kaydet
              </button>
            </div>
          </div>

          {hataMesaji && (
            <div className="mb-4 px-4 py-3 rounded-lg border border-danger-soft bg-danger-soft text-[13px] text-danger">
              <span className="font-bold">Kayıt hatası:</span> {hataMesaji}
            </div>
          )}

          <div className="mb-4 px-4 py-3 rounded-lg border border-line bg-surface-2/40 text-[12.5px] text-ink-soft leading-relaxed">
            <span className="font-bold text-ink">Mikro anlatım:</span> 200-400 söz hedefle.
            Sadece bu alt-konuyu anlat (ör: "mal alış"). Bu konunun soruları ayrıca alt
            kısımda otomatik listelenir — burada anlatımı kısa ve odaklı tut.
          </div>

          <div className="border border-line rounded-2xl bg-bg overflow-hidden">
            {!yukleniyor && konu && (
              <IcerikEditor initialContent={konu.icerik} onChange={editorDegisti} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
