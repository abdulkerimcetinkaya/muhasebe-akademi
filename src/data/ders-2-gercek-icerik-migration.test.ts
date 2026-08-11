import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260809000007_ders_2_muhasebe_nedir.sql'),
  'utf8',
);

describe('Ders 2 gerçek içerik migration sözleşmesi', () => {
  it('mevcut Ders 2 kimliğini korur', () => {
    expect(sql).toContain("i.ad='Muhasebe Nedir?'");
    expect(sql).not.toContain('insert into public.kesfet_itemler');
    expect(sql).not.toMatch(/delete\s+from\s+public\.kesfet_(itemler|ilerleme)/i);
  });

  it('25 kullanıcı bölümü taşır', () => {
    expect(sql.match(/pg_temp\.bn_h\('d2-\d{2}'/g) ?? []).toHaveLength(25);
  });

  it('bilgi dönüşümü laboratuvarı ve üç test içerir', () => {
    expect(sql).toContain("'type','bilgidonusumu'");
    expect(sql.match(/'test'\)/g) ?? []).toHaveLength(3);
  });

  it('yalnız iki sözlük kavramını ekler', () => {
    expect(sql).toContain("'muhasebe','Muhasebe'");
    expect(sql).toContain("'finansal-bilgi','Finansal Bilgi'");
  });

  it('mevzuat ve Question Engine bağı eklemez', () => {
    expect(sql).not.toContain('kesfet_item_sorulari');
    expect(sql).not.toContain('soru_mevzuat_baglantilari');
  });
});
