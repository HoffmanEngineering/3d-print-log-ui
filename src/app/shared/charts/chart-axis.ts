export type TickGranularity = 'Day' | 'Week' | 'Month';

/**
 * Tick count derived from measured width. Roughly one tick per 110px keeps labels from
 * colliding without rotating them — rotated axis labels are the usual reason a chart
 * becomes unreadable on a phone.
 */
export function tickCountForWidth(widthPx: number): number {
  if (!Number.isFinite(widthPx) || widthPx <= 0) return 2;
  return Math.max(2, Math.floor(widthPx / 110));
}

/** Compact form ("7/3") is used when the axis is narrow; the full form when there is room. */
export function formatTickDate(
  date: Date,
  granularity: TickGranularity,
  compact: boolean
): string {
  switch (granularity) {
    case 'Month':
      return date.toLocaleDateString(
        undefined,
        compact ? { month: 'short' } : { month: 'short', year: 'numeric' }
      );
    case 'Week':
    case 'Day':
    default:
      return compact
        ? `${date.getMonth() + 1}/${date.getDate()}`
        : date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          });
  }
}
