import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'humanize',
})
export class HumanizePipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    if (value === null || value === undefined) {
      return '';
    }

    const date = moment(value);
    return date.fromNow();
  }
}
