/**
 * Keşfet ders tamamlanma durumu.
 *
 * - Kayıtlı kullanıcı: kaynak `kesfet_ilerleme` tablosu (hesaba bağlı, cihazlar
 *   arası senkron). localStorage anlık cache + iyimser güncelleme için kullanılır.
 * - Anonim ziyaretçi: yalnızca localStorage (gezinme serbest; soru çözme kayıt
 *   ister). Kullanıcı giriş yapınca anonim ilerleme buluta bir kez taşınır.
 */

import { supabase } from './supabase';

const KEY = 'mli_kesfet_tamamlanan_v1';

// ---------- localStorage cache ----------

export const tamamlananSet = (): Set<string> => {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

const localeYaz = (s: Set<string>): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    // sessizce geç (quota / private mode)
  }
};

const localEkle = (id: string): void => {
  const s = tamamlananSet();
  s.add(id);
  localeYaz(s);
};

/**
 * Çıkışta çağrılır — önceki kullanıcının Keşfet ilerleme cache'ini siler.
 * Aksi halde aynı tarayıcıda B giriş yapınca A'nın local'de kalan
 * tamamladıkları "anonim ilerleme" sanılıp B'nin hesabına taşınır (sızıntı).
 */
export const kesfetCacheTemizle = (): void => {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // sessizce geç
  }
};

export const itemTamamlandiMi = (id: string): boolean => tamamlananSet().has(id);

// ---------- bulut (kesfet_ilerleme) ----------

const bulutYukle = async (kullaniciId: string): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('kesfet_ilerleme')
    .select('item_id')
    .eq('kullanici_id', kullaniciId);
  if (error || !data) return new Set();
  return new Set(data.map((r) => r.item_id));
};

const bulutEkle = async (kullaniciId: string, itemId: string): Promise<void> => {
  await supabase
    .from('kesfet_ilerleme')
    .upsert(
      { kullanici_id: kullaniciId, item_id: itemId },
      { onConflict: 'kullanici_id,item_id', ignoreDuplicates: true },
    );
};

/**
 * Bir dersi tamamlandı işaretler. Her zaman local cache'e yazar; kullanıcı
 * girişliyse ayrıca buluta yazar.
 */
export const itemTamamla = async (itemId: string, kullaniciId?: string | null): Promise<void> => {
  localEkle(itemId);
  if (kullaniciId) await bulutEkle(kullaniciId, itemId);
};

/**
 * Giriş yapan kullanıcı için ilerlemeyi senkronlar: bulut ∪ local birleşimini
 * hem döndürür hem local cache'e yazar; local'de olup bulutta olmayanları
 * (anonimken tamamlananlar) buluta taşır. Anonimse sadece local'i döndürür.
 */
export const ilerlemeGetir = async (kullaniciId: string | null): Promise<Set<string>> => {
  const yerel = tamamlananSet();
  if (!kullaniciId) return yerel;

  const bulut = await bulutYukle(kullaniciId);
  const birlesim = new Set([...bulut, ...yerel]);

  // Anonimken tamamlanıp buluta hiç yazılmamış olanları taşı.
  const eksikler = [...yerel].filter((id) => !bulut.has(id));
  if (eksikler.length > 0) {
    await supabase
      .from('kesfet_ilerleme')
      .upsert(
        eksikler.map((item_id) => ({ kullanici_id: kullaniciId, item_id })),
        { onConflict: 'kullanici_id,item_id', ignoreDuplicates: true },
      );
  }

  localeYaz(birlesim);
  return birlesim;
};
