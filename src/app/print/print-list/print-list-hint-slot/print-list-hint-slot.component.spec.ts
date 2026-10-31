import type { Mock, MockedObject } from 'vitest';
import { provideHttpClient, withXhr } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import {
  Component,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AchievementService } from '../../../core/services/achievement.service';
import { LoggingService } from '../../../core/services/logging.service';
import { UserSettingService } from '../../../core/services/user-setting.service';
import { MyAchievements } from '../../../core/types/achievement';
import { GettingStartedChecklistComponent } from '../../../onboarding/getting-started-checklist/getting-started-checklist.component';
import { OnboardingService } from '../../../onboarding/onboarding.service';
import { NextAchievementHintComponent } from '../next-achievement-hint/next-achievement-hint.component';
import { PrintListHintSlotComponent } from './print-list-hint-slot.component';

function achievementsWith(earned: string[]): MyAchievements {
  return {
    earnedTierCount: earned.length,
    totalTierCount: 3,
    families: ['first-printer', 'first-material', 'first-print'].map((key) => ({
      key,
      tiers: earned.includes(key)
        ? [{ tier: 1, unlockedAt: '2026-10-18', retroactive: false }]
        : [],
      progress: null,
    })),
    revealedHidden: [],
    nextHint: null,
  } as unknown as MyAchievements;
}

@Component({
  selector: 'app-getting-started-checklist',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: 'checklist',
})
class StubChecklistComponent {
  readonly me = input.required<MyAchievements>();
  readonly dismissed = output<void>();
  readonly printerAdded = output<void>();
}

@Component({
  selector: 'app-next-achievement-hint',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: 'hint',
})
class StubHintComponent {
  readonly me = input<MyAchievements | undefined>(undefined);
}

/** The slot decides in plain promises, which whenStable does not track. */
const settle = () => new Promise((resolve) => setTimeout(resolve));

describe('PrintListHintSlotComponent', () => {
  let fixture: ComponentFixture<PrintListHintSlotComponent>;
  let achievements: {
    me: Mock;
    catalog: Mock;
  };
  let onboarding: MockedObject<OnboardingService>;
  let active: boolean[];

  function configure(me: () => Observable<MyAchievements>, visible: boolean) {
    achievements = {
      me: vi.fn().mockImplementation(me),
      catalog: vi.fn(),
    };
    onboarding = {
      checklistVisible: vi.fn().mockName('OnboardingService.checklistVisible'),
      dismissChecklist: vi.fn().mockName('OnboardingService.dismissChecklist'),
      checklistShowing: signal(false),
    } as unknown as MockedObject<OnboardingService>;
    onboarding.checklistVisible.mockImplementation(
      async (m) => m !== null && visible
    );
    TestBed.configureTestingModule({
      imports: [PrintListHintSlotComponent],
      providers: [
        { provide: AchievementService, useValue: achievements },
        { provide: OnboardingService, useValue: onboarding },
      ],
    });
    TestBed.overrideComponent(PrintListHintSlotComponent, {
      remove: {
        imports: [
          GettingStartedChecklistComponent,
          NextAchievementHintComponent,
        ],
      },
      add: { imports: [StubChecklistComponent, StubHintComponent] },
    });
  }

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(PrintListHintSlotComponent);
    active = [];
    fixture.componentInstance.checklistActive.subscribe((v) => active.push(v));
    fixture.detectChanges();
    await settle();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const checklist = () =>
    fixture.debugElement.query(By.directive(StubChecklistComponent));
  const hint = () =>
    fixture.debugElement.query(By.directive(StubHintComponent));

  it('shows the checklist for an eligible user without first-print', async () => {
    const me = achievementsWith(['first-printer']);
    configure(() => of(me), true);
    await render();

    expect(checklist()).toBeTruthy();
    expect(hint()).toBeNull();
    expect(checklist().componentInstance.me()).toBe(me);
    expect(active).toEqual([true]);
    expect(achievements.me).toHaveBeenCalledTimes(1);
  });

  it('shows the hint, handing it the fetched me, when the checklist is not visible', async () => {
    const me = achievementsWith(['first-print']);
    configure(() => of(me), false);
    await render();

    expect(checklist()).toBeNull();
    expect(hint()).toBeTruthy();
    expect(hint().componentInstance.me()).toBe(me);
    expect(onboarding.checklistVisible).toHaveBeenCalledWith(me);
    expect(active).toEqual([false]);
    expect(achievements.me).toHaveBeenCalledTimes(1);
  });

  it('falls back to the hint, which fetches on its own, when me() fails', async () => {
    configure(() => throwError(() => new Error('offline')), true);
    await render();

    expect(checklist()).toBeNull();
    expect(hint()).toBeTruthy();
    expect(hint().componentInstance.me()).toBeUndefined();
    expect(active).toEqual([false]);
  });

  it('renders nothing while me() is pending', async () => {
    const pending = new Subject<MyAchievements>();
    configure(() => pending, true);
    await render();

    expect(checklist()).toBeNull();
    expect(hint()).toBeNull();
    expect(active).toEqual([]);
  });

  it('reports checklistShowing to the onboarding service', async () => {
    configure(() => of(achievementsWith([])), true);
    await render();
    expect(onboarding.checklistShowing()).toBe(true);

    checklist().componentInstance.dismissed.emit();
    expect(onboarding.checklistShowing()).toBe(false);
  });

  it('leaves checklistShowing false when the hint shows', async () => {
    configure(() => of(achievementsWith([])), false);
    await render();
    expect(onboarding.checklistShowing()).toBe(false);
  });

  it('clears checklistShowing when destroyed', async () => {
    configure(() => of(achievementsWith([])), true);
    await render();
    fixture.destroy();
    expect(onboarding.checklistShowing()).toBe(false);
  });

  it('swaps to the hint when the checklist is dismissed', async () => {
    configure(() => of(achievementsWith([])), true);
    await render();

    checklist().componentInstance.dismissed.emit();
    fixture.detectChanges();

    expect(checklist()).toBeNull();
    expect(hint()).toBeTruthy();
    expect(active).toEqual([true, false]);
  });

  it('tells the list when the checklist adds a printer', async () => {
    configure(() => of(achievementsWith([])), true);
    await render();
    const added = vi.fn();
    fixture.componentInstance.printerAdded.subscribe(added);

    checklist().componentInstance.printerAdded.emit();

    expect(added).toHaveBeenCalledTimes(1);
  });

  it('re-fetches me() after a printer is added', async () => {
    const before = achievementsWith([]);
    const after = achievementsWith(['first-printer']);
    const responses = [before, after];
    configure(() => of(responses.shift()!), true);
    await render();

    checklist().componentInstance.printerAdded.emit();
    fixture.detectChanges();

    expect(achievements.me).toHaveBeenCalledTimes(2);
    expect(checklist().componentInstance.me()).toBe(after);
  });

  it('retries once after 2 s when first-printer has not appeared yet', async () => {
    vi.useFakeTimers();
    const none = achievementsWith([]);
    const granted = achievementsWith(['first-printer']);
    const responses = [none, none, granted, granted];
    configure(() => of(responses.shift()!), true);
    fixture = TestBed.createComponent(PrintListHintSlotComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);
    fixture.detectChanges();

    checklist().componentInstance.printerAdded.emit();
    expect(achievements.me).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(1999);
    expect(achievements.me).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(1);
    fixture.detectChanges();
    expect(achievements.me).toHaveBeenCalledTimes(3);
    expect(checklist().componentInstance.me()).toBe(granted);

    await vi.advanceTimersByTimeAsync(5000);
    expect(achievements.me).toHaveBeenCalledTimes(3);
  });
});

/**
 * The real OnboardingService, real hint and real checklist over a test backend: the first
 * change detection must not throw (NG0600 and friends), and an ineligible user gets the hint.
 */
describe('PrintListHintSlotComponent with the real services', () => {
  it('renders without throwing and shows the hint for an ineligible user', async () => {
    TestBed.configureTestingModule({
      imports: [PrintListHintSlotComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: LoggingService,
          useValue: {
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
            logException: vi.fn().mockName('LoggingService.logException'),
          },
        },
        {
          provide: UserSettingService,
          useValue: {
            getCurrentUsersSettingByType: async () => null,
            addOrUpdateSetting: async () => undefined,
          },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PrintListHintSlotComponent);
    const active: boolean[] = [];
    fixture.componentInstance.checklistActive.subscribe((v) => active.push(v));

    expect(() => fixture.detectChanges()).not.toThrow();

    http
      .expectOne((r) => r.url.endsWith('/achievements/me'))
      .flush(achievementsWith([]));
    await settle();
    http
      .expectOne((r) => r.url.endsWith('/onboarding'))
      .flush({
        onboardingEligible: false,
        createdDate: null,
        emailVerified: true,
      });
    await settle();
    expect(() => fixture.detectChanges()).not.toThrow();

    expect(active).toEqual([false]);
    expect(
      fixture.debugElement.query(By.directive(NextAchievementHintComponent))
    ).toBeTruthy();
    expect(
      fixture.debugElement.query(By.directive(GettingStartedChecklistComponent))
    ).toBeNull();
    // The hint reuses the slot's me(): no second /achievements/me request.
    http.match((r) => r.url.endsWith('/achievements/catalog'));
    http.expectNone((r) => r.url.endsWith('/achievements/me'));
    http.verify();
  });

  it('renders the real checklist for an eligible user without throwing', async () => {
    TestBed.configureTestingModule({
      imports: [PrintListHintSlotComponent],
      providers: [
        provideHttpClient(withXhr()),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: LoggingService,
          useValue: {
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
            logException: vi.fn().mockName('LoggingService.logException'),
          },
        },
        {
          provide: UserSettingService,
          useValue: {
            getCurrentUsersSettingByType: async () => null,
            addOrUpdateSetting: async () => undefined,
          },
        },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PrintListHintSlotComponent);

    expect(() => fixture.detectChanges()).not.toThrow();
    http
      .expectOne((r) => r.url.endsWith('/achievements/me'))
      .flush(achievementsWith(['first-printer']));
    await settle();
    http
      .expectOne((r) => r.url.endsWith('/onboarding'))
      .flush({
        onboardingEligible: true,
        createdDate: '2026-10-18T00:00:00Z',
        emailVerified: false,
      });
    await settle();
    expect(() => fixture.detectChanges()).not.toThrow();

    await settle();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain('1 of 2 done');
    // Setting 26 is unset: the card carries the inline notice, and the global banner hides.
    expect(
      el.querySelector('[data-testid="inline-email-notice"]')
    ).not.toBeNull();
    const onboarding = TestBed.inject(OnboardingService);
    expect(onboarding.checklistShowing()).toBe(true);
    expect(onboarding.noticeAcknowledged()).toBe(false);

    (
      el.querySelector(
        'button[aria-label="Dismiss getting started"]'
      ) as HTMLButtonElement
    ).click();
    expect(onboarding.noticeAcknowledged()).toBe(true);
    http.match(() => true);
    http.verify();
  });
});
