// Özel BlockNote bloğu — Bilanço (iki taraflı mali durum tablosu).
//
// Saklama formatı (props):
//   baslik: "Açılış Bilançosu — 01.08.2026" (üst başlık, opsiyonel)
//   sol:    JSON stringify [{ ad, tutar }]  (VARLIKLAR)
//   sag:    JSON stringify [{ ad, tutar }]  (KAYNAKLAR)
//
// T hesabıyla aynı görsel dil: düz lacivert çizgiler, ortada ayraç,
// altta eşit toplamlar. Okuyucu + admin düzenleyici iki modlu.

import { createReactBlockSpec } from '@blocknote/react';

export type BilancoSatir = { ad: string; tutar: string };

const parse = (json: string): BilancoSatir[] => {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as BilancoSatir[];
  } catch {
    /* bozuk JSON → boş */
  }
  return [];
};
const stringify = (satirlar: BilancoSatir[]) => JSON.stringify(satirlar);

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

export const BilancoBlock = createReactBlockSpec(
  {
    type: 'bilanco',
    propSchema: {
      baslik: { default: 'BİLANÇO' },
      sol: { default: '[]' },
      sag: { default: '[]' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const baslik = block.props.baslik;
      const sol = parse(block.props.sol);
      const sag = parse(block.props.sag);

      if (!editor.isEditable) {
        return <BilancoOkuyucu baslik={baslik} sol={sol} sag={sag} />;
      }
      return (
        <BilancoDuzenleyici
          baslik={baslik}
          sol={sol}
          sag={sag}
          onDegis={(yeni) =>
            editor.updateBlock(block, {
              props: { baslik: yeni.baslik, sol: stringify(yeni.sol), sag: stringify(yeni.sag) },
            })
          }
        />
      );
    },
  },
);

// ---------- Okuyucu ----------

const BilancoOkuyucu = ({
  baslik,
  sol,
  sag,
}: {
  baslik: string;
  sol: BilancoSatir[];
  sag: BilancoSatir[];
}) => {
  const solToplam = sol.reduce((t, s) => t + tutarSayi(s.tutar), 0);
  const sagToplam = sag.reduce((t, s) => t + tutarSayi(s.tutar), 0);
  const denk = solToplam === sagToplam && solToplam > 0;

  const yan = (satirlar: BilancoSatir[], taraf: 'sol' | 'sag', etiket: string, toplam: number) => (
    <div className={`bn-bl-yan bn-bl-${taraf}`}>
      <div className="bn-bl-yan-baslik">{etiket}</div>
      <div className="bn-bl-satirlar">
        {satirlar.length === 0 && <div className="bn-bl-bos">—</div>}
        {satirlar.map((s, i) => (
          <div key={i} className="bn-bl-satir">
            <span className="bn-bl-ad">{s.ad}</span>
            <span className="bn-bl-tutar">{tutarBicim(s.tutar) || '0,00'}</span>
          </div>
        ))}
      </div>
      <div className="bn-bl-toplam">
        <span>Toplam</span>
        <span className="bn-bl-tutar">{tutarBicim(toplam) || '0,00'}</span>
      </div>
    </div>
  );

  return (
    <div className="bn-bilanco" contentEditable={false}>
      {baslik && <div className="bn-bl-baslik">{baslik}</div>}
      <div className="bn-bl-govde">
        {yan(sol, 'sol', 'Varlıklar', solToplam)}
        {yan(sag, 'sag', 'Kaynaklar', sagToplam)}
      </div>
      {denk && <div className="bn-bl-denk">Varlıklar = Kaynaklar</div>}
    </div>
  );
};

// ---------- Düzenleyici (admin) ----------

const BilancoDuzenleyici = ({
  baslik,
  sol,
  sag,
  onDegis,
}: {
  baslik: string;
  sol: BilancoSatir[];
  sag: BilancoSatir[];
  onDegis: (yeni: { baslik: string; sol: BilancoSatir[]; sag: BilancoSatir[] }) => void;
}) => {
  const yanForm = (satirlar: BilancoSatir[], taraf: 'sol' | 'sag', etiket: string) => {
    const guncelle = (yeni: BilancoSatir[]) =>
      onDegis({
        baslik,
        sol: taraf === 'sol' ? yeni : sol,
        sag: taraf === 'sag' ? yeni : sag,
      });
    return (
      <div className="bn-th-duz-yan">
        <div className="bn-th-duz-yan-baslik">{etiket}</div>
        {satirlar.map((s, i) => (
          <div key={i} className="bn-th-duz-satir">
            <input
              type="text"
              value={s.ad}
              onChange={(e) =>
                guncelle(satirlar.map((x, j) => (j === i ? { ...x, ad: e.target.value } : x)))
              }
              placeholder="Kalem adı — örn: Kasa"
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
          onClick={() => guncelle([...satirlar, { ad: '', tutar: '' }])}
          className="bn-th-duz-ekle"
        >
          + Kalem
        </button>
      </div>
    );
  };

  return (
    <div className="bn-th-duz" contentEditable={false}>
      <input
        type="text"
        value={baslik}
        onChange={(e) => onDegis({ baslik: e.target.value, sol, sag })}
        placeholder="Başlık — örn: Açılış Bilançosu — 01.08.2026"
        className="bn-th-duz-hesap"
      />
      <div className="bn-th-duz-govde">
        {yanForm(sol, 'sol', 'Varlıklar')}
        {yanForm(sag, 'sag', 'Kaynaklar')}
      </div>
    </div>
  );
};
