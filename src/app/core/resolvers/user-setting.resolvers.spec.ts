import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ResolveFn } from '@angular/router';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../services/user-setting.service';
import { resolveValue } from './testing/run-resolver';
import {
  currencyNameSettingResolver,
  currencySymbolSettingResolver,
  defaultElectricityKwhRateSettingResolver,
  defaultElectricityWattageSettingResolver,
  defaultFilamentDiameterSettingResolver,
  defaultFilamentPriceSettingResolver,
  defaultPrintViewStatusSettingResolver,
  filamentDisplayUnitSettingResolver,
  lastSelectedPrinterSettingResolver,
  preferredFilamentDisplayUnitSettingResolver,
} from './user-setting.resolvers';

type Case = [string, ResolveFn<UserSetting | null>, UserSettingType];

/** Run on routes a logged-out visitor can reach, so a failure must not cancel navigation (#66). */
const neverReject: Case[] = [
  [
    'currencySymbolSettingResolver',
    currencySymbolSettingResolver,
    UserSettingType.Currency_Symbol,
  ],
  [
    'defaultElectricityKwhRateSettingResolver',
    defaultElectricityKwhRateSettingResolver,
    UserSettingType.Electricity_KwhRate,
  ],
  [
    'defaultElectricityWattageSettingResolver',
    defaultElectricityWattageSettingResolver,
    UserSettingType.Electricity_DefaultWattageW,
  ],
  [
    'defaultFilamentPriceSettingResolver',
    defaultFilamentPriceSettingResolver,
    UserSettingType.Filaments_DefaultPrice,
  ],
  [
    'filamentDisplayUnitSettingResolver',
    filamentDisplayUnitSettingResolver,
    UserSettingType.Prints_PreferredFilamentDisplayUnit,
  ],
];

/**
 * The settings page reads `null` as "create this setting", so degrading a failed fetch to `null`
 * would make it add a setting that already exists. These let the failure through.
 */
const passFailureThrough: Case[] = [
  [
    'currencyNameSettingResolver',
    currencyNameSettingResolver,
    UserSettingType.Currency_Name,
  ],
  [
    'defaultFilamentDiameterSettingResolver',
    defaultFilamentDiameterSettingResolver,
    UserSettingType.Filaments_DefaultDiameterMm,
  ],
  [
    'defaultPrintViewStatusSettingResolver',
    defaultPrintViewStatusSettingResolver,
    UserSettingType.Prints_DefaultPrintViewStatus,
  ],
  [
    'preferredFilamentDisplayUnitSettingResolver',
    preferredFilamentDisplayUnitSettingResolver,
    UserSettingType.Prints_PreferredFilamentDisplayUnit,
  ],
  [
    'lastSelectedPrinterSettingResolver',
    lastSelectedPrinterSettingResolver,
    UserSettingType.Prints_LastSelectedPrinterId,
  ],
];

describe('user setting resolvers', () => {
  let settings: MockedObject<UserSettingService>;

  beforeEach(() => {
    settings = {
      getCurrentUsersSettingByType: vi
        .fn()
        .mockName('UserSettingService.getCurrentUsersSettingByType'),
    } as unknown as MockedObject<UserSettingService>;
    TestBed.configureTestingModule({
      providers: [{ provide: UserSettingService, useValue: settings }],
    });
  });

  for (const [name, resolver, type] of [
    ...neverReject,
    ...passFailureThrough,
  ]) {
    it(`${name} resolves the ${UserSettingType[type]} setting`, async () => {
      const setting = { value: 'x' } as UserSetting;
      settings.getCurrentUsersSettingByType.mockResolvedValue(setting);

      await expect(resolveValue(resolver)).resolves.toEqual(setting);
      expect(settings.getCurrentUsersSettingByType).toHaveBeenCalledTimes(1);
      expect(settings.getCurrentUsersSettingByType).toHaveBeenCalledWith(type);
    });
  }

  for (const [name, resolver] of neverReject) {
    it(`${name} resolves null when the settings call fails`, async () => {
      settings.getCurrentUsersSettingByType.mockRejectedValue(new Error('500'));

      await expect(resolveValue(resolver)).resolves.toEqual(null);
    });
  }

  for (const [name, resolver] of passFailureThrough) {
    it(`${name} rejects when the settings call fails`, async () => {
      settings.getCurrentUsersSettingByType.mockRejectedValue(new Error('500'));

      await expect(resolveValue(resolver)).rejects.toThrow();
    });
  }
});
