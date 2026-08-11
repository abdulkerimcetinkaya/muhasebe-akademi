-- Site kapanışı (11 Ağu 2026): müfredat sıfırdan kurulana kadar sitede
-- yayınlanmış eğitim içeriği ve onaylı soru bulunmayacak.
-- SİLME YOK — yalnız durum değişir; ilerleme/FK kayıtları etkilenmez.
--
-- Geri alma:
--   update public.kesfet_itemler i set yayin_durumu='yayinlandi'
--   from public.kesfet_bolumler b join public.kesfet_kartlar k on k.id=b.kart_id
--   where b.id=i.bolum_id and k.tip='kesfet' and i.yayin_durumu='incelemede';
--   update public.sorular set durum='onayli' where durum='taslak';
--   (Not: geri almadan önce o anki taslak/incelemede kümesini kontrol et.)

begin;

-- Keşfet dersleri ve alıştırmaları yayından incelemeye çek.
update public.kesfet_itemler i
set yayin_durumu='incelemede'
from public.kesfet_bolumler b
join public.kesfet_kartlar k on k.id=b.kart_id
where b.id=i.bolum_id
  and k.tip='kesfet'
  and i.yayin_durumu='yayinlandi';

-- Onaylı soruları taslağa çek (frontend eq('durum','onayli') filtreler).
update public.sorular
set durum='taslak'
where durum='onayli';

notify pgrst, 'reload schema';
commit;
