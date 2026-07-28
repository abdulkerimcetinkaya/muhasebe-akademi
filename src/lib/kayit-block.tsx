// Özel BlockNote bloğu — Mini Kayıt (ders içi yevmiye alıştırması).
//
// Öğrenci bir senaryo okur; her hesabı Borç/Alacak tarafına yerleştirir;
// "Kontrol et" → anında doğru/yanlış + doğru kayıt + açıklama. Soru çözme
// ekranına YÖNLENDİRMEZ; hafif, ders içi bir "yap" alıştırmasıdır.
//
// props:
//   senaryo:  "İşletme peşin 10.000 TL kahve sattı."
//   tarih:    "10.08.2026" (opsiyonel)
//   satirlar: JSON [{ kod, ad, tutar, tip:'borc'|'alacak' }]  (doğru cevap)
//   aciklama: kontrol sonrası açıklama (opsiyonel)

import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';
import { Ipucu } from './kontrol-block';

export type KayitSatir = { kod: string; ad: string; tutar: string; tip: 'borc' | 'alacak' };

const parse = (json: string): KayitSatir[] => {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as KayitSatir[];
  } catch {
    /* boş */
  }
  return [];
};
const stringify = (s: KayitSatir[]) => JSON.stringify(s);

const tutarSayi = (s: string | number): number => {
  if (s === '' || s == null) return 0;
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};
const tutarBicim = (s: string | number): string =>
  tutarSayi(s).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Yazarken canlı binlik ayırma: "10000" → "10.000", "10000,5" → "10.000,5".
const binAyir = (raw: string): string => {
  const temiz = raw.replace(/[^\d,]/g, '');
  const [tam, ...rest] = temiz.split(',');
  const tamGrup = tam.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return rest.length ? `${tamGrup},${rest.join('')}` : tamGrup;
};

export const KayitBlock = createReactBlockSpec(
  {
    type: 'kayit',
    propSchema: {
      senaryo: { default: '' },
      tarih: { default: '' },
      satirlar: { default: '[]' },
      aciklama: { default: '' },
      ipucu: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const senaryo = block.props.senaryo;
      const tarih = block.props.tarih;
      const satirlar = parse(block.props.satirlar);
      const aciklama = block.props.aciklama;
      const ipucu = block.props.ipucu;

      if (!editor.isEditable) {
        return <KayitOkuyucu senaryo={senaryo} tarih={tarih} satirlar={satirlar} aciklama={aciklama} ipucu={ipucu} />;
      }
      return (
        <KayitDuzenleyici
          senaryo={senaryo}
          tarih={tarih}
          satirlar={satirlar}
          aciklama={aciklama}
          ipucu={ipucu}
          onDegis={(y) =>
            editor.updateBlock(block, {
              props: {
                senaryo: y.senaryo,
                tarih: y.tarih,
                satirlar: stringify(y.satirlar),
                aciklama: y.aciklama,
                ipucu: y.ipucu,
              },
            })
          }
        />
      );
    },
  },
);

// ---------- Okuyucu (interaktif) ----------

// Hesap arayıcı — koddan veya isimden ara, seç.
const KayitOkuyucu = ({
  senaryo,
  tarih,
  satirlar,
  aciklama,
  ipucu,
  onDurum,
}: {
  senaryo: string;
  tarih: string;
  satirlar: KayitSatir[];
  aciklama: string;
  ipucu?: string;
  // Test modalı için: doğru=geçti, yanlış=yeniden dene, null=henüz kontrol edilmedi.
  onDurum?: (dogru: boolean | null) => void;
}) => {
  const [borcG, setBorcG] = useState<Record<number, string>>({});
  const [alacakG, setAlacakG] = useState<Record<number, string>>({});
  const [kontrol, setKontrol] = useState(false);

  const borcTop = satirlar.reduce((t, _s, i) => t + tutarSayi(borcG[i] ?? ''), 0);
  const alacakTop = satirlar.reduce((t, _s, i) => t + tutarSayi(alacakG[i] ?? ''), 0);
  const denge = borcTop > 0 && borcTop === alacakTop;
  const doluMu =
    satirlar.length > 0 &&
    satirlar.every((_s, i) => tutarSayi(borcG[i] ?? '') > 0 || tutarSayi(alacakG[i] ?? '') > 0);
  const dogruMu =
    denge &&
    satirlar.every((s, i) => {
      const b = tutarSayi(borcG[i] ?? '');
      const a = tutarSayi(alacakG[i] ?? '');
      return s.tip === 'borc' ? a === 0 && b === tutarSayi(s.tutar) : b === 0 && a === tutarSayi(s.tutar);
    });

  const sifirla = () => {
    setBorcG({});
    setAlacakG({});
    setKontrol(false);
    onDurum?.(null);
  };
  const kontrolEt = () => {
    setKontrol(true);
    onDurum?.(dogruMu);
  };

  const hucreDeger = (i: number, hangi: 'borc' | 'alacak') => {
    const uv = (hangi === 'borc' ? borcG[i] : alacakG[i]) ?? '';
    if (!kontrol) return uv;
    const s = satirlar[i];
    if (s.tip === hangi) return tutarBicim(s.tutar);
    return tutarSayi(uv) > 0 ? uv : '';
  };
  const hucreClass = (i: number, hangi: 'borc' | 'alacak') => {
    if (!kontrol) return '';
    const s = satirlar[i];
    if (s.tip === hangi) return 'bn-ky-hd';
    return tutarSayi((hangi === 'borc' ? borcG[i] : alacakG[i]) ?? '') > 0 ? 'bn-ky-hy' : '';
  };

  return (
    <div className="bn-kayit" contentEditable={false}>
      <div className="bn-ky-ust">Mini Kayıt{tarih ? ` · ${tarih}` : ''}</div>
      {senaryo && <div className="bn-ky-senaryo">{senaryo}</div>}
      <Ipucu metin={ipucu ?? ''} />

      <div className="bn-ky-ws">
        <div className="bn-ky-ws-baslik">
          <span>Hesap</span>
          <span>Borç</span>
          <span>Alacak</span>
        </div>
        {satirlar.map((s, i) => (
          <div key={i} className="bn-ky-ws-satir">
            <span className="bn-ky-ws-hesap">
              <span className="bn-ky-kod">{s.kod}</span>
              <span className="bn-ky-ad">{s.ad}</span>
            </span>
            <input
              className={`bn-ky-ws-input ${hucreClass(i, 'borc')}`}
              disabled={kontrol}
              inputMode="decimal"
              placeholder="—"
              value={hucreDeger(i, 'borc')}
              onChange={(e) => setBorcG((m) => ({ ...m, [i]: binAyir(e.target.value) }))}
            />
            <input
              className={`bn-ky-ws-input ${hucreClass(i, 'alacak')}`}
              disabled={kontrol}
              inputMode="decimal"
              placeholder="—"
              value={hucreDeger(i, 'alacak')}
              onChange={(e) => setAlacakG((m) => ({ ...m, [i]: binAyir(e.target.value) }))}
            />
          </div>
        ))}
        <div className={`bn-ky-ws-toplam ${denge ? 'denk' : ''}`}>
          <span>Toplam</span>
          <span className="bn-ky-fis-tutar">{tutarBicim(borcTop)}</span>
          <span className="bn-ky-fis-tutar">{tutarBicim(alacakTop)}</span>
        </div>
      </div>

      {!kontrol ? (
        <button type="button" className="bn-ky-kontrol-btn" disabled={!doluMu} onClick={kontrolEt}>
          Kontrol et
        </button>
      ) : (
        <div className={`bn-ky-sonuc ${dogruMu ? 'bn-ky-basari' : 'bn-ky-hata'}`}>
          <span className="bn-ky-sonuc-ikon" aria-hidden="true">{dogruMu ? '✓' : '✕'}</span>
          <div className="bn-ky-sonuc-govde">
            <div className="bn-ky-sonuc-baslik">{dogruMu ? 'Doğru kayıt!' : 'Kayıt hatalı'}</div>
            {!dogruMu && (
              <div className="bn-ky-aciklama">
                {denge
                  ? 'Toplamlar denk ama en az bir tutar yanlış tarafta. Doğru hücreler yeşil.'
                  : 'Borç ve alacak toplamları eşit değil. Doğru tutarları yeşil hücrelerde görebilirsin.'}
              </div>
            )}
            {aciklama && <div className="bn-ky-aciklama">{aciklama}</div>}
            <button type="button" className="bn-ky-tekrar" onClick={sifirla}>
              Tekrar dene
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Modal içinde tek başına kullanım için (ham block props alır).
export const KayitSoruView = ({
  senaryo,
  tarih,
  satirlar,
  aciklama,
  ipucu,
  onDurum,
}: {
  senaryo: string;
  tarih: string;
  satirlar: string;
  aciklama: string;
  ipucu?: string;
  onDurum?: (dogru: boolean | null) => void;
}) => (
  <KayitOkuyucu
    senaryo={senaryo}
    tarih={tarih}
    satirlar={parse(satirlar)}
    aciklama={aciklama}
    ipucu={ipucu}
    onDurum={onDurum}
  />
);

// ---------- Düzenleyici (admin) ----------

const KayitDuzenleyici = ({
  senaryo,
  tarih,
  satirlar,
  aciklama,
  ipucu,
  onDegis,
}: {
  senaryo: string;
  tarih: string;
  satirlar: KayitSatir[];
  aciklama: string;
  ipucu: string;
  onDegis: (y: { senaryo: string; tarih: string; satirlar: KayitSatir[]; aciklama: string; ipucu: string }) => void;
}) => {
  const setSatir = (yeni: KayitSatir[]) => onDegis({ senaryo, tarih, satirlar: yeni, aciklama, ipucu });
  return (
    <div className="bn-th-duz" contentEditable={false}>
      <input
        type="text"
        value={senaryo}
        onChange={(e) => onDegis({ senaryo: e.target.value, tarih, satirlar, aciklama, ipucu })}
        placeholder="Senaryo — örn: İşletme peşin 10.000 TL kahve sattı."
        className="bn-th-duz-hesap"
        style={{ textAlign: 'left' }}
      />
      <input
        type="text"
        value={tarih}
        onChange={(e) => onDegis({ senaryo, tarih: e.target.value, satirlar, aciklama, ipucu })}
        placeholder="Tarih (ops.) — örn: 10.08.2026"
        className="bn-th-duz-not"
        style={{ width: '100%', margin: '0.4rem 0' }}
      />
      <div className="bn-kn-duz-siklar">
        {satirlar.map((s, i) => (
          <div key={i} className="bn-ky-duz-satir">
            <input
              value={s.kod}
              onChange={(e) => setSatir(satirlar.map((x, j) => (j === i ? { ...x, kod: e.target.value } : x)))}
              placeholder="100"
              className="bn-th-duz-tutar"
              style={{ width: '4rem', textAlign: 'left' }}
            />
            <input
              value={s.ad}
              onChange={(e) => setSatir(satirlar.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))}
              placeholder="Hesap adı"
              className="bn-th-duz-not"
            />
            <input
              value={s.tutar}
              onChange={(e) => setSatir(satirlar.map((x, j) => (j === i ? { ...x, tutar: e.target.value } : x)))}
              placeholder="0"
              inputMode="decimal"
              className="bn-th-duz-tutar"
            />
            <select
              value={s.tip}
              onChange={(e) =>
                setSatir(satirlar.map((x, j) => (j === i ? { ...x, tip: e.target.value as 'borc' | 'alacak' } : x)))
              }
              className="bn-th-duz-tutar"
              style={{ width: '5.5rem' }}
            >
              <option value="borc">Borç</option>
              <option value="alacak">Alacak</option>
            </select>
            <button type="button" onClick={() => setSatir(satirlar.filter((_, j) => j !== i))} className="bn-th-duz-sil">
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setSatir([...satirlar, { kod: '', ad: '', tutar: '', tip: 'borc' }])}
          className="bn-th-duz-ekle"
        >
          + Satır
        </button>
      </div>
      <input
        type="text"
        value={ipucu}
        onChange={(e) => onDegis({ senaryo, tarih, satirlar, aciklama, ipucu: e.target.value })}
        placeholder="İpucu (opsiyonel — senaryo altında açılır; boşsa görünmez)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
      <input
        type="text"
        value={aciklama}
        onChange={(e) => onDegis({ senaryo, tarih, satirlar, aciklama: e.target.value, ipucu })}
        placeholder="Açıklama (kontrol sonrası gösterilir)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
    </div>
  );
};
