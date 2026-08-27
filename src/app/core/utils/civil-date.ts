/**
 * Helpers for civil dates — calendar days with no time and no timezone, carried across the
 * wire as `YYYY-MM-DD` strings.
 *
 * Project start and finish dates are civil dates rather than instants: a public project's
 * detail page renders for anonymous visitors anywhere, and the same project must show the
 * same day to every one of them.
 */

/**
 * `YYYY-MM-DD` -> a Date at LOCAL midnight, which is what a Material datepicker expects.
 *
 * Deliberately not `new Date('2026-08-12')`: that parses as UTC midnight, so west of UTC the
 * picker opens on the previous day.
 */
export function parseCivilDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

/**
 * Date -> `YYYY-MM-DD`, read from LOCAL calendar components.
 *
 * Never use `toISOString()` here: east of UTC it converts local midnight to the previous UTC
 * day, silently moving every picked date back one for users in a positive offset.
 */
export function formatCivilDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, '0');
  const day = `${value.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}
