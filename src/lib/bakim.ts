import { supabase } from './supabase';

/** Site bakım/çok-yakında modu açık mı? (herkes okuyabilir) */
export const bakimModuGetir = async (): Promise<boolean> => {
  const { data } = await supabase
    .from('site_ayarlari')
    .select('bakim_modu')
    .eq('id', 1)
    .maybeSingle();
  return Boolean(data?.bakim_modu);
};

/** Bakım modunu aç/kapat (RLS: yalnızca super admin). */
export const bakimModuAyarla = async (deger: boolean): Promise<void> => {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('site_ayarlari')
    .update({
      bakim_modu: deger,
      guncelleyen: userData.user?.id ?? null,
      guncellendi: new Date().toISOString(),
    })
    .eq('id', 1);
  if (error) throw error;
};
