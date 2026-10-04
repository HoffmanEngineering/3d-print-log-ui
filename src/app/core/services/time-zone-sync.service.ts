import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

import { UserSettingService, UserSettingType } from './user-setting.service';

/**
 * Saves the browser's time zone as the user's `General_TimeZone`, once per app session, so
 * daily and weekly streaks count local calendar days. If the API evaluates before this lands,
 * the setting change itself triggers a re-evaluation of the date badges.
 */
@Injectable({ providedIn: 'root' })
export class TimeZoneSyncService {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly settings = inject(UserSettingService);
  private done = false;
  private inFlight: Promise<void> | null = null;

  /**
   * Done once it has succeeded; a failed attempt (offline, a 5xx) leaves the next call free to
   * try again. Concurrent calls share one attempt.
   */
  syncOnce(): Promise<void> {
    if (!this.isBrowser || this.done) {
      return Promise.resolve();
    }
    this.inFlight ??= this.sync().finally(() => (this.inFlight = null));
    return this.inFlight;
  }

  private async sync(): Promise<void> {
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (!zone) return;

      const saved = await this.settings.getCurrentUsersSettingByType(
        UserSettingType.General_TimeZone
      );
      if (saved?.value !== zone) {
        await this.settings.addOrUpdateSetting(
          UserSettingType.General_TimeZone,
          zone
        );
      }
      this.done = true;
    } catch {
      // Best effort: without it, streaks count UTC days until a later attempt succeeds.
    }
  }
}
