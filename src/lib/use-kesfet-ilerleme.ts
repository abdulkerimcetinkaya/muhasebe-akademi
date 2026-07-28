/**
 * Keşfet ilerlemesi React hook'u — kullanıcıya göre yükler, tamamlama yazar.
 *
 * Saf veri katmanı (localStorage + Supabase) `kesfet-ilerleme.ts` içinde;
 * bu dosya yalnızca React/Auth bağını taşır. Ayrım, auth.ts ↔ kesfet-ilerleme
 * arasındaki döngüsel import'u önler (auth.ts yalnız saf katmanı kullanır).
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { tamamlananSet, ilerlemeGetir, itemTamamla } from './kesfet-ilerleme';

export const useKesfetIlerleme = () => {
  const { user } = useAuth();
  const [tamamlanan, setTamamlanan] = useState<Set<string>>(() => tamamlananSet());

  useEffect(() => {
    let iptal = false;
    ilerlemeGetir(user?.id ?? null).then((s) => {
      if (!iptal) setTamamlanan(s);
    });
    return () => {
      iptal = true;
    };
  }, [user?.id]);

  const tamamla = async (itemId: string): Promise<void> => {
    await itemTamamla(itemId, user?.id);
    setTamamlanan((s) => {
      const y = new Set(s);
      y.add(itemId);
      return y;
    });
  };

  return { tamamlanan, tamamla };
};
