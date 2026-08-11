-- Temeller kartını kanonik 5 bölüme indir.
-- Eski item ilerlemeleri, silme öncesinde eşdeğer yeni derslere taşınır.

begin;

with eslesme(eski_ad, yeni_ad) as (
  values
    ('Belge Nedir?', 'Belge'),
    ('Hesaplar Neden İki Taraflıdır', 'Hesaplar Neden İki Taraflıdır?'),
    ('Gelir, Gider ve Özkaynak İlişkisi', 'Gelir, Gider ve Özkaynak'),
    ('Varlık Hesapları Nasıl Çalışır?', 'Borç ve Alacak'),
    ('Kaynak Hesapları Nasıl Çalışır?', 'Borç ve Alacak'),
    ('İlk Muhasebe Kaydı', 'Yevmiye Kaydı'),
    ('Büyük Defter (Defteri Kebir)', 'Büyük Defter ve Mizan'),
    ('Mizan', 'Büyük Defter ve Mizan'),
    ('Bilanço', 'Bilanço ve Gelir Tablosu'),
    ('Gelir Tablosu', 'Bilanço ve Gelir Tablosu'),
    ('Muhasebenin Büyük Resmi', 'Bilanço ve Gelir Tablosu')
),
eski_itemler as (
  select i.id, e.yeni_ad
  from public.kesfet_itemler i
  join public.kesfet_bolumler b on b.id = i.bolum_id
  join public.kesfet_kartlar k on k.id = b.kart_id
  join eslesme e on e.eski_ad = i.ad
  where k.slug = 'muhasebe-baslangic'
    and b.ad in ('Giriş', 'Temel Kavramlar', 'Kayıt Mantığı', 'Çıktılar', 'Final', 'Final Simülasyonu')
),
yeni_itemler as (
  select i.id, i.ad
  from public.kesfet_itemler i
  join public.kesfet_bolumler b on b.id = i.bolum_id
  join public.kesfet_kartlar k on k.id = b.kart_id
  where k.slug = 'muhasebe-baslangic'
    and b.ad in (
      'Muhasebeyi Anlamak',
      'İşletmenin Finansal Yapısı',
      'Muhasebe Dili',
      'Muhasebe Kaydı',
      'Kayıttan Finansal Tabloya'
    )
)
insert into public.kesfet_ilerleme (kullanici_id, item_id, tamamlandi_at)
select p.kullanici_id, yeni.id, min(p.tamamlandi_at)
from public.kesfet_ilerleme p
join eski_itemler eski on eski.id = p.item_id
join yeni_itemler yeni on yeni.ad = eski.yeni_ad
group by p.kullanici_id, yeni.id
on conflict (kullanici_id, item_id) do update
set tamamlandi_at = least(public.kesfet_ilerleme.tamamlandi_at, excluded.tamamlandi_at);

delete from public.kesfet_bolumler b
using public.kesfet_kartlar k
where b.kart_id = k.id
  and k.slug = 'muhasebe-baslangic'
  and b.ad in ('Giriş', 'Temel Kavramlar', 'Kayıt Mantığı', 'Çıktılar', 'Final', 'Final Simülasyonu');

commit;
