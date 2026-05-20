// Modül 1 Genel Bakış ve 1.1 kartlarına "İlgili Mevzuat" bölümünü append eder.

let _idCounter = 0;
const blockId = (prefix) => `${prefix}${(++_idCounter).toString(36).padStart(7, '0')}`;

const text = (str, styles = {}) => ({ type: 'text', text: str, styles });
const b = (str) => text(str, { bold: true });

const heading = (prefix, level, str) => ({
  id: blockId(prefix),
  type: 'heading',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left', level },
  content: [text(str)],
  children: [],
});

const para = (prefix, ...parts) => ({
  id: blockId(prefix),
  type: 'paragraph',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map((p) => (typeof p === 'string' ? text(p) : p)),
  children: [],
});

const bullet = (prefix, ...parts) => ({
  id: blockId(prefix),
  type: 'bulletListItem',
  props: { textColor: 'default', backgroundColor: 'default', textAlignment: 'left' },
  content: parts.map((p) => (typeof p === 'string' ? text(p) : p)),
  children: [],
});

// ---------- Modül 1 Genel Bakış mevzuat ekleri ----------
_idCounter = 0;
const modulMevzuat = [
  heading('mm', 2, 'İlgili Mevzuat'),
  para(
    'mm',
    'Soruya başlamadan önce göz atman, mevzuatın dilini tanıman için iyi olur. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet('mm', b('TTK md. 11–12'), ' — Tacir ve ticari işletme tanımı'),
  bullet('mm', b('TTK md. 124'), ' — Ticaret şirketlerinin türleri'),
  bullet('mm', b('TTK md. 332'), ' — Anonim şirkette asgari sermaye'),
  bullet('mm', b('TTK md. 344'), ' — Anonim şirkette sermayenin %25’inin önceden yatırılması'),
  bullet('mm', b('TTK md. 580'), ' — Limited şirkette asgari sermaye'),
  bullet('mm', b('TTK md. 585'), ' — Limited şirkette sermayenin ödenme süresi'),
  bullet('mm', b('VUK md. 175 ve 219'), ' — Defter tutma ve dönem başı kayıtları'),
  bullet('mm', b('VUK md. 282'), ' — Kuruluş ve örgütlenme giderleri'),
  bullet('mm', b('TTK md. 64 ve 67'), ' — Defter tutma ve bilanço düzenleme yükümlülüğü'),
];

// ---------- 1.1 mevzuat ekleri ----------
_idCounter = 0;
const altMevzuat = [
  heading('am', 2, 'İlgili Mevzuat'),
  para(
    'am',
    'Bu konuyu kavrarken aşağıdaki maddelere göz atabilirsin. Bir maddede takılırsan ',
    b('Üstada Sor'),
    ' butonu yanında.',
  ),
  bullet('am', b('TTK md. 11–12'), ' — Tacir ve ticari işletme tanımı'),
  bullet('am', b('TTK md. 124'), ' — Ticaret şirketlerinin türleri (şahıs ve sermaye şirketleri)'),
  bullet('am', b('VUK md. 176–177'), ' — Bilanço esası ve işletme hesabı esası ayrımı'),
  bullet('am', b('TTK md. 64'), ' — Tacirin defter tutma yükümlülüğü'),
];

const sqlString = (obj) => "'" + JSON.stringify(obj).replace(/'/g, "''") + "'::jsonb";

console.log('begin;\n');
console.log('-- Modül 1 Genel Bakış — "İlgili Mevzuat" ekle');
console.log(
  `update unite_modulleri set icerik = icerik || ${sqlString(modulMevzuat)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-m1';`,
);
console.log();
console.log('-- 1.1 — "İlgili Mevzuat" ekle');
console.log(
  `update modul_alt_basliklari set icerik = icerik || ${sqlString(altMevzuat)}, icerik_guncellendi = now(), updated_at = now() where id = 'mal-alis-satis-1-1';`,
);
console.log('\ncommit;');
