import { PLATFORM_ID, signal, WritableSignal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { BehaviorSubject } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../../core/services/user-setting.service';
import { OnboardingService } from '../../onboarding/onboarding.service';
import { EmailNoticeComponent } from './email-notice.component';

describe('EmailNoticeComponent', () => {
  let fixture: ComponentFixture<EmailNoticeComponent>;
  let user$: BehaviorSubject<unknown>;
  let settings: jasmine.SpyObj<UserSettingService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let seenAt: string | undefined;
  let noticeAcknowledged: WritableSignal<boolean>;
  let checklistShowing: WritableSignal<boolean>;

  async function render(
    platform: 'browser' | 'server' = 'browser',
    url = '/prints'
  ): Promise<HTMLElement> {
    settings = jasmine.createSpyObj<UserSettingService>('UserSettingService', [
      'getCurrentUsersSettingByType',
      'addOrUpdateSetting',
    ]);
    settings.getCurrentUsersSettingByType.and.callFake(async (type) =>
      type === UserSettingType.Email_NoticeSeenAt && seenAt !== undefined
        ? ({ value: seenAt } as UserSetting)
        : null
    );
    settings.addOrUpdateSetting.and.returnValue(Promise.resolve());
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    await TestBed.configureTestingModule({
      imports: [EmailNoticeComponent, NoopAnimationsModule],
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: PLATFORM_ID, useValue: platform },
        { provide: AuthService, useValue: { userProfile$: user$ } },
        { provide: UserSettingService, useValue: settings },
        { provide: LoggingService, useValue: logging },
        {
          provide: OnboardingService,
          useValue: { noticeAcknowledged, checklistShowing },
        },
      ],
    }).compileComponents();
    await TestBed.inject(Router).navigateByUrl(url);
    fixture = TestBed.createComponent(EmailNoticeComponent);
    fixture.detectChanges();
    await settle();
    return fixture.nativeElement as HTMLElement;
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
  }

  function banner(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector(
      '[data-testid="email-notice"]'
    );
  }

  beforeEach(() => {
    user$ = new BehaviorSubject<unknown>({ id: 1 });
    seenAt = undefined;
    noticeAcknowledged = signal(false);
    checklistShowing = signal(false);
  });

  it('shows for a signed-in user who has not seen it', async () => {
    await render();

    expect(banner()).not.toBeNull();
    expect(banner()?.textContent).toContain(
      "We'll occasionally email you about your prints"
    );
  });

  it('stays hidden on /welcome, where the inline notice takes over', async () => {
    await render('browser', '/welcome');

    expect(banner()).toBeNull();
  });

  it('stays hidden after leaving /welcome once the welcome acknowledged the notice', async () => {
    await render('browser', '/welcome');
    // Skip setup / Done call acknowledgeEmailNotice() before navigating.
    noticeAcknowledged.set(true);
    await TestBed.inject(Router).navigateByUrl('/prints');
    await settle();

    expect(banner()).toBeNull();
  });

  it('appears when the user leaves /welcome without acknowledging (navbar link)', async () => {
    await render('browser', '/welcome');
    await TestBed.inject(Router).navigateByUrl('/printers');
    await settle();

    expect(banner()).not.toBeNull();
  });

  it('hides as soon as the notice is acknowledged inline elsewhere', async () => {
    await render();
    expect(banner()).not.toBeNull();

    noticeAcknowledged.set(true);
    fixture.detectChanges();

    expect(banner()).toBeNull();
  });

  it('stays hidden while the getting-started checklist shows', async () => {
    await render();
    checklistShowing.set(true);
    fixture.detectChanges();
    expect(banner()).toBeNull();

    checklistShowing.set(false);
    fixture.detectChanges();
    expect(banner()).not.toBeNull();
  });

  for (const url of ['/welcome?step=3', '/welcome#top', '/welcome/x']) {
    it(`treats ${url} as the welcome page`, async () => {
      await render('browser', url);
      expect(banner()).toBeNull();
    });
  }

  it('does not treat /welcomeX as the welcome page', async () => {
    await render('browser', '/welcomeX');
    expect(banner()).not.toBeNull();
  });

  it('stays hidden once seen', async () => {
    seenAt = '2026-10-01T00:00:00.000Z';
    await render();

    expect(banner()).toBeNull();
  });

  it('stays hidden when signed out', async () => {
    user$.next(null);
    await render();

    expect(banner()).toBeNull();
    expect(settings.getCurrentUsersSettingByType).not.toHaveBeenCalled();
  });

  it('stays hidden on the server', async () => {
    await render('server');

    expect(banner()).toBeNull();
    expect(settings.getCurrentUsersSettingByType).not.toHaveBeenCalled();
  });

  it('hides when the user signs out', async () => {
    await render();
    user$.next(null);
    await settle();

    expect(banner()).toBeNull();
  });

  it('"Got it" records the time and hides', async () => {
    await render();

    (
      fixture.nativeElement.querySelector(
        '[data-testid="email-notice-dismiss"]'
      ) as HTMLButtonElement
    ).click();
    await settle();

    const [type, value] = settings.addOrUpdateSetting.calls.mostRecent().args;
    expect(type).toBe(UserSettingType.Email_NoticeSeenAt);
    expect(new Date(value).toISOString()).toBe(value);
    expect(logging.logEvent).toHaveBeenCalledWith('EmailNotice_Dismissed', {
      action: 'got-it',
    });
    expect(banner()).toBeNull();
  });

  it('"Email settings" records the time and opens the email section', async () => {
    await render();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(
      true
    );

    (
      fixture.nativeElement.querySelector(
        '[data-testid="email-notice-settings"]'
      ) as HTMLButtonElement
    ).click();
    await settle();

    expect(settings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.Email_NoticeSeenAt,
      jasmine.any(String)
    );
    expect(logging.logEvent).toHaveBeenCalledWith('EmailNotice_Dismissed', {
      action: 'settings',
    });
    expect(navigate).toHaveBeenCalledWith(['/settings'], { fragment: 'email' });
    expect(banner()).toBeNull();
  });
});
