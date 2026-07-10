import { supabase } from './supabase';
import type { CariKartRow, CariTip } from './database.types';

export type CariKart = CariKartRow;

export const CARI_TIP_ETIKETLERI: Record<CariTip, string> = {
  musteri: 'Müşteri',
  tedarikci: 'Tedarikçi',
  personel: 'Personel',
  kamu: 'Kamu',
  banka: 'Banka',
  diger: 'Diğer',
};

const TABLO = 'cari_kartlar';

/** Aktif cari kartlar (unvan sırasına göre) — muavin formlarındaki cari seçici için. */
export const aktifCarileriYukle = async (): Promise<CariKart[]> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('*')
    .eq('aktif', true)
    .order('unvan', { ascending: true });
  if (error) throw error;
  return (data ?? []) as CariKart[];
};
