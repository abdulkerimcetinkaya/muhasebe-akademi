-- kesfet_ilerleme RLS + index ince ayarı (Supabase advisor önerileri).
--
-- 1) auth_rls_initplan: policy'lerde auth.uid() her satır için yeniden
--    değerlendiriliyordu. (select auth.uid()) ile bir kez hesaplanır.
-- 2) unindexed_foreign_keys: item_id FK'sine kapsayan index (cascade delete
--    ve item bazlı sorgular için).

drop policy if exists "kesfet_ilerleme_select_own" on public.kesfet_ilerleme;
drop policy if exists "kesfet_ilerleme_insert_own" on public.kesfet_ilerleme;
drop policy if exists "kesfet_ilerleme_delete_own" on public.kesfet_ilerleme;

create policy "kesfet_ilerleme_select_own"
  on public.kesfet_ilerleme for select
  using ((select auth.uid()) = kullanici_id or public.is_admin());

create policy "kesfet_ilerleme_insert_own"
  on public.kesfet_ilerleme for insert
  with check ((select auth.uid()) = kullanici_id);

create policy "kesfet_ilerleme_delete_own"
  on public.kesfet_ilerleme for delete
  using ((select auth.uid()) = kullanici_id);

create index if not exists kesfet_ilerleme_item_idx
  on public.kesfet_ilerleme (item_id);
