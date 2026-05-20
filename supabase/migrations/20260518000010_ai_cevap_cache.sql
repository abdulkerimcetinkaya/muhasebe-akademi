-- AI cevap önbelleği — sık tekrarlayan sorular için lokal cache.
-- Edge Function (ai-asistan) önce buraya bakar, hit varsa AI'a hiç gitmez.
--
-- Strateji:
--   - Hash: kullanıcı mesajı + bağlam (soruBaslik+senaryo) normalize edilip SHA-256
--   - Conversation length > 1 ise cache atlanır (multi-turn unique)
--   - Güncel veri sorgusu (Tavily tetikleniyorsa) cache atlanır
--   - hit_sayisi ve son_kullanim metriklerle takip — gözle görülür tekrarlar
--     ilgili "konu anlatımı" gibi statik içeriklere kalıcı taşınabilir.

begin;

create table public.ai_cevap_cache (
  id           uuid primary key default gen_random_uuid(),
  soru_hash    text unique not null,
  soru_metni   text not null,
  baglam       jsonb,
  cevap        text not null,
  kaynaklar    jsonb,
  hit_sayisi   int not null default 0,
  son_kullanim timestamptz not null default now(),
  olusturulma  timestamptz not null default now()
);

create index ai_cevap_cache_son_kullanim_idx
  on public.ai_cevap_cache (son_kullanim desc);
create index ai_cevap_cache_hit_idx
  on public.ai_cevap_cache (hit_sayisi desc);

-- Hit sayacını arttır + son kullanım zamanını güncelle (single row, atomik).
-- Edge function `ai_cache_hit(_hash)` ile çağırır.
create or replace function public.ai_cache_hit(_hash text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ai_cevap_cache
     set hit_sayisi = hit_sayisi + 1,
         son_kullanim = now()
   where soru_hash = _hash;
$$;

-- RLS — cache tablosuna direkt client erişimi yok, sadece edge function
-- service_role ile yazar/okur. Diğer roller engellenir.
alter table public.ai_cevap_cache enable row level security;

-- Service role bypass'ı zaten varsayılan; client (authenticated/anon) için
-- erişim yok. Admin kullanıcılar dashboard'dan görmek isterse ayrı policy
-- eklenebilir — şimdilik gerek yok.

commit;
