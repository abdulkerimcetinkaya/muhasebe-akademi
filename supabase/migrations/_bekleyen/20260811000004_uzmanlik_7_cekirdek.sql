-- Uzmanlıklar V3 (ADR-004): 7 çekirdek uzmanlık + 3 sektör rotası.
-- Silme yok: çekirdek listede olmayan kartlar gizlenir; rotalar capstone
-- olarak ön koşul ağıyla çekirdeklere bağlanır.

begin;

create or replace function pg_temp.sabit_uuid(p_key text) returns uuid language sql immutable as $$
  select (substr(md5(p_key),1,8)||'-'||substr(md5(p_key),9,4)||'-4'||substr(md5(p_key),14,3)||'-a'||substr(md5(p_key),18,3)||'-'||substr(md5(p_key),21,12))::uuid
$$;

-- ── 1) Çekirdek uzmanlıklar (fonksiyonel, 'yakinda') ──────────────────────
update public.kesfet_kartlar set ad='Vergi Uygulamaları', sira=20
where slug='ileri-vergi' and tip='kesfet';

update public.kesfet_kartlar set ad='Finansal Raporlama ve TMS/TFRS', sira=21
where slug='finansal-raporlama' and tip='kesfet';

update public.kesfet_kartlar set ad='Maliyet ve Üretim Muhasebesi', sira=22
where slug='maliyet-muhasebesi' and tip='kesfet';

update public.kesfet_kartlar set sira=23
where slug='proje-muhasebesi' and tip='kesfet';

update public.kesfet_kartlar set ad='İleri Bordro, SGK ve Teşvikler', sira=24
where slug='bordro-is-hukuku' and tip='kesfet';

update public.kesfet_kartlar set ad='Dış Ticaret Muhasebesi', sira=25
where slug='dis-ticaret-doviz' and tip='kesfet';

-- Ar-Ge sektörelden çekirdeğe alınır ve görünür olur.
update public.kesfet_kartlar set ad='Ar-Ge, Teknokent ve Teşvikler',
  uzmanlik_turu='fonksiyonel', durum='yakinda', sira=26
where slug='arge-teknokent' and tip='kesfet';

-- Çekirdek listede olmayan kart gizlenir (raporlama teması Y9'da yaşar).
update public.kesfet_kartlar set durum='gizli'
where slug='yonetim-muhasebesi' and tip='kesfet';

-- ── 2) Sektör rotaları (sektorel, 'gizli') ────────────────────────────────
update public.kesfet_kartlar set sira=30
where slug='savunma-sanayii' and tip='kesfet';
update public.kesfet_kartlar set ad='İnşaat ve Taahhüt Muhasebesi', sira=31
where slug='insaat-muhasebesi' and tip='kesfet';

insert into public.kesfet_kartlar(id,slug,ad,aciklama,ikon,kategori,tip,durum,sira,uzmanlik_turu,on_kosul_sluglari)
values (pg_temp.sabit_uuid('kart:e-ticaret'),'e-ticaret','e-Ticaret Muhasebesi',
 'Pazaryeri satışları, komisyon, sanal POS ve mutabakatı; satış, KDV ve stok yetkinliklerinin sektör rotası.',
 'ShoppingCart','Uzmanlıklar','kesfet','gizli',32,'sektorel',
 array['satis-musteri-tahsilat','vergi-belge-uygulamalari','stok-duran-varlik'])
on conflict(id) do update set ad=excluded.ad, aciklama=excluded.aciklama,
  durum=excluded.durum, sira=excluded.sira, uzmanlik_turu=excluded.uzmanlik_turu,
  on_kosul_sluglari=excluded.on_kosul_sluglari;

-- ── 3) Rota ön koşulları (capstone bağları) ───────────────────────────────
insert into public.kesfet_kart_on_kosullari(kart_id,on_kosul_kart_id,tur)
select k.id, o.id, 'zorunlu'
from (values
  ('e-ticaret','satis-musteri-tahsilat'),
  ('e-ticaret','vergi-belge-uygulamalari'),
  ('e-ticaret','stok-duran-varlik'),
  ('insaat-muhasebesi','proje-muhasebesi'),
  ('savunma-sanayii','proje-muhasebesi'),
  ('savunma-sanayii','arge-teknokent')
) v(kart_slug,on_slug)
join public.kesfet_kartlar k on k.slug=v.kart_slug and k.tip='kesfet'
join public.kesfet_kartlar o on o.slug=v.on_slug and o.tip='kesfet'
on conflict do nothing;

notify pgrst, 'reload schema';
commit;
