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

@Injectable({
  providedIn: 'root',
})
export class DefaultFilamentPriceSettingResolverService
  implements Resolve<UserSetting | null>
{
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Filaments_DefaultPrice
    );
  }
  constructor(private readonly userSettingService: UserSettingService) {}
}
