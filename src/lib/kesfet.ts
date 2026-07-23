import { supabase } from './supabase';
import type { KesfetBolumRow, KesfetItemRow, KesfetKartRow } from './database.types';
import type { KesfetKart } from '../data/kesfet';

/**
 * Keşfet DB erişimi — public yükleme + admin CRUD.
 * İçerik kesfet_kartlar / kesfet_bolumler / kesfet_itemler tablolarında.
 */

// ── Public yükleme ─────────────────────────────────────────────────────────

/** Tüm kartları bölüm ve item'larıyla, sıralı iç içe yapı olarak yükler. */
export const tumKartlariYukle = async (): Promise<KesfetKart[]> => {
  const [kartlarR, bolumlerR, itemlerR] = await Promise.all([
    supabase.from('kesfet_kartlar').select('*').order('sira'),
    supabase.from('kesfet_bolumler').select('*').order('sira'),
    supabase.from('kesfet_itemler').select('*').order('sira'),
  ]);
  if (kartlarR.error) throw kartlarR.error;
  if (bolumlerR.error) throw bolumlerR.error;
  if (itemlerR.error) throw itemlerR.error;

  const bolumler = (bolumlerR.data ?? []) as KesfetBolumRow[];
  const itemler = (itemlerR.data ?? []) as KesfetItemRow[];

  return ((kartlarR.data ?? []) as KesfetKartRow[]).map((k) => ({
    id: k.id,
    slug: k.slug,
    ad: k.ad,
    aciklama: k.aciklama,
    ikon: k.ikon,
    kategori: k.kategori,
    durum: k.durum,
    sira: k.sira,
    bolumler: bolumler
      .filter((b) => b.kart_id === k.id)
      .map((b) => ({
        id: b.id,
        ad: b.ad,
        sira: b.sira,
        itemlar: itemler
          .filter((it) => it.bolum_id === b.id)
          .map((it) => ({
            id: it.id,
            ad: it.ad,
            tip: it.tip,
            soru_id: it.soru_id,
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
  durum?: 'acik' | 'yakinda';
  sira?: number;
};

export const kartOlustur = async (input: YeniKart): Promise<KesfetKartRow> => {
  const { data, error } = await supabase.from('kesfet_kartlar').insert(input).select().single();
  if (error) throw error;
  return data as KesfetKartRow;
};

export const kartGuncelle = async (
  id: string,
  patch: Partial<YeniKart>,
): Promise<void> => {
  const { error } = await supabase.from('kesfet_kartlar').update(patch).eq('id', id);
  if (error) throw error;
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
): Promise<KesfetBolumRow> => {
  const { data, error } = await supabase
    .from('kesfet_bolumler')
    .insert({ kart_id, ad, sira })
    .select()
    .single();
  if (error) throw error;
  return data as KesfetBolumRow;
};

export const bolumGuncelle = async (
  id: string,
  patch: { ad?: string; sira?: number },
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
    .insert({ bolum_id, ad, tip, sira })
    .select()
    .single();
  if (error) throw error;
  return data as KesfetItemRow;
};

export const itemGuncelle = async (
  id: string,
  patch: { ad?: string; tip?: 'ders' | 'alistirma'; sira?: number; soru_id?: string | null },
): Promise<void> => {
  const { error } = await supabase.from('kesfet_itemler').update(patch).eq('id', id);
  if (error) throw error;
};

export const itemSil = async (id: string): Promise<void> => {
  const { error } = await supabase.from('kesfet_itemler').delete().eq('id', id);
  if (error) throw error;
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
    supabase.from('unite_modulleri').select('id, baslik, icerik'),
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
