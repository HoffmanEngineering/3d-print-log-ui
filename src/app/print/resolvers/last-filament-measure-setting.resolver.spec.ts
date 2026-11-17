import { TestBed } from '@angular/core/testing';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { resolveValue } from 'src/app/core/resolvers/testing/run-resolver';
import { lastFilamentMeasureSettingResolver } from './last-filament-measure-setting.resolver';

describe('lastFilamentMeasureSettingResolver', () => {
  it('resolves the last measure type picked for each material kind', async () => {
    const settingFor = (type: UserSettingType) =>
      ({ value: UserSettingType[type] }) as UserSetting;
    const settings = {
      getCurrentUsersSettingByType: vi
        .fn()
        .mockName('UserSettingService.getCurrentUsersSettingByType'),
    };
    settings.getCurrentUsersSettingByType.mockImplementation(async (type) =>
      settingFor(type)
    );
    TestBed.configureTestingModule({
      providers: [{ provide: UserSettingService, useValue: settings }],
    });

    await expect(
      resolveValue(lastFilamentMeasureSettingResolver)
    ).resolves.toEqual({
      filament: settingFor(
        UserSettingType.Prints_LastSelectedFilamentMeasureType
      ),
      resin: settingFor(UserSettingType.Prints_LastSelectedResinMeasureType),
      powder: settingFor(UserSettingType.Prints_LastSelectedPowderMeasureType),
      wire: settingFor(UserSettingType.Prints_LastSelectedWireMeasureType),
    });
  });
});
