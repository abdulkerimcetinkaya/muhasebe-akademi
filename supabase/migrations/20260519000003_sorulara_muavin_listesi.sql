-- Soruya özel muavin sözlüğü
--
-- Anlamsal değişim:
--   - Her soru kendi muavin tanımlarını taşır (örn: 100.001 Merkez Kasa).
--   - Global muavin_hesaplar tablosu kalabalıklaşmaz; her atölye/soru
--     bağımsız çalışır.
--   - HesapKoduInput dropdown'ında global muavinler ile birleştirilerek
--     gösterilir; çözüm doğrulama (kontrol.ts) hem global hem soruya özel
--     muavinleri kabul eder.
--
-- Format: [{"kod":"100.001","ad":"Merkez Kasa"}, ...]

alter table public.sorular
  add column if not exists muavinler jsonb not null default '[]'::jsonb;

-- cozumler.kod artık serbest text — ne hesap_plani'ne ne muavin_hesaplar'a FK.
-- Doğrulama uygulama katmanında (kontrol.ts):
--   kod ya HESAP_PLANI'nda ya da sorunun kendi muavinler listesinde olmalı.
alter table public.cozumler
  drop constraint if exists cozumler_kod_fkey;
