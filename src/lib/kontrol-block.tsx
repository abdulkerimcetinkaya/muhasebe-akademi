// Özel BlockNote bloğu — Kontrol Sorusu (ders içi interaktif mini-kontrol).
//
// Saklama formatı (props):
//   soru:     "Kasadaki 120.000 TL varlık mı kaynak mı?"
//   siklar:   JSON stringify [{ metin, dogru }]
//   aciklama: cevap sonrası gösterilen kısa açıklama
//
// Okuyucu: şıklara tıkla → anında doğru/yanlış + açıklama + tekrar dene.
// (İlerleme kaydedilmez; hafif "dur ve düşün" kontrolü.) Admin: form.

import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';

export type KontrolSik = { metin: string; dogru: boolean };

const parse = (json: string): KontrolSik[] => {
  try {
    const arr = JSON.parse(json);
    if (Array.isArray(arr)) return arr as KontrolSik[];
  } catch {
    /* bozuk JSON → boş */
  }
  return [];
};
const stringify = (siklar: KontrolSik[]) => JSON.stringify(siklar);

export const KontrolBlock = createReactBlockSpec(
  {
    type: 'kontrol',
    propSchema: {
      soru: { default: '' },
      siklar: { default: '[]' },
      aciklama: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const soru = block.props.soru;
      const siklar = parse(block.props.siklar);
      const aciklama = block.props.aciklama;

      if (!editor.isEditable) {
        return <KontrolOkuyucu soru={soru} siklar={siklar} aciklama={aciklama} />;
      }
      return (
        <KontrolDuzenleyici
          soru={soru}
          siklar={siklar}
          aciklama={aciklama}
          onDegis={(yeni) =>
            editor.updateBlock(block, {
              props: { soru: yeni.soru, siklar: stringify(yeni.siklar), aciklama: yeni.aciklama },
            })
          }
        />
      );
    },
  },
);

// ---------- Okuyucu (interaktif) ----------

const KontrolOkuyucu = ({
  soru,
  siklar,
  aciklama,
}: {
  soru: string;
  siklar: KontrolSik[];
  aciklama: string;
}) => {
  const [secili, setSecili] = useState<number | null>(null);
  const cevaplandi = secili !== null;
  const dogruMu = cevaplandi && siklar[secili]?.dogru;

  return (
    <div className="bn-kontrol" contentEditable={false}>
      <div className="bn-kn-ust">Kendini dene</div>
      <div className="bn-kn-soru">{soru || 'Soru metni…'}</div>
      <div className="bn-kn-siklar">
        {siklar.map((s, i) => {
          let durum = 'bos';
          if (cevaplandi) {
            if (s.dogru) durum = 'dogru';
            else if (i === secili) durum = 'yanlis';
            else durum = 'pas';
          }
          return (
            <button
              key={i}
              type="button"
              disabled={cevaplandi}
              onClick={() => setSecili(i)}
              className={`bn-kn-sik bn-kn-${durum}`}
            >
              <span className="bn-kn-harf">{String.fromCharCode(65 + i)}</span>
              <span className="bn-kn-metin">{s.metin}</span>
              {durum === 'dogru' && <span className="bn-kn-isaret">✓</span>}
              {durum === 'yanlis' && <span className="bn-kn-isaret">✕</span>}
            </button>
          );
        })}
      </div>
      {cevaplandi && (
        <div className={`bn-kn-sonuc ${dogruMu ? 'bn-kn-basari' : 'bn-kn-hata'}`}>
          <span className="bn-kn-sonuc-ikon" aria-hidden="true">{dogruMu ? '✓' : '✕'}</span>
          <div className="bn-kn-sonuc-govde">
            <div className="bn-kn-sonuc-baslik">{dogruMu ? 'Doğru' : 'Tekrar bak'}</div>
            {aciklama && <div className="bn-kn-aciklama">{aciklama}</div>}
            <button type="button" className="bn-kn-tekrar" onClick={() => setSecili(null)}>
              Tekrar dene
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ---------- Düzenleyici (admin) ----------

const KontrolDuzenleyici = ({
  soru,
  siklar,
  aciklama,
  onDegis,
}: {
  soru: string;
  siklar: KontrolSik[];
  aciklama: string;
  onDegis: (yeni: { soru: string; siklar: KontrolSik[]; aciklama: string }) => void;
}) => {
  const sikGuncelle = (yeni: KontrolSik[]) => onDegis({ soru, siklar: yeni, aciklama });

  return (
    <div className="bn-th-duz" contentEditable={false}>
      <input
        type="text"
        value={soru}
        onChange={(e) => onDegis({ soru: e.target.value, siklar, aciklama })}
        placeholder="Soru — örn: Kasadaki 120.000 TL varlık mı, kaynak mı?"
        className="bn-th-duz-hesap"
        style={{ textAlign: 'left' }}
      />
      <div className="bn-kn-duz-siklar">
        {siklar.map((s, i) => (
          <div key={i} className="bn-kn-duz-satir">
            <button
              type="button"
              onClick={() =>
                sikGuncelle(siklar.map((x, j) => ({ ...x, dogru: j === i })))
              }
              className={`bn-kn-duz-radyo ${s.dogru ? 'secili' : ''}`}
              title="Doğru şık"
            >
              {s.dogru ? '●' : '○'}
            </button>
            <input
              type="text"
              value={s.metin}
              onChange={(e) =>
                sikGuncelle(siklar.map((x, j) => (j === i ? { ...x, metin: e.target.value } : x)))
              }
              placeholder={`Şık ${String.fromCharCode(65 + i)}`}
              className="bn-th-duz-not"
            />
            <button
              type="button"
              onClick={() => sikGuncelle(siklar.filter((_, j) => j !== i))}
              className="bn-th-duz-sil"
              title="Sil"
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => sikGuncelle([...siklar, { metin: '', dogru: siklar.length === 0 }])}
          className="bn-th-duz-ekle"
        >
          + Şık
        </button>
      </div>
      <input
        type="text"
        value={aciklama}
        onChange={(e) => onDegis({ soru, siklar, aciklama: e.target.value })}
        placeholder="Açıklama (cevap sonrası gösterilir)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
    </div>
  );
};
