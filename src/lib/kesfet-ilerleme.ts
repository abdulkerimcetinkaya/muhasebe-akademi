/**
 * Keşfet item tamamlanma durumu — iskelet için localStorage tabanlı.
 * İleride kullanıcı-bazlı DB ilerlemesine taşınabilir.
 */

const KEY = 'mli_kesfet_tamamlanan_v1';

export const tamamlananSet = (): Set<string> => {
  try {
    const raw = localStorage.getItem(KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
};

export const itemTamamlandiMi = (id: string): boolean => tamamlananSet().has(id);

export const itemTamamla = (id: string): void => {
  try {
    const s = tamamlananSet();
    s.add(id);
    localStorage.setItem(KEY, JSON.stringify([...s]));
  } catch {
    // sessizce geç (quota / private mode)
  }
};
