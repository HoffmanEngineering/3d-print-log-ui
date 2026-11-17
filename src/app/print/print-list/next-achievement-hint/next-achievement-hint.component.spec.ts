import type { Mock, MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Routes } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';

import { TEST_CATALOG } from '../../../achievements/testing/achievement-fixtures';
import { AchievementService } from '../../../core/services/achievement.service';
import { LoggingService } from '../../../core/services/logging.service';
import { MyAchievements } from '../../../core/types/achievement';
import { NextAchievementHintComponent } from './next-achievement-hint.component';

// These specs navigate (a link click, a save), and a route the TestBed doesn't know
// fails with an unhandled 'Cannot match any routes', which fails the run.
const ANYWHERE: Routes = [{ path: '**', children: [] }];

const ME: MyAchievements = {
  earnedTierCount: 0,
  totalTierCount: 90,
  families: [],
  revealedHidden: [],
  nextHint: { key: 'first-print', tier: 1, ctaRoute: '/prints/new/edit' },
};

describe('NextAchievementHintComponent', () => {
  let fixture: ComponentFixture<NextAchievementHintComponent>;
  let dismissHint: Mock;
  let logging: MockedObject<LoggingService>;

  function render(me$: Observable<MyAchievements>): HTMLElement {
    dismissHint = vi.fn().mockReturnValue(of(undefined));
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    } as unknown as MockedObject<LoggingService>;
    TestBed.configureTestingModule({
      imports: [NextAchievementHintComponent],
      providers: [
        provideRouter(ANYWHERE),
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

  it('uses a me passed in instead of fetching its own', () => {
    const me = vi.fn().mockReturnValue(of(ME));
    TestBed.configureTestingModule({
      imports: [NextAchievementHintComponent],
      providers: [
        provideRouter(ANYWHERE),
        {
          provide: LoggingService,
          useValue: {
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
          },
        },
        {
          provide: AchievementService,
          useValue: { me, catalog: () => of(TEST_CATALOG) },
        },
      ],
    });
    const passed = TestBed.createComponent(NextAchievementHintComponent);
    passed.componentRef.setInput('me', ME);
    passed.detectChanges();

    expect(me).not.toHaveBeenCalled();
    expect((passed.nativeElement as HTMLElement).textContent).toContain(
      'Next achievement: First Layer'
    );
  });
});
