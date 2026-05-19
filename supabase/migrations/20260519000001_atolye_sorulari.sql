-- atolye_sorulari junction tablosu — alt başlık (atölye) ve soru many-to-many
--
-- Anlamsal değişim:
--   - sorular.alt_baslik_id artık "konu havuzu etiketi" (Problemler sayfasında
--     filtre için). Bir soru tek bir alt başlığa etiketli kalır.
--   - atolye_sorulari ise "atölyenin müfredatı" — admin tıkla-ekle ile seçer,
--     sıralar. Atölye sayfası (AltBaslikSayfasi) bunu kullanır.
--
-- Bir soru birden fazla atölyeye atanabilir; atölye dışından da seçilebilir
-- (örneğin bir önceki modülden tekrar pekiştirme).
--
-- Geçiş: mevcut alt_baslik_id'si olan tüm onaylı sorular junction'a kopyalanır
-- (eski davranışı koru — admin sonra istediğini kaldırabilir).

begin;

create table public.atolye_sorulari (
  alt_baslik_id  text not null
                 references public.modul_alt_basliklari(id) on delete cascade,
  soru_id        text not null
                 references public.sorular(id) on delete cascade,
  sira           int not null default 0,
  eklenme        timestamptz not null default now(),
  primary key (alt_baslik_id, soru_id)
);

create index atolye_sorulari_alt_baslik_idx
  on public.atolye_sorulari (alt_baslik_id, sira);
create index atolye_sorulari_soru_idx
  on public.atolye_sorulari (soru_id);

-- RLS
alter table public.atolye_sorulari enable row level security;

-- Herkes okuyabilir (sorular/modüller gibi public katalog)
create policy "atolye_sorulari_public_read"
  on public.atolye_sorulari for select using (true);

-- Sadece admin CRUD
create policy "atolye_sorulari_admin_all"
  on public.atolye_sorulari for all
  using (is_admin()) with check (is_admin());

-- ============================================================================
-- GEÇİŞ SEED — mevcut alt_baslik_id'li onaylı soruları junction'a kopyala.
-- sira: sorular.id sırasıyla otomatik artar (sonradan admin değiştirebilir).
-- ============================================================================
insert into public.atolye_sorulari (alt_baslik_id, soru_id, sira)
select
  s.alt_baslik_id,
  s.id,
  row_number() over (
    partition by s.alt_baslik_id
    order by s.id
  ) as sira
from public.sorular s
where s.alt_baslik_id is not null
  and s.durum = 'onayli'
on conflict (alt_baslik_id, soru_id) do nothing;

commit;
