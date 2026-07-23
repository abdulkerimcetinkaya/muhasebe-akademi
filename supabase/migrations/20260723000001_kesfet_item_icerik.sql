-- =====================================================================
-- Keşfet item içeriği: kesfet_itemler'e BlockNote içerik alanı
-- =====================================================================
-- Karar: içerik eski unite_modulleri/modul_alt_basliklari sisteminden
-- Keşfet'e taşınır, eski sistem emekli edilir. İlk adım — item'ın
-- kendi içeriğini tutacağı alan. Renderer (IcerikGoruntuleyici) ve
-- editör (IcerikEditor) birebir yeniden kullanılır.
--
-- ADDITIVE — yalnızca iki yeni kolon; mevcut veriye DOKUNMAZ.
-- Idempotent: add column if not exists. Geri alınabilir (drop column).
-- =====================================================================

begin;

alter table public.kesfet_itemler
  add column if not exists icerik jsonb,
  add column if not exists icerik_guncellendi timestamptz;

commit;

notify pgrst, 'reload schema';
