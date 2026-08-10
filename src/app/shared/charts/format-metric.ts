/**
 * Value formatting shared by the stat tiles and the panels that restate the same figures
 * (the overview highlights, the cost lists). It lives outside any one component because a
 * highlight that says "0.84 cost" next to a tile that says "$0.84" is the same number told
 * two different ways, and only one of them is readable.
 */

/** Two most significant units only: "3d 4h" beats "3d 4h 12m 6s" on a tile. */
export function formatDurationShort(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  if (seconds === 0) return '0m';

  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [
    days ? `${days}d` : null,
    hours ? `${hours}h` : null,
    minutes ? `${minutes}m` : null,
  ].filter(Boolean) as string[];

  return parts.slice(0, 2).join(' ') || '0m';
}

/**
 * The user's currency, as a symbol. Falls back to a bare 2dp figure only when the code is
 * one Intl rejects — printing "USD" as a literal prefix would be worse than no symbol.
 */
export function formatMoney(value: number, currency: string | null): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency ?? 'USD',
    }).format(value);
  } catch {
    return value.toFixed(2);
  }
}
