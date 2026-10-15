import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin } from 'rxjs';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

export interface LastMeasureSettings {
  filament: UserSetting | null;
  resin: UserSetting | null;
  powder: UserSetting | null;
  wire: UserSetting | null;
}

/** The measure type last picked for each kind of material. */
export const lastFilamentMeasureSettingResolver: ResolveFn<
  LastMeasureSettings
> = () => {
  const settings = inject(UserSettingService);

  return forkJoin({
    filament: settings.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedFilamentMeasureType
    ),
    resin: settings.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedResinMeasureType
    ),
    powder: settings.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedPowderMeasureType
    ),
    wire: settings.getCurrentUsersSettingByType(
      UserSettingType.Prints_LastSelectedWireMeasureType
    ),
  });
};
