/**
 * Helpers for civil dates — calendar days with no time and no timezone, carried across the
 * wire as `YYYY-MM-DD` strings.
 *
 * Project start and finish dates are civil dates rather than instants: a public project's
 * detail page renders for anonymous visitors anywhere, and the same project must show the
 * same day to every one of them.
 */

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * `YYYY-MM-DD` -> a Date at LOCAL midnight, which is what a Material datepicker expects.
 * Returns null for anything that is not a real calendar day.
 *
 * Deliberately not `new Date('2026-08-12')`: that parses as UTC midnight, so west of UTC the
 * picker opens on the previous day.
 */
export function parseCivilDate(value: string | null | undefined): Date | null {
  if (!value) return null;

  const match = CIVIL_DATE_PATTERN.exec(value.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(year, month - 1, day);
  // The multi-argument Date constructor maps years 0–99 onto 1900–1999, so `0001-01-01`
  // would silently become 1901. DateOnly and SQL `date` both start at year 0001.
  date.setFullYear(year);

  // The constructor also rolls invalid days forward — 2026-02-30 becomes March 2 — which
  // would let a typed date be saved as a different day than the one entered. Round-tripping
  // the components is the cheapest way to reject that outright.
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/**
 * Date -> `YYYY-MM-DD`, read from LOCAL calendar components.
 *
 * Never use `toISOString()` here: east of UTC it converts local midnight to the previous UTC
 * day, silently moving every picked date back one for users in a positive offset.
 */
export function formatCivilDate(value: Date | null | undefined): string | null {
  if (!value || Number.isNaN(value.getTime())) return null;

  // Years are padded to four digits: `DateOnly` will not parse a bare `1-01-01`.
  const year = `${value.getFullYear()}`.padStart(4, '0');
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Today as a civil date in UTC, matching how the API resolves a print-less project. */
export function todayUtcCivilDate(): string {
  const now = new Date();
  const year = `${now.getUTCFullYear()}`.padStart(4, '0');
  const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${now.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
