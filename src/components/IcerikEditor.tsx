import { useEffect, useMemo, useState } from 'react';
import {
  useCreateBlockNote,
  useBlockNoteEditor,
  useComponentsContext,
  FormattingToolbar,
  FormattingToolbarController,
  getFormattingToolbarItems,
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  type DefaultReactSuggestionItem,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import {
  filterSuggestionItems,
  insertOrUpdateBlockForSlashMenu,
  type Block,
} from '@blocknote/core';
import '@blocknote/core/fonts/inter.css';
import '@blocknote/mantine/style.css';
import { supabase } from '../lib/supabase';
import { ozelSema } from '../lib/blocknote-schema';
import { HesapKodDataList } from '../lib/yevmiye-block';
import { SozlukAdminModal } from './SozlukAdminModal';

interface Props {
  initialContent: unknown | null;
  onChange: (blocks: Block[]) => void;
}

const STORAGE_BUCKET = 'unite-gorseller';

// Drag-drop / paste edilen görseli Supabase Storage'a yükler, public URL döndürür.
const gorselYukle = async (file: File): Promise<string> => {
  const uzanti = file.name.split('.').pop()?.toLowerCase() || 'png';
  const yol = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${uzanti}`;

  console.log('[IcerikEditor] Yükleme başlıyor:', { yol, boyut: file.size, mime: file.type });

  const { data: oturum } = await supabase.auth.getSession();
  console.log('[IcerikEditor] Oturum:', oturum.session ? oturum.session.user.email : 'YOK');

  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(yol, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type || undefined,
  });

  if (error) {
    console.error('[IcerikEditor] Storage hatası:', error);
    alert(`Görsel yükleme hatası:\n\n${error.message}\n\n(Detay konsola yazıldı)`);
    throw new Error(`Görsel yükleme hatası: ${error.message}`);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(yol);
  console.log('[IcerikEditor] Yükleme başarılı:', data.publicUrl);
  return data.publicUrl;
};

/**
 * Notion-tarzı blok editör (admin panelinde kullanılır).
 * BlockNote dokümanı JSON olarak `unites.icerik` kolonuna yazılır.
 *
 * Özel "term" inline style: kullanıcı metni seçince çıkan formatting toolbar'a
 * (bold/italic'in yanına) "Sözlük" butonu eklenir; tıklanınca açıklama modalı
 * açılır. Mevcut term üzerine tıklayınca buton seçili görünür ve modal
 * düzenleme/silme modunda açılır.
 *
 * Görsel yükleme: drag-drop / paste / slash-menu üzerinden eklenen görseller
 * `unite-gorseller` Storage bucket'ına yüklenir.
 */
export const IcerikEditor = ({ initialContent, onChange }: Props) => {
  const initialBlocks = useMemo(() => {
    if (!initialContent) return undefined;
    if (Array.isArray(initialContent) && initialContent.length > 0) {
      return initialContent as Block[];
    }
    return undefined;
  }, [initialContent]);

  const editor = useCreateBlockNote({
    schema: ozelSema,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialContent: initialBlocks as any,
    uploadFile: gorselYukle,
    // Yapıştırmayı Markdown olarak parse et: kaynaktan gelen renk/stil (örn.
    // beyaz yazı) taşınmaz, ama # başlık, * madde, > alıntı, ``` kod doğru
    // bloklara dönüşür. Düz metin (pasteText) markdown'ı literal bırakıyordu.
    pasteHandler: ({ event, editor: ed, defaultPasteHandler }) => {
      const metin = event.clipboardData?.getData('text/plain');
      if (metin) {
        ed.pasteMarkdown(metin);
        return true;
      }
      return defaultPasteHandler();
    },
  });

  // Editör değiştiğinde parent'a bildir.
  const [hazir, setHazir] = useState(false);
  useEffect(() => {
    if (!editor) return;
    setHazir(true);
    const off = editor.onChange(() => {
      onChange(editor.document as unknown as Block[]);
    });
    return () => {
      if (typeof off === 'function') off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Sözlük modal state — toolbar butonundan tetiklenir.
  const [sozlukAcik, setSozlukAcik] = useState(false);
  const [secilenMetin, setSecilenMetin] = useState('');
  const [mevcutAciklama, setMevcutAciklama] = useState('');

  const sozlukButonAc = () => {
    const secim = editor.getSelectedText();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aktifStiller: any = editor.getActiveStyles();
    const mevcut = (aktifStiller?.term as string | undefined) ?? '';
    // Eğer seçim yoksa ama cursor mevcut term üzerinde, mevcut aciklamayı düzenle.
    // (Aksi halde kullanıcıdan seçim yapmasını iste.)
    if (!secim && !mevcut) {
      alert('Önce bir kelime ya da kelime grubunu seç, sonra Sözlük butonuna bas.');
      return;
    }
    setSecilenMetin(secim || '—');
    setMevcutAciklama(mevcut);
    setSozlukAcik(true);
  };

  const sozlukKaydet = (aciklama: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.addStyles({ term: aciklama } as any);
    setSozlukAcik(false);
  };

  const sozlukSil = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    editor.removeStyles({ term: true } as any);
    setSozlukAcik(false);
  };

  if (!hazir) {
    return (
      <div className="bn-icerik bn-yukleniyor">
        <div className="text-[13px] text-ink-soft font-mono tracking-[0.16em] uppercase">
          editör hazırlanıyor…
        </div>
      </div>
    );
  }

  // Slash menü öğeleri: varsayılan listeye "Yevmiye Kaydı" + "Saha Notu" ekle.
  const slashMenuOgeleri = (query: string): DefaultReactSuggestionItem[] => {
    const yevmiyeOgesi: DefaultReactSuggestionItem = {
      title: 'Yevmiye Kaydı',
      subtext: 'Klasik defter formatında borç/alacak satırları',
      aliases: ['yevmiye', 'kayit', 'defter', 'borc', 'alacak', 'journal'],
      group: 'Diğer',
      icon: <YevmiyeGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'yevmiye',
          props: { tarih: '', satirlar: '[]', aciklama: '' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const sahaNotuOgesi: DefaultReactSuggestionItem = {
      title: 'Saha Notu',
      subtext: 'Uzman alıntısı — yazar ve unvan ile',
      aliases: ['saha', 'not', 'alinti', 'quote', 'uzman', 'üstad', 'ustad'],
      group: 'Diğer',
      icon: <SahaNotuGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'sahanotu',
          props: { alinti: '', yazar: '', unvan: '' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const tHesabiOgesi: DefaultReactSuggestionItem = {
      title: 'T Hesabı',
      subtext: 'Büyük defter görseli — borç solda, alacak sağda (T şekli)',
      aliases: ['t', 'thesabi', 't hesabi', 'hesap', 'kebir', 'buyuk defter', 'ledger'],
      group: 'Diğer',
      icon: <THesabiGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'thesabi',
          props: { hesap: '', sol: '[]', sag: '[]' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const bilancoOgesi: DefaultReactSuggestionItem = {
      title: 'Bilanço',
      subtext: 'İki taraflı mali durum — solda varlıklar, sağda kaynaklar',
      aliases: ['bilanco', 'bilanço', 'mali durum', 'varlik', 'kaynak', 'balance'],
      group: 'Diğer',
      icon: <BilancoGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'bilanco',
          props: { baslik: 'BİLANÇO', sol: '[]', sag: '[]' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const kontrolOgesi: DefaultReactSuggestionItem = {
      title: 'Kontrol Sorusu',
      subtext: 'Ders içi mini soru — şıklar + anında geri bildirim',
      aliases: ['kontrol', 'soru', 'quiz', 'test', 'sik', 'kendini dene'],
      group: 'Diğer',
      icon: <KontrolGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'kontrol',
          props: { soru: '', siklar: '[]', aciklama: '' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const kayitOgesi: DefaultReactSuggestionItem = {
      title: 'Mini Kayıt',
      subtext: 'Ders içi yevmiye alıştırması — borç/alacak yerleştir + kontrol',
      aliases: ['kayit', 'kayıt', 'mini', 'yevmiye alistirma', 'borc alacak', 'entry'],
      group: 'Diğer',
      icon: <KayitGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'kayit',
          props: { senaryo: '', tarih: '', satirlar: '[]', aciklama: '' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const veriKartlariOgesi: DefaultReactSuggestionItem = {
      title: 'Veri Kartları',
      subtext: 'İşletme bilgilerini aşamalı veya karşılaştırmalı göster',
      aliases: ['veri', 'kart', 'karsilastirma', 'işletme', 'durum'],
      group: 'Diğer',
      icon: <VeriKartlariGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'verikartlari', props: { baslik: '', kartlar: '[]', asamali: false },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const laboratuvarOgesi: DefaultReactSuggestionItem = {
      title: 'İşlem Laboratuvarı',
      subtext: 'Sürgüler ve olay nedenleriyle etkileşimli deney alanı',
      aliases: ['laboratuvar', 'slider', 'sürgü', 'deney', 'işlem'],
      group: 'Diğer',
      icon: <LaboratuvarGlyph />,
      onItemClick: () => {
        insertOrUpdateBlockForSlashMenu(editor, {
          type: 'islemlaboratuvari', props: { baslik: 'Aynı para, farklı işletme', config: '{}' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any);
      },
    };
    const bilgiDonusumuOgesi: DefaultReactSuggestionItem = {
      title: 'Bilgi Dönüşümü',
      subtext: 'Dağınık işletme olaylarını soruya göre anlamlı bilgiye dönüştür',
      aliases: ['bilgi', 'dönüşüm', 'muhasebe laboratuvarı', 'girdi', 'çıktı'],
      group: 'Diğer', icon: <BilgiDonusumuGlyph />,
      onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, {
        type: 'bilgidonusumu', props: { baslik: 'Dağınık Bilgiden Anlamlı Bilgiye', config: '{}' },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any),
    };
    return filterSuggestionItems(
      [
        ...getDefaultReactSlashMenuItems(editor),
        yevmiyeOgesi,
        sahaNotuOgesi,
        tHesabiOgesi,
        bilancoOgesi,
        kontrolOgesi,
        kayitOgesi,
        veriKartlariOgesi,
        laboratuvarOgesi,
        bilgiDonusumuOgesi,
      ],
      query,
    );
  };

  return (
    <div className="bn-icerik">
      <BlockNoteView
        editor={editor}
        theme="light"
        slashMenu={false}
        formattingToolbar={false}
        sideMenu
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) => slashMenuOgeleri(query)}
        />
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              {getFormattingToolbarItems()}
              <SozlukToolbarButton key="sozlukButton" onAc={sozlukButonAc} />
            </FormattingToolbar>
          )}
        />
      </BlockNoteView>

      <HesapKodDataList />

      <SozlukAdminModal
        acik={sozlukAcik}
        secilenMetin={secilenMetin}
        baslangicAciklama={mevcutAciklama}
        onKaydet={sozlukKaydet}
        onSil={sozlukSil}
        onKapat={() => setSozlukAcik(false)}
      />
    </div>
  );
};

const YevmiyeGlyph = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
    <path d="M8 9v6" />
    <path d="M16 9v6" />
  </svg>
);

const SahaNotuGlyph = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M7 7h4v4H7z" />
    <path d="M13 7h4v4h-4z" />
    <path d="M9 11c0 3-2 5-4 5" />
    <path d="M15 11c0 3-2 5-4 5" />
  </svg>
);

const THesabiGlyph = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 7h16" />
    <path d="M12 7v13" />
  </svg>
);

const BilancoGlyph = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="15" rx="2" />
    <path d="M12 5v15" />
    <path d="M3 16h18" />
  </svg>
);

const KontrolGlyph = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.5v.2" />
    <path d="M12 17h.01" />
  </svg>
);

const VeriKartlariGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <rect x="3" y="4" width="8" height="16" rx="2" /><rect x="13" y="4" width="8" height="16" rx="2" /><path d="M6 9h2M16 9h2M6 14h2M16 14h2" />
  </svg>
);

const LaboratuvarGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <path d="M9 3h6M10 3v6l-5 8a3 3 0 0 0 2.6 4.5h8.8A3 3 0 0 0 19 17l-5-8V3" /><path d="M7.5 16h9" />
  </svg>
);
const BilgiDonusumuGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M4 6h6M14 6h6M10 6l4 6-4 6M14 18h6M4 18h6" /></svg>
);

const KayitGlyph = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M12 4v16" />
    <path d="M7 10l2 2 3-3" />
  </svg>
);

/**
 * Formatting toolbar'da yer alan özel "Sözlük" butonu.
 * Mevcut term mark'ı varsa seçili görünür (toggle gibi); tıklanınca
 * parent'a haber verir (modal açılır).
 */
const SozlukToolbarButton = ({ onAc }: { onAc: () => void }) => {
  const Components = useComponentsContext();
  const editor = useBlockNoteEditor();

  if (!Components || !editor) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const aktif = !!(editor.getActiveStyles() as any)?.term;

  return (
    <Components.FormattingToolbar.Button
      mainTooltip={aktif ? 'Sözlük açıklamasını düzenle' : 'Sözlüğe ekle'}
      label="Sözlük"
      icon={<BookGlyph />}
      isSelected={aktif}
      onClick={() => onAc()}
    />
  );
};

// BlockNote butonları küçük SVG istiyor — lucide-react'ten Icon yerine
// inline SVG (BlockNote toolbar stil ezmesiyle uyumlu).
const BookGlyph = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
  </svg>
);
