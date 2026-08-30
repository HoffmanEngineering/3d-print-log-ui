import { Injectable, inject } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

@Injectable({
  providedIn: 'root',
})
export class DefaultFilamentPriceSettingResolverService {
  private readonly userSettingService = inject(UserSettingService);

  // Must never reject: this resolver runs on the public prints/:id route, and a
  // rejected resolver cancels navigation and bounces the visitor to / (#66).
  resolve(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Promise<UserSetting | null> {
    return this.userSettingService
      .getCurrentUsersSettingByType(UserSettingType.Filaments_DefaultPrice)
      .catch(() => null);
  }
}
