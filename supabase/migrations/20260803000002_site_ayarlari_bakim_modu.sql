-- MuhasebeAkademi — site bakım/çok-yakında modu (tek satırlık global ayar)
create table site_ayarlari (
  id smallint primary key default 1,
  bakim_modu boolean not null default false,
  guncelleyen uuid,
  guncellendi timestamptz not null default now(),
  constraint site_ayarlari_tek_satir check (id = 1)
);
insert into site_ayarlari (id, bakim_modu) values (1, false);
alter table site_ayarlari enable row level security;
-- Herkes okuyabilir (gate flag'i); yalnızca super admin güncelleyebilir.
create policy site_ayarlari_read on site_ayarlari for select using (true);
create policy site_ayarlari_super_update on site_ayarlari for update
  using (exists (select 1 from adminler a where a.user_id = auth.uid() and 'super' = any(a.roller)))
  with check (exists (select 1 from adminler a where a.user_id = auth.uid() and 'super' = any(a.roller)));
