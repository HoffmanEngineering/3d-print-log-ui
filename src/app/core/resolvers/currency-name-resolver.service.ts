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
export class CurrencyNameResolverService
  implements Resolve<UserSetting | null>
{
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Currency_Name
    );
  }
  constructor(private readonly userSettingService: UserSettingService) {}
}
