import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260809000006_ders_1_muhasebe_neden_gereklidir.sql'), 'utf8');

describe('Ders 1 gerçek içerik migration sözleşmesi', () => {
  it('mevcut ders kimliğini koruyarak yalnız içeriği günceller', () => {
    expect(sql).toContain("i.ad='Muhasebe Neden Gereklidir?'");
    expect(sql).toContain('where id=v_item');
    expect(sql).not.toMatch(/delete\s+from\s+public\.kesfet_(itemler|ilerleme)/i);
    expect(sql).not.toContain('insert into public.kesfet_itemler');
  });

  it('20 bölümlük kullanıcı akışını taşır', () => {
    expect((sql.match(/pg_temp\.bn_h\('d1-\d{2}'/g) ?? [])).toHaveLength(20);
    expect(sql).toContain('Muhasebe bu işi nasıl yapıyor?');
  });

  it('satır içi ve test kontrollerini ayırır', () => {
    expect(sql).toContain("'satirici', true");
    expect((sql.match(/'test'\)/g) ?? [])).toHaveLength(3);
  });

  it('veri kartları, laboratuvar ve üç sözlük terimini içerir', () => {
    expect(sql).toContain("'type','verikartlari'");
    expect(sql).toContain("'type','islemlaboratuvari'");
    expect(sql).toContain("'mali-durum','Mali Durum'");
    expect(sql).toContain("'type','text','text','Alacak'");
    expect(sql).toContain("'type','text','text','Borç'");
  });

  it('mevzuat ve Question Engine bağlantısı eklemez', () => {
    expect(sql).not.toContain('kesfet_item_sorulari');
    expect(sql).not.toContain('soru_mevzuat_baglantilari');
  });
});
