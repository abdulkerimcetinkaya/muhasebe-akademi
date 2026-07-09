# CURRENT CONTEXT

> Her çalışma sonunda güncellenir. En fazla 1 sayfa.
> Son güncelleme: 10.07.2026

## Current Phase

Foundation → Curriculum. Teknik altyapı (M1–M9) tamam; odak artık dokümantasyon, içerik ve öğrenme deneyimi.

## Current Sprint

Dokümantasyon altyapısı (Single Source of Truth) kurulumu — `docs/` yapısı, CONTEXT/ROADMAP, CUR iskeletleri, TASK sistemi.

## Completed

- M1–M9 teknik altyapı + Learning Engine (canlı)
- KUR-001 (Ticari Mal Alış Faturası) — olay + belge + cevap anahtarı + mevzuat + yetkinlik + soru; seed apply, DB testi başarılı
- Frontend dual-read loader (legacy `cozumler` + v2 `cozum_basliklari/satirlari`)
- `ilerleme_kaydet` RPC entegrasyonu (TypeScript temiz)
- PROJECT.md + CUR-001/002 (v0.2) — commit `c0d3373`

## Active Tasks

- Dokümantasyon altyapısı (bu çalışma)

## Recent Decisions

- Hedef: mükemmel mimari değil, **MVP Beta**. M10 (Olay Stüdyosu, legacy migration, 1000+ soru) → v2.1'e ertelendi.
- CUR-001 + CUR-002 değişmez temel taş; sonraki CUR'lar bunları referans alır.
- İlk Beta modülü: **Ticari İşletme**.

## Next Priority

1. KUR-001 tarayıcı smoke test (dev runtime doğrulama)
2. İlk 10 kürasyon olayı
3. 30–50 soru
4. İlerleme/dashboard ekranı
5. Beta

## Blockers

- KUR-001 smoke test: Claude Chrome uzantısı bağlı değil + uygulamaya giriş yapılmış oturum gerekiyor (RPC/XP testi için).

## Notes

- Working tree'de commit edilmemiş muavin v2 / cari frontend refaktörü + Modül 2 seed scriptleri duruyor (kapsam dışı, dokunulmadı).
