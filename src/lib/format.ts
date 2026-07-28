export const paraFormat = (n: number | string | null | undefined): string => {
  if (n === 0 || n === '' || n === null || n === undefined) return '';
  const num = typeof n === 'string' ? Number(n) : n;
  if (Number.isNaN(num)) return '';
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

// Bir Date'i YEREL saat diliminde YYYY-MM-DD anahtarına çevirir.
// toISOString() UTC verdiği için gün sınırı kayıyordu: TR'de (UTC+3) gece
// 00:00–03:00 arası "bugün" bir önceki güne yazılıyordu. Aktivite/heatmap/
// streak/günün sorusu/fiş tarihi gibi TÜM gün-anahtarları bunu kullanmalı ki
// yazma ve okuma tarafı tutarlı kalsın.
export const gunAnahtari = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const g = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${g}`;
};

export const bugununTarihi = (): string => gunAnahtari();
