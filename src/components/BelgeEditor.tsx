import { useState } from 'react';
import { Icon } from './Icon';
import { aiBelgeUret } from '../lib/ai';
import { gunAnahtari } from '../lib/format';
import type {
  Belge,
  BelgeTuru,
  CekBelge,
  CozumSatir,
  DekontBelge,
  DekontIslemTuru,
  FaturaBelge,
  FaturaKalem,
  PerakendeFisBelge,
  PerakendeFisKalem,
  SenetBelge,
} from '../types';

interface Props {
  belgeler: Belge[];
  onChange: (yeni: Belge[]) => void;
  baglam?: {
    soruBaslik: string;
    senaryo: string;
    aciklama?: string;
    cozum: CozumSatir[];
  };
}

const BUGUN = () => gunAnahtari();

const TUR_AD: Record<BelgeTuru, string> = {
  fatura: 'Fatura',
  'perakende-fis': 'Perakende Fişi',
  cek: 'Çek',
  senet: 'Senet',
  dekont: 'Dekont',
};

const bosBelge = (tur: BelgeTuru): Belge => {
  switch (tur) {
    case 'fatura':
      return {
        tur: 'fatura',
        faturaTipi: 'satis',
        faturaNo: '',
        tarih: BUGUN(),
        satici: { unvan: '' },
        alici: { unvan: '' },
        kalemler: [{ aciklama: '', miktar: 1, birim: 'ADET', birimFiyat: 0 }],
        kdvOrani: 20,
      };
    case 'perakende-fis':
      return {
        tur: 'perakende-fis',
        fisNo: '',
        tarih: BUGUN(),
        isletme: { unvan: '' },
        kalemler: [{ aciklama: '', miktar: 1, birimFiyat: 0, kdvOrani: 20 }],
        odemeYontemi: 'NAKIT',
      };
    case 'cek':
      return {
        tur: 'cek',
        cekNo: '',
        bankaAdi: '',
        duzenlemeTarihi: BUGUN(),
        vadeTarihi: BUGUN(),
        tutar: 0,
        lehtar: '',
        kesideci: { unvan: '' },
      };
    case 'senet':
      return {
        tur: 'senet',
        senetTipi: 'bono',
        senetNo: '',
        duzenlemeTarihi: BUGUN(),
        vadeTarihi: BUGUN(),
        tutar: 0,
        lehtar: { unvan: '' },
        borclu: { unvan: '' },
      };
    case 'dekont':
      return {
        tur: 'dekont',
        bankaAdi: '',
        dekontNo: '',
        islemTarihi: BUGUN(),
        islemTuru: 'HAVALE',
        aciklama: '',
        hesapSahibi: { unvan: '' },
        tutar: 0,
        yon: 'BORC',
      };
  }
};

export const BelgeEditor = ({ belgeler, onChange, baglam }: Props) => {
  const [acik, setAcik] = useState<number | null>(belgeler.length === 0 ? null : 0);
  const [secim, setSecim] = useState<BelgeTuru>('fatura');
  const [aiYukleniyor, setAiYukleniyor] = useState(false);
  const [aiHata, setAiHata] = useState<string | null>(null);

  const ekle = () => {
    const yeni = [...belgeler, bosBelge(secim)];
    onChange(yeni);
    setAcik(yeni.length - 1);
  };

  const aiIleUret = async () => {
    if (!baglam) return;
    const dolu = baglam.senaryo.trim() && baglam.cozum.some((s) => s.kod && (s.borc || s.alacak));
    if (!dolu) {
      setAiHata('AI için önce senaryo ve çözüm satırlarını doldur.');
      return;
    }
    setAiHata(null);
    setAiYukleniyor(true);
    try {
      const { belgeler: yeniler } = await aiBelgeUret({
        soruBaslik: baglam.soruBaslik,
        senaryo: baglam.senaryo,
        aciklama: baglam.aciklama,
        cozum: baglam.cozum.filter((s) => s.kod),
      });
      if (yeniler.length === 0) {
        setAiHata('AI belge üretemedi. Senaryo daha detaylı olmalı olabilir.');
        return;
      }
      const birlesik = [...belgeler, ...yeniler];
      onChange(birlesik);
      setAcik(belgeler.length);
    } catch (e) {
      setAiHata((e as Error).message);
    } finally {
      setAiYukleniyor(false);
    }
  };

  const sil = (idx: number) => {
    const yeni = belgeler.filter((_, i) => i !== idx);
    onChange(yeni);
    if (acik === idx) setAcik(null);
    else if (acik !== null && acik > idx) setAcik(acik - 1);
  };

  const guncelle = (idx: number, b: Belge) => {
    onChange(belgeler.map((eski, i) => (i === idx ? b : eski)));
  };

  return (
    <div className="bg-surface border border-line rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-lg font-bold tracking-tight">Belgeler</h3>
          <p className="text-[11px] text-ink-mute font-medium">
            Soruda öğrenciye gösterilecek fatura / fiş / çek / senet / dekont.
          </p>
        </div>
        <span className="text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold">
          {belgeler.length} adet
        </span>
      </div>

      {belgeler.length === 0 && (
        <div className="text-sm text-ink-mute font-medium italic mb-4 px-3 py-4 bg-bg-tint rounded-lg">
          Henüz belge yok. Aşağıdan tip seçip ekleyebilirsin.
        </div>
      )}

      <div className="space-y-2 mb-4">
        {belgeler.map((b, i) => {
          const acikMi = acik === i;
          return (
            <div
              key={i}
              className="border border-line rounded-lg overflow-hidden"
            >
              <div className="flex items-center justify-between px-3 py-2 bg-bg-tint">
                <button
                  type="button"
                  onClick={() => setAcik(acikMi ? null : i)}
                  className="flex items-center gap-2 flex-1 text-left text-sm font-bold"
                >
                  <Icon name={acikMi ? 'ChevronDown' : 'ChevronRight'} size={14} />
                  <span className="text-[10px] tracking-[0.2em] uppercase font-mono text-ink-mute">
                    #{i + 1}
                  </span>
                  <span>{TUR_AD[b.tur]}</span>
                  <span className="text-ink-mute font-medium font-mono text-xs">
                    {belgeOzet(b)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => sil(i)}
                  className="p-1.5 text-ink-quiet hover:text-danger hover:bg-danger-soft rounded transition"
                  title="Belgeyi sil"
                >
                  <Icon name="X" size={14} />
                </button>
              </div>
              {acikMi && (
                <div className="p-3 border-t border-line">
                  <BelgeAlanlari belge={b} onChange={(yeni) => guncelle(i, yeni)} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {aiHata && (
        <div className="mb-3 px-3 py-2 bg-danger-soft border border-danger-soft rounded-lg text-xs text-danger font-medium">
          {aiHata}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
        <select
          value={secim}
          onChange={(e) => setSecim(e.target.value as BelgeTuru)}
          className="px-3 py-2 bg-bg-tint border border-line-strong outline-none text-sm rounded-lg font-medium"
        >
          {(Object.keys(TUR_AD) as BelgeTuru[]).map((t) => (
            <option key={t} value={t}>
              {TUR_AD[t]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={ekle}
          className="flex items-center gap-2 px-4 py-2 bg-ink text-bg rounded-lg text-sm font-bold hover:opacity-90 active:scale-[0.98] transition"
        >
          <Icon name="Plus" size={14} />
          Belge Ekle
        </button>
        {baglam && (
          <button
            type="button"
            onClick={aiIleUret}
            disabled={aiYukleniyor}
            className="ml-auto flex items-center gap-2 px-4 py-2 bg-brand-deep hover:bg-brand-deep dark:bg-brand dark:hover:bg-brand text-bg rounded-lg text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            title="Senaryo ve çözümden belge üret"
          >
            <Icon name={aiYukleniyor ? 'Loader2' : 'Sparkles'} size={14} className={aiYukleniyor ? 'animate-spin' : ''} />
            {aiYukleniyor ? 'Üretiliyor…' : 'AI ile Oluştur'}
          </button>
        )}
      </div>
    </div>
  );
};

const belgeOzet = (b: Belge): string => {
  switch (b.tur) {
    case 'fatura':
      return `${b.faturaNo || '—'} · ${b.tarih}`;
    case 'perakende-fis':
      return `${b.fisNo || '—'} · ${b.tarih}`;
    case 'cek':
      return `${b.cekNo || '—'} · ${b.tutar}₺`;
    case 'senet':
      return `${b.senetNo || '—'} · ${b.tutar}₺`;
    case 'dekont':
      return `${b.dekontNo || '—'} · ${b.tutar}₺`;
  }
};

const BelgeAlanlari = ({
  belge,
  onChange,
}: {
  belge: Belge;
  onChange: (b: Belge) => void;
}) => {
  switch (belge.tur) {
    case 'fatura':
      return <FaturaAlanlari b={belge} on={onChange} />;
    case 'perakende-fis':
      return <PerakendeAlanlari b={belge} on={onChange} />;
    case 'cek':
      return <CekAlanlari b={belge} on={onChange} />;
    case 'senet':
      return <SenetAlanlari b={belge} on={onChange} />;
    case 'dekont':
      return <DekontAlanlari b={belge} on={onChange} />;
  }
};

// ── Ortak küçük input bileşenleri ────────────────────────────────────────────
const Etiket = ({ children }: { children: React.ReactNode }) => (
  <label className="block text-[10px] tracking-[0.2em] uppercase text-ink-mute font-bold mb-1">
    {children}
  </label>
);

const Metin = ({
  value,
  onChange: oc,
  placeholder,
  type = 'text',
}: {
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: 'text' | 'date' | 'number';
}) => (
  <input
    type={type}
    value={value}
    onChange={(e) => oc(e.target.value)}
    placeholder={placeholder}
    className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded font-medium"
  />
);

const Sayi = ({
  value,
  onChange: oc,
  step = '0.01',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: string;
}) => (
  <input
    type="number"
    step={step}
    value={value}
    onChange={(e) => oc(parseFloat(e.target.value) || 0)}
    className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong focus:border-ink focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/30 outline-none text-sm rounded font-mono text-right"
  />
);

// ── FATURA ────────────────────────────────────────────────────────────────────
const FaturaAlanlari = ({ b, on }: { b: FaturaBelge; on: (x: FaturaBelge) => void }) => {
  const setKalem = (i: number, k: Partial<FaturaKalem>) =>
    on({
      ...b,
      kalemler: b.kalemler.map((eski, idx) => (idx === i ? { ...eski, ...k } : eski)),
    });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Etiket>Fatura Tipi</Etiket>
          <select
            value={b.faturaTipi ?? 'satis'}
            onChange={(e) => on({ ...b, faturaTipi: e.target.value as 'satis' | 'alis' | 'iade' })}
            className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong outline-none text-sm rounded font-medium"
          >
            <option value="satis">Satış</option>
            <option value="alis">Alış</option>
            <option value="iade">İade</option>
          </select>
        </div>
        <div>
          <Etiket>Fatura No *</Etiket>
          <Metin value={b.faturaNo} onChange={(v) => on({ ...b, faturaNo: v })} placeholder="ABC2026000001" />
        </div>
        <div>
          <Etiket>Tarih *</Etiket>
          <Metin type="date" value={b.tarih} onChange={(v) => on({ ...b, tarih: v })} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2 p-2 bg-bg-tint/50 rounded">
          <div className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">
            Satıcı
          </div>
          <Metin
            value={b.satici.unvan}
            onChange={(v) => on({ ...b, satici: { ...b.satici, unvan: v } })}
            placeholder="Unvan"
          />
          <div className="grid grid-cols-2 gap-2">
            <Metin
              value={b.satici.vkn ?? ''}
              onChange={(v) => on({ ...b, satici: { ...b.satici, vkn: v } })}
              placeholder="VKN"
            />
            <Metin
              value={b.satici.vergiDairesi ?? ''}
              onChange={(v) => on({ ...b, satici: { ...b.satici, vergiDairesi: v } })}
              placeholder="V. Dairesi"
            />
          </div>
        </div>
        <div className="space-y-2 p-2 bg-bg-tint/50 rounded">
          <div className="text-[10px] tracking-[0.2em] uppercase text-ink-soft font-bold">
            Alıcı
          </div>
          <Metin
            value={b.alici.unvan}
            onChange={(v) => on({ ...b, alici: { ...b.alici, unvan: v } })}
            placeholder="Unvan"
          />
          <div className="grid grid-cols-2 gap-2">
            <Metin
              value={b.alici.vkn ?? ''}
              onChange={(v) => on({ ...b, alici: { ...b.alici, vkn: v } })}
              placeholder="VKN/TCKN"
            />
            <Metin
              value={b.alici.vergiDairesi ?? ''}
              onChange={(v) => on({ ...b, alici: { ...b.alici, vergiDairesi: v } })}
              placeholder="V. Dairesi"
            />
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Etiket>Kalemler</Etiket>
          <button
            type="button"
            onClick={() =>
              on({
                ...b,
                kalemler: [
                  ...b.kalemler,
                  { aciklama: '', miktar: 1, birim: 'ADET', birimFiyat: 0 },
                ],
              })
            }
            className="text-[11px] font-bold text-ink-soft hover:text-ink"
          >
            + satır
          </button>
        </div>
        <div className="space-y-1">
          {b.kalemler.map((k, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 items-start">
              <div className="col-span-5">
                <Metin value={k.aciklama} onChange={(v) => setKalem(i, { aciklama: v })} placeholder="Açıklama" />
              </div>
              <div className="col-span-2">
                <Sayi value={k.miktar} onChange={(v) => setKalem(i, { miktar: v })} />
              </div>
              <div className="col-span-2">
                <Metin value={k.birim} onChange={(v) => setKalem(i, { birim: v })} placeholder="ADET" />
              </div>
              <div className="col-span-2">
                <Sayi value={k.birimFiyat} onChange={(v) => setKalem(i, { birimFiyat: v })} />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => on({ ...b, kalemler: b.kalemler.filter((_, idx) => idx !== i) })}
                  disabled={b.kalemler.length <= 1}
                  className="p-1 text-ink-quiet hover:text-danger disabled:opacity-30"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <Etiket>KDV %</Etiket>
          <Sayi value={b.kdvOrani} onChange={(v) => on({ ...b, kdvOrani: v })} step="1" />
        </div>
        <div className="col-span-2">
          <Etiket>Not</Etiket>
          <Metin value={b.not ?? ''} onChange={(v) => on({ ...b, not: v })} />
        </div>
      </div>
    </div>
  );
};

// ── PERAKENDE FİŞİ ────────────────────────────────────────────────────────────
const PerakendeAlanlari = ({
  b,
  on,
}: {
  b: PerakendeFisBelge;
  on: (x: PerakendeFisBelge) => void;
}) => {
  const setKalem = (i: number, k: Partial<PerakendeFisKalem>) =>
    on({
      ...b,
      kalemler: b.kalemler.map((eski, idx) => (idx === i ? { ...eski, ...k } : eski)),
    });
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <Etiket>Fiş No *</Etiket>
          <Metin value={b.fisNo} onChange={(v) => on({ ...b, fisNo: v })} />
        </div>
        <div>
          <Etiket>Tarih *</Etiket>
          <Metin type="date" value={b.tarih} onChange={(v) => on({ ...b, tarih: v })} />
        </div>
        <div>
          <Etiket>Ödeme</Etiket>
          <select
            value={b.odemeYontemi ?? 'NAKIT'}
            onChange={(e) =>
              on({ ...b, odemeYontemi: e.target.value as 'NAKIT' | 'KART' | 'KARMA' })
            }
            className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong outline-none text-sm rounded font-medium"
          >
            <option value="NAKIT">Nakit</option>
            <option value="KART">Kart</option>
            <option value="KARMA">Karma</option>
          </select>
        </div>
      </div>
      <div>
        <Etiket>İşletme Unvanı</Etiket>
        <Metin value={b.isletme.unvan} onChange={(v) => on({ ...b, isletme: { ...b.isletme, unvan: v } })} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <Etiket>Kalemler</Etiket>
          <button
            type="button"
            onClick={() =>
              on({
                ...b,
                kalemler: [...b.kalemler, { aciklama: '', miktar: 1, birimFiyat: 0, kdvOrani: 20 }],
              })
            }
            className="text-[11px] font-bold text-ink-soft hover:text-ink"
          >
            + satır
          </button>
        </div>
        <div className="space-y-1">
          {b.kalemler.map((k, i) => (
            <div key={i} className="grid grid-cols-12 gap-1 items-start">
              <div className="col-span-5">
                <Metin value={k.aciklama} onChange={(v) => setKalem(i, { aciklama: v })} placeholder="Açıklama" />
              </div>
              <div className="col-span-2">
                <Sayi value={k.miktar} onChange={(v) => setKalem(i, { miktar: v })} />
              </div>
              <div className="col-span-2">
                <Sayi value={k.birimFiyat} onChange={(v) => setKalem(i, { birimFiyat: v })} />
              </div>
              <div className="col-span-2">
                <Sayi value={k.kdvOrani} onChange={(v) => setKalem(i, { kdvOrani: v })} step="1" />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => on({ ...b, kalemler: b.kalemler.filter((_, idx) => idx !== i) })}
                  disabled={b.kalemler.length <= 1}
                  className="p-1 text-ink-quiet hover:text-danger disabled:opacity-30"
                >
                  <Icon name="X" size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ── ÇEK ───────────────────────────────────────────────────────────────────────
const CekAlanlari = ({ b, on }: { b: CekBelge; on: (x: CekBelge) => void }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Etiket>Çek No *</Etiket>
        <Metin value={b.cekNo} onChange={(v) => on({ ...b, cekNo: v })} />
      </div>
      <div>
        <Etiket>Banka *</Etiket>
        <Metin value={b.bankaAdi} onChange={(v) => on({ ...b, bankaAdi: v })} placeholder="Garanti BBVA" />
      </div>
      <div>
        <Etiket>Şube</Etiket>
        <Metin value={b.subeAdi ?? ''} onChange={(v) => on({ ...b, subeAdi: v })} />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Etiket>Düzenleme Tarihi *</Etiket>
        <Metin type="date" value={b.duzenlemeTarihi} onChange={(v) => on({ ...b, duzenlemeTarihi: v })} />
      </div>
      <div>
        <Etiket>Vade Tarihi *</Etiket>
        <Metin type="date" value={b.vadeTarihi} onChange={(v) => on({ ...b, vadeTarihi: v })} />
      </div>
      <div>
        <Etiket>Tutar *</Etiket>
        <Sayi value={b.tutar} onChange={(v) => on({ ...b, tutar: v })} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Etiket>Lehtar (kimin lehine) *</Etiket>
        <Metin value={b.lehtar} onChange={(v) => on({ ...b, lehtar: v })} />
      </div>
      <div>
        <Etiket>Keşideci Unvanı *</Etiket>
        <Metin
          value={b.kesideci.unvan}
          onChange={(v) => on({ ...b, kesideci: { ...b.kesideci, unvan: v } })}
        />
      </div>
    </div>
  </div>
);

// ── SENET ─────────────────────────────────────────────────────────────────────
const SenetAlanlari = ({ b, on }: { b: SenetBelge; on: (x: SenetBelge) => void }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Etiket>Senet No *</Etiket>
        <Metin value={b.senetNo} onChange={(v) => on({ ...b, senetNo: v })} />
      </div>
      <div>
        <Etiket>Tip</Etiket>
        <select
          value={b.senetTipi ?? 'bono'}
          onChange={(e) => on({ ...b, senetTipi: e.target.value as 'bono' | 'police' })}
          className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong outline-none text-sm rounded font-medium"
        >
          <option value="bono">Bono</option>
          <option value="police">Poliçe</option>
        </select>
      </div>
      <div>
        <Etiket>Tutar *</Etiket>
        <Sayi value={b.tutar} onChange={(v) => on({ ...b, tutar: v })} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Etiket>Düzenleme Tarihi *</Etiket>
        <Metin type="date" value={b.duzenlemeTarihi} onChange={(v) => on({ ...b, duzenlemeTarihi: v })} />
      </div>
      <div>
        <Etiket>Vade Tarihi *</Etiket>
        <Metin type="date" value={b.vadeTarihi} onChange={(v) => on({ ...b, vadeTarihi: v })} />
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Etiket>Lehtar Unvanı *</Etiket>
        <Metin
          value={b.lehtar.unvan}
          onChange={(v) => on({ ...b, lehtar: { ...b.lehtar, unvan: v } })}
        />
      </div>
      <div>
        <Etiket>Borçlu Unvanı *</Etiket>
        <Metin
          value={b.borclu.unvan}
          onChange={(v) => on({ ...b, borclu: { ...b.borclu, unvan: v } })}
        />
      </div>
    </div>
  </div>
);

// ── DEKONT ────────────────────────────────────────────────────────────────────
const ISLEM_TURU_AD: Record<DekontIslemTuru, string> = {
  HAVALE: 'Havale',
  EFT: 'EFT',
  KREDI_KULLANIMI: 'Kredi kullanımı',
  KREDI_TAKSIT: 'Kredi taksiti',
  MASRAF: 'Banka masrafı',
  FAIZ_GELIRI: 'Faiz geliri',
  POS_TAHSILATI: 'POS tahsilatı',
};

const DekontAlanlari = ({ b, on }: { b: DekontBelge; on: (x: DekontBelge) => void }) => (
  <div className="space-y-3">
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Etiket>Banka *</Etiket>
        <Metin value={b.bankaAdi} onChange={(v) => on({ ...b, bankaAdi: v })} />
      </div>
      <div>
        <Etiket>Dekont No *</Etiket>
        <Metin value={b.dekontNo} onChange={(v) => on({ ...b, dekontNo: v })} />
      </div>
      <div>
        <Etiket>Tarih *</Etiket>
        <Metin type="date" value={b.islemTarihi} onChange={(v) => on({ ...b, islemTarihi: v })} />
      </div>
    </div>
    <div className="grid grid-cols-3 gap-3">
      <div>
        <Etiket>İşlem Türü *</Etiket>
        <select
          value={b.islemTuru}
          onChange={(e) => on({ ...b, islemTuru: e.target.value as DekontIslemTuru })}
          className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong outline-none text-sm rounded font-medium"
        >
          {(Object.keys(ISLEM_TURU_AD) as DekontIslemTuru[]).map((t) => (
            <option key={t} value={t}>
              {ISLEM_TURU_AD[t]}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Etiket>Tutar *</Etiket>
        <Sayi value={b.tutar} onChange={(v) => on({ ...b, tutar: v })} />
      </div>
      <div>
        <Etiket>Yön *</Etiket>
        <select
          value={b.yon}
          onChange={(e) => on({ ...b, yon: e.target.value as 'BORC' | 'ALACAK' })}
          className="w-full px-2.5 py-1.5 bg-bg-tint border border-line-strong outline-none text-sm rounded font-medium"
        >
          <option value="BORC">Borç (hesaptan çıkan)</option>
          <option value="ALACAK">Alacak (hesaba giren)</option>
        </select>
      </div>
    </div>
    <div>
      <Etiket>Hesap Sahibi Unvanı</Etiket>
      <Metin
        value={b.hesapSahibi.unvan}
        onChange={(v) => on({ ...b, hesapSahibi: { ...b.hesapSahibi, unvan: v } })}
      />
    </div>
    <div>
      <Etiket>Açıklama *</Etiket>
      <Metin value={b.aciklama} onChange={(v) => on({ ...b, aciklama: v })} placeholder="Mal bedeli ödemesi" />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Etiket>Masraf</Etiket>
        <Sayi value={b.masraf ?? 0} onChange={(v) => on({ ...b, masraf: v })} />
      </div>
      <div>
        <Etiket>BSMV</Etiket>
        <Sayi value={b.bsmv ?? 0} onChange={(v) => on({ ...b, bsmv: v })} />
      </div>
    </div>
  </div>
);
