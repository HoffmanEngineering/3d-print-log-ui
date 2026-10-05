import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
} from '@angular/router';
import { of } from 'rxjs';

import { TEST_CATALOG } from '../../achievements/testing/achievement-fixtures';
import { AchievementService } from '../../core/services/achievement.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  EMPTY_PUBLIC_ACHIEVEMENTS,
  PublicAchievements,
} from '../../core/types/achievement';
import { UserAchievementsComponent } from './user-achievements.component';

const EARNED: PublicAchievements = {
  earnedTierCount: 1,
  featured: [],
  families: [
    {
      key: 'first-print',
      highestTier: 1,
      tiers: [
        { tier: 1, unlockedAt: '2026-10-01T00:00:00Z', retroactive: false },
      ],
    },
  ],
  revealedHidden: [],
};

describe('UserAchievementsComponent', () => {
  let fixture: ComponentFixture<UserAchievementsComponent>;
  let forUser: jasmine.Spy;

  function render(
    dto: PublicAchievements,
    query: Record<string, string> = {}
  ): HTMLElement {
    forUser = jasmine.createSpy('forUser').and.returnValue(of(dto));
    TestBed.configureTestingModule({
      imports: [UserAchievementsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({ id: '42' })),
            queryParamMap: of(convertToParamMap(query)),
          },
        },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj('LoggingService', ['logEvent']),
        },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => of({ matches: true, breakpoints: {} }) },
        },
        {
          provide: AchievementService,
          useValue: { catalog: () => of(TEST_CATALOG), forUser },
        },
      ],
    });
    fixture = TestBed.createComponent(UserAchievementsComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders empty state on EMPTY_PUBLIC_ACHIEVEMENTS', () => {
    const el = render(EMPTY_PUBLIC_ACHIEVEMENTS);

    expect(forUser).toHaveBeenCalledWith(42);
    expect(el.querySelector('.empty')).not.toBeNull();
    expect(el.querySelector('app-achievement-grid')).toBeNull();
    expect(el.querySelector('.empty a')!.getAttribute('href')).toBe(
      '/docs/achievements'
    );
  });

  it('renders the earned grid without progress', () => {
    const el = render(EARNED);

    expect(el.querySelector('app-achievement-grid')).not.toBeNull();
    expect(
      el.querySelector('[data-key="first-print"] app-achievement-badge')!
        .classList
    ).not.toContain('locked');
    expect(el.querySelectorAll('mat-progress-bar').length).toBe(0);
  });

  it('deep link ?badge opens the side panel', () => {
    const el = render(EARNED, { badge: 'first-print' });

    const panel = el.querySelector('aside app-achievement-detail');
    expect(panel).not.toBeNull();
    expect(panel!.textContent).toContain('First Layer');
  });

  it('selecting a badge updates ?badge without scrolling the page', () => {
    const el = render(EARNED);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(
      true
    );

    (el.querySelector('[data-key="first-print"]') as HTMLButtonElement).click();

    expect(navigate).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: { badge: 'first-print' },
        replaceUrl: true,
        scroll: 'manual',
      })
    );
  });
});
