import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

@Injectable({
  providedIn: 'root',
})
export class PreferredFilamentDisplayUnitSettingResolverService {
  constructor(private readonly userSettingService: UserSettingService) {}

  // Must never reject: a rejected resolver cancels navigation and bounces to /
  // (#66), so without this a failed settings fetch would block the material
  // detail page, which only wants the setting to format a number. Every
  // consumer already treats the result as nullable.
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
