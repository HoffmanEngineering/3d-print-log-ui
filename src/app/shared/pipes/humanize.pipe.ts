import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'humanize',
  standalone: false,
})
export class HumanizePipe implements PipeTransform {
  transform(value: unknown): unknown {
    if (value === null || value === undefined) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(String(value));
    if (isNaN(date.getTime())) {
      return '';
    }
    const diffMs = date.getTime() - Date.now();
    const absDiffSecs = Math.round(Math.abs(diffMs) / 1000);
    const absDiffMins = Math.round(absDiffSecs / 60);
    const absDiffHours = Math.round(absDiffMins / 60);
    const absDiffDays = Math.round(absDiffHours / 24);
    const absDiffMonths = Math.round(absDiffDays / 30);
    const absDiffYears = Math.round(absDiffDays / 365);

    const sign = diffMs < 0 ? -1 : 1;
    const rtf = new Intl.RelativeTimeFormat(navigator.language, {
      numeric: 'auto',
    });

    if (absDiffSecs < 45) return rtf.format(sign * absDiffSecs, 'second');
    if (absDiffSecs < 90) return rtf.format(sign * 1, 'minute');
    if (absDiffMins < 45) return rtf.format(sign * absDiffMins, 'minute');
    if (absDiffMins < 90) return rtf.format(sign * 1, 'hour');
    if (absDiffHours < 22) return rtf.format(sign * absDiffHours, 'hour');
    if (absDiffHours < 36) return rtf.format(sign * 1, 'day');
    if (absDiffDays < 26) return rtf.format(sign * absDiffDays, 'day');
    if (absDiffDays < 45) return rtf.format(sign * 1, 'month');
    if (absDiffDays < 320) return rtf.format(sign * absDiffMonths, 'month');
    if (absDiffDays < 548) return rtf.format(sign * 1, 'year');
    return rtf.format(sign * absDiffYears, 'year');
  }
}
