-- =====================================================================
-- M9 — Learning Engine (kullanici_yetkinlikleri + türetim view'ları + XP RPC)
-- =====================================================================
-- Referans: M9-MIMARI-ANALIZ.md, ADR-009/015/019, V2-VERI-MODELI §2.3
--
-- ⚠️ SALT YAPI — BACKFILL YOK: kullanici_yetkinlikleri BOŞ kurulur. Geriye dönük XP
--    dağıtımı YAPILMAZ — ilerleme'de anlamlı geçmiş yok (2 satır) + olay_yetkinlikleri
--    boş (ağırlık yok). XP İLERİYE DÖNÜK akümüle olur (ilerleme_kaydet RPC).
--
-- ⚠️ DORMANT-AKTİF: XP akışı `olay_yetkinlikleri` ağırlıkları kürasyonla dolunca
--    aktifleşir. Bugün RPC çalışır (ilerleme yazar) ama olay_yetkinlikleri boş
--    olduğundan XP dağıtımı no-op'tur. Bu beklenen sıra (M5→M9).
--
-- ADR-009: xp/dogru/yanlis SAKLANIR (write-time akümülatör); seviye/toplam/zayıf
--    alan TÜRETİLİR (view, security_invoker). ADR-015: yetkinlik = ölçüm ekseni.
-- ADR-019: M9 kullanıcının SONUCUNU (ilerleme) okur, cevap anahtarına dokunmaz.
--
-- Kapsam (M9):
--   + kullanici_yetkinlikleri       (akümülatör: xp/dogru/yanlis/son_calisma_at)
--   + xp_seviye(int) fonksiyonu     (XP eşik → seviye, immutable)
--   + kullanici_yetkinlik_durum     (view: seviye/başarı oranı — security_invoker)
--   + kullanici_zayif_alan          (view: zayıf yetkinlikler — security_invoker)
--   + ilerleme_kaydet(...) RPC      (atomik: ilerleme + XP dağıtımı, ilk-doğru idempotent)
--
-- İdempotent: create if not exists + create or replace + drop policy if exists.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. kullanici_yetkinlikleri (akümülatör — V2-VERI-MODELI §2.3)
-- ---------------------------------------------------------------------
create table if not exists public.kullanici_yetkinlikleri (
  user_id         uuid not null references public.kullanicilar(id) on delete cascade,
  yetkinlik_id    text not null references public.yetkinlikler(id) on delete cascade,
  xp              int not null default 0,
  dogru_sayisi    int not null default 0,
  yanlis_sayisi   int not null default 0,
  son_calisma_at  timestamptz,
  primary key (user_id, yetkinlik_id)
);
-- Agregat istatistik ters yönü ("bu yetkinlikteki kullanıcılar")
create index if not exists kullanici_yetkinlikleri_yetkinlik_idx on public.kullanici_yetkinlikleri (yetkinlik_id);

-- ---------------------------------------------------------------------
-- 2. RLS — Sahiplik (kendi verisi + admin)
-- ---------------------------------------------------------------------
alter table public.kullanici_yetkinlikleri enable row level security;
drop policy if exists "kullanici_yetkinlikleri_own_read" on public.kullanici_yetkinlikleri;
create policy "kullanici_yetkinlikleri_own_read" on public.kullanici_yetkinlikleri for select
  using (user_id = auth.uid() or public.is_admin());
drop policy if exists "kullanici_yetkinlikleri_admin_all" on public.kullanici_yetkinlikleri;
create policy "kullanici_yetkinlikleri_admin_all" on public.kullanici_yetkinlikleri for all
  using (public.is_admin()) with check (public.is_admin());
-- Yazma normalde ilerleme_kaydet() RPC'si (SECURITY DEFINER) üzerinden; doğrudan
-- kullanıcı insert/update politikası YOK (iş kuralı RPC'de).

-- ---------------------------------------------------------------------
-- 3. xp_seviye(int) — XP eşik fonksiyonu (seviye TÜRETİLİR, ADR-009)
-- ---------------------------------------------------------------------
-- Eşikler ayarlanabilir; seviye saklanmaz, bu fonksiyonla view'da hesaplanır.
create or replace function public.xp_seviye(_xp int)
returns int language sql immutable as $fn$
  select case
    when _xp >= 1000 then 5
    when _xp >=  500 then 4
    when _xp >=  200 then 3
    when _xp >=   50 then 2
    else 1
  end;
$fn$;

-- ---------------------------------------------------------------------
-- 4. Türetim view'ları (security_invoker → RLS querier'a uygulanır)
-- ---------------------------------------------------------------------
-- security_invoker=true KRİTİK: yoksa view owner (postgres) haklarıyla çalışır
-- ve kullanıcı başkalarının verisini görür. invoker ile own-data RLS geçerli kalır.
create or replace view public.kullanici_yetkinlik_durum
  with (security_invoker = true) as
select
  ky.user_id,
  ky.yetkinlik_id,
  y.ad as yetkinlik_ad,
  ky.xp,
  public.xp_seviye(ky.xp) as seviye,
  ky.dogru_sayisi,
  ky.yanlis_sayisi,
  case when (ky.dogru_sayisi + ky.yanlis_sayisi) = 0 then null
       else round(ky.dogru_sayisi::numeric / (ky.dogru_sayisi + ky.yanlis_sayisi), 2)
  end as basari_orani,
  ky.son_calisma_at
from public.kullanici_yetkinlikleri ky
join public.yetkinlikler y on y.id = ky.yetkinlik_id;

create or replace view public.kullanici_zayif_alan
  with (security_invoker = true) as
select *
from public.kullanici_yetkinlik_durum
where basari_orani is not null
  and (dogru_sayisi + yanlis_sayisi) >= 3   -- yeterli deneme
  and basari_orani < 0.6;                    -- zayıf eşiği (ayarlanabilir)

-- ---------------------------------------------------------------------
-- 5. ilerleme_kaydet() RPC — atomik: ilerleme + XP dağıtımı
-- ---------------------------------------------------------------------
-- İş kuralı tek yerde (ADR-009 çift-sayım riski): XP yalnız SORU BAŞINA İLK DOĞRU
-- çözümde dağıtılır; dogru/yanlis sayaçları her denemede güncellenir. XP dağıtımı
-- soru→olay→olay_yetkinlikleri zinciriyle; olay_yetkinlikleri boşsa no-op (dormant).
create or replace function public.ilerleme_kaydet(
  _soru_id          text,
  _dogru_mu         boolean,
  _sure_saniye      int     default null,
  _kullanilan_ai    boolean default false,
  _cozum_gosterildi boolean default false,
  _kazanilan_puan   int     default 0
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid          uuid := auth.uid();
  v_ilerleme_id  uuid;
  v_onceki_dogru boolean;
  v_ilk_dogru    boolean;
  v_zorluk       public.zorluk;
  v_base         int;
begin
  if v_uid is null then
    raise exception 'ilerleme_kaydet: kimlik doğrulaması gerekli';
  end if;

  -- İlk-doğru mu? (bu insert'ten ÖNCE önceki doğru çözüm var mı)
  select exists (
    select 1 from public.ilerleme
    where user_id = v_uid and soru_id = _soru_id and dogru_mu
  ) into v_onceki_dogru;
  v_ilk_dogru := _dogru_mu and not v_onceki_dogru;

  -- 1) ilerleme satırı (mevcut motivasyon katmanı — kazanilan_puan burada)
  insert into public.ilerleme
    (user_id, soru_id, dogru_mu, sure_saniye, kullanilan_ai, cozum_gosterildi, kazanilan_puan)
  values
    (v_uid, _soru_id, _dogru_mu, _sure_saniye, _kullanilan_ai, _cozum_gosterildi, _kazanilan_puan)
  returning id into v_ilerleme_id;

  -- 2) Yetkinlik akümülatörü.
  -- Base XP = ZORLUK_PUAN sabiti (ADR-009): kolay=5, orta=10, zor=20.
  --   ⚠️ Bu değerler frontend/backend'deki ZORLUK_PUAN sabitiyle (src/data/sabitler)
  --      AYNI olmalıdır. Puanı app'ten parametre almak yerine DB'de deterministik
  --      hesaplıyoruz (tek doğruluk kaynağı burada). İleride zorluk puanları
  --      farklılaşır/çeşitlenirse ayrı bir KATALOG tabloya (ör. zorluk_puanlari)
  --      taşınacak; şimdilik CASE yeterli.
  select s.zorluk into v_zorluk from public.sorular s where s.id = _soru_id;
  v_base := case v_zorluk when 'kolay' then 5 when 'orta' then 10 when 'zor' then 20 else 0 end;

  insert into public.kullanici_yetkinlikleri
    (user_id, yetkinlik_id, xp, dogru_sayisi, yanlis_sayisi, son_calisma_at)
  select
    v_uid, oy.yetkinlik_id,
    case when v_ilk_dogru then round(v_base * oy.agirlik)::int else 0 end,
    case when _dogru_mu then 1 else 0 end,
    case when _dogru_mu then 0 else 1 end,
    now()
  from public.sorular s
  join public.olay_yetkinlikleri oy on oy.olay_id = s.olay_id
  where s.id = _soru_id
  on conflict (user_id, yetkinlik_id) do update set
    xp             = public.kullanici_yetkinlikleri.xp + excluded.xp,
    dogru_sayisi   = public.kullanici_yetkinlikleri.dogru_sayisi + excluded.dogru_sayisi,
    yanlis_sayisi  = public.kullanici_yetkinlikleri.yanlis_sayisi + excluded.yanlis_sayisi,
    son_calisma_at = excluded.son_calisma_at;

  return v_ilerleme_id;
end $fn$;

-- ---------------------------------------------------------------------
-- 6. DOĞRULAMA
-- ---------------------------------------------------------------------
do $$
declare v_satir int;
begin
  select count(*) into v_satir from public.kullanici_yetkinlikleri;
  raise notice 'M9 raporu — kullanici_yetkinlikleri: % (bekl. 0)', v_satir;

  if to_regclass('public.kullanici_yetkinlikleri') is null then
    raise exception 'M9 hata: kullanici_yetkinlikleri tablosu yok';
  end if;
  if to_regclass('public.kullanici_yetkinlik_durum') is null
     or to_regclass('public.kullanici_zayif_alan') is null then
    raise exception 'M9 hata: türetim view''larından biri yok';
  end if;
  if not exists (select 1 from pg_proc where proname='ilerleme_kaydet') then
    raise exception 'M9 hata: ilerleme_kaydet RPC yok';
  end if;
  if not exists (select 1 from pg_proc where proname='xp_seviye') then
    raise exception 'M9 hata: xp_seviye fonksiyonu yok';
  end if;
  if v_satir > 0 then
    raise exception 'M9 hata: kullanici_yetkinlikleri boş değil (backfill yapılmamalı)';
  end if;

  raise notice 'M9 doğrulama başarılı ✓ (yapı + RPC + view; backfill yok; XP olay_yetkinlikleri kürasyonuyla akar)';
end $$;

commit;

-- PostgREST şema cache yenile
notify pgrst, 'reload schema';
