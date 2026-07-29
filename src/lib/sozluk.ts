import { supabase } from './supabase';

// Terim panelinde "Kanun ne diyor?" bölümünü besleyen mevzuat katmanı.
export interface MevzuatMaddesi {
  kanun: string; // "VUK" | "TTK" ...
  madde: string; // "231/5"
  baslik: string;
  lafiz: string; // kanun metni (birebir)
}
// Özet, başlıklı gruplar hâlinde: "Tanım", "Zorunlu unsurlar", "Süreler",
// "Saklama" gibi — her grubun altında maddeler alt alta.
export interface MevzuatOzetGrup {
  baslik: string;
  maddeler: string[];
}
export interface MevzuatKatmani {
  maddeler?: MevzuatMaddesi[];
  ozet?: MevzuatOzetGrup[];
}

export interface SozlukTerimi {
  slug: string;
  baslik: string;
  kisa_aciklama: string;
  uzun_icerik: string;
  ornek: string | null;
  ilgili_terimler: string[];
  ilgili_unite_ids: number[];
  ilgili_hesap_kodlari: string[];
  mevzuat: MevzuatKatmani;
  goruntuleme_sayisi: number;
  yayinda: boolean;
  created_at: string;
  updated_at: string;
}

export interface SozlukTerimOzet {
  slug: string;
  baslik: string;
  kisa_aciklama: string;
}

const TABLO = 'sozluk_terimleri';

/** Public liste — yayındaki tüm terimlerin başlık + kısa açıklaması. */
export const sozlukListesi = async (): Promise<SozlukTerimOzet[]> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('slug, baslik, kisa_aciklama')
    .eq('yayinda', true)
    .order('baslik', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SozlukTerimOzet[];
};

/** Tek terim — slug ile. */
export const sozlukTerimYukle = async (slug: string): Promise<SozlukTerimi | null> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('*')
    .eq('slug', slug)
    .eq('yayinda', true)
    .maybeSingle();
  if (error) throw error;
  return data ? (data as unknown as SozlukTerimi) : null;
};

/** Görüntüleme sayacını artır (anon da çağırabilir). */
export const sozlukGoruntule = async (slug: string): Promise<void> => {
  await supabase.rpc('sozluk_goruntule', { _slug: slug });
};

// ─── Admin tarafı ──────────────────────────────────────────────────────────

export type YeniSozlukTerimi = Omit<
  SozlukTerimi,
  'goruntuleme_sayisi' | 'created_at' | 'updated_at' | 'mevzuat'
> & { mevzuat?: MevzuatKatmani };

export const sozlukTerimYarat = async (
  input: YeniSozlukTerimi,
): Promise<SozlukTerimi> => {
  const { data, error } = await supabase
    .from(TABLO)
    .insert(input)
    .select()
    .single();
  if (error) throw error;
  return data as SozlukTerimi;
};

export const sozlukTerimGuncelle = async (
  slug: string,
  patch: Partial<YeniSozlukTerimi>,
): Promise<void> => {
  const { error } = await supabase.from(TABLO).update(patch).eq('slug', slug);
  if (error) throw error;
};

export const sozlukTerimSil = async (slug: string): Promise<void> => {
  const { error } = await supabase.from(TABLO).delete().eq('slug', slug);
  if (error) throw error;
};

export const tumTerimleriYukleAdmin = async (): Promise<SozlukTerimi[]> => {
  const { data, error } = await supabase
    .from(TABLO)
    .select('*')
    .order('baslik', { ascending: true });
  if (error) throw error;
  return (data ?? []) as SozlukTerimi[];
};

/** TR karakterleri ASCII'ye çevirip URL-safe slug üretir. */
export const slugUret = (metin: string): string => {
  const map: Record<string, string> = {
    ç: 'c', Ç: 'c', ğ: 'g', Ğ: 'g', ı: 'i', İ: 'i',
    ö: 'o', Ö: 'o', ş: 's', Ş: 's', ü: 'u', Ü: 'u',
  };
  return metin
    .split('')
    .map((c) => map[c] ?? c)
    .join('')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};
