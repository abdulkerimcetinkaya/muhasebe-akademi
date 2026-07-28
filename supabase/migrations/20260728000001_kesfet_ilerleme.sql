-- Keşfet ilerlemesi — kullanıcı-bazlı ders tamamlama kaydı.
--
-- Önceden ilerleme yalnızca localStorage'daydı (cihaza bağlı, hesapla senkron
-- değil). Testle tamamlama artık gerçek bir başarıya bağlandığı için ilerlemeyi
-- kullanıcı hesabına taşıyoruz. Anonim ziyaretçi için frontend localStorage
-- fallback'i kullanmaya devam eder (soru çözme kayıt ister; gezinme serbest).

create table if not exists public.kesfet_ilerleme (
  kullanici_id   uuid not null references auth.users(id) on delete cascade,
  item_id        uuid not null references public.kesfet_itemler(id) on delete cascade,
  tamamlandi_at  timestamptz not null default now(),
  primary key (kullanici_id, item_id)
);

create index if not exists kesfet_ilerleme_kullanici_idx
  on public.kesfet_ilerleme (kullanici_id);

alter table public.kesfet_ilerleme enable row level security;

-- Kullanıcı yalnızca kendi ilerlemesini görür/ekler/siler.
create policy "kesfet_ilerleme_select_own"
  on public.kesfet_ilerleme for select
  using (auth.uid() = kullanici_id or public.is_admin());

create policy "kesfet_ilerleme_insert_own"
  on public.kesfet_ilerleme for insert
  with check (auth.uid() = kullanici_id);

create policy "kesfet_ilerleme_delete_own"
  on public.kesfet_ilerleme for delete
  using (auth.uid() = kullanici_id);
