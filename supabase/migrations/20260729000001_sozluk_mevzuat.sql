-- Sözlük terimlerine mevzuat katmanı.
--
-- Terim tıklandığında açılan panelde "Kanun ne diyor?" (maddeler, lafzıyla) +
-- "Özet/pratik" gösterilir. İçerik NotebookLM mevzuat kaynağından (VUK/TTK tam
-- metin) teyitli girilir.
--
-- Şekil: { "maddeler": [{ "kanun", "madde", "baslik", "lafiz" }], "ozet": ["..."] }
alter table public.sozluk_terimleri
  add column if not exists mevzuat jsonb not null default '{}'::jsonb;
