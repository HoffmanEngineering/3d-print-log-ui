import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { isFinite } from 'lodash-es';
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

    const years = Math.floor(totalPrintTimeInSeconds / (365 * 86_400));
    let remaining = totalPrintTimeInSeconds % (365 * 86_400);
    const months = Math.floor(remaining / (30 * 86_400));
    remaining = remaining % (30 * 86_400);
    const days = Math.floor(remaining / 86_400);
    remaining = remaining % 86_400;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = Math.floor(remaining % 60);

    let durationString = '';
    if (years > 0) durationString += `${years} year(s) `;
    if (months > 0) durationString += `${months} month(s) `;
    if (days > 0) durationString += `${days} day(s) `;
    if (hours > 0) durationString += `${hours} hour(s) `;
    if (minutes > 0) durationString += `${minutes} minute(s) `;
    if (seconds > 0) durationString += `${seconds} second(s) `;
    if (durationString === '') durationString = 'No Print Time Recorded';

    this.totalPrintTime = durationString;
  }
}
