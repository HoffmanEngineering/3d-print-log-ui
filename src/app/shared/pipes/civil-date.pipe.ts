import { Pipe, PipeTransform } from '@angular/core';
import { parseCivilDate } from 'src/app/core/utils/civil-date';

/**
 * Renders a `YYYY-MM-DD` civil date as e.g. "Aug 12, 2026".
 *
 * Deliberately NOT `LocaleDatePipe`: that pipe formats an instant in the viewer's timezone,
 * which is exactly the conversion a civil date must not undergo. Passing `'2026-08-12'` to it
 * parses as UTC midnight and renders as Aug 11 for every viewer west of UTC.
 */
@Pipe({
  name: 'civilDate',
})
export class CivilDatePipe implements PipeTransform {
  transform(
    value: string | null | undefined,
    locale: string = navigator.language,
    fallback: string = '—'
  ): string {
    const date = parseCivilDate(value);
    if (!date) {
      return fallback;
    }
    return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
      date
    );
  }
}
