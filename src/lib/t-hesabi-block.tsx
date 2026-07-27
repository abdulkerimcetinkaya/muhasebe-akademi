// Özel BlockNote bloğu — T Hesabı (büyük defter görselleştirmesi).
//
// Saklama formatı (props):
//   hesap: "100 KASA" (üstte, T'nin tepesinde)
//   sol:   JSON stringify [{ tutar, aciklama? }]  (Borç — T'nin solu)
//   sag:   JSON stringify [{ tutar, aciklama? }]  (Alacak — T'nin sağı)
//
// Render iki modlu: okuyucu (T şekli) + düzenleyici (admin form).

import { createReactBlockSpec } from '@blocknote/react';

export type THesabiSatir = { tutar: string; aciklama?: string };

const parse = (json: string): THesabiSatir[] => {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as THesabiSatir[];
  } catch {
    /* bozuk JSON → boş */
  }
  return [];
};
const stringify = (satirlar: THesabiSatir[]) => JSON.stringify(satirlar);

const tutarSayi = (s: string | number): number => {
  if (s === '' || s === null || s === undefined) return 0;
  if (typeof s === 'number') return Number.isFinite(s) ? s : 0;
  const temiz = String(s).replace(/\./g, '').replace(',', '.');
  const n = parseFloat(temiz);
  return Number.isFinite(n) ? n : 0;
};
const tutarBicim = (s: string | number): string => {
  const n = tutarSayi(s);
  if (n === 0 && (s === '' || s === null || s === undefined)) return '';
  return n.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const THesabiBlock = createReactBlockSpec(
  {
    type: 'thesabi',
    propSchema: {
      hesap: { default: '' },
      sol: { default: '[]' },
      sag: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const hesap = block.props.hesap;
      const sol = parse(block.props.sol);
      const sag = parse(block.props.sag);

      if (!editor.isEditable) {
        return <THesabiOkuyucu hesap={hesap} sol={sol} sag={sag} />;
      }
      return (
        <THesabiDuzenleyici
          hesap={hesap}
          sol={sol}
          sag={sag}
          onDegis={(yeni) =>
            editor.updateBlock(block, {
              props: { hesap: yeni.hesap, sol: stringify(yeni.sol), sag: stringify(yeni.sag) },
            })
          }
        />
      );
    },
  },
);

// ---------- Okuyucu (T şekli) ----------

const THesabiOkuyucu = ({
  hesap,
  sol,
  sag,
}: {
  hesap: string;
  sol: THesabiSatir[];
  sag: THesabiSatir[];
}) => {
  const solToplam = sol.reduce((t, s) => t + tutarSayi(s.tutar), 0);
  const sagToplam = sag.reduce((t, s) => t + tutarSayi(s.tutar), 0);
  const bakiye = solToplam - sagToplam;
  const bakiyeTip = bakiye > 0 ? 'Borç' : bakiye < 0 ? 'Alacak' : null;

  const yan = (satirlar: THesabiSatir[], taraf: 'sol' | 'sag', baslik: string) => (
    <div className={`bn-th-yan bn-th-${taraf}`}>
      <div className="bn-th-yan-baslik">{baslik}</div>
      <div className="bn-th-kayitlar">
        {satirlar.length === 0 && <div className="bn-th-bos">—</div>}
        {satirlar.map((s, i) => (
          <div key={i} className="bn-th-kayit">
            {s.aciklama && <span className="bn-th-not">{s.aciklama}</span>}
            <span className="bn-th-tutar">{tutarBicim(s.tutar) || '0,00'}</span>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="bn-thesabi" contentEditable={false}>
      <div className="bn-th-baslik">{hesap || 'Hesap'}</div>
      <div className="bn-th-govde">
        {yan(sol, 'sol', 'Borç')}
        {yan(sag, 'sag', 'Alacak')}
      </div>
      {(sol.length > 0 || sag.length > 0) && (
        <>
          <div className="bn-th-toplamlar">
            <span className="bn-th-toplam bn-th-toplam-sol">{tutarBicim(solToplam) || '0,00'}</span>
            <span className="bn-th-toplam bn-th-toplam-sag">{tutarBicim(sagToplam) || '0,00'}</span>
          </div>
          {bakiyeTip && (
            <div className="bn-th-bakiye">
              Kalan: <strong>{tutarBicim(Math.abs(bakiye))}</strong> ({bakiyeTip} bakiye)
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ---------- Düzenleyici (admin form) ----------

const THesabiDuzenleyici = ({
  hesap,
  sol,
  sag,
  onDegis,
}: {
  hesap: string;
  sol: THesabiSatir[];
  sag: THesabiSatir[];
  onDegis: (yeni: { hesap: string; sol: THesabiSatir[]; sag: THesabiSatir[] }) => void;
}) => {
  const yanForm = (satirlar: THesabiSatir[], taraf: 'sol' | 'sag', baslik: string) => {
    const guncelle = (yeni: THesabiSatir[]) =>
      onDegis({
        hesap,
        sol: taraf === 'sol' ? yeni : sol,
        sag: taraf === 'sag' ? yeni : sag,
      });
    return (
      <div className="bn-th-duz-yan">
        <div className="bn-th-duz-yan-baslik">{baslik}</div>
        {satirlar.map((s, i) => (
          <div key={i} className="bn-th-duz-satir">
            <input
              type="text"
              value={s.aciklama ?? ''}
              onChange={(e) =>
                guncelle(satirlar.map((x, j) => (j === i ? { ...x, aciklama: e.target.value } : x)))
              }
              placeholder="Açıklama (ops.)"
              className="bn-th-duz-not"
            />
            <input
              type="text"
              value={s.tutar}
              onChange={(e) =>
                guncelle(satirlar.map((x, j) => (j === i ? { ...x, tutar: e.target.value } : x)))
              }
              placeholder="0"
              inputMode="decimal"
              className="bn-th-duz-tutar"
            />
            <button
              type="button"
              onClick={() => guncelle(satirlar.filter((_, j) => j !== i))}
              className="bn-th-duz-sil"
              title="Sil"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => guncelle([...satirlar, { tutar: '', aciklama: '' }])}
          className="bn-th-duz-ekle"
        >
          + Satır
        </button>
      </div>
    );
  };

  return (
    <div className="bn-th-duz" contentEditable={false}>
      <input
        type="text"
        value={hesap}
        onChange={(e) => onDegis({ hesap: e.target.value, sol, sag })}
        placeholder="Hesap adı — örn: 100 KASA"
        className="bn-th-duz-hesap"
      />
      <div className="bn-th-duz-govde">
        {yanForm(sol, 'sol', 'Borç')}
        {yanForm(sag, 'sag', 'Alacak')}
      </div>
    </div>
  );
};
