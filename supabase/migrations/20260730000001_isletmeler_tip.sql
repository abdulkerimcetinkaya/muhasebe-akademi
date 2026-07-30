-- İşletmeler (dönem simülasyonu) — bkz. docs/adr/ADR-001-isletmeler-modeli.md
-- kesfet_kartlar'a "tip" ayrımı eklenir: 'kesfet' (mevcut Keşfet kartları) veya
-- 'isletme' (dönem simülasyonu). Additive + geriye dönük uyumlu: mevcut satırlar
-- default ile 'kesfet' olur. itemler'deki tip (ders/alistirma) ile karışmaz.

alter table public.kesfet_kartlar
  add column if not exists tip text not null default 'kesfet';

-- Check constraint'i ayrı ekle (idempotent — varsa atla).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'kesfet_kartlar_tip_check'
  ) then
    alter table public.kesfet_kartlar
      add constraint kesfet_kartlar_tip_check check (tip in ('kesfet','isletme'));
  end if;
end $$;

create index if not exists kesfet_kartlar_tip_idx on public.kesfet_kartlar (tip);
