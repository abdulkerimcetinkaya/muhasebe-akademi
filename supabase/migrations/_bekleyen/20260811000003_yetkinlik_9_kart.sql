-- Yetkinlikler V3 (ADR-004): 6 konu kartını 9 iş akışı kartına dönüştürür.
-- Yayındaki 8 Yetkinlik dersi yeni kartlara taşınır; hiçbir kayıt silinmez.
-- Yayınlı içerik alan kartlar kullanıcı erişimini korumak için 'acik' olur;
-- içeriksiz yeni kart (Y5) 'yakinda' kalır.
-- Bilinen erişim değişimi: "Belge, Kayıt ve Bakiye Kontrolü" alıştırması
-- Y8'e (yakında) taşınır — Y8 açılana dek kullanıcıya kapalı (ADR-004 notu).

begin;

create or replace function pg_temp.sabit_uuid(p_key text) returns uuid language sql immutable as $$
  select (substr(md5(p_key),1,8)||'-'||substr(md5(p_key),9,4)||'-4'||substr(md5(p_key),14,3)||'-a'||substr(md5(p_key),18,3)||'-'||substr(md5(p_key),21,12))::uuid
$$;

-- ── 1) Yeniden adlanan mevcut kartlar (id/slug sabit) ─────────────────────
update public.kesfet_kartlar set ad='Satın Alma, Satıcı ve Ödeme',
  aciklama='Satın alma sürecini faturadan cari kapanışına ve mutabakata kadar yönet.',
  sira=11
where slug='gunluk-muhasebe-islemleri' and tip='kesfet';

update public.kesfet_kartlar set ad='KDV ve e-Belge Operasyonları',
  aciklama='Vergi ve elektronik belge süreçlerini günlük muhasebeyle birleştir.',
  sira=15
where slug='vergi-belge-uygulamalari' and tip='kesfet';

update public.kesfet_kartlar set ad='Mutabakat ve Dönem Sonu Kontrolleri',
  aciklama='Muhasebeyi kontrol et, düzelt ve döneme hazırla.',
  sira=17
where slug='donem-sonu-islemleri' and tip='kesfet';

update public.kesfet_kartlar set ad='Beyanname, Kapanış ve Raporlama',
  aciklama='Muhasebe verisini beyan ve raporlama sürecine taşı.',
  sira=18
where slug='beyanname-surecleri' and tip='kesfet';

update public.kesfet_kartlar set sira=16
where slug='bordro-sgk' and tip='kesfet';

-- Yeni modelde karşılığı olmayan kart: gizle (silme yok, ADR-004).
update public.kesfet_kartlar set durum='gizli'
where slug='sirket-ticaret-islemleri' and tip='kesfet';

-- ── 2) Yeni kartlar ───────────────────────────────────────────────────────
insert into public.kesfet_kartlar(id,slug,ad,aciklama,ikon,kategori,tip,durum,sira,on_kosul_sluglari)
values
(pg_temp.sabit_uuid('kart:belgeden-muhasebe-islemine'),'belgeden-muhasebe-islemine',
 'Belgeden Muhasebe İşlemine','Gerçek işletme belgelerini okuyup muhasebe olayına dönüştür.',
 'FileSearch','Yetkinlikler','kesfet','acik',10,array['kayittan-finansal-tabloya']),
(pg_temp.sabit_uuid('kart:satis-musteri-tahsilat'),'satis-musteri-tahsilat',
 'Satış, Müşteri ve Tahsilat','Satış sürecini kayıt, tahsilat ve cari mutabakata kadar yönet.',
 'HandCoins','Yetkinlikler','kesfet','acik',12,array['belgeden-muhasebe-islemine']),
(pg_temp.sabit_uuid('kart:kasa-banka-kart-finansman'),'kasa-banka-kart-finansman',
 'Kasa, Banka, Kart ve Finansman','Para hareketlerini muhasebeleştir ve mutabakatını yap.',
 'Landmark','Yetkinlikler','kesfet','acik',13,array['kayittan-finansal-tabloya']),
(pg_temp.sabit_uuid('kart:stok-duran-varlik'),'stok-duran-varlik',
 'Stok ve Duran Varlık İşlemleri','İşletmenin mallarını ve uzun süreli varlıklarını izle.',
 'Boxes','Yetkinlikler','kesfet','yakinda',14,array['gunluk-muhasebe-islemleri'])
on conflict(id) do update set ad=excluded.ad, aciklama=excluded.aciklama,
  kategori=excluded.kategori, durum=excluded.durum, sira=excluded.sira,
  on_kosul_sluglari=excluded.on_kosul_sluglari;

-- ── 3) Ön koşul ağı: yeni kartların bağları ───────────────────────────────
insert into public.kesfet_kart_on_kosullari(kart_id,on_kosul_kart_id,tur)
select k.id, o.id, 'zorunlu'
from (values
  ('belgeden-muhasebe-islemine','kayittan-finansal-tabloya'),
  ('satis-musteri-tahsilat','belgeden-muhasebe-islemine'),
  ('kasa-banka-kart-finansman','kayittan-finansal-tabloya'),
  ('stok-duran-varlik','gunluk-muhasebe-islemleri')
) v(kart_slug,on_slug)
join public.kesfet_kartlar k on k.slug=v.kart_slug and k.tip='kesfet'
join public.kesfet_kartlar o on o.slug=v.on_slug and o.tip='kesfet'
on conflict do nothing;

-- ── 4) Bölüm ve ders taşımaları ───────────────────────────────────────────
do $$
declare
  v_y1 uuid; v_y2 uuid; v_y3 uuid; v_y4 uuid; v_y8 uuid;
  v_bolum uuid;
begin
  select id into v_y1 from public.kesfet_kartlar where slug='belgeden-muhasebe-islemine' and tip='kesfet';
  select id into v_y2 from public.kesfet_kartlar where slug='gunluk-muhasebe-islemleri' and tip='kesfet';
  select id into v_y3 from public.kesfet_kartlar where slug='satis-musteri-tahsilat' and tip='kesfet';
  select id into v_y4 from public.kesfet_kartlar where slug='kasa-banka-kart-finansman' and tip='kesfet';
  select id into v_y8 from public.kesfet_kartlar where slug='donem-sonu-islemleri' and tip='kesfet';

  -- Y1: "Belgeyi Okumak" ve "Belge Kontrol Vakası" bölümleri KDV kartından taşınır.
  update public.kesfet_bolumler b set kart_id=v_y1, sira=0
  from public.kesfet_kartlar k
  where k.id=b.kart_id and k.slug='vergi-belge-uygulamalari' and b.ad='Belgeyi Okumak';

  update public.kesfet_bolumler b set kart_id=v_y1, sira=1
  from public.kesfet_kartlar k
  where k.id=b.kart_id and k.slug='vergi-belge-uygulamalari' and b.ad='Belge Kontrol Vakası';

  -- Y2: "Alış ve Satış" bölümü "Satın Alma" olur; satış dersi Y3'e gidecek.
  update public.kesfet_bolumler b set ad='Satın Alma'
  from public.kesfet_kartlar k
  where k.id=b.kart_id and k.slug='gunluk-muhasebe-islemleri' and b.ad='Alış ve Satış';

  -- Y3: yeni bölüm + "Vadeli Satış ve Tahsilat" dersi Y2'den taşınır.
  v_bolum := pg_temp.sabit_uuid('bolum:satis-musteri-tahsilat:0');
  insert into public.kesfet_bolumler(id,kart_id,ad,sira,tur)
  values (v_bolum, v_y3, 'Satış ve Tahsilat', 0, 'normal')
  on conflict(id) do update set kart_id=excluded.kart_id, ad=excluded.ad, sira=excluded.sira;

  update public.kesfet_itemler i set bolum_id=v_bolum, sira=0
  from public.kesfet_bolumler b, public.kesfet_kartlar k
  where b.id=i.bolum_id and k.id=b.kart_id
    and k.slug='gunluk-muhasebe-islemleri' and i.ad='Vadeli Satış ve Tahsilat';

  -- Y4: "Kasa ve Banka" bölümü Y2'den taşınır.
  update public.kesfet_bolumler b set kart_id=v_y4, sira=0
  from public.kesfet_kartlar k
  where k.id=b.kart_id and k.slug='gunluk-muhasebe-islemleri' and b.ad='Kasa ve Banka';

  -- Y8: "Gün Sonu Kontrolü" bölümü Y2'den taşınır.
  update public.kesfet_bolumler b set kart_id=v_y8, sira=0
  from public.kesfet_kartlar k
  where k.id=b.kart_id and k.slug='gunluk-muhasebe-islemleri' and b.ad='Gün Sonu Kontrolü';
end $$;

notify pgrst, 'reload schema';
commit;
