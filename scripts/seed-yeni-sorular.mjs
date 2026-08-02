#!/usr/bin/env node
// content/sorular/*.json içindeki soruları doğrular ve
// supabase/migrations/20260425000003_more_sorular.sql üretir.
// Mevcut seed (20260423000002) ile çakışmamak için ID'ler "<unite>-ek-<N>".

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CONTENT = join(ROOT, 'content/sorular');
const MIG_OUT = join(ROOT, 'supabase/migrations/20260425000003_more_sorular.sql');

// Tek Düzen Hesap Planı (src/data/hesap-plani.ts ile birebir senkron)
const GECERLI_KOD = new Set([
  '100','101','102','103','108','120','121','122','127','128','129','131',
  '150','151','152','153','157','159',
  '180','181','190','191','192','193','195','196','197',
  '252','253','254','255','257','258','280','281',
  '300','320','321','322','331','335','336','340',
  '360','361','380','381','391','392','397','480','481',
  '500','540','570','580','590','591',
  '600','601','610','611','621','632','642','644','646','647','649',
  '653','654','656','657','659','660','679','689','690',
  '730','760','770','780',
]);

const GECERLI_UNITE = new Set([
  'kasa','banka','mal','senet','kdv','amortisman','personel',
  'donem-sonu','supheli-alacaklar','reeskont','kambiyo',
]);

const dosyalar = readdirSync(CONTENT).filter((f) => f.endsWith('.json'));
const tumSorular = [];
const hatalar = [];

for (const dosya of dosyalar) {
  const yol = join(CONTENT, dosya);
  let veri;
  try {
    veri = JSON.parse(readFileSync(yol, 'utf-8'));
  } catch (e) {
    hatalar.push(`${dosya}: JSON parse hatası — ${e.message}`);
    continue;
  }
  if (!Array.isArray(veri)) {
    hatalar.push(`${dosya}: dizi değil`);
    continue;
  }

  veri.forEach((soru, i) => {
    const etiket = `${dosya}#${i + 1}`;
    if (!GECERLI_UNITE.has(soru.isletme_id)) {
      hatalar.push(`${etiket}: geçersiz isletme_id "${soru.isletme_id}"`);
    }
    if (!soru.baslik || soru.baslik.length > 80) {
      hatalar.push(`${etiket}: başlık eksik veya çok uzun`);
    }
    if (!['kolay', 'orta', 'zor'].includes(soru.zorluk)) {
      hatalar.push(`${etiket}: geçersiz zorluk`);
    }
    if (!Array.isArray(soru.cozumler) || soru.cozumler.length < 2) {
      hatalar.push(`${etiket}: en az 2 çözüm satırı olmalı`);
      return;
    }
    let toplamBorc = 0;
    let toplamAlacak = 0;
    soru.cozumler.forEach((c, j) => {
      if (!GECERLI_KOD.has(c.kod)) {
        hatalar.push(`${etiket}: satır ${j + 1} — geçersiz kod "${c.kod}"`);
      }
      const b = Number(c.borc) || 0;
      const a = Number(c.alacak) || 0;
      if (b < 0 || a < 0) hatalar.push(`${etiket}: satır ${j + 1} — negatif tutar`);
      if (b > 0 && a > 0) hatalar.push(`${etiket}: satır ${j + 1} — borç ve alacak aynı satırda`);
      if (b === 0 && a === 0) hatalar.push(`${etiket}: satır ${j + 1} — boş tutar`);
      toplamBorc += b;
      toplamAlacak += a;
    });
    const fark = Math.abs(toplamBorc - toplamAlacak);
    if (fark > 0.01) {
      hatalar.push(
        `${etiket}: yevmiye dengesi tutmadı (borç ${toplamBorc} ≠ alacak ${toplamAlacak})`,
      );
    }
    tumSorular.push(soru);
  });
}

if (hatalar.length) {
  console.error('Doğrulama hataları:');
  hatalar.forEach((h) => console.error(' ✗', h));
  process.exit(1);
}

console.log(`✓ ${tumSorular.length} soru doğrulandı.`);

const escapeSql = (s) => (s ?? '').toString();
const dolarKaynak = (s) => `$ml$${escapeSql(s).replaceAll('$ml$', '$$$ml$$')}$ml$`;

const idSayaci = new Map();
const sqlParcalar = ['begin;', ''];

for (const soru of tumSorular) {
  const sira = (idSayaci.get(soru.isletme_id) ?? 0) + 1;
  idSayaci.set(soru.isletme_id, sira);
  const id = `${soru.isletme_id}-ek-${sira}`;
  const ipucu = soru.ipucu ? dolarKaynak(soru.ipucu) : 'null';
  const aciklama = soru.aciklama ? dolarKaynak(soru.aciklama) : 'null';
  sqlParcalar.push(
    `insert into sorular (id, isletme_id, baslik, zorluk, senaryo, ipucu, aciklama, belgeler, durum, kaynak, yayinlanma_tarihi) values`,
    `  ('${id}', '${soru.isletme_id}', ${dolarKaynak(soru.baslik)}, '${soru.zorluk}', ${dolarKaynak(soru.senaryo)}, ${ipucu}, ${aciklama}, $ml$[]$ml$::jsonb, 'onayli', 'ai', now())`,
    `  on conflict (id) do update set`,
    `    isletme_id = excluded.isletme_id,`,
    `    baslik = excluded.baslik,`,
    `    zorluk = excluded.zorluk,`,
    `    senaryo = excluded.senaryo,`,
    `    ipucu = excluded.ipucu,`,
    `    aciklama = excluded.aciklama,`,
    `    durum = excluded.durum;`,
    '',
  );
  sqlParcalar.push(`delete from cozumler where soru_id = '${id}';`);
  soru.cozumler.forEach((c, j) => {
    sqlParcalar.push(
      `insert into cozumler (soru_id, sira, kod, borc, alacak) values ('${id}', ${j + 1}, '${c.kod}', ${Number(c.borc)}, ${Number(c.alacak)});`,
    );
  });
  sqlParcalar.push('');
}

sqlParcalar.push('commit;');

const baslik = `-- =====================================================================
-- Ek soru seed (Sprint 4): content/sorular/*.json'dan üretildi
-- Üretici: scripts/seed-yeni-sorular.mjs
-- Üretim tarihi: ${new Date().toISOString()}
-- Kapsam: ${tumSorular.length} ek soru, "<unite>-ek-N" ID'li
-- =====================================================================

`;

writeFileSync(MIG_OUT, baslik + sqlParcalar.join('\n') + '\n');
console.log(`✓ Migration yazıldı: ${MIG_OUT.replace(ROOT + '/', '')}`);
console.log(`  Eklenecek soru: ${tumSorular.length}`);
const ozet = {};
for (const s of tumSorular) ozet[s.isletme_id] = (ozet[s.isletme_id] || 0) + 1;
console.log('  Ünite başına:', ozet);
