-- MuhasebeAkademi — ünite → işletme tam yeniden adlandırma (tablo + kolon)
-- FK/index/RLS/trigger Postgres rename ile otomatik takip eder; fonksiyon/view yok.
ALTER TABLE unites RENAME TO isletmeler;
ALTER TABLE unite_modulleri RENAME TO isletme_modulleri;
ALTER TABLE unite_konulari RENAME TO isletme_konulari;
ALTER TABLE isletme_modulleri RENAME COLUMN unite_id TO isletme_id;
ALTER TABLE isletme_konulari RENAME COLUMN unite_id TO isletme_id;
ALTER TABLE sorular RENAME COLUMN unite_id TO isletme_id;
ALTER TABLE sozluk_terimleri RENAME COLUMN ilgili_unite_ids TO ilgili_isletme_ids;
