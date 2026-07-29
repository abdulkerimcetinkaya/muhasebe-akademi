import { useCreateBlockNote } from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import type { Block } from '@blocknote/core';
import { useMemo } from 'react';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { ozelSema } from '../lib/blocknote-schema';
import { SozlukPopover } from './SozlukPopover';
import { MevzuatPaneli } from './MevzuatPaneli';

interface Props {
  icerik: unknown | null;
}

/**
 * Read-only BlockNote viewer. UniteSayfasi'nda kullanıcı tarafında
 * işletmeye ait konu anlatımını gösterir. Boşsa null döner — caller boş
 * durumu (örn. "İçerik henüz hazırlanmadı") kendi karar versin.
 *
 * Özel "term" inline style ile işaretlenmiş kelimeler `span.bn-term` olarak
 * render edilir; `SozlukPopover` global tıklama yakalayıcısı bunlara
 * popover bağlar.
 */
export const IcerikGoruntuleyici = ({ icerik }: Props) => {
  const blocks = useMemo<Block[] | undefined>(() => {
    if (!icerik) return undefined;
    if (!Array.isArray(icerik) || icerik.length === 0) return undefined;
    // Savunma: şemada TANIMSIZ blok tipini ele. İçerik (DB) yeni bir blok
    // tipi içerip kod henüz onu bilmiyorsa (deploy gecikmesi) tüm ders
    // çökmesin — bilinmeyen blok sessizce atlanır, gerisi render edilir.
    const bilinen = ozelSema.blockSchema as Record<string, unknown> | undefined;
    if (!bilinen) return icerik as Block[];
    const suzulmus = (icerik as Block[]).filter((b) => !b?.type || b.type in bilinen);
    return suzulmus.length > 0 ? suzulmus : undefined;
  }, [icerik]);

  const editor = useCreateBlockNote({
    schema: ozelSema,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialContent: blocks as any,
  });

  if (!blocks) return null;

  return (
    <div className="bn-icerik bn-okunur">
      <BlockNoteView editor={editor} editable={false} theme="light" />
      <SozlukPopover />
      <MevzuatPaneli />
    </div>
  );
};
