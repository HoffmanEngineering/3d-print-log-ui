import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ComponentFixture,
  discardPeriodicTasks,
  fakeAsync,
  TestBed,
  tick,
} from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { BehaviorSubject, delay, map, NEVER, of } from 'rxjs';

import { AchievementService } from '../../core/services/achievement.service';
import { LoggingService } from '../../core/services/logging.service';
import { MyAchievements } from '../../core/types/achievement';
import { TEST_CATALOG } from '../testing/achievement-fixtures';
import { MyAchievementsComponent } from './my-achievements.component';

const ME: MyAchievements = {
  earnedTierCount: 2,
  totalTierCount: 90,
  families: [
    {
      key: 'first-print',
      tiers: [
        { tier: 1, unlockedAt: '2026-10-01T00:00:00Z', retroactive: false },
      ],
      progress: null,
    },
    {
      key: 'prints-logged',
      tiers: [],
      progress: { best: 4, current: 4, nextThreshold: 10 },
    },
    {
      key: 'mcp',
      tiers: [
        { tier: 1, unlockedAt: '2026-10-02T00:00:00Z', retroactive: true },
      ],
      progress: null,
    },
  ],
  revealedHidden: [],
  nextHint: { key: 'prints-logged', tier: 1, ctaRoute: '/achievements' },
};

describe('MyAchievementsComponent', () => {
  let fixture: ComponentFixture<MyAchievementsComponent>;
  let queryParams: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let logging: jasmine.SpyObj<LoggingService>;
  let me$ = of(ME);
  let wide$: BehaviorSubject<boolean>;

  function create(): HTMLElement {
    TestBed.configureTestingModule({
      imports: [MyAchievementsComponent],
      providers: [
        {
          provide: AchievementService,
          useValue: { catalog: () => of(TEST_CATALOG), me: () => me$ },
        },
        { provide: ActivatedRoute, useValue: { queryParamMap: queryParams } },
        {
          provide: Router,
          useValue: jasmine.createSpyObj('Router', ['navigate']),
        },
        { provide: LoggingService, useValue: logging },
        {
          provide: BreakpointObserver,
          useValue: {
            observe: () =>
              wide$.pipe(map((matches) => ({ matches, breakpoints: {} }))),
          },
        },
        {
          provide: MatBottomSheet,
          useValue: {
            open: () => ({
              afterDismissed: () => NEVER,
              dismiss: () => undefined,
            }),
          },
        },
      ],
    });
    fixture = TestBed.createComponent(MyAchievementsComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    queryParams = new BehaviorSubject(convertToParamMap({}));
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    me$ = of(ME);
    wide$ = new BehaviorSubject(true);
  });

  it('shows tiers earned out of the total and the next hint', () => {
    const el = create();
    expect(el.textContent).toContain('2 / 90 tiers');
    expect(el.textContent).toContain('Next: Prolific Printer');
    expect(logging.logEvent).toHaveBeenCalledWith('AchievementsPage_Opened', {
      earnedTierCount: 2,
    });
  });

  it('deep link ?badge opens detail', () => {
    queryParams.next(convertToParamMap({ badge: 'mcp' }));
    const el = create();

    const panel = el.querySelector('aside app-achievement-detail');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('Earned before achievements existed');
    expect(logging.logEvent).toHaveBeenCalledWith('AchievementDetail_Opened', {
      key: 'mcp',
      earned: true,
    });
  });

  it('logs a detail open once, not again when the layout changes', () => {
    queryParams.next(convertToParamMap({ badge: 'mcp' }));
    create();

    wide$.next(false);
    fixture.detectChanges();
    wide$.next(true);
    fixture.detectChanges();

    const opens = logging.logEvent.calls
      .allArgs()
      .filter(([name]) => name === 'AchievementDetail_Opened');
    expect(opens.length).toBe(1);
  });

  it('skeleton deferred', fakeAsync(() => {
    me$ = of(ME).pipe(delay(1000));
    const el = create();

    tick(100);
    fixture.detectChanges();
    expect(el.querySelector('app-skeleton')).toBeNull();

    tick(150);
    fixture.detectChanges();
    expect(el.querySelector('app-skeleton')).not.toBeNull();

    tick(1000);
    fixture.detectChanges();
    expect(el.querySelector('app-skeleton')).toBeNull();
    expect(el.querySelector('app-achievement-grid')).not.toBeNull();
    discardPeriodicTasks();
  }));
});
