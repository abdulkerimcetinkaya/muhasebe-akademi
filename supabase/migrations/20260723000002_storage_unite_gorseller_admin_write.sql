-- =====================================================================
-- Storage RLS: unite-gorseller bucket'ına admin yazma izni
-- =====================================================================
-- Sorun: bucket public (okuma var) ama storage.objects üzerinde INSERT
-- politikası yoktu → admin içerik editöründen görsel yükleme "new row
-- violates row-level security policy" veriyordu.
-- Çözüm: admin (public.is_admin()) için insert/update/delete politikaları.
-- Okuma zaten "unite_gorseller_public_read" ile public.
-- Idempotent: drop policy if exists + create.
-- =====================================================================

drop policy if exists "unite_gorseller_admin_insert" on storage.objects;
create policy "unite_gorseller_admin_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'unite-gorseller' and public.is_admin());

drop policy if exists "unite_gorseller_admin_update" on storage.objects;
create policy "unite_gorseller_admin_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'unite-gorseller' and public.is_admin())
  with check (bucket_id = 'unite-gorseller' and public.is_admin());

drop policy if exists "unite_gorseller_admin_delete" on storage.objects;
create policy "unite_gorseller_admin_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'unite-gorseller' and public.is_admin());
