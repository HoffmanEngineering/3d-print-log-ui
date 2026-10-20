import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoggingService } from '../core/services/logging.service';
import { PrinterService } from '../core/services/printer.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../core/services/user-setting.service';
import { MyAchievements } from '../core/types/achievement';
import {
  INELIGIBLE_STATUS,
  OnboardingApiService,
  OnboardingStatus,
} from './onboarding-api.service';
import { OnboardingService } from './onboarding.service';

const ELIGIBLE: OnboardingStatus = {
  onboardingEligible: true,
  createdDate: '2026-10-18T00:00:00Z',
  emailVerified: false,
};

function setting(type: UserSettingType): UserSetting {
  return {
    id: 1,
    userId: 1,
    userSettingTypeId: type,
    value: '2026-10-18T00:00:00Z',
    createdDate: new Date(),
    updatedDate: new Date(),
  };
}

function achievements(earned: string[]): MyAchievements {
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

describe('OnboardingService', () => {
  let service: OnboardingService;
  let api: jasmine.SpyObj<OnboardingApiService>;
  let settings: jasmine.SpyObj<UserSettingService>;
  let printers: jasmine.SpyObj<PrinterService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let store: Map<UserSettingType, UserSetting>;

  function setPrinterCount(totalCount: number) {
    printers.getCurrentUserPrinterSummaries.and.returnValue(
      of({ paging: { totalCount } } as never)
    );
  }

  beforeEach(() => {
    store = new Map();
    api = jasmine.createSpyObj<OnboardingApiService>('OnboardingApiService', [
      'getStatus',
    ]);
    api.getStatus.and.returnValue(of(ELIGIBLE));
    settings = jasmine.createSpyObj<UserSettingService>('UserSettingService', [
      'getCurrentUsersSettingByType',
      'addOrUpdateSetting',
    ]);
    settings.getCurrentUsersSettingByType.and.callFake(
      async (type) => store.get(type) ?? null
    );
    settings.addOrUpdateSetting.and.callFake(async (type) => {
      await Promise.resolve();
      store.set(type, setting(type));
    });
    printers = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'getCurrentUserPrinterSummaries',
    ]);
    setPrinterCount(0);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
    ]);
    TestBed.configureTestingModule({
      providers: [
        { provide: OnboardingApiService, useValue: api },
        { provide: UserSettingService, useValue: settings },
        { provide: PrinterService, useValue: printers },
        { provide: LoggingService, useValue: logging },
      ],
    });
    service = TestBed.inject(OnboardingService);
  });

  describe('status', () => {
    it('caches the lookup per page load', async () => {
      await service.status();
      await service.status();
      expect(api.getStatus).toHaveBeenCalledTimes(1);
    });

    it('re-fetches when forced', async () => {
      await service.status();
      await service.status(true);
      expect(api.getStatus).toHaveBeenCalledTimes(2);
    });

    it('clear drops the cache', async () => {
      await service.status();
      service.clear();
      await service.status();
      expect(api.getStatus).toHaveBeenCalledTimes(2);
    });

    it('does not cache a failed lookup', async () => {
      api.getStatus.and.returnValue(of(INELIGIBLE_STATUS));
      expect(await service.status()).toBe(INELIGIBLE_STATUS);
      api.getStatus.and.returnValue(of(ELIGIBLE));
      expect(await service.status()).toEqual(ELIGIBLE);
    });
  });

  describe('shouldShowWelcome', () => {
    const rows: {
      eligible: boolean;
      welcomeSet: boolean;
      printers: number;
      target: string;
      expected: boolean;
    }[] = [
      {
        eligible: true,
        welcomeSet: false,
        printers: 0,
        target: '/prints',
        expected: true,
      },
      {
        eligible: true,
        welcomeSet: false,
        printers: 0,
        target: '/',
        expected: true,
      },
      {
        eligible: true,
        welcomeSet: false,
        printers: 0,
        target: '/prints?x=1',
        expected: true,
      },
      {
        eligible: true,
        welcomeSet: false,
        printers: 0,
        target: '/prints/new/cura?settingId=1',
        expected: false,
      },
      {
        eligible: true,
        welcomeSet: false,
        printers: 0,
        target: '/settings',
        expected: false,
      },
      {
        eligible: true,
        welcomeSet: false,
        printers: 1,
        target: '/prints',
        expected: false,
      },
      {
        eligible: true,
        welcomeSet: true,
        printers: 0,
        target: '/prints',
        expected: false,
      },
      {
        eligible: false,
        welcomeSet: false,
        printers: 0,
        target: '/prints',
        expected: false,
      },
    ];

    for (const row of rows) {
      it(`eligible=${row.eligible} setting29=${row.welcomeSet ? 'set' : 'unset'} printers=${row.printers} ${row.target} -> ${row.expected}`, async () => {
        api.getStatus.and.returnValue(
          of({ ...ELIGIBLE, onboardingEligible: row.eligible })
        );
        if (row.welcomeSet) {
          store.set(
            UserSettingType.Onboarding_WelcomeFinishedAt,
            setting(UserSettingType.Onboarding_WelcomeFinishedAt)
          );
        }
        setPrinterCount(row.printers);
        expect(await service.shouldShowWelcome(row.target)).toBe(row.expected);
      });
    }

    it('is false when the status lookup throws', async () => {
      api.getStatus.and.returnValue(throwError(() => new Error('boom')));
      expect(await service.shouldShowWelcome('/prints')).toBeFalse();
    });

    it('is false when the settings lookup throws', async () => {
      settings.getCurrentUsersSettingByType.and.rejectWith(new Error('boom'));
      expect(await service.shouldShowWelcome('/prints')).toBeFalse();
    });

    it('is false when the printers call errors', async () => {
      printers.getCurrentUserPrinterSummaries.and.returnValue(
        throwError(() => new Error('boom'))
      );
      expect(await service.shouldShowWelcome('/prints')).toBeFalse();
    });
  });

  describe('checklistVisible', () => {
    it('is true for an eligible user with no badges', async () => {
      expect(await service.checklistVisible(achievements([]))).toBeTrue();
    });

    it('is true when only earlier steps are earned', async () => {
      expect(
        await service.checklistVisible(
          achievements(['first-printer', 'first-material'])
        )
      ).toBeTrue();
    });

    it('is false once first-print is held', async () => {
      expect(
        await service.checklistVisible(achievements(['first-print']))
      ).toBeFalse();
    });

    it('is false when dismissed (setting 30 set)', async () => {
      store.set(
        UserSettingType.Onboarding_ChecklistDismissedAt,
        setting(UserSettingType.Onboarding_ChecklistDismissedAt)
      );
      expect(await service.checklistVisible(achievements([]))).toBeFalse();
    });

    it('is false when achievements are null', async () => {
      expect(await service.checklistVisible(null)).toBeFalse();
    });

    it('is false when ineligible', async () => {
      api.getStatus.and.returnValue(
        of({ ...ELIGIBLE, onboardingEligible: false })
      );
      expect(await service.checklistVisible(achievements([]))).toBeFalse();
    });

    it('is false when the status call fails with a 404-style fallback', async () => {
      api.getStatus.and.returnValue(of(INELIGIBLE_STATUS));
      expect(await service.checklistVisible(achievements([]))).toBeFalse();
    });
  });

  describe('dismissChecklist', () => {
    it('writes setting 30', async () => {
      await service.dismissChecklist();
      expect(settings.addOrUpdateSetting).toHaveBeenCalledOnceWith(
        UserSettingType.Onboarding_ChecklistDismissedAt,
        jasmine.any(String)
      );
    });

    it('logs and swallows a failed write', async () => {
      settings.addOrUpdateSetting.and.rejectWith(new Error('boom'));
      await service.dismissChecklist();
      expect(logging.logException).toHaveBeenCalledTimes(1);
    });
  });

  const writers: [string, UserSettingType, () => Promise<void>][] = [
    [
      'markWelcomeFinished',
      UserSettingType.Onboarding_WelcomeFinishedAt,
      () => service.markWelcomeFinished(),
    ],
    [
      'acknowledgeEmailNotice',
      UserSettingType.Email_NoticeSeenAt,
      () => service.acknowledgeEmailNotice(),
    ],
  ];

  for (const [name, type, run] of writers) {
    describe(name, () => {
      it('writes the setting once', async () => {
        await run();
        expect(settings.addOrUpdateSetting).toHaveBeenCalledOnceWith(
          type,
          jasmine.any(String)
        );
      });

      it('writes an ISO timestamp', async () => {
        await run();
        const value = settings.addOrUpdateSetting.calls.mostRecent().args[1];
        expect(new Date(value).toISOString()).toBe(value);
      });

      it('does not write when already set', async () => {
        store.set(type, setting(type));
        await run();
        expect(settings.addOrUpdateSetting).not.toHaveBeenCalled();
      });

      it('does not write when ineligible', async () => {
        api.getStatus.and.returnValue(
          of({ ...ELIGIBLE, onboardingEligible: false })
        );
        await run();
        expect(settings.addOrUpdateSetting).not.toHaveBeenCalled();
      });

      it('does not throw when the write fails, and logs it', async () => {
        settings.addOrUpdateSetting.and.rejectWith(new Error('400 exists'));
        await expectAsync(run()).toBeResolved();
        expect(logging.logException).toHaveBeenCalledTimes(1);
      });

      it('writes at most once for two concurrent calls', async () => {
        await Promise.all([run(), run()]);
        expect(settings.addOrUpdateSetting).toHaveBeenCalledTimes(1);
      });

      it('skips the write when another tab set it after the first read', async () => {
        await service.status();
        store.set(type, setting(type));
        await run();
        expect(settings.addOrUpdateSetting).not.toHaveBeenCalled();
      });
    });
  }

  describe('session flags', () => {
    it('noticeAcknowledged turns true as soon as acknowledgeEmailNotice is called', () => {
      expect(service.noticeAcknowledged()).toBeFalse();
      void service.acknowledgeEmailNotice();
      expect(service.noticeAcknowledged()).toBeTrue();
    });

    it('noticeAcknowledged stays true when the write fails', async () => {
      settings.addOrUpdateSetting.and.rejectWith(new Error('500'));
      await service.acknowledgeEmailNotice();
      expect(service.noticeAcknowledged()).toBeTrue();
    });

    it('noticeAcknowledged is true even for an ineligible user, whose write is skipped', async () => {
      api.getStatus.and.returnValue(
        of({ ...ELIGIBLE, onboardingEligible: false })
      );
      await service.acknowledgeEmailNotice();
      expect(service.noticeAcknowledged()).toBeTrue();
    });

    it('shouldShowWelcome is false after markWelcomeFinished, even when the write fails', async () => {
      settings.addOrUpdateSetting.and.rejectWith(new Error('500'));
      await service.markWelcomeFinished();
      expect(
        store.has(UserSettingType.Onboarding_WelcomeFinishedAt)
      ).toBeFalse();
      expect(await service.shouldShowWelcome('/prints')).toBeFalse();
    });

    it('shouldShowWelcome is false while the finish write is still pending', async () => {
      settings.addOrUpdateSetting.and.returnValue(new Promise(() => {}));
      void service.markWelcomeFinished();
      expect(await service.shouldShowWelcome('/prints')).toBeFalse();
      expect(printers.getCurrentUserPrinterSummaries).not.toHaveBeenCalled();
    });

    it('checklistShowing starts false and is writable by the slot', () => {
      expect(service.checklistShowing()).toBeFalse();
      service.checklistShowing.set(true);
      expect(service.checklistShowing()).toBeTrue();
    });

    it('clear resets the session flags', async () => {
      await service.acknowledgeEmailNotice();
      await service.markWelcomeFinished();
      service.checklistShowing.set(true);
      service.clear();
      store.clear();
      expect(service.noticeAcknowledged()).toBeFalse();
      expect(service.checklistShowing()).toBeFalse();
      expect(await service.shouldShowWelcome('/prints')).toBeTrue();
    });
  });

  describe('emailNoticePending', () => {
    it('is true when setting 26 is unset and nothing acknowledged it', async () => {
      expect(await service.emailNoticePending()).toBeTrue();
    });

    it('is false once setting 26 is set', async () => {
      store.set(
        UserSettingType.Email_NoticeSeenAt,
        setting(UserSettingType.Email_NoticeSeenAt)
      );
      expect(await service.emailNoticePending()).toBeFalse();
    });

    it('is false after an acknowledgment this session', async () => {
      settings.addOrUpdateSetting.and.rejectWith(new Error('500'));
      await service.acknowledgeEmailNotice();
      expect(await service.emailNoticePending()).toBeFalse();
    });

    it('is false when the lookup fails', async () => {
      settings.getCurrentUsersSettingByType.and.rejectWith(new Error('boom'));
      expect(await service.emailNoticePending()).toBeFalse();
    });
  });

  describe('hasEarned', () => {
    it('is true only for a family with tiers', () => {
      const me = achievements(['first-printer']);
      expect(OnboardingService.hasEarned(me, 'first-printer')).toBeTrue();
      expect(OnboardingService.hasEarned(me, 'first-print')).toBeFalse();
      expect(OnboardingService.hasEarned(me, 'missing')).toBeFalse();
    });
  });
});
