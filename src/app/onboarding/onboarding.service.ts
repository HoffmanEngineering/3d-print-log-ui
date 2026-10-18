import { inject, Injectable } from '@angular/core';
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

  markWelcomeFinished(): Promise<void> {
    return this.writeOnce(UserSettingType.Onboarding_WelcomeFinishedAt);
  }

  acknowledgeEmailNotice(): Promise<void> {
    return this.writeOnce(UserSettingType.Email_NoticeSeenAt);
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

  /** Drops the cached status; called on logout. */
  clear(): void {
    this.statusPromise = null;
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
