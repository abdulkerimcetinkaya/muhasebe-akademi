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
          .map((it) => ({ id: it.id, ad: it.ad, tip: it.tip, soru_id: it.soru_id })),
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
