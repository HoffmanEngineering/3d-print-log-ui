import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { UsersPrintsStatsService } from 'src/app/core/services/users-prints-stats.service';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  standalone: false,
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
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalFilamentUsage(
        this.userId,
        new Date(new Date().setHours(0, 0, 0, 0) - 30 * 86_400_000),
        endOfToday
      )
      .subscribe((result) => {
        const totalFilamentUsage = +(result ?? 0) / 1000;
        this.totalFilamentUsageLast30DaysInG = `${totalFilamentUsage} (g)`;
      });
  }
  calculatePrintCountTotalFilamentUsage() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalFilamentUsage(this.userId, this.MIN_DATE, endOfToday)
      .subscribe((result) => {
        const totalFilamentUsage = +(result ?? 0) / 1000;
        this.totalFilamentUsageInG = `${totalFilamentUsage} (g)`;
      });
  }
  calculateTotalPrintTimeLast30Days() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalPrintTimeInSeconds(
        this.userId,
        new Date(new Date().setHours(0, 0, 0, 0) - 30 * 86_400_000),
        endOfToday
      )
      .subscribe((result) => {
        const durationString = this.formatTotalDuration(result);

        this.totalPrintTimeLast30Days = durationString;
      });
  }
  calculateTotalPrintTime() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalPrintTimeInSeconds(this.userId, this.MIN_DATE, endOfToday)
      .subscribe((result) => {
        const durationString = this.formatTotalDuration(result);

        this.totalPrintTimeTotal = durationString;
      });
  }
  calculatePrintCountLast30Days() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersPrintCount(
        this.userId,
        new Date(new Date().setHours(0, 0, 0, 0) - 30 * 86_400_000),
        endOfToday
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
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersPrintCount(this.userId, this.MIN_DATE, endOfToday)
      .subscribe((result) => {
        this.printCountTotal = result;
      });
  }

  private formatTotalDuration(totalSeconds: number): string {
    const years = Math.floor(totalSeconds / (365 * 86_400));
    let remaining = totalSeconds % (365 * 86_400);
    const months = Math.floor(remaining / (30 * 86_400));
    remaining = remaining % (30 * 86_400);
    const days = Math.floor(remaining / 86_400);
    remaining = remaining % 86_400;
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = Math.floor(remaining % 60);

    let result = '';
    if (years > 0) result += `${years}\xa0year(s) `;
    if (months > 0) result += `${months}\xa0month(s) `;
    if (days > 0) result += `${days}\xa0day(s) `;
    if (hours > 0) result += `${hours}\xa0hour(s) `;
    if (minutes > 0) result += `${minutes}\xa0minute(s) `;
    if (seconds > 0) result += `${seconds}\xa0second(s) `;
    if (result === '') result = 'No Print Time Recorded';
    return result;
  }
}
