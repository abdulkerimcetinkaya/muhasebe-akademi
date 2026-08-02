/**
 * Migration 20260427000003_yeni_unite_yapisi dry-run.
 *
 * Production DB'ye dokunmadan, mevcut soruları okuyup keyword bazlı
 * yeniden kategorilendirmeyi JS'te simüle eder ve rapor üretir.
 *
 * Kullanım:
 *   npx tsx scripts/migration-dry-run.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// .env'i yükle
const envPath = resolve(process.cwd(), '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env: Record<string, string> = {};
envContent.split('\n').forEach((satir) => {
  const m = satir.match(/^([^=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
});

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY .env\'de bulunamadı');
  process.exit(1);
}

const supabase = createClient(url, key);

interface Soru {
  id: string;
  isletme_id: string;
  baslik: string;
  senaryo: string;
}

const ilike = (text: string, pattern: string) =>
  text.toLowerCase().includes(pattern.toLowerCase());

const yeniUniteIdHesapla = (s: Soru): string => {
  const b = s.baslik;
  const sen = s.senaryo;
  const eski = s.isletme_id;

  if (eski === 'kasa' || eski === 'banka') return 'hazir-degerler';

  if (eski === 'mal') {
    const satisGosterge =
      ilike(b, 'satış') ||
      ilike(b, 'satıl') ||
      ilike(b, 'sattı') ||
      ilike(b, 'müşteri') ||
      ilike(b, 'perakende') ||
      ilike(b, 'z raporu') ||
      ilike(sen, '600 yurt içi') ||
      ilike(sen, 'satış faturası') ||
      ilike(sen, '391 hesaplanan');
    const alisIstisna = ilike(b, 'satıcıya iade') || ilike(b, 'alıştan iade');
    return satisGosterge && !alisIstisna ? 'mal-satis' : 'mal-alis';
  }

  if (eski === 'senet') {
    const borcGosterge =
      ilike(b, 'borç senedi') ||
      ilike(b, 'verilen senet') ||
      ilike(b, 'satıcıya') ||
      ilike(b, 'bono kes') ||
      ilike(sen, '321 borç senet') ||
      ilike(sen, 'bono düzenle') ||
      ilike(sen, 'satıcıya verilen');
    return borcGosterge ? 'ticari-borclar' : 'ticari-alacaklar';
  }

  if (eski === 'kdv') return 'kdv';
  if (eski === 'personel') return 'personel';

  if (eski === 'amortisman') {
    const amortismanAyirma =
      ilike(b, 'amortisman') ||
      ilike(sen, 'amortisman ayır') ||
      ilike(sen, 'azalan bakiye') ||
      ilike(sen, '257 birikmiş') ||
      ilike(b, 'kıst') ||
      ilike(sen, 'yıpranma');
    return amortismanAyirma ? 'amortisman' : 'mdv';
  }

  if (eski === 'donem-sonu') {
    if (ilike(b, 'reeskont') || ilike(sen, 'reeskont') ||
        ilike(sen, '122 alacak senet') || ilike(sen, '322 borç senet')) {
      return 'reeskont-karsilik';
    }
    if (ilike(b, 'stok') || ilike(b, 'envanter') ||
        ilike(sen, 'dönem sonu stok') || ilike(sen, 'satılan ticari mallar maliyet') ||
        ilike(sen, '621 satılan') || ilike(sen, 'fiziki sayım') ||
        ilike(b, 'fifo') || ilike(b, 'ortalama maliyet')) {
      return 'stok-degerleme';
    }
    return 'donem-sonu-kapanis';
  }

  if (eski === 'supheli-alacaklar') {
    if (ilike(b, '128') &&
        !(ilike(b, 'karşılık') || ilike(b, '129') || ilike(sen, '654 karşılık'))) {
      return 'ticari-alacaklar';
    }
    return 'reeskont-karsilik';
  }

  if (eski === 'reeskont') return 'reeskont-karsilik';

  if (eski === 'kambiyo') {
    if (ilike(b, 'dövizli kasa') || ilike(b, 'dövizli banka') ||
        (ilike(sen, '102 banka') && ilike(sen, 'dövizli')) ||
        (ilike(sen, '100 kasa') && ilike(sen, 'dövizli'))) {
      return 'hazir-degerler';
    }
    return 'yabanci-kaynaklar';
  }

  return eski; // bilinmeyen → değişme
};

async function main() {
  const { data, error } = await supabase
    .from('sorular')
    .select('id, isletme_id, baslik, senaryo')
    .order('isletme_id')
    .order('id');

  if (error) {
    console.error('Soru çekme hatası:', error);
    process.exit(1);
  }

  const sorular = (data ?? []) as Soru[];
  console.log(`\n✓ ${sorular.length} soru çekildi.\n`);

  // Eski ünitelere göre dağılım
  const eskiDagilim: Record<string, number> = {};
  sorular.forEach((s) => {
    eskiDagilim[s.isletme_id] = (eskiDagilim[s.isletme_id] ?? 0) + 1;
  });
  console.log('═══════════ ESKİ DAĞILIM (mevcut DB) ═══════════');
  Object.entries(eskiDagilim)
    .sort((a, b) => b[1] - a[1])
    .forEach(([id, n]) => {
      console.log(`  ${id.padEnd(22)} ${n.toString().padStart(4)}`);
    });

  // Migration sonrası dağılım
  const yeniDagilim: Record<string, number> = {};
  const transferRapor: Record<string, Record<string, number>> = {};
  sorular.forEach((s) => {
    const yeni = yeniUniteIdHesapla(s);
    yeniDagilim[yeni] = (yeniDagilim[yeni] ?? 0) + 1;
    if (!transferRapor[s.isletme_id]) transferRapor[s.isletme_id] = {};
    transferRapor[s.isletme_id][yeni] = (transferRapor[s.isletme_id][yeni] ?? 0) + 1;
  });

  console.log('\n═══════════ YENİ DAĞILIM (migration sonrası) ═══════════');
  const yeniSira = [
    'acilis', 'hazir-degerler', 'mal-alis', 'mal-satis',
    'ticari-alacaklar', 'ticari-borclar', 'kdv', 'personel',
    'mdv', 'amortisman', 'reeskont-karsilik', 'stok-degerleme',
    'yabanci-kaynaklar', 'gelir-tablosu', 'donem-sonu-kapanis',
  ];
  yeniSira.forEach((id, i) => {
    const n = yeniDagilim[id] ?? 0;
    const isaret = n === 0 ? ' ⚠ BOŞ' : '';
    console.log(`  ${(i + 1).toString().padStart(2)}. ${id.padEnd(22)} ${n.toString().padStart(4)}${isaret}`);
  });

  console.log('\n═══════════ TRANSFER MATRIKSİ ═══════════');
  Object.entries(transferRapor).forEach(([eski, hedefler]) => {
    const toplam = Object.values(hedefler).reduce((a, b) => a + b, 0);
    console.log(`\n  ${eski} (${toplam} soru):`);
    Object.entries(hedefler)
      .sort((a, b) => b[1] - a[1])
      .forEach(([yeni, n]) => {
        const yuzde = ((n / toplam) * 100).toFixed(0);
        const ok = eski === yeni || yeni in transferRapor === false;
        console.log(`    → ${yeni.padEnd(22)} ${n.toString().padStart(3)} (${yuzde}%)`);
      });
  });

  // Boş ünite uyarısı
  const bosUniteler = yeniSira.filter((id) => !yeniDagilim[id]);
  if (bosUniteler.length) {
    console.log('\n═══════════ ⚠ BOŞ KALAN ÜNİTELER ═══════════');
    bosUniteler.forEach((id) => console.log(`  • ${id} (sıfır soru)`));
    console.log('  → Bu ünitelere admin panelden soru eklenmesi gerekir.');
  }

  console.log('\n✓ Dry-run tamamlandı. Migration uygulanmadı.');
}

main();
