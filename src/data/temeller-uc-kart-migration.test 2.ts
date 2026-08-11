import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260809000004_temeller_uc_kart.sql'),
  'utf8',
);

describe('Temeller üç kart migration sözleşmesi', () => {
  it('üç kartı ve final bölüm türünü kurar', () => {
    expect(sql).toContain("'muhasebe-baslangic'");
    expect(sql).toContain("'hesap-kayit-mantigi'");
    expect(sql).toContain("'kayittan-finansal-tabloya'");
    expect(sql).toContain("'kart_finali'");
  });

  it('45 ders tanımı taşır', () => {
    const satirlar = sql.match(/^\('(?:muhasebe-baslangic|hesap-kayit-mantigi|kayittan-finansal-tabloya)',\d,/gm) ?? [];
    expect(satirlar).toHaveLength(45);
  });

  it('ilerleme tablosunu silmez ve mevcut item kimliğini yeniden kullanır', () => {
    expect(sql).not.toMatch(/delete\s+from\s+public\.kesfet_ilerleme/i);
    expect(sql).toContain('i:=coalesce(eski');
    expect(sql).toContain('on conflict(id) do update set bolum_id=excluded.bolum_id');
  });

  it('T2 ve T3 ilişkilerini yalnız önerilen olarak kurar', () => {
    expect(sql).toContain("values(t2,t1,'onerilen'),(t3,t2,'onerilen')");
  });

  it('10 maddelik T1 finalini ve KUR-001 T3 görevini bağlar', () => {
    expect((sql.match(/"id":"m\d+"/g) ?? [])).toHaveLength(10);
    expect(sql).toContain("'kesfet-t1-final-001'");
    expect(sql).toContain("s.id='soru-mal-alis-veresiye-001'");
  });
});
