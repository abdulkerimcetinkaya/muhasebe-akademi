import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEMELLER_V2_SEED_DERSLER } from './temeller-mufredat-denetimi';

const migrationPath = resolve(process.cwd(), 'supabase/migrations/20260809000002_kesfet_yetkinlik_agi.sql');
const sql = readFileSync(migrationPath, 'utf8');

describe('Keşfet migration sözleşmesi', () => {
  it('mevcut Keşfet kartlarını veya ilerlemeyi silmez', () => {
    expect(sql).not.toMatch(/delete\s+from\s+public\.kesfet_kartlar/i);
    expect(sql).not.toMatch(/delete\s+from\s+public\.kesfet_ilerleme/i);
    expect(sql).not.toMatch(/truncate\s+/i);
  });

  it('türlendirilmiş ön koşul ve ölçümlü soru ilişkilerini kurar', () => {
    expect(sql).toContain('create table if not exists public.kesfet_kart_on_kosullari');
    expect(sql).toContain('create table if not exists public.kesfet_item_sorulari');
    expect(sql).toContain('kesfet_on_kosul_dongu_engelle');
  });

  it('altın referans KUR-001 sorusunu yalnız mevcut ve onaylıysa bağlar', () => {
    expect(sql).toContain("s.id='soru-mal-alis-veresiye-001'");
    expect(sql).toContain("s.durum='onayli'");
  });

  // Not: bu migration'ın kendi tarihsel 19 derslik seed'ini doğrular.
  // Ürünün kanonik hedefi 39 derstir (bkz. temeller-39-ders-migration.test.ts).
  it('kendi 19 derslik seed sözleşmesindeki her dersi taşır', () => {
    for (const ders of TEMELLER_V2_SEED_DERSLER) {
      expect(sql, `${ders.no}. ders migration içinde yok: ${ders.ad}`).toContain(`'${ders.ad}'`);
    }
  });

  it('İşletmeler kayıtlarını yeniden kurmaz', () => {
    expect(sql).not.toMatch(/delete[\s\S]+tip\s*=\s*'isletme'/i);
    expect(sql).not.toMatch(/update[\s\S]+tip\s*=\s*'isletme'/i);
  });
});
