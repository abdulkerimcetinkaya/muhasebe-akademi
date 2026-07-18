-- =====================================================================
-- Keşfet öğrenme yapısı: kart → bölüm → item (LeetCode Explore modeli)
-- =====================================================================
-- İçerik hardcoded (src/data/kesfet.ts) yerine DB'de tutulur; admin panelinden
-- yönetilir. ADDITIVE — yalnızca yeni tablolar; mevcut veriye DOKUNMAZ.
-- RLS: herkese okuma (içerik public), yazma admin (is_admin).
-- Idempotent: create if not exists + seed slug guard'ı.
-- =====================================================================

begin;

create table if not exists public.kesfet_kartlar (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  ad         text not null,
  aciklama   text not null default '',
  ikon       text not null default 'Rocket',
  kategori   text not null default 'Temeller',
  durum      text not null default 'yakinda' check (durum in ('acik','yakinda')),
  sira       int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kesfet_bolumler (
  id         uuid primary key default gen_random_uuid(),
  kart_id    uuid not null references public.kesfet_kartlar(id) on delete cascade,
  ad         text not null,
  sira       int  not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.kesfet_itemler (
  id         uuid primary key default gen_random_uuid(),
  bolum_id   uuid not null references public.kesfet_bolumler(id) on delete cascade,
  ad         text not null,
  tip        text not null default 'ders' check (tip in ('ders','alistirma')),
  sira       int  not null default 0,
  -- Alıştırma item'ları ileride bir soruya bağlanabilir (opsiyonel).
  soru_id    text references public.sorular(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kesfet_bolumler_kart_idx  on public.kesfet_bolumler (kart_id, sira);
create index if not exists kesfet_itemler_bolum_idx  on public.kesfet_itemler (bolum_id, sira);

-- updated_at trigger'ları
drop trigger if exists kesfet_kartlar_updated_at on public.kesfet_kartlar;
create trigger kesfet_kartlar_updated_at before update on public.kesfet_kartlar
  for each row execute function public.set_updated_at();
drop trigger if exists kesfet_bolumler_updated_at on public.kesfet_bolumler;
create trigger kesfet_bolumler_updated_at before update on public.kesfet_bolumler
  for each row execute function public.set_updated_at();
drop trigger if exists kesfet_itemler_updated_at on public.kesfet_itemler;
create trigger kesfet_itemler_updated_at before update on public.kesfet_itemler
  for each row execute function public.set_updated_at();

-- RLS: herkese okuma, yazma admin
alter table public.kesfet_kartlar  enable row level security;
alter table public.kesfet_bolumler enable row level security;
alter table public.kesfet_itemler  enable row level security;

drop policy if exists "kesfet_kartlar_read"  on public.kesfet_kartlar;
create policy "kesfet_kartlar_read"  on public.kesfet_kartlar  for select using (true);
drop policy if exists "kesfet_kartlar_admin" on public.kesfet_kartlar;
create policy "kesfet_kartlar_admin" on public.kesfet_kartlar  for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "kesfet_bolumler_read"  on public.kesfet_bolumler;
create policy "kesfet_bolumler_read"  on public.kesfet_bolumler for select using (true);
drop policy if exists "kesfet_bolumler_admin" on public.kesfet_bolumler;
create policy "kesfet_bolumler_admin" on public.kesfet_bolumler for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "kesfet_itemler_read"  on public.kesfet_itemler;
create policy "kesfet_itemler_read"  on public.kesfet_itemler  for select using (true);
drop policy if exists "kesfet_itemler_admin" on public.kesfet_itemler;
create policy "kesfet_itemler_admin" on public.kesfet_itemler  for all
  using (public.is_admin()) with check (public.is_admin());

-- Seed: mevcut "Muhasebe Başlangıç" kartı (idempotent — slug yoksa ekle)
do $$
declare
  v_kart uuid; v_b1 uuid; v_b2 uuid; v_b3 uuid;
begin
  if exists (select 1 from public.kesfet_kartlar where slug = 'muhasebe-baslangic') then
    return;
  end if;

  insert into public.kesfet_kartlar (slug, ad, aciklama, ikon, kategori, durum, sira)
  values ('muhasebe-baslangic', 'Muhasebe Başlangıç',
    'Muhasebenin temel kayıt mantığını adım adım öğren: olay, belge, çift taraflı kayıt ve ilk yevmiye.',
    'Rocket', 'Temeller', 'acik', 0)
  returning id into v_kart;

  insert into public.kesfet_bolumler (kart_id, ad, sira) values (v_kart, 'Muhasebe Mantığı', 0) returning id into v_b1;
  insert into public.kesfet_bolumler (kart_id, ad, sira) values (v_kart, 'İlk Kayıt', 1) returning id into v_b2;
  insert into public.kesfet_bolumler (kart_id, ad, sira) values (v_kart, 'Özet', 2) returning id into v_b3;

  insert into public.kesfet_itemler (bolum_id, ad, tip, sira) values
    (v_b1, 'Muhasebe neyi takip eder?', 'ders', 0),
    (v_b1, 'Her işlem bir olaydır', 'ders', 1),
    (v_b1, 'Çift taraflı kayıt', 'ders', 2),
    (v_b1, 'Borç ve alacak ne demek?', 'ders', 3),
    (v_b2, 'İlk kaydı birlikte yapalım', 'ders', 0),
    (v_b2, 'Peşin mal alışı', 'alistirma', 1),
    (v_b3, 'Neler öğrendin?', 'ders', 0);
end $$;

commit;

notify pgrst, 'reload schema';
