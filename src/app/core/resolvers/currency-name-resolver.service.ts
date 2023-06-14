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
export class CurrencyNameResolverService
  
{
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Currency_Name
    );
  }
  constructor(private readonly userSettingService: UserSettingService) {}
}
