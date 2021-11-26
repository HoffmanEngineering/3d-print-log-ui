import { Pipe, PipeTransform } from '@angular/core';
import * as moment from 'moment';

@Pipe({
  name: 'duration',
})
export class DurationPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    if (value === null || value === undefined || !isFinite(Number(value))) {
      return '';
    }

    const duration = moment.duration(value, 'seconds');
    let result = '';

    if (+duration.asDays().toFixed(0) > 0) {
      result += `${duration.asDays().toFixed(0)}d `;
    }

    if (duration.hours() > 0) {
      result += `${duration.hours()}h `;
    }

    if (duration.minutes() > 0) {
      result += `${duration.minutes()}m `;
    }

    if (duration.seconds() > 0) {
      result += `${duration.seconds()}s `;
    }

    if (duration.milliseconds() > 0) {
      result += `${duration.milliseconds()}ms `;
    }
    return result;
  }
}
