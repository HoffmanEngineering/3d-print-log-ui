import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { UsersPrintsStatsService } from 'src/app/core/services/users-prints-stats.service';

import { StatsComponent } from './stats.component';

describe('StatsComponent', () => {
  let fixture: ComponentFixture<StatsComponent>;
  let component: StatsComponent;
  let stats: MockedObject<UsersPrintsStatsService>;

  const MIN_DATE = new Date('1910-01-01');
  const isAllTime = (from: Date) => from.getTime() === MIN_DATE.getTime();

  beforeEach(() => {
    stats = {
      getUsersPrintCount: vi
        .fn()
        .mockName('UsersPrintsStatsService.getUsersPrintCount'),
      getUsersTotalPrintTimeInSeconds: vi
        .fn()
        .mockName('UsersPrintsStatsService.getUsersTotalPrintTimeInSeconds'),
      getUsersTotalFilamentUsage: vi
        .fn()
        .mockName('UsersPrintsStatsService.getUsersTotalFilamentUsage'),
    } as unknown as MockedObject<UsersPrintsStatsService>;
    stats.getUsersPrintCount.mockImplementation((_id, from) =>
      of(isAllTime(from) ? 40 : 6)
    );
    stats.getUsersTotalPrintTimeInSeconds.mockImplementation((_id, from) =>
      of(isAllTime(from) ? 90061 : 0)
    );
    stats.getUsersTotalFilamentUsage.mockImplementation((_id, from) =>
      of(isAllTime(from) ? 12500 : null)
    );

    TestBed.configureTestingModule({
      imports: [StatsComponent],
      providers: [{ provide: UsersPrintsStatsService, useValue: stats }],
    });
    fixture = TestBed.createComponent(StatsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('userId', 7);
    fixture.detectChanges();
  });

  it('loads all-time and last-30-day print counts for the user', () => {
    expect(component.printCountTotal()).toBe(40);
    expect(component.printCountLast30Days()).toBe(6);
    expect(
      vi.mocked(stats.getUsersPrintCount).mock.calls.map((a) => a[0])
    ).toEqual([7, 7]);
  });

  it('spells out print time from years down to seconds', () => {
    expect(component.totalPrintTimeTotal()).toBe(
      '1\xa0day(s) 1\xa0hour(s) 1\xa0minute(s) 1\xa0second(s) '
    );
  });

  it('says when no print time has been recorded', () => {
    expect(component.totalPrintTimeLast30Days()).toBe('No Print Time Recorded');
  });

  it('shows filament use in grams, counting a missing total as zero', () => {
    expect(component.totalFilamentUsageInG()).toBe('12.5 (g)');
    expect(component.totalFilamentUsageLast30DaysInG()).toBe('0 (g)');
  });

  it('reloads when shown a different user', () => {
    fixture.componentRef.setInput('userId', 8);
    fixture.detectChanges();

    expect(vi.mocked(stats.getUsersPrintCount).mock.lastCall[0]).toBe(8);
  });

  it("shows another user's figures once they arrive", () => {
    const count = new Subject<number>();
    stats.getUsersPrintCount.mockReturnValue(count);
    stats.getUsersTotalPrintTimeInSeconds.mockReturnValue(new Subject());
    stats.getUsersTotalFilamentUsage.mockReturnValue(new Subject());

    fixture.componentRef.setInput('userId', 8);
    fixture.detectChanges();
    count.next(123);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('123');
  });
});
