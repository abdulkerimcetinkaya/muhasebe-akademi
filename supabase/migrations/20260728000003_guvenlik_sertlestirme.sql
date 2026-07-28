-- Güvenlik sertleştirmesi (Supabase advisor bulguları).
--
-- 1) ai_log_gunluk view'i SECURITY DEFINER idi → RLS baypas riski (ERROR).
--    security_invoker=on: view sorgulayanın yetkileriyle çalışır. ai_log'un
--    RLS'i zaten admin-only (ai_log_admin_select = is_admin()), dolayısıyla
--    admin maliyet paneli çalışmaya devam eder, başkaları erişemez.
alter view public.ai_log_gunluk set (security_invoker = on);

-- 2) function_search_path_mutable: search_path sabitlenmemiş fonksiyonlar
--    (search_path enjeksiyonuna açık). public'e pinliyoruz — davranış korunur.
alter function public.set_updated_at() set search_path = public;
alter function public.sozluk_updated_at_trigger() set search_path = public;
alter function public.muavin_hesaplar_updated_at() set search_path = public;
alter function public.adminler_roller_check() set search_path = public;
alter function public.muavin_cari_zorunlu() set search_path = public;
alter function public.cozum_satir_butunluk() set search_path = public;
alter function public.xp_seviye(integer) set search_path = public;

-- 3) public_bucket_allows_listing: unite-gorseller PUBLIC bir bucket; görseller
--    public CDN URL'inden (getPublicUrl) servis edilir, RLS gerektirmez ve app
--    hiç .list() çağırmaz. Geniş public SELECT policy'si yalnızca anonim
--    dosya enumerasyonuna izin veriyordu → kaldırıldı. Admin insert/update/
--    delete policy'leri korunur.
drop policy if exists "unite_gorseller_public_read" on storage.objects;
