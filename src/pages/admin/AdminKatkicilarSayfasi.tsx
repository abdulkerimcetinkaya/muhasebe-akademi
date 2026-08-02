import { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import {
  basvuruOnayla,
  basvuruReddet,
  katkiciYetkisiKaldir,
  tumBasvurulariYukle,
  UNVAN_ETIKETLERI,
  type KatkiciBasvuru,
} from '../../lib/katkici';
import type { KatkiciDurum } from '../../lib/database.types';

const tarihFormat = (s: string | null): string => {
  if (!s) return '—';
  return new Date(s).toLocaleString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DURUM_RENK: Record<KatkiciDurum, string> = {
  beklemede: 'text-premium-deep bg-premium-soft border-premium-soft',
  onayli: 'text-success dark:text-success bg-success-soft border-success-soft',
  reddedildi: 'text-danger dark:text-danger bg-danger-soft border-danger-soft',
};

export const AdminKatkicilarSayfasi = () => {
  const [list, setList] = useState<KatkiciBasvuru[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<KatkiciDurum | 'hepsi'>('beklemede');

  // Reddetme modal
  const [reddetTarget, setReddetTarget] = useState<KatkiciBasvuru | null>(null);
  const [redSebep, setRedSebep] = useState('');

  const yukle = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const data = await tumBasvurulariYukle();
      setList(data);
    } catch (e) {
      setHata(`Yüklenemedi: ${(e as Error).message}`);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  const filtreli = useMemo(() => {
    if (filtre === 'hepsi') return list;
    return list.filter((b) => b.durum === filtre);
  }, [list, filtre]);

  const sayilar = useMemo(
    () => ({
      bekleyen: list.filter((b) => b.durum === 'beklemede').length,
      onayli: list.filter((b) => b.durum === 'onayli').length,
      reddedilen: list.filter((b) => b.durum === 'reddedildi').length,
    }),
    [list],
  );

  const onayla = async (b: KatkiciBasvuru) => {
    if (!confirm(`${b.ad_soyad} (${UNVAN_ETIKETLERI[b.unvan]}) onaylansın mı?`)) return;
    try {
      await basvuruOnayla(b.id);
      await yukle();
    } catch (e) {
      alert(`Onaylanamadı: ${(e as Error).message}`);
    }
  };

  const reddet = async () => {
    if (!reddetTarget) return;
    if (redSebep.trim().length < 10) {
      alert('Red sebebi en az 10 karakter olmalı.');
      return;
    }
    try {
      await basvuruReddet(reddetTarget.id, redSebep.trim());
      await yukle();
      setReddetTarget(null);
      setRedSebep('');
    } catch (e) {
      alert(`Reddedilemedi: ${(e as Error).message}`);
    }
  };

  const yetkiKaldir = async (b: KatkiciBasvuru) => {
    if (
      !confirm(
        `${b.ad_soyad} kullanıcısının katkıcı yetkisi kaldırılsın mı? Yeni soru ekleyemez ama eklediği onaylı sorular yayında kalır.`,
      )
    )
      return;
    try {
      await katkiciYetkisiKaldir(b.user_id);
      await yukle();
    } catch (e) {
      alert(`Kaldırılamadı: ${(e as Error).message}`);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-6">
          <AdminSayfaBaslik
            baslik="Katkıcı Başvuruları"
            aciklama={
              <>
                <strong className="text-premium-deep">{sayilar.bekleyen}</strong> bekleyen ·{' '}
                <strong className="text-success dark:text-success">{sayilar.onayli}</strong> onaylı ·{' '}
                <strong className="text-danger dark:text-danger">{sayilar.reddedilen}</strong> reddedilen
              </>
            }
          />

          <div className="flex items-center gap-2 flex-wrap">
            {(['beklemede', 'onayli', 'reddedildi', 'hepsi'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltre(f)}
                className={`px-3 py-1.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg border transition ${
 filtre === f
 ? 'bg-ink text-bg border-ink'
 : 'border-line-strong hover:bg-bg-tint '
 }`}
              >
                {f === 'hepsi' ? 'Hepsi' : f === 'beklemede' ? 'Bekleyen' : f === 'onayli' ? 'Onaylı' : 'Reddedilen'}
              </button>
            ))}
          </div>

          {hata && (
            <div className="flex items-start gap-2 p-3 bg-danger-soft border border-danger-soft rounded-lg text-[13px] text-danger font-medium">
              <Icon name="AlertCircle" size={16} className="flex-shrink-0 mt-0.5" />
              <span>{hata}</span>
            </div>
          )}

          {yukleniyor ? (
            <div className="text-sm text-ink-quiet">Yükleniyor…</div>
          ) : filtreli.length === 0 ? (
            <div className="text-sm text-ink-quiet text-center py-12 border border-dashed border-line-strong rounded-xl">
              Bu filtreyle eşleşen başvuru yok.
            </div>
          ) : (
            <div className="space-y-3">
              {filtreli.map((b) => (
                <div
                  key={b.id}
                  className="bg-surface border border-line rounded-xl p-5"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-display text-[16px] font-bold">
                          {b.ad_soyad}
                        </span>
                        <span
                          className={`text-[10px] tracking-wider uppercase font-mono font-bold px-2 py-0.5 rounded border ${DURUM_RENK[b.durum]}`}
                        >
                          {b.durum}
                        </span>
                        <span className="text-[11px] tracking-wider uppercase font-mono font-bold text-ink-mute bg-surface-2 px-1.5 py-0.5 rounded">
                          {UNVAN_ETIKETLERI[b.unvan]}
                        </span>
                      </div>
                      {b.kurum && (
                        <div className="text-[12.5px] text-ink-soft mt-1">
                          {b.kurum}
                        </div>
                      )}
                      {b.iletisim_email && (
                        <div className="text-[11.5px] font-mono text-ink-mute mt-0.5">
                          {b.iletisim_email}
                        </div>
                      )}
                      <div className="text-[11px] text-ink-quiet mt-1 font-mono">
                        Başvuru: {tarihFormat(b.created_at)}
                        {b.karar_at && ` · Karar: ${tarihFormat(b.karar_at)}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {b.durum === 'beklemede' && (
                        <>
                          <button
                            onClick={() => onayla(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-bold bg-success hover:bg-success text-bg rounded-lg transition"
                          >
                            <Icon name="BadgeCheck" size={11} />
                            Onayla
                          </button>
                          <button
                            onClick={() => setReddetTarget(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-bold border border-danger-soft text-danger dark:text-danger hover:bg-danger-soft rounded-lg transition"
                          >
                            <Icon name="XCircle" size={11} />
                            Reddet
                          </button>
                        </>
                      )}
                      {b.durum === 'onayli' && (
                        <button
                          onClick={() => yetkiKaldir(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] tracking-[0.2em] uppercase font-bold border border-danger-soft text-danger dark:text-danger hover:bg-danger-soft rounded-lg transition"
                        >
                          <Icon name="Lock" size={11} />
                          Yetki Kaldır
                        </button>
                      )}
                    </div>
                  </div>

                  {b.aciklama && (
                    <div className="mt-3 text-[13px] leading-relaxed bg-bg-tint border border-line rounded-lg p-3 whitespace-pre-wrap">
                      {b.aciklama}
                    </div>
                  )}

                  {b.red_sebep && (
                    <div className="mt-2 text-[12.5px] text-danger bg-danger-soft border border-danger-soft rounded-lg p-3">
                      <strong>Red sebebi:</strong> {b.red_sebep}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Reddetme modalı */}
      {reddetTarget && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
          onClick={() => setReddetTarget(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-line rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-xl"
          >
            <div>
              <h2 className="font-display text-xl font-bold tracking-tight">
                Başvuruyu Reddet
              </h2>
              <p className="text-[12px] text-ink-mute mt-1">
                <strong>{reddetTarget.ad_soyad}</strong> için red sebebi yaz. Kullanıcıya gösterilecek.
              </p>
            </div>

            <textarea
              value={redSebep}
              onChange={(e) => setRedSebep(e.target.value)}
              autoFocus
              rows={4}
              minLength={10}
              maxLength={500}
              placeholder="Doğrulanamayan beyan, eksik açıklama, vs."
              className="w-full px-3 py-2 bg-bg-tint border border-line-strong rounded-lg text-sm font-medium outline-none focus:border-ink resize-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setReddetTarget(null);
                  setRedSebep('');
                }}
                className="px-4 py-2 text-[11px] tracking-[0.2em] uppercase font-bold border border-line-strong rounded-lg hover:bg-bg-tint transition"
              >
                Vazgeç
              </button>
              <button
                onClick={reddet}
                className="inline-flex items-center gap-2 bg-danger hover:bg-danger text-bg px-5 py-2 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg transition"
              >
                <Icon name="XCircle" size={12} />
                Reddet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
