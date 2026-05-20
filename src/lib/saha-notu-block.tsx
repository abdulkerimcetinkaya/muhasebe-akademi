// Özel BlockNote bloğu — Saha Notu (uzman alıntısı).
//
// Saklama formatı (props):
//   alinti: alıntının kendisi (zorunlu, italic render edilir)
//   yazar:  isim (örn: "Ayşe Demir")
//   unvan:  rolü (örn: "YMM" — küçük rozet olarak render edilir)
//
// Düzenleyici: üç input alanı (alıntı textarea, yazar, unvan).
// Görüntüleyici: dekoratif büyük tırnak işareti + italic gövde + sağ alta
// yazar/unvan imzası.

import { createReactBlockSpec } from '@blocknote/react';

export const SahaNotuBlock = createReactBlockSpec(
  {
    type: 'sahanotu',
    propSchema: {
      alinti: { default: '' },
      yazar: { default: '' },
      unvan: { default: '' },
    },
    content: 'none',
  },
  {
    render: ({ block, editor }) => {
      const editable = editor.isEditable;
      const alinti = block.props.alinti;
      const yazar = block.props.yazar;
      const unvan = block.props.unvan;

      if (!editable) {
        return <SahaNotuOkuyucu alinti={alinti} yazar={yazar} unvan={unvan} />;
      }

      return (
        <SahaNotuDuzenleyici
          alinti={alinti}
          yazar={yazar}
          unvan={unvan}
          onDegis={(yeni) => {
            editor.updateBlock(block, { props: yeni });
          }}
        />
      );
    },
  },
);

// ---------- Görüntüleyici ----------

const SahaNotuOkuyucu = ({
  alinti,
  yazar,
  unvan,
}: {
  alinti: string;
  yazar: string;
  unvan: string;
}) => {
  const imza = [yazar, unvan].filter(Boolean).join(', ');
  return (
    <figure className="bn-sahanotu-okur" contentEditable={false}>
      <blockquote className="bn-sahanotu-govde">{alinti || '—'}</blockquote>
      {imza && (
        <figcaption className="bn-sahanotu-imza">— {imza}</figcaption>
      )}
    </figure>
  );
};

// ---------- Düzenleyici ----------

const SahaNotuDuzenleyici = ({
  alinti,
  yazar,
  unvan,
  onDegis,
}: {
  alinti: string;
  yazar: string;
  unvan: string;
  onDegis: (yeni: { alinti: string; yazar: string; unvan: string }) => void;
}) => {
  return (
    <div className="bn-sahanotu-duz" contentEditable={false}>
      <div className="bn-sahanotu-duz-etk">Saha Notu</div>

      <textarea
        value={alinti}
        onChange={(e) => onDegis({ alinti: e.target.value, yazar, unvan })}
        placeholder="Sözleşme tarihiyle tescil tarihini karıştırmayın…"
        rows={3}
        className="bn-sahanotu-duz-alinti"
      />

      <div className="bn-sahanotu-duz-imza">
        <input
          type="text"
          value={yazar}
          onChange={(e) => onDegis({ alinti, yazar: e.target.value, unvan })}
          placeholder="Yazar (örn: Ayşe Demir)"
          className="bn-sahanotu-duz-yazar"
        />
        <input
          type="text"
          value={unvan}
          onChange={(e) => onDegis({ alinti, yazar, unvan: e.target.value })}
          placeholder="Unvan (örn: YMM)"
          className="bn-sahanotu-duz-unvan"
        />
      </div>
    </div>
  );
};
