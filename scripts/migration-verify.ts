import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8')
    .split('\n')
    .filter((l) => l.includes('='))
    .map((l) => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function main() {
  const u = await sb.from('isletmeler').select('id,ad,sira').order('sira');
  const s = await sb.from('sorular').select('isletme_id');
  const dagilim: Record<string, number> = {};
  (s.data ?? []).forEach((r: { isletme_id: string }) => {
    dagilim[r.isletme_id] = (dagilim[r.isletme_id] ?? 0) + 1;
  });

  console.log(`\nToplam ünite: ${u.data?.length}`);
  console.log(`Toplam soru:  ${s.data?.length}\n`);
  console.log('═══════════════════════════════════════════════════════════');

  (u.data ?? []).forEach((r: { sira: number; id: string; ad: string }) => {
    const n = dagilim[r.id] ?? 0;
    const isaret = n === 0 ? ' ⚠' : '';
    console.log(
      `${r.sira.toString().padStart(2)}. ${r.id.padEnd(22)} ${n.toString().padStart(3)} soru${isaret}  — ${r.ad}`
    );
  });
}

main();
