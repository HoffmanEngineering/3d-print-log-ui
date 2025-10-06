import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { isFinite } from 'lodash-es';
import moment from 'moment';
import { PrintStatistic } from '../services/print-statistics.service';

@Component({
  selector: 'app-total-print-time',
  templateUrl: './total-print-time.component.html',
  styleUrls: ['./total-print-time.component.scss'],
  standalone: false,
})
export class TotalPrintTimeComponent implements OnChanges {
  @Input() prints: PrintStatistic[] = [];

  public totalPrintTime = '';

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.prints) {
      this.calculatePrintCount();
    }
  }

  calculatePrintCount() {
    const totalPrintTimeInSeconds = this.prints.reduce(
      (accumulatedPrintTime, print) => {
        const printTime = isFinite(print.printTimeInSeconds)
          ? +print.printTimeInSeconds
          : isFinite(print.estimatedPrintTimeInSeconds)
            ? +print.estimatedPrintTimeInSeconds
            : 0;

        return accumulatedPrintTime + printTime;
      },
      0
    );

    const duration = moment.duration(totalPrintTimeInSeconds, 'seconds');

    let durationString = '';

    if (duration.years() > 0) {
      durationString += `${duration.years()} year(s) `;
    }

    if (duration.months() > 0) {
      durationString += `${duration.months()} month(s) `;
    }

    if (duration.days() > 0) {
      durationString += `${duration.days()} day(s) `;
    }

    if (duration.hours() > 0) {
      durationString += `${duration.hours()} hour(s) `;
    }

    if (duration.minutes() > 0) {
      durationString += `${duration.minutes()} minute(s) `;
    }

    if (duration.seconds() > 0) {
      durationString += `${duration.seconds()} second(s) `;
    }

    if (durationString === '') {
      durationString = 'No Print Time Recorded';
    }

    this.totalPrintTime = durationString;
  }
}
