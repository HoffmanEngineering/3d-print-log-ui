import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

@Injectable()
export class LastSelectedPrinterSettingResolverService
  
{
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedPrinterId
    );
  }
  constructor(private readonly userSettingService: UserSettingService) {}
}
