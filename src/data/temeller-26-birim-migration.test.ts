import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TEMELLER_HEDEF_DERSLER } from './temeller-mufredat-denetimi';

const sql = readFileSync(
  // V3 geçişi rafa kaldırıldı (ADR-004 sonrası müfredat sıfırdan kurulacak);
  // dosya _bekleyen/ altında tarihsel sözleşme olarak durur.
  resolve(process.cwd(), 'supabase/migrations/_bekleyen/20260811000002_temeller_26_birim.sql'),
  'utf8',
);

describe('Temeller 26 birim migration sözleşmesi (V5 / ADR-004)', () => {
  it('26 kanonik birimi kart başına 10, 10 ve 6 olarak tanımlar', () => {
    const hedefBolumu = sql.slice(
      sql.indexOf('insert into t26_hedefler values'),
      sql.indexOf('pg_temp.temeller_bolum_idleri'),
    );
    expect((hedefBolumu.match(/^\('muhasebe-baslangic'/gm) ?? [])).toHaveLength(10);
    expect((hedefBolumu.match(/^\('hesap-kayit-mantigi'/gm) ?? [])).toHaveLength(10);
    expect((hedefBolumu.match(/^\('kayittan-finansal-tabloya'/gm) ?? [])).toHaveLength(6);
  });

  it('13 birleşme tanımlar (39 − 13 = 26)', () => {
    const birlesmeBolumu = sql.slice(
      sql.indexOf('insert into t26_birlesmeler values'),
      sql.indexOf('create temporary table t26_hedefler'),
    );
    expect((birlesmeBolumu.match(/^\('/gm) ?? [])).toHaveLength(13);
  });

  it('admin denetim listesiyle birebir aynı 26 birim adını taşır', () => {
    expect(TEMELLER_HEDEF_DERSLER).toHaveLength(26);
    for (const birim of TEMELLER_HEDEF_DERSLER) {
      expect(sql, `${birim.no}. birim migration hedeflerinde yok: ${birim.ad}`).toContain(`'${birim.ad}'`);
    }
  });

  it('birleşen kayıtları silmeden arşivler ve ilerlemeyi kanonik birime taşır', () => {
    expect(sql).not.toMatch(/delete\s+from\s+public\.kesfet_itemler/i);
    expect(sql).toContain("set yayin_durumu='arsiv'");
    expect(sql).toContain('insert into public.kesfet_ilerleme');
    expect(sql).toContain('least(public.kesfet_ilerleme.tamamlandi_at,excluded.tamamlandi_at)');
  });

  it('slug değiştirmez ve İşletmeler kayıtlarına dokunmaz', () => {
    expect(sql).not.toMatch(/set\s+slug\s*=/i);
    expect(sql).not.toMatch(/tip\s*=\s*'isletme'/i);
    expect(sql).not.toMatch(/isletme_modulleri|modul_alt_basliklari/i);
  });

  it('kart finallerini ve ön koşul ağını değiştirmez', () => {
    expect(sql).not.toContain('kesfet_kart_on_kosullari');
    expect(sql).not.toContain("tur='kart_finali'");
  });
});
