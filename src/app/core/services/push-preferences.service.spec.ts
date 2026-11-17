import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { PushPreferencesService } from './push-preferences.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from './user-setting.service';

describe('PushPreferencesService', () => {
  let service: PushPreferencesService;
  let userSettings: MockedObject<UserSettingService>;

  beforeEach(() => {
    userSettings = {
      getCurrentUsersSettingByType: vi
        .fn()
        .mockName('UserSettingService.getCurrentUsersSettingByType'),
      addOrUpdateSetting: vi
        .fn()
        .mockName('UserSettingService.addOrUpdateSetting'),
    } as unknown as MockedObject<UserSettingService>;

    TestBed.configureTestingModule({
      providers: [{ provide: UserSettingService, useValue: userSettings }],
    });
    service = TestBed.inject(PushPreferencesService);
  });

  function settingWithValue(value: string): UserSetting {
    return { value } as UserSetting;
  }

  it('treats an absent setting as enabled', async () => {
    userSettings.getCurrentUsersSettingByType.mockResolvedValue(null);
    await expect(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).resolves.toEqual(true);
  });

  it('treats the literal "false" as disabled', async () => {
    userSettings.getCurrentUsersSettingByType.mockResolvedValue(
      settingWithValue('false')
    );
    await expect(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).resolves.toEqual(false);
  });

  it('trims and lowercases before comparing', async () => {
    userSettings.getCurrentUsersSettingByType.mockResolvedValue(
      settingWithValue('  FALSE ')
    );
    await expect(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).resolves.toEqual(false);
  });

  it('treats an unrecognised value as enabled, matching the API', async () => {
    userSettings.getCurrentUsersSettingByType.mockResolvedValue(
      settingWithValue('garbage')
    );
    await expect(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).resolves.toEqual(true);
  });

  it('writes the canonical string', async () => {
    userSettings.addOrUpdateSetting.mockResolvedValue(undefined);
    await service.setEnabled(UserSettingType.Push_PrintCompleted, false);
    expect(userSettings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.Push_PrintCompleted,
      'false'
    );
  });
});
