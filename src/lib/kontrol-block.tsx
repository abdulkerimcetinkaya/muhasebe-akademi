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

// Opsiyonel ipucu — admin doldurursa soru altında açılır kapanır rozet olur;
// boşsa hiç görünmez. Kontrol ve Kayıt bloklarında ortak kullanılır.
const AmpulGlyph = () => (
  <svg className="bn-ipucu-ampul" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.5.4.8.9.9 1.5l.2 1.2h5l.2-1.2c.1-.6.4-1.1.9-1.5A6 6 0 0 0 12 3Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const Ipucu = ({ metin }: { metin: string }) => {
  const [acik, setAcik] = useState(false);
  if (!metin) return null;
  return (
    <div className={`bn-ipucu ${acik ? 'acik' : ''}`}>
      <button type="button" className="bn-ipucu-btn" onClick={() => setAcik((a) => !a)}>
        <AmpulGlyph />
        İpucu
        <span className="bn-ipucu-ok" aria-hidden="true">{acik ? '▾' : '▸'}</span>
      </button>
      {acik && <div className="bn-ipucu-metin">{metin}</div>}
    </div>
  );
};

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
      ipucu: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const soru = block.props.soru;
      const siklar = parse(block.props.siklar);
      const aciklama = block.props.aciklama;
      const ipucu = block.props.ipucu;

      if (!editor.isEditable) {
        return <KontrolOkuyucu soru={soru} siklar={siklar} aciklama={aciklama} ipucu={ipucu} />;
      }
      return (
        <KontrolDuzenleyici
          soru={soru}
          siklar={siklar}
          aciklama={aciklama}
          ipucu={ipucu}
          onDegis={(yeni) =>
            editor.updateBlock(block, {
              props: { soru: yeni.soru, siklar: stringify(yeni.siklar), aciklama: yeni.aciklama, ipucu: yeni.ipucu },
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
  ipucu,
  onDurum,
}: {
  soru: string;
  siklar: KontrolSik[];
  aciklama: string;
  ipucu?: string;
  // Test modalı için: doğru=geçti, yanlış=yeniden dene, null=henüz cevaplanmadı.
  onDurum?: (dogru: boolean | null) => void;
}) => {
  const [secili, setSecili] = useState<number | null>(null);
  const cevaplandi = secili !== null;
  const dogruMu = cevaplandi && siklar[secili]?.dogru;

  const sec = (i: number) => {
    setSecili(i);
    onDurum?.(!!siklar[i]?.dogru);
  };
  const tekrar = () => {
    setSecili(null);
    onDurum?.(null);
  };

  return (
    <div className="bn-kontrol" contentEditable={false}>
      <div className="bn-kn-ust">Kendini dene</div>
      <div className="bn-kn-soru">{soru || 'Soru metni…'}</div>
      <Ipucu metin={ipucu ?? ''} />
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
              onClick={() => sec(i)}
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
            <button type="button" className="bn-kn-tekrar" onClick={tekrar}>
              Tekrar dene
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// Modal içinde tek başına kullanım için (ham block props alır).
export const KontrolSoruView = ({
  soru,
  siklar,
  aciklama,
  ipucu,
  onDurum,
}: {
  soru: string;
  siklar: string;
  aciklama: string;
  ipucu?: string;
  onDurum?: (dogru: boolean | null) => void;
}) => <KontrolOkuyucu soru={soru} siklar={parse(siklar)} aciklama={aciklama} ipucu={ipucu} onDurum={onDurum} />;

// ---------- Düzenleyici (admin) ----------

const KontrolDuzenleyici = ({
  soru,
  siklar,
  aciklama,
  ipucu,
  onDegis,
}: {
  soru: string;
  siklar: KontrolSik[];
  aciklama: string;
  ipucu: string;
  onDegis: (yeni: { soru: string; siklar: KontrolSik[]; aciklama: string; ipucu: string }) => void;
}) => {
  const sikGuncelle = (yeni: KontrolSik[]) => onDegis({ soru, siklar: yeni, aciklama, ipucu });

  return (
    <div className="bn-th-duz" contentEditable={false}>
      <input
        type="text"
        value={soru}
        onChange={(e) => onDegis({ soru: e.target.value, siklar, aciklama, ipucu })}
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
        value={ipucu}
        onChange={(e) => onDegis({ soru, siklar, aciklama, ipucu: e.target.value })}
        placeholder="İpucu (opsiyonel — soru altında açılır; boşsa görünmez)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
      <input
        type="text"
        value={aciklama}
        onChange={(e) => onDegis({ soru, siklar, aciklama: e.target.value, ipucu })}
        placeholder="Açıklama (cevap sonrası gösterilir)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
    </div>
  );
};
