import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { TEST_CATALOG } from '../../../achievements/testing/achievement-fixtures';
import { AchievementService } from '../../../core/services/achievement.service';
import { LoggingService } from '../../../core/services/logging.service';
import { MyAchievements } from '../../../core/types/achievement';
import { NextAchievementHintComponent } from './next-achievement-hint.component';

const ME: MyAchievements = {
  earnedTierCount: 0,
  totalTierCount: 90,
  families: [],
  revealedHidden: [],
  nextHint: { key: 'first-print', tier: 1, ctaRoute: '/prints/new/edit' },
};

describe('NextAchievementHintComponent', () => {
  let fixture: ComponentFixture<NextAchievementHintComponent>;
  let dismissHint: jasmine.Spy;
  let logging: jasmine.SpyObj<LoggingService>;

  function render(me$: Observable<MyAchievements>): HTMLElement {
    dismissHint = jasmine
      .createSpy('dismissHint')
      .and.returnValue(of(undefined));
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    TestBed.configureTestingModule({
      imports: [NextAchievementHintComponent],
      providers: [
        provideRouter([]),
        { provide: LoggingService, useValue: logging },
        {
          provide: AchievementService,
          useValue: {
            me: () => me$,
            catalog: () => of(TEST_CATALOG),
            dismissHint,
          },
        },
      ],
    });
    fixture = TestBed.createComponent(NextAchievementHintComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('renders nothing when nextHint null', () => {
    const el = render(of({ ...ME, nextHint: null }));
    expect(el.children.length).toBe(0);
  });

  it('renders nothing on error', () => {
    const el = render(throwError(() => new Error('offline')));
    expect(el.children.length).toBe(0);
  });

  it('shows the next badge and its description', () => {
    const el = render(of(ME));
    expect(el.textContent).toContain('Next achievement: First Layer');
    expect(el.textContent).toContain('Do 1');
  });

  it('dismiss hides and calls API', () => {
    const el = render(of(ME));

    (el.querySelector('button.dismiss') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(dismissHint).toHaveBeenCalledWith('first-print', 1);
    expect(el.querySelector('.hint')).toBeNull();
    expect(logging.logEvent).toHaveBeenCalledWith('AchievementHint_Dismissed', {
      key: 'first-print',
      tier: 1,
    });
  });

  it('cta routes to ctaRoute', () => {
    const el = render(of(ME));

    const cta = el.querySelector('a.cta') as HTMLAnchorElement;
    expect(cta.getAttribute('href')).toBe('/prints/new/edit');
    cta.click();
    expect(logging.logEvent).toHaveBeenCalledWith('AchievementHint_Clicked', {
      key: 'first-print',
      tier: 1,
    });
  });
});
