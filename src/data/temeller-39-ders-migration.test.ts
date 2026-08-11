import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260809000005_temeller_39_ders.sql'),
  'utf8',
);

describe('Temeller 39 ders migration sözleşmesi', () => {
  it('uygulanmış 45 ders migrationını değiştirmeden yeni hedefi tanımlar', () => {
    const hedefBolumu = sql.slice(sql.indexOf('insert into temeller_ders_hedefleri values'));
    const hedefler = hedefBolumu.match(/^\('(?:muhasebe-baslangic|hesap-kayit-mantigi|kayittan-finansal-tabloya)'/gm) ?? [];
    expect(hedefler).toHaveLength(39);
  });

  it('kart başına 13, 14 ve 12 ders taşır', () => {
    const hedefBolumu = sql.slice(sql.indexOf('insert into temeller_ders_hedefleri values'));
    expect((hedefBolumu.match(/^\('muhasebe-baslangic'/gm) ?? [])).toHaveLength(13);
    expect((hedefBolumu.match(/^\('hesap-kayit-mantigi'/gm) ?? [])).toHaveLength(14);
    expect((hedefBolumu.match(/^\('kayittan-finansal-tabloya'/gm) ?? [])).toHaveLength(12);
  });

  it('birleşen kayıtları silmeden arşivler ve ilerlemeyi kanonik derse taşır', () => {
    expect(sql).not.toMatch(/delete\s+from\s+public\.kesfet_itemler/i);
    expect(sql).toContain("set yayin_durumu='arsiv'");
    expect(sql).toContain('insert into public.kesfet_ilerleme');
    expect(sql).toContain('least(public.kesfet_ilerleme.tamamlandi_at,excluded.tamamlandi_at)');
  });

  it('yeni işletme-sahip ayrımı dersini mevcut şablonla ekler', () => {
    expect(sql).toContain("'İşletme ile Sahibinin İşlemlerini Ayırmak'");
    expect(sql).toContain("pg_temp.ders_icerigi('muhasebe-baslangic-1-0'");
  });

  it('kart finallerini, rotaları ve ön koşulları değiştirmez', () => {
    expect(sql).not.toContain('kesfet_kart_on_kosullari');
    expect(sql).not.toContain("tur='kart_finali'");
    expect(sql).not.toContain('kesfet-t1-final-001');
  });
});
