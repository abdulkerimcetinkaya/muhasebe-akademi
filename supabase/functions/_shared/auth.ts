// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

export interface YetkiSonuc {
  user: any;
  supabase: any;
}

// Edge function çağıranın JWT'sini doğrular + supabase client'ı kullanıcı kimliğiyle döner
export const kullaniciDogrula = async (req: Request): Promise<YetkiSonuc | Response> => {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ hata: 'Oturum bulunamadı' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    },
  );

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    return new Response(JSON.stringify({ hata: 'Geçersiz oturum' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { user: userData.user, supabase };
};

// Premium üyelik kontrolü — premium_bitis > bugün olmalı
export const premiumKontrol = async (supabase: any, userId: string): Promise<boolean> => {
  const { data } = await supabase
    .from('kullanicilar')
    .select('premium_bitis')
    .eq('id', userId)
    .maybeSingle();
  if (!data?.premium_bitis) return false;
  return new Date(data.premium_bitis) > new Date();
};

// Admin kontrolü — DB'deki public.adminler tablosuna bakar (is_admin RPC).
// Tek kaynak: AdminYetkilileriSayfasi'ndan eklenen herkes burada da geçerli.
// Opsiyonel _role parametresi (örn 'icerik', 'operasyon') belirli yetkiyi
// ister; null geçilirse herhangi bir admin yeter ('super' rolü tüm rolleri
// kapsar — is_admin() postgres tarafında).
export const adminKontrol = async (
  supabase: any,
  _role?: string,
): Promise<boolean> => {
  const { data, error } = await supabase.rpc('is_admin', {
    _role: _role ?? null,
  });
  if (error) {
    console.error('[adminKontrol] is_admin RPC hatası:', error.message);
    return false;
  }
  return data === true;
};
