-- Keşfet müfredatı sıfırlama (ADR-005 · 11 Ağu 2026)
-- Ürün sahibi kararı: eski Keşfet ağacı GERÇEKTEN silinir (gizleme değil),
-- yerine yeni 31 kartlık mimari kurulur (20260811000007).
--
-- Yedek: docs/backups/kesfet-yedek-2026-08-11.json (yapı + ilerleme + ön koşul)
--        docs/backups/kesfet-yazili-dersler-2026-08-11.json (2 dersin tam metni)
--
-- Kapsam YALNIZ Keşfet. Dokunulmayanlar: sorular, muhasebe_olaylari,
-- isletmeler / isletme_modulleri / modul_alt_basliklari, yetkinlikler.
--
-- FK sırası kritik: kesfet_kart_on_kosullari.on_kosul_kart_id RESTRICT olduğu
-- için önce ön koşul satırları silinmeli; gerisi CASCADE ile gider
-- (kart → bölüm → item → ilerleme + item_sorulari).

begin;

-- 1) RESTRICT'i aç
delete from public.kesfet_kart_on_kosullari;

-- 2) Kartları sil → bölüm/item/ilerleme/item_sorulari CASCADE ile temizlenir.
--    tip='kesfet' güvenlik kemeri: İşletmeler kartı (tip='isletme') ileride
--    eklenirse bu migration ona dokunmaz.
delete from public.kesfet_kartlar where tip = 'kesfet';

notify pgrst, 'reload schema';
commit;
