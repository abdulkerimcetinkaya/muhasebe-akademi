import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  uniteleriCachedenOku,
  uniteleriCacheeYaz,
  uniteleriYukle,
  type UnitelerVerisi,
} from '../lib/isletmeler-loader';

interface UnitelerDurumu extends UnitelerVerisi {
  yukleniyor: boolean;
  hata: string | null;
  yenile: () => Promise<void>;
}

const BOS: UnitelerVerisi = { uniteler: [], tumSorular: [] };

const UnitelerContext = createContext<UnitelerDurumu>({
  ...BOS,
  yukleniyor: true,
  hata: null,
  yenile: async () => {},
});

export const UnitelerProvider = ({ children }: { children: ReactNode }) => {
  const cached = uniteleriCachedenOku();
  const [veri, setVeri] = useState<UnitelerVerisi>(cached ?? BOS);
  const [yukleniyor, setYukleniyor] = useState(!cached);
  const [hata, setHata] = useState<string | null>(null);

  const yukle = useCallback(async () => {
    try {
      const yeni = await uniteleriYukle();
      setVeri(yeni);
      uniteleriCacheeYaz(yeni.uniteler);
      setHata(null);
    } catch (e) {
      setHata(e instanceof Error ? e.message : 'Bilinmeyen hata');
    } finally {
      setYukleniyor(false);
    }
  }, []);

  useEffect(() => {
    let iptal = false;
    yukle().catch(() => {
      // hata yukle içinde state'e yazıldı; iptal edildiyse no-op
      if (iptal) return;
    });
    return () => {
      iptal = true;
    };
  }, [yukle]);

  return (
    <UnitelerContext.Provider
      value={{ ...veri, yukleniyor, hata, yenile: yukle }}
    >
      {children}
    </UnitelerContext.Provider>
  );
};

export const useUniteler = () => useContext(UnitelerContext);
