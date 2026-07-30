// Sitemap üretici — build'de otomatik çalışır (package.json "build").
// DB'den (Supabase, anon key) yayındaki sözlük terimleri + açık Keşfet
// kart/derslerini çeker; statik rotalarla birleştirip public/sitemap.xml yazar.
//
// DAYANIKLILIK: creds yoksa veya DB hatası olursa build'i KIRMAZ — en azından
// statik rotalarla geçerli bir sitemap yazar (process exit 0).
//
// Env: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (Vercel build'de mevcut;
// lokalde .env'den okunur).

import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = 'https://muhasebeakademi.com';
const OUT = join(root, 'public', 'sitemap.xml');

// Vercel: process.env; lokal: .env'i elle oku (dotenv bağımlılığı yok).
function loadEnv() {
  const e = { ...process.env };
  const p = join(root, '.env');
  if (existsSync(p)) {
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !e[m[1]]) e[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return e;
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const tag = (loc, lastmod, cf, pr) =>
  `  <url><loc>${BASE}${esc(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`;

const STATIK = [
  ['/', 'weekly', '1.0'],
  ['/sozluk', 'weekly', '0.9'],
  ['/kesfet', 'weekly', '0.8'],
  ['/isletmeler', 'weekly', '0.8'],
  ['/uniteler', 'weekly', '0.7'],
  ['/problemler', 'weekly', '0.7'],
  ['/premium', 'monthly', '0.5'],
];

async function main() {
  const env = loadEnv();
  const url = env.VITE_SUPABASE_URL;
  const key = env.VITE_SUPABASE_ANON_KEY;
  const bugun = new Date().toISOString().slice(0, 10);
  const satirlar = STATIK.map(([loc, cf, pr]) => tag(loc, bugun, cf, pr));

  if (!url || !key) {
    console.warn('[sitemap] Supabase env yok — yalnızca statik rotalar.');
  } else {
    try {
      const sb = createClient(url, key);
      const [soz, kart] = await Promise.all([
        sb.from('sozluk_terimleri').select('slug').eq('yayinda', true),
        sb.from('kesfet_kartlar').select('slug, tip').eq('durum', 'acik'),
      ]);
      for (const t of soz.data ?? []) satirlar.push(tag(`/sozluk/${t.slug}`, bugun, 'monthly', '0.8'));
      // Ders/işlem (item) sayfaları anonime kapalı (kayıt duvarı) — sitemap'e
      // yalnızca vitrin niteliğindeki kart sayfaları girer. Kart türüne göre
      // taban: 'kesfet' → /kesfet, 'isletme' → /isletmeler.
      for (const k of kart.data ?? []) {
        const taban = k.tip === 'isletme' ? '/isletmeler' : '/kesfet';
        satirlar.push(tag(`${taban}/${k.slug}`, bugun, 'weekly', '0.7'));
      }
      if (soz.error || kart.error) {
        console.warn('[sitemap] kısmi DB hatası:', soz.error?.message, kart.error?.message);
      }
    } catch (e) {
      console.warn('[sitemap] DB hatası, statik rotalarla devam:', e?.message);
    }
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Otomatik üretildi (scripts/gen-sitemap.mjs, build sırasında). Elle düzenleme. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${satirlar.join('\n')}\n</urlset>\n`;
  writeFileSync(OUT, xml);
  console.log(`[sitemap] public/sitemap.xml yazıldı — ${satirlar.length} URL.`);
}

main().catch((e) => {
  // Asla build'i kırma.
  console.warn('[sitemap] beklenmeyen hata, atlanıyor:', e?.message);
});
