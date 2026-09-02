import { TestBed } from '@angular/core/testing';
import { PushPreferencesService } from './push-preferences.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from './user-setting.service';

describe('PushPreferencesService', () => {
  let service: PushPreferencesService;
  let userSettings: jasmine.SpyObj<UserSettingService>;

  beforeEach(() => {
    userSettings = jasmine.createSpyObj('UserSettingService', [
      'getCurrentUsersSettingByType',
      'addOrUpdateSetting',
    ]);

    TestBed.configureTestingModule({
      providers: [{ provide: UserSettingService, useValue: userSettings }],
    });
    service = TestBed.inject(PushPreferencesService);
  });

  function settingWithValue(value: string): UserSetting {
    return { value } as UserSetting;
  }

  it('treats an absent setting as enabled', async () => {
    userSettings.getCurrentUsersSettingByType.and.resolveTo(null);
    await expectAsync(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).toBeResolvedTo(true);
  });

  it('treats the literal "false" as disabled', async () => {
    userSettings.getCurrentUsersSettingByType.and.resolveTo(
      settingWithValue('false')
    );
    await expectAsync(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).toBeResolvedTo(false);
  });

  it('trims and lowercases before comparing', async () => {
    userSettings.getCurrentUsersSettingByType.and.resolveTo(
      settingWithValue('  FALSE ')
    );
    await expectAsync(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).toBeResolvedTo(false);
  });

  it('treats an unrecognised value as enabled, matching the API', async () => {
    userSettings.getCurrentUsersSettingByType.and.resolveTo(
      settingWithValue('garbage')
    );
    await expectAsync(
      service.isEnabled(UserSettingType.Push_PrintFailed)
    ).toBeResolvedTo(true);
  });

  it('writes the canonical string', async () => {
    userSettings.addOrUpdateSetting.and.resolveTo(undefined);
    await service.setEnabled(UserSettingType.Push_PrintCompleted, false);
    expect(userSettings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.Push_PrintCompleted,
      'false'
    );
  });
});
