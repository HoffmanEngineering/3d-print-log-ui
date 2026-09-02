import { Injectable } from '@angular/core';
import { NativeDateAdapter } from '@angular/material/core';
import { parseCivilDate } from 'src/app/core/utils/civil-date';

/** Matches anything the user clearly INTENDED as a civil date, valid or not. */
const CIVIL_SHAPED = /^\d{4}-\d{1,2}-\d{1,2}$/;

/**
 * A `NativeDateAdapter` that reads a typed `YYYY-MM-DD` as a LOCAL calendar day.
 *
 * `NativeDateAdapter.parse` delegates to `Date.parse`, and per the ECMAScript spec a bare
 * date-only ISO string is interpreted as UTC midnight. So a user typing `2026-02-01` into a
 * datepicker in New York produces a Date whose local components are January 31 — and the
 * form then serializes those local components and saves the wrong day. Picking from the
 * calendar popup is unaffected, which is exactly why the bug is easy to miss.
 *
 * Anything that is not a bare civil date falls through to the base adapter, so locale
 * formats like `2/1/2026` keep working.
 */
@Injectable()
export class CivilDateAdapter extends NativeDateAdapter {
  override parse(value: unknown, parseFormat?: unknown): Date | null {
    if (typeof value === 'string') {
      const trimmed = value.trim();

      const civil = parseCivilDate(trimmed);
      if (civil) {
        return civil;
      }

      // Shaped like a civil date but not a real day (2026-02-30, 2026-13-01). Returning an
      // INVALID date makes the control show as invalid. Falling through to the base adapter
      // instead would quietly roll it forward to March 2 — the same silent day-substitution
      // this adapter exists to stop, just by a different route.
      if (CIVIL_SHAPED.test(trimmed)) {
        return new Date(NaN);
      }
    }

    return super.parse(value, parseFormat);
  }
}
