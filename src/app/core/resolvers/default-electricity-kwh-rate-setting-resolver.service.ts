import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

@Injectable({
  providedIn: 'root',
})
export class DefaultElectricityKwhRateSettingResolverService {
  constructor(private readonly userSettingService: UserSettingService) {}

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    return this.userSettingService.getCurrentUsersSettingByType(
      UserSettingType.Electricity_KwhRate
    );
  }
}
