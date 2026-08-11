/* eslint-disable react-refresh/only-export-components */
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
      yanlisAciklama: { default: '' },
      sunum: { default: 'test' },
      cokluSecim: { default: false },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const soru = block.props.soru;
      const siklar = parse(block.props.siklar);
      const aciklama = block.props.aciklama;
      const ipucu = block.props.ipucu;
      const yanlisAciklama = block.props.yanlisAciklama;
      const cokluSecim = block.props.cokluSecim;

      if (!editor.isEditable) {
        return <KontrolOkuyucu soru={soru} siklar={siklar} aciklama={aciklama} yanlisAciklama={yanlisAciklama} ipucu={ipucu} cokluSecim={cokluSecim} />;
      }
      return (
        <KontrolDuzenleyici
          soru={soru}
          siklar={siklar}
          aciklama={aciklama}
          ipucu={ipucu}
          yanlisAciklama={yanlisAciklama}
          sunum={block.props.sunum}
          cokluSecim={cokluSecim}
          onDegis={(yeni) =>
            editor.updateBlock(block, {
              props: { ...yeni, siklar: stringify(yeni.siklar) },
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
  yanlisAciklama,
  ipucu,
  cokluSecim = false,
  onDurum,
}: {
  soru: string;
  siklar: KontrolSik[];
  aciklama: string;
  yanlisAciklama?: string;
  ipucu?: string;
  cokluSecim?: boolean;
  // Test modalı için: doğru=geçti, yanlış=yeniden dene, null=henüz cevaplanmadı.
  onDurum?: (dogru: boolean | null) => void;
}) => {
  const [secililer, setSecililer] = useState<number[]>([]);
  const [cevaplandi, setCevaplandi] = useState(false);
  const dogruMu = cevaplandi && siklar.every((s, i) => s.dogru === secililer.includes(i));

  const sec = (i: number) => {
    if (cokluSecim) {
      setSecililer((mevcut) => mevcut.includes(i) ? mevcut.filter((x) => x !== i) : [...mevcut, i]);
      return;
    }
    setSecililer([i]);
    setCevaplandi(true);
    onDurum?.(!!siklar[i]?.dogru);
  };
  const kontrolEt = () => {
    if (secililer.length === 0) return;
    const sonuc = siklar.every((s, i) => s.dogru === secililer.includes(i));
    setCevaplandi(true);
    onDurum?.(sonuc);
  };
  const tekrar = () => {
    setSecililer([]);
    setCevaplandi(false);
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
            else if (secililer.includes(i)) durum = 'yanlis';
            else durum = 'pas';
          } else if (secililer.includes(i)) durum = 'secili';
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
      {cokluSecim && !cevaplandi && <button type="button" className="bn-kn-kontrol-et" disabled={secililer.length === 0} onClick={kontrolEt}>Seçimlerimi kontrol et</button>}
      {cevaplandi && (
        <div className={`bn-kn-sonuc ${dogruMu ? 'bn-kn-basari' : 'bn-kn-hata'}`}>
          <span className="bn-kn-sonuc-ikon" aria-hidden="true">{dogruMu ? '✓' : '✕'}</span>
          <div className="bn-kn-sonuc-govde">
            <div className="bn-kn-sonuc-baslik">{dogruMu ? 'Doğru' : 'Tekrar bak'}</div>
            {(dogruMu ? aciklama : yanlisAciklama || aciklama) && <div className="bn-kn-aciklama">{dogruMu ? aciklama : yanlisAciklama || aciklama}</div>}
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
  yanlisAciklama,
  ipucu,
  cokluSecim,
  onDurum,
}: {
  soru: string;
  siklar: string;
  aciklama: string;
  yanlisAciklama?: string;
  ipucu?: string;
  cokluSecim?: boolean;
  onDurum?: (dogru: boolean | null) => void;
}) => <KontrolOkuyucu soru={soru} siklar={parse(siklar)} aciklama={aciklama} yanlisAciklama={yanlisAciklama} ipucu={ipucu} cokluSecim={cokluSecim} onDurum={onDurum} />;

// ---------- Düzenleyici (admin) ----------

const KontrolDuzenleyici = ({
  soru,
  siklar,
  aciklama,
  yanlisAciklama,
  ipucu,
  sunum,
  cokluSecim,
  onDegis,
}: {
  soru: string;
  siklar: KontrolSik[];
  aciklama: string;
  yanlisAciklama: string;
  ipucu: string;
  sunum: string;
  cokluSecim: boolean;
  onDegis: (yeni: { soru: string; siklar: KontrolSik[]; aciklama: string; yanlisAciklama: string; ipucu: string; sunum: string; cokluSecim: boolean }) => void;
}) => {
  const degerler = { soru, siklar, aciklama, yanlisAciklama, ipucu, sunum, cokluSecim };
  const sikGuncelle = (yeni: KontrolSik[]) => onDegis({ ...degerler, siklar: yeni });

  return (
    <div className="bn-th-duz" contentEditable={false}>
      <input
        type="text"
        value={soru}
        onChange={(e) => onDegis({ ...degerler, soru: e.target.value })}
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
                sikGuncelle(siklar.map((x, j) => ({ ...x, dogru: cokluSecim ? (j === i ? !x.dogru : x.dogru) : j === i })))
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
      <div className="bn-kn-duz-ayarlar">
        <label><input type="checkbox" checked={sunum === 'satirici'} onChange={(e) => onDegis({ ...degerler, sunum: e.target.checked ? 'satirici' : 'test' })} /> Ders içinde göster</label>
        <label><input type="checkbox" checked={cokluSecim} onChange={(e) => onDegis({ ...degerler, cokluSecim: e.target.checked })} /> Çoklu seçim</label>
      </div>
      <input
        type="text"
        value={ipucu}
        onChange={(e) => onDegis({ ...degerler, ipucu: e.target.value })}
        placeholder="İpucu (opsiyonel — soru altında açılır; boşsa görünmez)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
      <input
        type="text"
        value={aciklama}
        onChange={(e) => onDegis({ ...degerler, aciklama: e.target.value })}
        placeholder="Açıklama (cevap sonrası gösterilir)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
      <input
        type="text"
        value={yanlisAciklama}
        onChange={(e) => onDegis({ ...degerler, yanlisAciklama: e.target.value })}
        placeholder="Yanlış cevap açıklaması (boşsa genel açıklama kullanılır)"
        className="bn-th-duz-not"
        style={{ width: '100%', marginTop: '0.5rem' }}
      />
    </div>
  );
};
