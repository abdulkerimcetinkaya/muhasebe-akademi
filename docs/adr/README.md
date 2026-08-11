# ADR — Architecture Decision Records

Büyük teknik kararlar bu klasörde kayıt altına alınır.

## Mevcut Kayıtlar

- [ADR-001 — İşletmeler modeli (dönem simülasyonu)](ADR-001-isletmeler-modeli.md) — Accepted
- [ADR-002 — Keşfet ile V2 öğrenme çekirdeğinin sorumluluk sınırı](ADR-002-kesfet-v2-sorumluluk-siniri.md) — Accepted
- [ADR-003 — Kanonik Temeller müfredatı ve tek doğruluk kaynağı](ADR-003-kanonik-temeller-mufredati.md) — Proposed

## Kullanım

- Her karar tek bir dosya: `ADR-XXX-kisa-baslik.md`
- Numaralar sıralı ve tekildir (ADR-001, ADR-002, …).
- Bir kez yazılan ADR silinmez; süperseded olursa yeni ADR ile referanslanır.

## Önerilen Şablon

```markdown
# ADR-XXX — Başlık

## Durum

Proposed | Accepted | Superseded

## Bağlam

## Karar

## Sonuçlar
```
