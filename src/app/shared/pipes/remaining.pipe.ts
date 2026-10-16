import { formatNumber } from '@angular/common';
import { inject, LOCALE_ID, Pipe, PipeTransform } from '@angular/core';

/** What a spool with no starting weight shows in place of an amount left. */
export const NOT_TRACKED = 'Not tracked';

export interface RemainingFormat {
  /** Divides the raw value first, e.g. 1000 to show milligrams as grams. */
  divisor?: number;
  /** Angular digitsInfo, as for the number pipe. Defaults to '1.0-3'. */
  digitsInfo?: string;
  /** Appended to a tracked amount only, e.g. 'g' or ' (g) remaining'. */
  unit?: string;
}

/**
 * True when the API reports an amount left. The API returns null remaining
 * (weight, length and volume) for a spool with no starting weight; zero and
 * negative amounts are real, tracked values.
 */
export function isRemainingTracked(
  value: number | null | undefined
): value is number {
  // A missing (undefined) field, e.g. from an older API, also reads as untracked.
  return value !== null && value !== undefined;
}

/**
 * Formats a remaining weight, length or volume, or says "Not tracked" when the
 * spool has no starting weight. Use this instead of the number pipe, which
 * renders null as an empty string and `null / 1000` as a misleading 0.
 */
@Pipe({ name: 'remaining' })
export class RemainingPipe implements PipeTransform {
  private readonly locale = inject(LOCALE_ID);

  transform(
    value: number | null | undefined,
    format: RemainingFormat = {}
  ): string {
    if (!isRemainingTracked(value)) {
      return NOT_TRACKED;
    }
    const { divisor = 1, digitsInfo = '1.0-3', unit = '' } = format;
    return formatNumber(value / divisor, this.locale, digitsInfo) + unit;
  }
}
