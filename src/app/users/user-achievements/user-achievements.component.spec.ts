import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
} from '@angular/router';
import { of } from 'rxjs';

import { TEST_CATALOG } from '../../achievements/testing/achievement-fixtures';
import { AchievementService } from '../../core/services/achievement.service';
import {
  EMPTY_PUBLIC_ACHIEVEMENTS,
  PublicAchievements,
} from '../../core/types/achievement';
import { UserAchievementsComponent } from './user-achievements.component';

describe('UserAchievementsComponent', () => {
  let fixture: ComponentFixture<UserAchievementsComponent>;
  let forUser: jasmine.Spy;

  function render(dto: PublicAchievements): HTMLElement {
    forUser = jasmine.createSpy('forUser').and.returnValue(of(dto));
    TestBed.configureTestingModule({
      imports: [UserAchievementsComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '42' })) },
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
    const el = render({
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
    });

    expect(el.querySelector('app-achievement-grid')).not.toBeNull();
    expect(
      el.querySelector('[data-key="first-print"] app-achievement-badge')!
        .classList
    ).not.toContain('locked');
    expect(el.querySelectorAll('mat-progress-bar').length).toBe(0);
  });
});
