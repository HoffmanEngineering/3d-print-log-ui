export type TickGranularity = 'Day' | 'Week' | 'Month';

/**
 * Parses a bucket's local start into a LOCAL Date.
 *
 * The API sends DateOnly, which serializes as "2026-07-01". `new Date("2026-07-01")` is
 * specified to parse a date-only form as UTC midnight, so every getMonth()/getDate() west of
 * UTC reads the PREVIOUS day — a bucket the server labeled 1 July renders as 6/30 in Chicago.
 * Splitting the parts and building a local date keeps the civil date the server computed.
 *
 * Values carrying a time component are left to the normal parser, which is already correct
 * for them.
 */
export function parseLocalDate(value: string): Date {
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateOnly) return new Date(value);

  return new Date(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
}

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
