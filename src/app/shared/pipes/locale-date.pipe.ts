import { Pipe, PipeTransform } from '@angular/core';

export type LocaleDateFormat = 'date' | 'time' | 'datetime' | 'long' | 'short';

const FORMAT_OPTIONS: Record<LocaleDateFormat, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: 'medium' },
  time: { timeStyle: 'medium' },
  datetime: { dateStyle: 'medium', timeStyle: 'medium' },
  long: { dateStyle: 'long' },
  short: { dateStyle: 'short', timeStyle: 'short' },
};

@Pipe({
  name: 'localeDate',
  standalone: false,
})
export class LocaleDatePipe implements PipeTransform {
  transform(
    value: Date | string | null | undefined,
    format: LocaleDateFormat = 'date',
    locale: string = navigator.language
  ): string {
    if (value === null || value === undefined) {
      return '';
    }
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) {
      return '';
    }
    return new Intl.DateTimeFormat(locale, FORMAT_OPTIONS[format]).format(date);
  }
}
