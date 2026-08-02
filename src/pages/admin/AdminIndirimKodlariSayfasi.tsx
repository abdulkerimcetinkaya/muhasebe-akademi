import { useEffect, useState } from 'react';
import { Icon } from '../../components/Icon';
import { AdminYanMenu } from '../../components/AdminYanMenu';
import { AdminSayfaBaslik } from '../../components/AdminSayfaBaslik';
import {
  indirimKoduGuncelle,
  indirimKoduOlustur,
  indirimKoduSil,
  rastgeleKodUret,
  tumIndirimKodlariYukle,
  type IndirimKodu,
  type YeniIndirimKodu,
} from '../../lib/indirim';
import { planlariYukle, type Plan } from '../../lib/odeme';

const tarihFormat = (s: string | null): string => {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const AdminIndirimKodlariSayfasi = () => {
  const [list, setList] = useState<IndirimKodu[]>([]);
  const [planlar, setPlanlar] = useState<Plan[]>([]);
  const [yukleniyor, setYukleniyor] = useState(true);
  const [hata, setHata] = useState<string | null>(null);

  // Form state (yeni kod)
  const [formAcik, setFormAcik] = useState(false);
  const [kod, setKod] = useState('');
  const [yuzde, setYuzde] = useState(20);
  const [maxKullanim, setMaxKullanim] = useState<string>('');
  const [bitisTarihi, setBitisTarihi] = useState('');
  const [planKodu, setPlanKodu] = useState<string>('');
  const [aciklama, setAciklama] = useState('');
  const [kaydediliyor, setKaydediliyor] = useState(false);

  const yukle = async () => {
    setYukleniyor(true);
    setHata(null);
    try {
      const [kodlar, plnlar] = await Promise.all([
        tumIndirimKodlariYukle(),
        planlariYukle().catch(() => [] as Plan[]),
      ]);
      setList(kodlar);
      setPlanlar(plnlar);
    } catch (e) {
      setHata(`Yüklenemedi: ${(e as Error).message}`);
    } finally {
      setYukleniyor(false);
    }
  };

  useEffect(() => {
    yukle();
  }, []);

  const formuSifirla = () => {
    setKod('');
    setYuzde(20);
    setMaxKullanim('');
    setBitisTarihi('');
    setPlanKodu('');
    setAciklama('');
  };

  const olustur = async () => {
    if (!kod.trim() || yuzde < 1 || yuzde > 100) {
      setHata('Kod ve indirim yüzdesi (1-100) zorunlu');
      return;
    }
    setKaydediliyor(true);
    setHata(null);
    try {
      const yeni: YeniIndirimKodu = {
        kod: kod.trim(),
        indirim_yuzde: yuzde,
        max_kullanim: maxKullanim.trim() ? parseInt(maxKullanim, 10) : null,
        bitis_tarihi: bitisTarihi ? new Date(bitisTarihi).toISOString() : null,
        aktif: true,
        aciklama: aciklama.trim() || null,
        plan_kodu: planKodu || null,
      };
      await indirimKoduOlustur(yeni);
      formuSifirla();
      setFormAcik(false);
      await yukle();
    } catch (e) {
      setHata((e as Error).message);
    } finally {
      setKaydediliyor(false);
    }
  };

  const aktiflikDegistir = async (k: IndirimKodu) => {
    try {
      await indirimKoduGuncelle(k.id, { aktif: !k.aktif });
      await yukle();
    } catch (e) {
      setHata((e as Error).message);
    }
  };

  const sil = async (k: IndirimKodu) => {
    if (!confirm(`"${k.kod}" kodunu silmek istediğine emin misin? Kullanım kayıtları da silinir.`)) {
      return;
    }
    try {
      await indirimKoduSil(k.id);
      await yukle();
    } catch (e) {
      setHata((e as Error).message);
    }
  };

  return (
    <div className="max-w-[1240px] mx-auto px-5 sm:px-8 py-8">
      <div className="flex gap-8">
        <AdminYanMenu />
        <main className="flex-1 min-w-0 space-y-6">
          <AdminSayfaBaslik
            baslik="İndirim Kodları"
            aciklama="Pazarlama kampanyaları + okul fulfillment için. %100 kod = ücretsiz aktivasyon."
            aksiyon={
              <button
                type="button"
                onClick={() => setFormAcik(!formAcik)}
                className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg hover:opacity-90 transition"
              >
                <Icon name={formAcik ? 'X' : 'Plus'} size={12} />
                {formAcik ? 'Kapat' : 'Yeni Kod'}
              </button>
            }
          />

          {hata && (
            <div className="p-3 rounded-lg bg-danger-soft border border-danger-soft text-[13px] text-danger">
              {hata}
            </div>
          )}

          {formAcik && (
            <div className="rounded-2xl border border-line bg-surface p-6 space-y-4">
              <h2 className="font-display text-xl font-bold tracking-tight">Yeni Kod</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Kod *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={kod}
                      onChange={(e) => setKod(e.target.value.toUpperCase())}
                      placeholder="LAUNCH50"
                      maxLength={32}
                      className="flex-1 px-3 py-2 bg-bg-tint border border-line rounded-lg text-[13px] font-mono uppercase outline-none focus:border-ink"
                    />
                    <button
                      type="button"
                      onClick={() => setKod(rastgeleKodUret(8))}
                      className="px-3 py-2 text-[11px] tracking-[0.15em] uppercase font-bold rounded-lg border border-line-strong hover:bg-surface-2 transition"
                    >
                      Rastgele
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    İndirim % *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={yuzde}
                    onChange={(e) => setYuzde(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-3 py-2 bg-bg-tint border border-line rounded-lg text-[13px] outline-none focus:border-ink"
                  />
                  <div className="text-[11px] text-ink-mute mt-1">
                    %100 = ücretsiz aktivasyon (iyzico atlanır)
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Maksimum Kullanım
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={maxKullanim}
                    onChange={(e) => setMaxKullanim(e.target.value)}
                    placeholder="Sınırsız (boş bırak)"
                    className="w-full px-3 py-2 bg-bg-tint border border-line rounded-lg text-[13px] outline-none focus:border-ink"
                  />
                  <div className="text-[11px] text-ink-mute mt-1">
                    Okul fulfillment için: 30 öğrenci → 30
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Bitiş Tarihi
                  </label>
                  <input
                    type="date"
                    value={bitisTarihi}
                    onChange={(e) => setBitisTarihi(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-tint border border-line rounded-lg text-[13px] outline-none focus:border-ink"
                  />
                </div>

                <div>
                  <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                    Plan (opsiyonel)
                  </label>
                  <select
                    value={planKodu}
                    onChange={(e) => setPlanKodu(e.target.value)}
                    className="w-full px-3 py-2 bg-bg-tint border border-line rounded-lg text-[13px] outline-none focus:border-ink"
                  >
                    <option value="">Tüm planlar</option>
                    {planlar.map((p) => (
                      <option key={p.kod} value={p.kod}>
                        {p.ad} (₺{p.tutar})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] tracking-[0.2em] uppercase font-bold text-ink-mute mb-1.5">
                  Açıklama (admin notu)
                </label>
                <input
                  type="text"
                  value={aciklama}
                  onChange={(e) => setAciklama(e.target.value)}
                  placeholder="Örn: Yıldız Eğitim 30 öğrenci, ödeme 7 May"
                  className="w-full px-3 py-2 bg-bg-tint border border-line rounded-lg text-[13px] outline-none focus:border-ink"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={olustur}
                  disabled={kaydediliyor || !kod.trim()}
                  className="px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg bg-ink text-bg hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {kaydediliyor ? 'Kaydediliyor…' : 'Oluştur'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFormAcik(false);
                    formuSifirla();
                  }}
                  className="px-5 py-2.5 text-[11px] tracking-[0.2em] uppercase font-bold rounded-lg border border-line-strong hover:bg-surface-2 transition"
                >
                  İptal
                </button>
              </div>
            </div>
          )}

          {/* Liste */}
          {yukleniyor ? (
            <div className="text-ink-mute text-sm">Yükleniyor…</div>
          ) : list.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center text-ink-mute text-sm">
              Henüz kod oluşturulmadı. "Yeni Kod" ile başlayabilirsin.
            </div>
          ) : (
            <div className="rounded-2xl border border-line overflow-hidden">
              <table className="w-full text-[13px]">
                <thead className="bg-bg-tint text-[10px] tracking-[0.2em] uppercase text-ink-mute">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">Kod</th>
                    <th className="text-left px-4 py-3 font-bold">İndirim</th>
                    <th className="text-left px-4 py-3 font-bold">Kullanım</th>
                    <th className="text-left px-4 py-3 font-bold">Plan</th>
                    <th className="text-left px-4 py-3 font-bold">Bitiş</th>
                    <th className="text-left px-4 py-3 font-bold">Açıklama</th>
                    <th className="text-right px-4 py-3 font-bold">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {list.map((k) => {
                    const kullanim = k.kullanim_sayisi ?? 0;
                    const limit = k.max_kullanim;
                    const dolu = limit != null && kullanim >= limit;
                    const sureBitti =
                      k.bitis_tarihi != null && new Date(k.bitis_tarihi) < new Date();
                    return (
                      <tr key={k.id} className="hover:bg-bg-tint">
                        <td className="px-4 py-3 font-mono font-semibold">
                          {k.kod}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-display font-bold ${
 k.indirim_yuzde === 100
 ? 'text-danger dark:text-danger'
 : ''
 }`}
                          >
                            %{k.indirim_yuzde}
                          </span>
                          {k.indirim_yuzde === 100 && (
                            <span className="ml-1 text-[10px] tracking-[0.15em] uppercase text-danger dark:text-danger">
                              ücretsiz
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-[12px]">
                          {kullanim} / {limit ?? '∞'}
                          {dolu && (
                            <span className="ml-1.5 text-[10px] tracking-[0.15em] uppercase text-danger dark:text-danger">
                              dolu
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-ink-soft">
                          {k.plan_kodu || 'tümü'}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-ink-soft">
                          {tarihFormat(k.bitis_tarihi)}
                          {sureBitti && (
                            <span className="ml-1.5 text-[10px] tracking-[0.15em] uppercase text-danger dark:text-danger">
                              bitti
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-[12px] text-ink-soft max-w-[240px] truncate">
                          {k.aciklama ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => aktiflikDegistir(k)}
                              className={`text-[10px] tracking-[0.2em] uppercase font-bold px-2 py-1 rounded transition ${
 k.aktif
 ? 'bg-success-soft text-success dark:text-success hover:bg-success-soft'
 : 'bg-line-soft text-ink-soft hover:bg-line '
 }`}
                            >
                              {k.aktif ? 'Aktif' : 'Pasif'}
                            </button>
                            <button
                              type="button"
                              onClick={() => sil(k)}
                              className="text-[10px] tracking-[0.2em] uppercase font-bold px-2 py-1 rounded bg-danger-soft text-danger dark:text-danger hover:bg-danger-soft transition"
                            >
                              Sil
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
