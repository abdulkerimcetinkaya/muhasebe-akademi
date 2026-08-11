/* eslint-disable react-refresh/only-export-components */
import { createReactBlockSpec } from '@blocknote/react';
import { useState } from 'react';

export type VeriKarti = {
  baslik: string;
  satirlar: { etiket: string; deger: string; vurgu?: boolean }[];
};

const parse = (value: string): VeriKarti[] => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const VeriKartlariBlock = createReactBlockSpec(
  {
    type: 'verikartlari',
    propSchema: {
      baslik: { default: '' },
      kartlar: { default: '[]' },
      asamali: { default: false },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const kartlar = parse(block.props.kartlar);
      if (editor.isEditable) {
        return (
          <div className="bn-vk-editor" contentEditable={false}>
            <input value={block.props.baslik} placeholder="Blok başlığı" onChange={(e) => editor.updateBlock(block, { props: { baslik: e.target.value } })} />
            <label><input type="checkbox" checked={block.props.asamali} onChange={(e) => editor.updateBlock(block, { props: { asamali: e.target.checked } })} /> Aşamalı göster</label>
            <textarea value={block.props.kartlar} rows={8} onChange={(e) => editor.updateBlock(block, { props: { kartlar: e.target.value } })} aria-label="Veri kartları JSON" />
          </div>
        );
      }
      return <VeriKartlari baslik={block.props.baslik} kartlar={kartlar} asamali={block.props.asamali} />;
    },
  },
);

export const VeriKartlari = ({ baslik, kartlar, asamali }: { baslik?: string; kartlar: VeriKarti[]; asamali?: boolean }) => {
  const [gorunen, setGorunen] = useState(asamali ? 1 : kartlar.length);
  return (
    <section className="bn-vk" contentEditable={false} aria-label={baslik || 'İşletme bilgileri'}>
      {baslik && <div className="bn-vk-baslik">{baslik}</div>}
      <div className="bn-vk-grid">
        {kartlar.slice(0, gorunen).map((kart, index) => (
          <article className="bn-vk-kart" key={`${kart.baslik}-${index}`}>
            <h3>{kart.baslik}</h3>
            <dl>
              {kart.satirlar.map((satir, satirIndex) => (
                <div className={satir.vurgu ? 'vurgu' : ''} key={`${satir.etiket}-${satirIndex}`}>
                  <dt>{satir.etiket}</dt><dd className="tnum">{satir.deger}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      {asamali && gorunen < kartlar.length && (
        <button type="button" className="bn-vk-devam" onClick={() => setGorunen((v) => Math.min(v + 1, kartlar.length))}>
          Bir bilgi daha göster
        </button>
      )}
    </section>
  );
};
