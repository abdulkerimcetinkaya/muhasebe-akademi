-- Legacy soru bankasını Beta kullanıcılarından gizle.
-- ÖNEMLİ: Silme YOK. Sadece durum 'onayli' -> 'arsiv'. Veriler ve kullanıcı
-- geçmişi korunur; RLS (durum='onayli') sayesinde arşiv sorular listede de,
-- doğrudan URL ile de kullanıcıya sunulmaz.
--
-- Ayırt edici ölçüt: v2 cevap anahtarı (cozum_basliklari) olan sorular curriculum
-- KUR içeriğidir ve onayli kalır. Yalnızca eski `cozumler` yapısına dayanan
-- sorular legacy'dir ve arşivlenir.
--
-- KUR-001 (soru-mal-alis-veresiye-001) v2 cevap anahtarlıdır; ayrıca id ile
-- açıkça hariç tutulur -> her koşulda onayli kalır.
--
-- Idempotent: koşul yalnızca hâlâ 'onayli' olan legacy soruları hedefler.
-- Tekrar çalıştırıldığında 0 satır etkilenir. Şema değişikliği yoktur.

update public.sorular s
set durum = 'arsiv'
where s.durum = 'onayli'
  and s.id <> 'soru-mal-alis-veresiye-001'
  and not exists (
    select 1 from public.cozum_basliklari b where b.olay_id = s.olay_id
  );

-- ---------------------------------------------------------------------------
-- GERİ DÖNÜŞ (rollback) — gerekirse elle çalıştır:
--
--   update public.sorular s
--   set durum = 'onayli'
--   where s.durum = 'arsiv'
--     and not exists (
--       select 1 from public.cozum_basliklari b where b.olay_id = s.olay_id
--     );
--
-- Not: Geri dönüş yalnızca bu migration'ın arşivlediği legacy soruları etkiler
-- (v2 anahtarsız + arsiv). Başka amaçla arşivlenmiş sorular varsa koşulu daralt.
-- ---------------------------------------------------------------------------
