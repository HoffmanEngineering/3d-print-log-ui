import {
  ChangeDetectionStrategy,
  Component,
  effect,
  input,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { UsersPrintsStatsService } from 'src/app/core/services/users-prints-stats.service';
import {
  DefaultGridColumnsDirective,
  DefaultGridRowsDirective,
  DefaultGridGapDirective,
  DefaultGridColumnDirective,
  DefaultGridRowDirective,
} from '@ngbracket/ngx-layout/grid';
import { StatPanelComponent } from '../../shared/panels/stat-panel/stat-panel.component';

@Component({
  selector: 'app-stats',
  templateUrl: './stats.component.html',
  styleUrls: ['./stats.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DefaultGridColumnsDirective,
    DefaultGridRowsDirective,
    DefaultGridGapDirective,
    StatPanelComponent,
    DefaultGridColumnDirective,
    DefaultGridRowDirective,
  ],
})
export class StatsComponent {
  private readonly userPrintsService = inject(UsersPrintsStatsService);

  readonly userId = input<number>();

  readonly printCountTotal = signal(0);
  readonly printCountLast30Days = signal(0);

  readonly totalPrintTimeTotal = signal('');
  readonly totalPrintTimeLast30Days = signal('');

  readonly totalFilamentUsageInG = signal('');
  readonly totalFilamentUsageLast30DaysInG = signal('');

  public readonly MIN_DATE = new Date('1910-01-01');

  constructor() {
    effect(() => {
      this.userId();
      // The loaders read userId() and write the stat signals; neither should
      // become a dependency of this effect.
      untracked(() => {
        this.resetStats();

        this.calculatePrintCount();
        this.calculatePrintCountLast30Days();

        this.calculateTotalPrintTime();
        this.calculateTotalPrintTimeLast30Days();

        this.calculatePrintCountTotalFilamentUsage();
        this.calculateTotalFilamentUsageLast30Days();
      });
    });
  }

  calculateTotalFilamentUsageLast30Days() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalFilamentUsage(
        this.userId(),
        new Date(new Date().setHours(0, 0, 0, 0) - 30 * 86_400_000),
        endOfToday
      )
      .subscribe((result) => {
        const totalFilamentUsage = +(result ?? 0) / 1000;
        this.totalFilamentUsageLast30DaysInG.set(`${totalFilamentUsage} (g)`);
      });
  }
  calculatePrintCountTotalFilamentUsage() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalFilamentUsage(this.userId(), this.MIN_DATE, endOfToday)
      .subscribe((result) => {
        const totalFilamentUsage = +(result ?? 0) / 1000;
        this.totalFilamentUsageInG.set(`${totalFilamentUsage} (g)`);
      });
  }
  calculateTotalPrintTimeLast30Days() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalPrintTimeInSeconds(
        this.userId(),
        new Date(new Date().setHours(0, 0, 0, 0) - 30 * 86_400_000),
        endOfToday
      )
      .subscribe((result) => {
        const durationString = this.formatTotalDuration(result);

        this.totalPrintTimeLast30Days.set(durationString);
      });
  }
  calculateTotalPrintTime() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersTotalPrintTimeInSeconds(this.userId(), this.MIN_DATE, endOfToday)
      .subscribe((result) => {
        const durationString = this.formatTotalDuration(result);

        this.totalPrintTimeTotal.set(durationString);
      });
  }
  calculatePrintCountLast30Days() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersPrintCount(
        this.userId(),
        new Date(new Date().setHours(0, 0, 0, 0) - 30 * 86_400_000),
        endOfToday
      )
      .subscribe((result) => {
        this.printCountLast30Days.set(result);
      });
  }
  resetStats() {
    this.printCountTotal.set(0);
    this.printCountLast30Days.set(0);

    this.totalPrintTimeTotal.set('');
    this.totalPrintTimeLast30Days.set('');

    this.totalFilamentUsageInG.set('');
    this.totalFilamentUsageLast30DaysInG.set('');
  }

  calculatePrintCount() {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    this.userPrintsService
      .getUsersPrintCount(this.userId(), this.MIN_DATE, endOfToday)
      .subscribe((result) => {
        this.printCountTotal.set(result);
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
