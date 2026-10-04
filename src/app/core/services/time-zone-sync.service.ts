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
  private started = false;

  async syncOnce(): Promise<void> {
    if (!this.isBrowser || this.started) {
      return;
    }
    this.started = true;

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
    } catch {
      // Best effort: without it, streaks count UTC days until the next session.
    }
  }
}
