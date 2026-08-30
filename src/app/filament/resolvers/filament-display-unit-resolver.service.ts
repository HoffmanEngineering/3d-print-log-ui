import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

/**
 * The preferred filament display unit, for routes that only want it to format a
 * number and must not fail without it.
 *
 * Deliberately separate from PreferredFilamentDisplayUnitSettingResolverService.
 * That one is used by the settings page, where `null` carries meaning — it is how
 * the page knows to CREATE the setting rather than update it. Degrading a failed
 * fetch to `null` there would make the settings page try to add a setting that
 * already exists. Here `null` only means "fall back to the default unit", so
 * swallowing the failure is safe, and it keeps a settings outage from cancelling
 * navigation to a page that has nothing to do with settings (#66).
 */
@Injectable({
  providedIn: 'root',
})
export class FilamentDisplayUnitResolverService {
  private readonly userSettingService = inject(UserSettingService);

  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<UserSetting | null> {
    return this.userSettingService
      .getCurrentUsersSettingByType(
        UserSettingType.Prints_PreferredFilamentDisplayUnit
      )
      .catch(() => null);
  }
}
