import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

@Injectable()
export class LastFilamentMeasureSettingResolverService {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return forkJoin({
      filament: this.userSettingService.getCurrentUsersSettingByType(
        UserSettingType.Prints_LastSelectedFilamentMeasureType
      ),
      resin: this.userSettingService.getCurrentUsersSettingByType(
        UserSettingType.Prints_LastSelectedResinMeasureType
      ),
      powder: this.userSettingService.getCurrentUsersSettingByType(
        UserSettingType.Prints_LastSelectedPowderMeasureType
      ),
      wire: this.userSettingService.getCurrentUsersSettingByType(
        UserSettingType.Prints_LastSelectedWireMeasureType
      ),
    });
  }
  constructor(private readonly userSettingService: UserSettingService) {}
}
