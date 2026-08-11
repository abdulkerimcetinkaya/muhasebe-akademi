import { supabase } from './supabase';
import type { KesfetBolumRow, KesfetItemRow, KesfetItemSoruRow, KesfetKartOnKosulRow, KesfetKartRow } from './database.types';
import type { KartTip, KesfetKart } from '../data/kesfet';

/**
 * Keşfet DB erişimi — public yükleme + admin CRUD.
 * İçerik kesfet_kartlar / kesfet_bolumler / kesfet_itemler tablolarında.
 */

// ── Public yükleme ─────────────────────────────────────────────────────────

/**
 * Kartları bölüm ve item'larıyla, sıralı iç içe yapı olarak yükler.
 * `tip` verilirse yalnızca o türü ('kesfet' ders / 'isletme' simülasyon) getirir.
 */
export const tumKartlariYukle = async (tip?: KartTip, tumItemDurumlari = false): Promise<KesfetKart[]> => {
  let kartSorgu = supabase.from('kesfet_kartlar').select('*').order('sira');
  if (tip) kartSorgu = kartSorgu.eq('tip', tip);
  const [kartlarR, bolumlerR, itemlerR, onKosullarR, itemSorulariR] = await Promise.all([
    kartSorgu,
    supabase.from('kesfet_bolumler').select('*').order('sira'),
    supabase.from('kesfet_itemler').select('*').order('sira'),
    supabase.from('kesfet_kart_on_kosullari').select('*'),
    supabase.from('kesfet_item_sorulari').select('*').order('sira'),
  ]);
  if (kartlarR.error) throw kartlarR.error;
  if (bolumlerR.error) throw bolumlerR.error;
  if (itemlerR.error) throw itemlerR.error;

  const bolumler = (bolumlerR.data ?? []) as KesfetBolumRow[];
  const itemler = ((itemlerR.data ?? []) as KesfetItemRow[]).filter(
    (item) => tumItemDurumlari || !item.yayin_durumu || item.yayin_durumu === 'yayinlandi',
  );
  // 00002 uygulanana kadar çalışan uygulamayı kırmayan dual-read. Migration sonrası
  // normalize tablolar kaynak olur; öncesinde legacy kolon/soru_id kullanılır.
  const normalizeBaglarHazir = !onKosullarR.error && !itemSorulariR.error;
  const onKosullar = (normalizeBaglarHazir ? onKosullarR.data ?? [] : []) as KesfetKartOnKosulRow[];
  const itemSorulari = (normalizeBaglarHazir ? itemSorulariR.data ?? [] : []) as KesfetItemSoruRow[];
  const slugById = new Map(((kartlarR.data ?? []) as KesfetKartRow[]).map((kart) => [kart.id, kart.slug]));

  return ((kartlarR.data ?? []) as KesfetKartRow[]).map((k) => ({
    id: k.id,
    slug: k.slug,
    ad: k.ad,
    aciklama: k.aciklama,
    ikon: k.ikon,
    kategori: k.kategori,
    tip: ((k as { tip?: KartTip }).tip ?? 'kesfet') as KartTip,
    durum: k.durum,
    uzmanlik_turu: k.uzmanlik_turu,
    on_kosul_sluglari: normalizeBaglarHazir ? onKosullar
      .filter((x) => x.kart_id === k.id && x.tur === 'zorunlu')
      .map((x) => slugById.get(x.on_kosul_kart_id))
      .filter((x): x is string => Boolean(x)) : k.on_kosul_sluglari ?? [],
    onerilen_on_kosul_sluglari: normalizeBaglarHazir ? onKosullar
      .filter((x) => x.kart_id === k.id && x.tur === 'onerilen')
      .map((x) => slugById.get(x.on_kosul_kart_id))
      .filter((x): x is string => Boolean(x)) : k.onerilen_on_kosul_sluglari ?? [],
    sira: k.sira,
    bolumler: bolumler
      .filter((b) => b.kart_id === k.id)
      .map((b) => ({
          id: b.id,
          ad: b.ad,
          sira: b.sira,
          tur: b.tur ?? 'normal',
        itemlar: itemler
          .filter((it) => it.bolum_id === b.id)
          .map((it) => ({
            id: it.id,
            ad: it.ad,
            tip: it.tip,
            yayin_durumu: it.yayin_durumu ?? 'yayinlandi',
            soru_id: it.soru_id,
            sorular: normalizeBaglarHazir ? itemSorulari
              .filter((bag) => bag.item_id === it.id)
              .map(({ soru_id, sira, zorunlu, minimum_basari, destek_seviyesi }) => ({
                soru_id, sira, zorunlu, minimum_basari, destek_seviyesi,
              })) : it.soru_id ? [{ soru_id: it.soru_id, sira: 0, zorunlu: true, minimum_basari: 100, destek_seviyesi: 'standart' as const }] : [],
            icerik: it.icerik,
          })),
      })),
  }));
};

// ── Admin: Kart ────────────────────────────────────────────────────────────

export type YeniKart = {
  slug: string;
  ad: string;
  aciklama?: string;
  ikon?: string;
  kategori?: string;
  durum?: 'acik' | 'yakinda' | 'gizli';
  uzmanlik_turu?: 'fonksiyonel' | 'sektorel' | null;
  on_kosul_sluglari?: string[];
  onerilen_on_kosul_sluglari?: string[];
  sira?: number;
};

const kartOnKosullariniKaydet = async (
  kartId: string,
  zorunluSluglar: string[] = [],
  onerilenSluglar: string[] = [],
): Promise<void> => {
  const sluglar = [...new Set([...zorunluSluglar, ...onerilenSluglar])];
  const { data: hedefler, error: hedefHata } = sluglar.length
    ? await supabase.from('kesfet_kartlar').select('id, slug').in('slug', sluglar)
    : { data: [], error: null };
  if (hedefHata) throw hedefHata;
  const idBySlug = new Map((hedefler ?? []).map((x) => [x.slug, x.id]));
  const eksikler = sluglar.filter((slug) => !idBySlug.has(slug));
  if (eksikler.length) throw new Error(`Ön koşul kartı bulunamadı: ${eksikler.join(', ')}`);
  if (sluglar.some((slug) => idBySlug.get(slug) === kartId)) {
    throw new Error('Bir kart kendisinin ön koşulu olamaz.');
  }
  const { error: silHata } = await supabase.from('kesfet_kart_on_kosullari').delete().eq('kart_id', kartId);
  if (silHata) throw silHata;
  const satirlar = [
    ...zorunluSluglar.map((slug) => ({ kart_id: kartId, on_kosul_kart_id: idBySlug.get(slug)!, tur: 'zorunlu' as const })),
    ...onerilenSluglar.map((slug) => ({ kart_id: kartId, on_kosul_kart_id: idBySlug.get(slug)!, tur: 'onerilen' as const })),
  ];
  if (satirlar.length) {
    const { error } = await supabase.from('kesfet_kart_on_kosullari').insert(satirlar);
    if (error) throw error;
  }
};

export const kartOlustur = async (input: YeniKart): Promise<KesfetKartRow> => {
  const { on_kosul_sluglari, onerilen_on_kosul_sluglari, ...kartInput } = input;
  const { data, error } = await supabase.from('kesfet_kartlar').insert(kartInput).select().single();
  if (error) throw error;
  await kartOnKosullariniKaydet(data.id, on_kosul_sluglari, onerilen_on_kosul_sluglari);
  return data as KesfetKartRow;
};

export const kartGuncelle = async (
  id: string,
  patch: Partial<YeniKart>,
): Promise<void> => {
  const { on_kosul_sluglari, onerilen_on_kosul_sluglari, ...kartPatch } = patch;
  const { error } = await supabase.from('kesfet_kartlar').update(kartPatch).eq('id', id);
  if (error) throw error;
  if (on_kosul_sluglari !== undefined || onerilen_on_kosul_sluglari !== undefined) {
    await kartOnKosullariniKaydet(id, on_kosul_sluglari, onerilen_on_kosul_sluglari);
  }
};

export const kartSil = async (id: string): Promise<void> => {
  const { error } = await supabase.from('kesfet_kartlar').delete().eq('id', id);
  if (error) throw error;
};

// ── Admin: Bölüm ───────────────────────────────────────────────────────────

export const bolumOlustur = async (
  kart_id: string,
  ad: string,
  sira: number,
  tur: 'normal' | 'kart_finali' = 'normal',
): Promise<KesfetBolumRow> => {
  const { data, error } = await supabase
    .from('kesfet_bolumler')
    .insert({ kart_id, ad, sira, tur })
    .select()
    .single();
  if (error) throw error;
  return data as KesfetBolumRow;
};

export const bolumGuncelle = async (
  id: string,
  patch: { ad?: string; sira?: number; tur?: 'normal' | 'kart_finali' },
): Promise<void> => {
  const { error } = await supabase.from('kesfet_bolumler').update(patch).eq('id', id);
  if (error) throw error;
};

export const bolumSil = async (id: string): Promise<void> => {
  const { error } = await supabase.from('kesfet_bolumler').delete().eq('id', id);
  if (error) throw error;
};

// ── Admin: Item ────────────────────────────────────────────────────────────

export const itemOlustur = async (
  bolum_id: string,
  ad: string,
  tip: 'ders' | 'alistirma',
  sira: number,
): Promise<KesfetItemRow> => {
  const { data, error } = await supabase
    .from('kesfet_itemler')
    .insert({ bolum_id, ad, tip, sira, yayin_durumu: 'taslak' })
    .select()
    .single();
  if (error) throw error;
  return data as KesfetItemRow;
};

export const itemGuncelle = async (
  id: string,
  patch: { ad?: string; tip?: 'ders' | 'alistirma'; sira?: number; soru_id?: string | null; yayin_durumu?: 'taslak' | 'incelemede' | 'yayinlandi' | 'arsiv' },
): Promise<void> => {
  const { error } = await supabase.from('kesfet_itemler').update(patch).eq('id', id);
  if (error) throw error;
};

export const itemSil = async (id: string): Promise<void> => {
  const { error } = await supabase.from('kesfet_itemler').delete().eq('id', id);
  if (error) throw error;
};

export const itemSorulariniKaydet = async (itemId: string, soruIdleri: string[]): Promise<void> => {
  const temiz = [...new Set(soruIdleri.map((id) => id.trim()).filter(Boolean))];
  if (temiz.length) {
    const { data, error } = await supabase.from('sorular').select('id, durum').in('id', temiz);
    if (error) throw error;
    const bulunan = new Set((data ?? []).map((soru) => soru.id));
    const eksikler = temiz.filter((id) => !bulunan.has(id));
    if (eksikler.length) throw new Error(`Soru bulunamadı: ${eksikler.join(', ')}`);
  }
  const { error: silHata } = await supabase.from('kesfet_item_sorulari').delete().eq('item_id', itemId);
  if (silHata) throw silHata;
  if (temiz.length) {
    const { error } = await supabase.from('kesfet_item_sorulari').insert(
      temiz.map((soru_id, sira) => ({ item_id: itemId, soru_id, sira, zorunlu: true, minimum_basari: 100, destek_seviyesi: 'standart' as const })),
    );
    if (error) throw error;
  }
};

export const kartYayinSorunlariniBul = async (kart: KesfetKart): Promise<string[]> => {
  const sorunlar: string[] = [];
  const itemlar = kart.bolumler.flatMap((bolum) => bolum.itemlar).filter((item) => !item.yayin_durumu || item.yayin_durumu === 'yayinlandi');
  if (!itemlar.length) sorunlar.push('Kartta ders bulunmuyor.');
  for (const item of itemlar) {
    if (!Array.isArray(item.icerik) || item.icerik.length === 0) sorunlar.push(`İçerik boş: ${item.ad}`);
  }
  const zorunluSorular = [...new Set(itemlar.flatMap((item) => (item.sorular ?? []).filter((soru) => soru.zorunlu).map((soru) => soru.soru_id)))];
  if (!zorunluSorular.length) return sorunlar;
  const { data: sorular, error: soruHata } = await supabase.from('sorular').select('id, durum, olay_id, tip, config').in('id', zorunluSorular);
  if (soruHata) throw soruHata;
  const soruById = new Map((sorular ?? []).map((soru) => [soru.id, soru]));
  for (const id of zorunluSorular) {
    const soru = soruById.get(id);
    if (!soru) sorunlar.push(`Ölçümlü soru bulunamadı: ${id}`);
    else if (soru.durum !== 'onayli') sorunlar.push(`Ölçümlü soru onaylı değil: ${id}`);
    else if (!soru.olay_id) sorunlar.push(`Ölçümlü soru V2 olayına bağlı değil: ${id}`);
    else if (soru.tip === 'coktan_secmeli') {
      const config = soru.config as { surum?: number; maddeler?: unknown[] } | null;
      if (config?.surum !== 1 || !Array.isArray(config.maddeler) || config.maddeler.length === 0) {
        sorunlar.push(`Çoktan seçmeli soru config'i geçersiz: ${id}`);
      }
    }
  }
  const olayIdleri = [...new Set((sorular ?? []).map((soru) => soru.olay_id).filter((id): id is string => Boolean(id)))];
  if (!olayIdleri.length) return sorunlar;
  const [olaylarR, belgelerR, cozumlerR, yetkinliklerR] = await Promise.all([
    supabase.from('muhasebe_olaylari').select('id, durum, islem_tarihi').in('id', olayIdleri),
    supabase.from('olay_belgeleri').select('olay_id').in('olay_id', olayIdleri),
    supabase.from('cozum_basliklari').select('id, olay_id').in('olay_id', olayIdleri).eq('varyant', 1),
    supabase.from('olay_yetkinlikleri').select('olay_id').in('olay_id', olayIdleri),
  ]);
  for (const sonuc of [olaylarR, belgelerR, cozumlerR, yetkinliklerR]) if (sonuc.error) throw sonuc.error;
  const olaylar = new Map((olaylarR.data ?? []).map((olay) => [olay.id, olay]));
  const belgeli = new Set((belgelerR.data ?? []).map((x) => x.olay_id));
  const yetkinlikli = new Set((yetkinliklerR.data ?? []).map((x) => x.olay_id));
  const cozumByOlay = new Map((cozumlerR.data ?? []).map((x) => [x.olay_id, x.id]));
  const tipByOlay = new Map((sorular ?? []).filter((soru) => soru.olay_id).map((soru) => [soru.olay_id!, soru.tip]));
  const cozumIdleri = [...cozumByOlay.values()];
  const { data: mevzuatBaglari, error: mevzuatHata } = cozumIdleri.length
    ? await supabase.from('cozum_mevzuat').select('baslik_id').in('baslik_id', cozumIdleri)
    : { data: [], error: null };
  if (mevzuatHata) throw mevzuatHata;
  const mevzuatliCozum = new Set((mevzuatBaglari ?? []).map((x) => x.baslik_id));
  for (const olayId of olayIdleri) {
    const olay = olaylar.get(olayId);
    if (!olay || olay.durum !== 'onayli') sorunlar.push(`Olay onaylı değil veya bulunamadı: ${olayId}`);
    if (!yetkinlikli.has(olayId)) sorunlar.push(`Olay yetkinliğe bağlı değil: ${olayId}`);
    if (tipByOlay.get(olayId) !== 'yevmiye_kaydi') continue;
    if (!olay?.islem_tarihi) sorunlar.push(`Olay işlem tarihi eksik: ${olayId}`);
    if (!belgeli.has(olayId)) sorunlar.push(`Olay belgesiz: ${olayId}`);
    const cozumId = cozumByOlay.get(olayId);
    if (!cozumId) sorunlar.push(`Olayın normalize çözümü yok: ${olayId}`);
    else if (!mevzuatliCozum.has(cozumId)) sorunlar.push(`Olay çözümü mevzuata bağlı değil: ${olayId}`);
  }
  return sorunlar;
};

// ── Admin: Item içeriği (BlockNote) ─────────────────────────────────────────

/** Tek item'ın başlık + içeriğini yükler (editör açılışında). */
export const itemIcerikYukle = async (
  id: string,
): Promise<{ ad: string; tip: 'ders' | 'alistirma'; icerik: unknown | null } | null> => {
  const { data, error } = await supabase
    .from('kesfet_itemler')
    .select('ad, tip, icerik')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ad: data.ad, tip: data.tip, icerik: data.icerik ?? null };
};

/** Item içeriğini kaydeder (BlockNote blok dizisi). */
export const itemIcerikKaydet = async (id: string, icerik: unknown): Promise<void> => {
  const { error } = await supabase
    .from('kesfet_itemler')
    .update({ icerik, icerik_guncellendi: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
};

export const kesfetOlcumDurumuYukle = async (
  userId: string,
  soruIdleri: string[],
): Promise<Set<string>> => {
  if (!soruIdleri.length) return new Set();
  const { data, error } = await supabase
    .from('ilerleme')
    .select('soru_id')
    .eq('user_id', userId)
    .eq('dogru_mu', true)
    .in('soru_id', soruIdleri);
  if (error) throw error;
  return new Set((data ?? []).map((row) => row.soru_id));
};

export type KesfetMevzuatBaglantisi = {
  id: string;
  kaynak: string;
  maddeNo: string;
  baslik: string;
  aciklama: string | null;
  effectiveDate: string;
  sourceUrl: string | null;
};

export const kesfetMevzuatBaglantilariniYukle = async (
  soruIdleri: string[],
): Promise<KesfetMevzuatBaglantisi[]> => {
  if (!soruIdleri.length) return [];
  const { data: sorular, error: soruHata } = await supabase.from('sorular').select('olay_id').in('id', soruIdleri);
  if (soruHata) throw soruHata;
  const olayIdleri = [...new Set((sorular ?? []).map((soru) => soru.olay_id).filter((id): id is string => Boolean(id)))];
  if (!olayIdleri.length) return [];
  const [{ data: olaylar, error: olayHata }, { data: basliklar, error: baslikHata }] = await Promise.all([
    supabase.from('muhasebe_olaylari').select('id, islem_tarihi').in('id', olayIdleri),
    supabase.from('cozum_basliklari').select('id, olay_id').in('olay_id', olayIdleri).eq('varyant', 1),
  ]);
  if (olayHata) throw olayHata;
  if (baslikHata) throw baslikHata;
  const baslikIdleri = (basliklar ?? []).map((baslik) => baslik.id);
  if (!baslikIdleri.length) return [];
  const { data: baglar, error: bagHata } = await supabase.from('cozum_mevzuat').select('baslik_id, madde_id, aciklama').in('baslik_id', baslikIdleri);
  if (bagHata) throw bagHata;
  const maddeIdleri = [...new Set((baglar ?? []).map((bag) => bag.madde_id))];
  if (!maddeIdleri.length) return [];
  const [{ data: maddeler, error: maddeHata }, { data: versiyonlar, error: versiyonHata }] = await Promise.all([
    supabase.from('mevzuat_maddeleri').select('id, kaynak_id, madde_no').in('id', maddeIdleri),
    supabase.from('mevzuat_madde_versiyonlari').select('id, madde_id, baslik, effective_date, expire_date, source_url, aktif').in('madde_id', maddeIdleri).eq('aktif', true),
  ]);
  if (maddeHata) throw maddeHata;
  if (versiyonHata) throw versiyonHata;
  const kaynakIdleri = [...new Set((maddeler ?? []).map((madde) => madde.kaynak_id))];
  const { data: kaynaklar, error: kaynakHata } = await supabase.from('mevzuat_kaynaklar').select('id, ad, source_url').in('id', kaynakIdleri).eq('aktif', true);
  if (kaynakHata) throw kaynakHata;
  const olayByBaslik = new Map((basliklar ?? []).map((baslik) => [baslik.id, baslik.olay_id]));
  const tarihByOlay = new Map((olaylar ?? []).map((olay) => [olay.id, olay.islem_tarihi]));
  const maddeById = new Map((maddeler ?? []).map((madde) => [madde.id, madde]));
  const kaynakById = new Map((kaynaklar ?? []).map((kaynak) => [kaynak.id, kaynak]));
  return (baglar ?? []).flatMap((bag) => {
    const madde = maddeById.get(bag.madde_id);
    if (!madde) return [];
    const islemTarihi = tarihByOlay.get(olayByBaslik.get(bag.baslik_id) ?? '');
    if (!islemTarihi) return [];
    const gecerli = (versiyonlar ?? [])
      .filter((v) => v.madde_id === madde.id && v.effective_date <= islemTarihi && (!v.expire_date || v.expire_date > islemTarihi))
      .sort((a, b) => b.effective_date.localeCompare(a.effective_date))[0];
    const kaynak = kaynakById.get(madde.kaynak_id);
    if (!gecerli || !kaynak) return [];
    return [{
      id: gecerli.id,
      kaynak: kaynak.ad,
      maddeNo: madde.madde_no,
      baslik: gecerli.baslik,
      aciklama: bag.aciklama,
      effectiveDate: gecerli.effective_date,
      sourceUrl: gecerli.source_url ?? kaynak.source_url,
    }];
  });
};

// ── Admin: Eski içerik havuzu (geçiş dönemi) ────────────────────────────────
// unite_modulleri → modul_alt_basliklari sisteminden Keşfet'e taşınacak dolu
// içerikler. "Eski içerikten aktar" seçicisi bunları listeler. Eski sistem
// emekli edilince bu fonksiyon da kaldırılır.

export type EskiIcerik = {
  kaynak: 'modul' | 'alt';
  id: string;
  baslik: string;
  icerik: unknown;
};

/** Eski sistemdeki dolu içerikleri (modül genel bakış + alt başlık) getirir. */
export const eskiIceriklerYukle = async (): Promise<EskiIcerik[]> => {
  const [modR, altR] = await Promise.all([
    supabase.from('isletme_modulleri').select('id, baslik, icerik'),
    supabase.from('modul_alt_basliklari').select('id, baslik, icerik'),
  ]);
  if (modR.error) throw modR.error;
  if (altR.error) throw altR.error;

  const dolu = (icerik: unknown): boolean => Array.isArray(icerik) && icerik.length > 0;

  const moduller: EskiIcerik[] = ((modR.data ?? []) as { id: string; baslik: string; icerik: unknown }[])
    .filter((r) => dolu(r.icerik))
    .map((r) => ({ kaynak: 'modul', id: r.id, baslik: `${r.baslik} (Genel Bakış)`, icerik: r.icerik }));

  const altlar: EskiIcerik[] = ((altR.data ?? []) as { id: string; baslik: string; icerik: unknown }[])
    .filter((r) => dolu(r.icerik))
    .map((r) => ({ kaynak: 'alt', id: r.id, baslik: r.baslik, icerik: r.icerik }));

  return [...moduller, ...altlar];
};
