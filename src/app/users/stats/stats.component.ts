import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import * as moment from 'moment';
import { UsersPrintsStatsService } from 'src/app/core/services/users-prints-stats.service';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
})
export class StatsComponent implements OnChanges {
  @Input() userId: number;

  public printCountTotal = 0;
  public printCountLast30Days = 0;

  public totalPrintTimeTotal = '';
  public totalPrintTimeLast30Days = '';

  public totalFilamentUsageInG = '';
  public totalFilamentUsageLast30DaysInG = '';

  public readonly MIN_DATE = new Date('1910-01-01');

  constructor(private readonly userPrintsService: UsersPrintsStatsService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.userId) {
      this.resetStats();

      this.calculatePrintCount();
      this.calculatePrintCountLast30Days();

      this.calculateTotalPrintTime();
      this.calculateTotalPrintTimeLast30Days();

      this.calculatePrintCountTotalFilamentUsage();
      this.calculateTotalFilamentUsageLast30Days();
    }
  }
  calculateTotalFilamentUsageLast30Days() {
    this.userPrintsService
      .getUsersTotalFilamentUsage(
        this.userId,
        moment().subtract(30, 'days').toDate(),
        moment().toDate()
      )
      .subscribe((result) => {
        const totalFilamentUsage = +(result ?? 0) / 1000;
        this.totalFilamentUsageLast30DaysInG = `${totalFilamentUsage} (g)`;
      });
  }
  calculatePrintCountTotalFilamentUsage() {
    this.userPrintsService
      .getUsersTotalFilamentUsage(this.userId, this.MIN_DATE, moment().toDate())
      .subscribe((result) => {
        const totalFilamentUsage = +(result ?? 0) / 1000;
        this.totalFilamentUsageInG = `${totalFilamentUsage} (g)`;
      });
  }
  calculateTotalPrintTimeLast30Days() {
    this.userPrintsService
      .getUsersTotalPrintTimeInSeconds(
        this.userId,
        moment().subtract(30, 'days').toDate(),
        moment().toDate()
      )
      .subscribe((result) => {
        const duration = moment.duration(result, 'seconds');

        const durationString = this.getTotalDurationString(duration);

        this.totalPrintTimeLast30Days = durationString;
      });
  }
  calculateTotalPrintTime() {
    this.userPrintsService
      .getUsersTotalPrintTimeInSeconds(
        this.userId,
        this.MIN_DATE,
        moment().toDate()
      )
      .subscribe((result) => {
        const duration = moment.duration(result, 'seconds');

        const durationString = this.getTotalDurationString(duration);

        this.totalPrintTimeTotal = durationString;
      });
  }
  calculatePrintCountLast30Days() {
    this.userPrintsService
      .getUsersPrintCount(
        this.userId,
        moment().subtract(30, 'days').toDate(),
        moment().toDate()
      )
      .subscribe((result) => {
        this.printCountLast30Days = result;
      });
  }
  resetStats() {
    this.printCountTotal = 0;
    this.printCountLast30Days = 0;

    this.totalPrintTimeTotal = '';
    this.totalPrintTimeLast30Days = '';

    this.totalFilamentUsageInG = '';
    this.totalFilamentUsageLast30DaysInG = '';
  }

  calculatePrintCount() {
    this.userPrintsService
      .getUsersPrintCount(this.userId, this.MIN_DATE, moment().toDate())
      .subscribe((result) => {
        this.printCountTotal = result;
      });
  }

  private getTotalDurationString(duration: moment.Duration) {
    let durationString = '';
    if (duration.years() > 0) {
      durationString += `${duration.years()}\xa0year(s) `;
    }
    if (duration.months() > 0) {
      durationString += `${duration.months()}\xa0month(s) `;
    }
    if (duration.days() > 0) {
      durationString += `${duration.days()}\xa0day(s) `;
    }
    if (duration.hours() > 0) {
      durationString += `${duration.hours()}\xa0hour(s) `;
    }
    if (duration.minutes() > 0) {
      durationString += `${duration.minutes()}\xa0minute(s) `;
    }
    if (duration.seconds() > 0) {
      durationString += `${duration.seconds()}\xa0second(s) `;
    }
    if (durationString === '') {
      durationString = 'No Print Time Recorded';
    }
    return durationString;
  }
}
