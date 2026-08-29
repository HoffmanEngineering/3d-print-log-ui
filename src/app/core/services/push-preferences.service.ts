import { inject, Injectable } from '@angular/core';
import { UserSettingService, UserSettingType } from './user-setting.service';

/** The setting types that govern push delivery. */
export type PushNotificationType =
  | UserSettingType.Push_PrintCompleted
  | UserSettingType.Push_PrintFailed;

const DISABLED = 'false';
const ENABLED = 'true';

/**
 * Reads and writes push preferences through the existing cached user-settings store.
 *
 * Deliberately one purpose-built service rather than a route resolver per setting: the
 * resolver-per-setting pattern used elsewhere in settings scales badly at one resolver per
 * pushable notification type.
 */
@Injectable({ providedIn: 'root' })
export class PushPreferencesService {
  private readonly userSettings = inject(UserSettingService);

  /**
   * Absence, emptiness, and anything unrecognised mean enabled — matching the API's
   * PushPreference.IsEnabled exactly. If these two drift, a user's opt-out stops working.
   */
  async isEnabled(type: PushNotificationType): Promise<boolean> {
    const setting = await this.userSettings.getCurrentUsersSettingByType(type);
    return setting?.value?.trim().toLowerCase() !== DISABLED;
  }

  async setEnabled(
    type: PushNotificationType,
    enabled: boolean
  ): Promise<void> {
    await this.userSettings.addOrUpdateSetting(
      type,
      enabled ? ENABLED : DISABLED
    );
  }
}
