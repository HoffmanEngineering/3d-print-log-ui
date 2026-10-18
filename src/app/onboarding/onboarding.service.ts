import { inject, Injectable, signal } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { LoggingService } from '../core/services/logging.service';
import { PrinterService } from '../core/services/printer.service';
import {
  UserSettingService,
  UserSettingType,
} from '../core/services/user-setting.service';
import { MyAchievements } from '../core/types/achievement';
import {
  GETTING_STARTED_KEYS,
  INELIGIBLE_STATUS,
  OnboardingApiService,
  OnboardingStatus,
} from './onboarding-api.service';

/** How long navigation or a dialog waits on an onboarding lookup before going on without it. */
export const ONBOARDING_LOOKUP_TIMEOUT_MS = 3000;

/**
 * Decides whether a new user is shown the welcome flow and the getting-started checklist,
 * and records when they finish. Nothing here may block the app: every failed lookup reads as
 * "not eligible" and every failed write is logged and swallowed.
 */
@Injectable({
  providedIn: 'root',
})
export class OnboardingService {
  private readonly api = inject(OnboardingApiService);
  private readonly settings = inject(UserSettingService);
  private readonly printers = inject(PrinterService);
  private readonly logging = inject(LoggingService);

  private statusPromise: Promise<OnboardingStatus> | null = null;
  private readonly pendingWrites = new Map<UserSettingType, Promise<void>>();

  private readonly acknowledged = signal(false);
  /**
   * True once anything this session acknowledged the email notice, whether or not setting 26
   * was written. The global banner reads it, so it never comes back after an inline notice.
   */
  readonly noticeAcknowledged = this.acknowledged.asReadonly();

  /** Set by the print list's hint slot while the getting-started checklist is on screen. */
  readonly checklistShowing = signal(false);

  /** Set when the welcome flow ends this page load, whatever happened to setting 29. */
  private welcomeFinished = false;

  /** Cached per page load. A failed lookup is not cached, so the next call retries. */
  status(force = false): Promise<OnboardingStatus> {
    if (force || !this.statusPromise) {
      const lookup = this.fetchStatus();
      this.statusPromise = lookup;
      lookup.then((status) => {
        if (status === INELIGIBLE_STATUS && this.statusPromise === lookup) {
          this.statusPromise = null;
        }
      });
    }
    return this.statusPromise;
  }

  /** Eligible, welcome not yet finished, no printers, and heading to the print list or home. */
  async shouldShowWelcome(targetUrl: string): Promise<boolean> {
    try {
      if (this.welcomeFinished) {
        return false;
      }
      if (!OnboardingService.isWelcomeTarget(targetUrl)) {
        return false;
      }
      const status = await this.status();
      if (!status.onboardingEligible) {
        return false;
      }
      const finished = await this.settings.getCurrentUsersSettingByType(
        UserSettingType.Onboarding_WelcomeFinishedAt
      );
      if (finished) {
        return false;
      }
      const page = await lastValueFrom(
        this.printers.getCurrentUserPrinterSummaries(1, 1, '', false)
      );
      return page.paging.totalCount === 0;
    } catch {
      return false;
    }
  }

  /** A failed write (or another tab's 400) must not send the user back to /welcome. */
  markWelcomeFinished(): Promise<void> {
    this.welcomeFinished = true;
    return this.writeOnce(UserSettingType.Onboarding_WelcomeFinishedAt);
  }

  acknowledgeEmailNotice(): Promise<void> {
    this.acknowledged.set(true);
    return this.writeOnce(UserSettingType.Email_NoticeSeenAt);
  }

  /** True while setting 26 is unset and nothing acknowledged the notice. A failed lookup is false. */
  async emailNoticePending(): Promise<boolean> {
    if (this.acknowledged()) {
      return false;
    }
    try {
      const seen = await this.settings.getCurrentUsersSettingByType(
        UserSettingType.Email_NoticeSeenAt
      );
      return !seen?.value && !this.acknowledged();
    } catch {
      return false;
    }
  }

  async dismissChecklist(): Promise<void> {
    try {
      await this.settings.addOrUpdateSetting(
        UserSettingType.Onboarding_ChecklistDismissedAt,
        new Date().toISOString()
      );
    } catch (error) {
      this.logError(error);
    }
  }

  async checklistVisible(me: MyAchievements | null): Promise<boolean> {
    if (!me) {
      return false;
    }
    try {
      const status = await this.status();
      if (!status.onboardingEligible) {
        return false;
      }
      const dismissed = await this.settings.getCurrentUsersSettingByType(
        UserSettingType.Onboarding_ChecklistDismissedAt
      );
      return (
        !dismissed &&
        !OnboardingService.hasEarned(me, GETTING_STARTED_KEYS.print)
      );
    } catch {
      return false;
    }
  }

  static hasEarned(me: MyAchievements, key: string): boolean {
    const family = me.families.find((f) => f.key === key);
    return (family?.tiers.length ?? 0) > 0;
  }

  /** Drops the cached status and the session flags; called on logout. */
  clear(): void {
    this.statusPromise = null;
    this.welcomeFinished = false;
    this.acknowledged.set(false);
    this.checklistShowing.set(false);
  }

  private async fetchStatus(): Promise<OnboardingStatus> {
    try {
      return await lastValueFrom(this.api.getStatus());
    } catch {
      return INELIGIBLE_STATUS;
    }
  }

  /**
   * Writes now() to a setting only when the user is eligible and the setting is unset.
   * Concurrent calls share one write, and the setting is re-read right before writing so a
   * second tab that already wrote it wins. A failed write (including a 400 "already exists"
   * from the other tab) is logged and swallowed.
   */
  private writeOnce(type: UserSettingType): Promise<void> {
    const pending = this.pendingWrites.get(type);
    if (pending) {
      return pending;
    }
    const write = this.doWriteOnce(type).finally(() => {
      this.pendingWrites.delete(type);
    });
    this.pendingWrites.set(type, write);
    return write;
  }

  private async doWriteOnce(type: UserSettingType): Promise<void> {
    try {
      const status = await this.status();
      if (!status.onboardingEligible) {
        return;
      }
      const existing = await this.settings.getCurrentUsersSettingByType(type);
      if (existing) {
        return;
      }
      await this.settings.addOrUpdateSetting(type, new Date().toISOString());
    } catch (error) {
      this.logError(error);
    }
  }

  private logError(error: unknown): void {
    this.logging.logException(
      error instanceof Error ? error : new Error(String(error))
    );
  }

  private static isWelcomeTarget(targetUrl: string): boolean {
    const path = targetUrl.split(/[?#]/)[0];
    return path === '/prints' || path === '/';
  }
}
