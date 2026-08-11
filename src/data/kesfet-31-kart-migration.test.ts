import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { KESFET_HEDEF_KARTLAR, TEMELLER_HEDEF_YAPI } from './kesfet-mufredat-hedefi';

const kirilim = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260811000008_temeller_bolum_ders.sql'),
  'utf8',
);

const kur = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260811000007_kesfet_31_kart.sql'),
  'utf8',
);
const sifirla = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260811000006_kesfet_sifirla.sql'),
  'utf8',
);

describe('Keşfet V6 — 31 kart migration sözleşmesi (ADR-005)', () => {
  it('7 Temeller + 16 Yetkinlikler + 8 Uzmanlıklar tanımlar', () => {
    const say = (k: string) => KESFET_HEDEF_KARTLAR.filter((x) => x.kategori === k).length;
    expect(say('Temeller')).toBe(7);
    expect(say('Yetkinlikler')).toBe(16);
    expect(say('Uzmanlıklar')).toBe(8);
    expect(KESFET_HEDEF_KARTLAR).toHaveLength(31);
  });

  it('hedef listesindeki her kart migration içinde slug ve adıyla geçer', () => {
    for (const kart of KESFET_HEDEF_KARTLAR) {
      expect(kur, `slug migration'da yok: ${kart.slug}`).toContain(`'${kart.slug}'`);
      expect(kur, `ad migration'da yok: ${kart.ad}`).toContain(kart.ad);
    }
  });

  it('slug ve sıra değerleri benzersiz', () => {
    const sluglar = KESFET_HEDEF_KARTLAR.map((k) => k.slug);
    const siralar = KESFET_HEDEF_KARTLAR.map((k) => k.sira);
    expect(new Set(sluglar).size).toBe(sluglar.length);
    expect(new Set(siralar).size).toBe(siralar.length);
  });

  it('slug URL-güvenli (küçük harf, ASCII, tire)', () => {
    for (const kart of KESFET_HEDEF_KARTLAR) {
      expect(kart.slug, `slug URL-güvenli değil: ${kart.slug}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('içerik üretilmeden hiçbir kart kullanıcıya açılmaz', () => {
    expect(kur).toContain("'yakinda'");
    expect(kur).not.toContain("'acik'");
  });

  it('Temeller kırılımı 21 bölüm · 47 ders · 7 final taşır', () => {
    const kartlar = Object.keys(TEMELLER_HEDEF_YAPI);
    expect(kartlar).toHaveLength(7);

    const normal = Object.values(TEMELLER_HEDEF_YAPI).flat().filter((b) => !b.final);
    const final = Object.values(TEMELLER_HEDEF_YAPI).flat().filter((b) => b.final);
    expect(normal).toHaveLength(21);
    expect(final).toHaveLength(7);
    expect(normal.flatMap((b) => b.dersler)).toHaveLength(47);
    expect(final.flatMap((b) => b.dersler)).toHaveLength(7);

    // Her Temeller kartının kırılımı tanımlı olmalı
    const temelSluglar = KESFET_HEDEF_KARTLAR.filter((k) => k.kategori === 'Temeller').map((k) => k.slug);
    expect(kartlar.sort()).toEqual(temelSluglar.sort());
  });

  it('kırılımdaki her bölüm ve ders migration içinde geçer', () => {
    for (const [slug, bolumler] of Object.entries(TEMELLER_HEDEF_YAPI)) {
      expect(kirilim, `kart migration'da yok: ${slug}`).toContain(`'${slug}'`);
      for (const bolum of bolumler) {
        expect(kirilim, `bölüm migration'da yok: ${bolum.ad}`).toContain(`'${bolum.ad}'`);
        for (const ders of bolum.dersler) {
          expect(kirilim, `ders migration'da yok: ${ders}`).toContain(`'${ders}'`);
        }
      }
    }
  });

  it('ders adları platform genelinde benzersiz', () => {
    const hepsi = Object.values(TEMELLER_HEDEF_YAPI).flat().flatMap((b) => b.dersler);
    expect(new Set(hepsi).size).toBe(hepsi.length);
  });

  it('kırılım içerik üretmez — dersler boş ve taslak kurulur', () => {
    expect(kirilim).toContain("'[]'::jsonb");
    expect(kirilim).toContain("'taslak'");
    expect(kirilim).not.toContain("'yayinlandi'");
  });

  it('sıfırlama yalnız Keşfet kapsamında kalır', () => {
    expect(sifirla).toContain("delete from public.kesfet_kart_on_kosullari");
    expect(sifirla).toContain("delete from public.kesfet_kartlar where tip = 'kesfet'");
    for (const korunan of [
      'public.sorular',
      'public.muhasebe_olaylari',
      'public.isletmeler',
      'public.isletme_modulleri',
      'public.modul_alt_basliklari',
      'public.yetkinlikler',
    ]) {
      expect(sifirla, `sıfırlama korunan tabloya dokunuyor: ${korunan}`).not.toContain(
        `delete from ${korunan}`,
      );
    }
  });
});
