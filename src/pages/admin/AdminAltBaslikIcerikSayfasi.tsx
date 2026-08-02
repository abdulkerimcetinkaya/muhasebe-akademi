// AdminAltBaslikIcerikSayfasi — bir alt başlığın (atölyenin) konu anlatımını
// BlockNote ile düzenler. `modul_alt_basliklari.icerik` alanına yazar.
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Block } from '@blocknote/core';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { IcerikEditor } from '../../components/IcerikEditor';
import { useUniteler } from '../../contexts/UnitelerContext';
import { supabase } from '../../lib/supabase';
import type { ModulAltBaslikRow } from '../../lib/database.types';

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

export const AdminAltBaslikIcerikSayfasi = () => {
  const { uniteId, modulId, altId } = useParams<{
    uniteId: string;
    modulId: string;
    altId: string;
  }>();
  const nav = useNavigate();
  const { yenile: unitelerYenile } = useUniteler();

  const [altBaslik, setAltBaslik] = useState<ModulAltBaslikRow | null>(null);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [yuklemeHata, setYuklemeHata] = useState<string | null>(null);
  const [durum, setDurum] = useState<KayitDurum>('bos');
  const [hataMesaji, setHataMesaji] = useState<string | null>(null);

  const sonBloklarRef = useRef<Block[] | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!altId) return;
    let iptal = false;
    setYukleniyor(true);
    supabase
      .from('modul_alt_basliklari')
      .select('*')
      .eq('id', altId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (iptal) return;
        if (error) {
          setYuklemeHata(error.message);
          setYukleniyor(false);
          return;
        }
        if (!data) {
          setYuklemeHata('Alt başlık bulunamadı.');
          setYukleniyor(false);
          return;
        }
        setAltBaslik(data as ModulAltBaslikRow);
        setYuklemeHata(null);
        setYukleniyor(false);
      });
    return () => {
      iptal = true;
    };
  }, [altId]);

  const kaydet = async (bloklar: Block[]) => {
    if (!altId) return;
    setDurum('kaydediliyor');
    setHataMesaji(null);
    const { error } = await supabase
      .from('modul_alt_basliklari')
      .update({
        icerik: bloklar,
        icerik_guncellendi: new Date().toISOString(),
      })
      .eq('id', altId);
    if (error) {
      setDurum('hata');
      setHataMesaji(error.message);
      return;
    }
    try {
      await unitelerYenile();
    } catch {
      // sessizce geç
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
                onClick={() =>
                  nav(`/admin/isletmeler/${uniteId}/moduller/${modulId}/alt-basliklar`)
                }
                className="inline-flex items-center gap-2 text-[12px] text-ink-mute hover:text-ink font-semibold mb-3 transition"
              >
                <Icon name="ArrowLeft" size={12} />
                Alt Başlıklar
              </button>

              {yukleniyor ? (
                <div className="text-[14px] text-ink-soft font-mono tracking-[0.16em] uppercase">
                  yükleniyor…
                </div>
              ) : yuklemeHata ? (
                <div className="text-[14px] text-danger font-semibold">{yuklemeHata}</div>
              ) : altBaslik ? (
                <div>
                  <div className="text-[10px] tracking-[0.3em] uppercase text-ink-mute font-bold mb-1">
                    Atölye Sırası {altBaslik.sira} · Konu Anlatımı
                  </div>
                  <h1 className="font-display text-[28px] sm:text-[34px] font-bold tracking-tight text-ink leading-tight">
                    {altBaslik.baslik}
                  </h1>
                  {altBaslik.karma && (
                    <span className="inline-flex items-center gap-1 mt-2 text-[10px] tracking-[0.22em] uppercase font-bold text-premium-deep dark:text-premium">
                      <Icon name="Star" size={10} />
                      Karma atölye
                    </span>
                  )}
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
            <span className="font-bold text-ink">Notion-tarzı yazım:</span>{' '}
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-bg border border-line">
              /
            </kbd>{' '}
            ile blok ekle.{' '}
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-bg border border-line">
              **
            </kbd>{' '}
            kalın,{' '}
            <kbd className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-bg border border-line">
              _
            </kbd>{' '}
            italik. Yazım durunca otomatik kaydedilir.
          </div>

          <div className="border border-line rounded-2xl bg-bg overflow-hidden">
            {!yukleniyor && altBaslik && (
              <IcerikEditor initialContent={altBaslik.icerik} onChange={editorDegisti} />
            )}
          </div>
        </div>
      </div>
    </main>
  );
};
