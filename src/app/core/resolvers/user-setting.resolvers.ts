import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../services/user-setting.service';

/**
 * Resolves one of the signed-in user's settings and lets a failed fetch reject.
 *
 * Use this where `null` carries meaning. The settings page reads a `null`
 * setting as "create it" rather than "update it", so degrading a failure to
 * `null` there would make it add a setting that already exists.
 */
function userSettingResolver(
  type: UserSettingType
): ResolveFn<UserSetting | null> {
  return () => inject(UserSettingService).getCurrentUsersSettingByType(type);
}

/**
 * Resolves one of the signed-in user's settings, or `null` when it cannot be
 * fetched.
 *
 * Use this on any route a logged-out visitor can reach, and wherever `null`
 * only means "fall back to the default". A rejected resolver cancels
 * navigation and bounces the visitor to / (#66).
 */
function optionalUserSettingResolver(
  type: UserSettingType
): ResolveFn<UserSetting | null> {
  return () =>
    inject(UserSettingService)
      .getCurrentUsersSettingByType(type)
      .catch(() => null);
}

export const currencyNameSettingResolver = userSettingResolver(
  UserSettingType.Currency_Name
);

export const defaultFilamentDiameterSettingResolver = userSettingResolver(
  UserSettingType.Filaments_DefaultDiameterMm
);

export const defaultPrintViewStatusSettingResolver = userSettingResolver(
  UserSettingType.Prints_DefaultPrintViewStatus
);

export const preferredFilamentDisplayUnitSettingResolver = userSettingResolver(
  UserSettingType.Prints_PreferredFilamentDisplayUnit
);

export const lastSelectedPrinterSettingResolver = userSettingResolver(
  UserSettingType.Prints_LastSelectedPrinterId
);

/** Runs on the public prints/:id route. */
export const currencySymbolSettingResolver = optionalUserSettingResolver(
  UserSettingType.Currency_Symbol
);

/** Runs on the public prints/:id route. */
export const defaultElectricityKwhRateSettingResolver =
  optionalUserSettingResolver(UserSettingType.Electricity_KwhRate);

/** Runs on the public prints/:id route. */
export const defaultElectricityWattageSettingResolver =
  optionalUserSettingResolver(UserSettingType.Electricity_DefaultWattageW);

/** Runs on the public prints/:id route. */
export const defaultFilamentPriceSettingResolver = optionalUserSettingResolver(
  UserSettingType.Filaments_DefaultPrice
);

/**
 * The same setting as {@link preferredFilamentDisplayUnitSettingResolver}, for
 * routes that only want it to format a number. Here `null` means "use the
 * default unit", so a settings outage cannot cancel navigation to a page that
 * has nothing to do with settings (#66).
 */
export const filamentDisplayUnitSettingResolver = optionalUserSettingResolver(
  UserSettingType.Prints_PreferredFilamentDisplayUnit
);
