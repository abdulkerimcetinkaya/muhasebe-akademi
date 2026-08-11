-- Keşfet: 20260809000001 ile 20260809000002 arasında slug değişen 5 kartın
-- eski sürümünü öğrenci görünümünden çıkarır.
--
-- Bağlam: 000001 kartları bir slug kümesiyle kurdu; 000002 aynı konuları farklı
-- slug'larla yeniden kurdu ve eskileri kaldırmadı (additive model, TODO_KESFET
-- Faz 1 kararı). Sonuç: katalogta yan yana iki "Vergi Uygulamaları", iki
-- "Dış Ticaret", iki "Maliyet" kartı görünüyor.
--
-- Denetim (2026-08-11, canlı DB): bu 5 kartın hepsinde
--   bölüm = 0, ders = 0, kullanıcı ilerlemesi = 0, ön koşul bağı = 0
-- Yani hiçbir içerik veya kullanıcı verisi etkilenmez.
--
-- SİLMİYORUZ — proje ilkesi gereği durum='gizli' ile pasife alıyoruz.
-- Geri alma:
--   update public.kesfet_kartlar set durum='yakinda'
--   where slug in ('sirket-islemleri','maliyet-uretim','vergi-uygulamalari',
--                  'dis-ticaret','savunma-sanayii-muhasebesi');

begin;

-- Güvenlik kilidi: içerik veya ilerleme taşıyan bir kart varsa migration durur.
do $$
declare v_ihlal text;
begin
  select string_agg(k.slug, ', ') into v_ihlal
  from public.kesfet_kartlar k
  where k.slug in ('sirket-islemleri','maliyet-uretim','vergi-uygulamalari',
                   'dis-ticaret','savunma-sanayii-muhasebesi')
    and (
      exists (select 1 from public.kesfet_bolumler b where b.kart_id = k.id)
      or exists (
        select 1 from public.kesfet_kart_on_kosullari x
        where x.kart_id = k.id or x.on_kosul_kart_id = k.id
      )
    );

  if v_ihlal is not null then
    raise exception 'Gizlenecek kart boş değil, elle incele: %', v_ihlal;
  end if;
end $$;

update public.kesfet_kartlar
set durum = 'gizli'
where tip = 'kesfet'
  and slug in ('sirket-islemleri','maliyet-uretim','vergi-uygulamalari',
               'dis-ticaret','savunma-sanayii-muhasebesi');

notify pgrst, 'reload schema';

commit;
