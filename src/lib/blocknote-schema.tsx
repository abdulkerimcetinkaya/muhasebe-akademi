// Özel BlockNote schema'sı — varsayılan stillerin üstüne "term" (sözlük terimi)
// inline style'ı ekler.
//
// Kullanım: admin bir kelimeyi seçer, toolbar'daki "Sözlük" butonuna basar,
// açıklamayı girer → o text aralığı term mark'ı ile işaretlenir. Frontend
// (IcerikGoruntuleyici) bu mark'ı tıklanabilir bir span olarak render eder;
// tıklanınca popover ile açıklama gösterilir.
//
// Saklama: BlockNote'un JSON şeması içinde `styles: { term: "açıklama metni" }`
// olarak text segmentine bağlanır — yeni DB kolonu yok, mevcut `icerik` alanı
// yeterli.

import { BlockNoteSchema, defaultBlockSpecs, defaultStyleSpecs } from '@blocknote/core';
import { createReactStyleSpec } from '@blocknote/react';
import { YevmiyeBlock } from './yevmiye-block';
import { SahaNotuBlock } from './saha-notu-block';

export const TermStyleSpec = createReactStyleSpec(
  {
    type: 'term',
    propSchema: 'string',
  },
  {
    render: (props) => (
      <span
        className="bn-term"
        data-aciklama={props.value}
        ref={props.contentRef}
      />
    ),
  },
);

export const ozelSema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    yevmiye: YevmiyeBlock(),
    sahanotu: SahaNotuBlock(),
  },
  styleSpecs: {
    ...defaultStyleSpecs,
    term: TermStyleSpec,
  },
});
