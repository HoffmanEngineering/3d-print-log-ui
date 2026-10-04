import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { TimeZoneSyncService } from './time-zone-sync.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from './user-setting.service';

describe('TimeZoneSyncService', () => {
  let settings: jasmine.SpyObj<UserSettingService>;
  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function create(
    saved: string | null,
    platform = 'browser'
  ): TimeZoneSyncService {
    settings = jasmine.createSpyObj<UserSettingService>('UserSettingService', [
      'getCurrentUsersSettingByType',
      'addOrUpdateSetting',
    ]);
    settings.getCurrentUsersSettingByType.and.returnValue(
      Promise.resolve(saved === null ? null : ({ value: saved } as UserSetting))
    );
    settings.addOrUpdateSetting.and.returnValue(Promise.resolve());
    TestBed.configureTestingModule({
      providers: [
        { provide: UserSettingService, useValue: settings },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    return TestBed.inject(TimeZoneSyncService);
  }

  it('adds when missing', async () => {
    await create(null).syncOnce();
    expect(settings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.General_TimeZone,
      browserZone
    );
  });

  it('updates when different', async () => {
    await create('Mars/Olympus').syncOnce();
    expect(settings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.General_TimeZone,
      browserZone
    );
  });

  it('no call when equal', async () => {
    await create(browserZone).syncOnce();
    expect(settings.addOrUpdateSetting).not.toHaveBeenCalled();
  });

  it('runs once', async () => {
    const service = create(null);
    await service.syncOnce();
    await service.syncOnce();
    expect(settings.getCurrentUsersSettingByType).toHaveBeenCalledTimes(1);
  });

  it('no-op on server platform', async () => {
    await create(null, 'server').syncOnce();
    expect(settings.getCurrentUsersSettingByType).not.toHaveBeenCalled();
  });

  it('swallows errors', async () => {
    const service = create(null);
    settings.addOrUpdateSetting.and.returnValue(
      Promise.reject(new Error('offline'))
    );
    await expectAsync(service.syncOnce()).toBeResolved();
  });
});
