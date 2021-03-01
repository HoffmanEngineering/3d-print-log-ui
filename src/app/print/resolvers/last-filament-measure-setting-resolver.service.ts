import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  Resolve,
  RouterStateSnapshot,
} from '@angular/router';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

@Injectable()
export class LastFilamentMeasureSettingResolverService
  implements Resolve<UserSetting | null> {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedFilamentMeasureType
    );
  }
  constructor(private readonly userSettingService: UserSettingService) {}
}
