import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { LoggingService } from '../../core/services/logging.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../../core/services/user-setting.service';
import { AchievementSettingsComponent } from './achievement-settings.component';

describe('AchievementSettingsComponent', () => {
  let fixture: ComponentFixture<AchievementSettingsComponent>;
  let settings: jasmine.SpyObj<UserSettingService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let stored: Partial<Record<UserSettingType, string>>;

  async function render(): Promise<HTMLElement> {
    settings = jasmine.createSpyObj<UserSettingService>('UserSettingService', [
      'getCurrentUsersSettingByType',
      'addOrUpdateSetting',
    ]);
    settings.getCurrentUsersSettingByType.and.callFake((type) =>
      settingsDelay.then(() =>
        stored[type] !== undefined
          ? ({ value: stored[type] } as UserSetting)
          : null
      )
    );
    settings.addOrUpdateSetting.and.returnValue(Promise.resolve());
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);

    await TestBed.configureTestingModule({
      imports: [AchievementSettingsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: UserSettingService, useValue: settings },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AchievementSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    // The settings load is a promise chain, which whenStable does not track.
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  let settingsDelay: Promise<void>;

  beforeEach(() => {
    stored = {};
    settingsDelay = Promise.resolve();
  });

  it('loads current values', async () => {
    stored = {
      [UserSettingType.Achievements_ShowOnProfile]: 'false',
      [UserSettingType.Achievements_Celebrations]: 'quiet',
    };
    await render();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      showOnProfile: false,
      celebrations: 'quiet',
    });
  });

  it('defaults to shown and full celebrations', async () => {
    await render();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      showOnProfile: true,
      celebrations: 'on',
    });
  });

  it('saves celebrations quiet', async () => {
    await render();

    fixture.componentInstance.form.controls.celebrations.setValue('quiet');
    await fixture.whenStable();

    expect(settings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.Achievements_Celebrations,
      'quiet'
    );
    expect(settings.addOrUpdateSetting).toHaveBeenCalledTimes(1);
    expect(logging.logEvent).toHaveBeenCalledWith(
      'AchievementSettings_Changed',
      {
        showOnProfile: true,
        celebrations: 'quiet',
      }
    );
  });

  it('saves show on profile', async () => {
    await render();

    fixture.componentInstance.form.controls.showOnProfile.setValue(false);
    await fixture.whenStable();

    expect(settings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.Achievements_ShowOnProfile,
      'false'
    );
  });

  it('keeps the controls disabled until the saved values load', async () => {
    let release: () => void = () => undefined;
    stored = { [UserSettingType.Achievements_Celebrations]: 'off' };
    const gate = new Promise<void>((r) => (release = r));
    settingsDelay = gate;
    const pending = render();

    // Still loading: a choice made now would be overwritten by the load, so none is possible.
    await new Promise((r) => setTimeout(r, 50));
    expect(fixture.componentInstance.form.disabled).toBeTrue();

    release();
    await pending;
    await new Promise((r) => setTimeout(r));
    expect(fixture.componentInstance.form.enabled).toBeTrue();
    expect(fixture.componentInstance.form.controls.celebrations.value).toBe(
      'off'
    );
  });

  it('saves rapid changes one at a time, last value last', async () => {
    await render();
    const resolvers: (() => void)[] = [];
    settings.addOrUpdateSetting.and.callFake(
      () => new Promise<void>((r) => resolvers.push(r))
    );

    fixture.componentInstance.form.controls.celebrations.setValue('quiet');
    fixture.componentInstance.form.controls.celebrations.setValue('off');
    await fixture.whenStable();
    expect(settings.addOrUpdateSetting).toHaveBeenCalledTimes(1);

    resolvers[0]();
    await new Promise((r) => setTimeout(r));
    expect(settings.addOrUpdateSetting).toHaveBeenCalledTimes(2);
    expect(settings.addOrUpdateSetting.calls.mostRecent().args).toEqual([
      UserSettingType.Achievements_Celebrations,
      'off',
    ]);
    resolvers[1]();
  });

  it('settings links to /docs/achievements', async () => {
    const el = await render();

    expect(el.querySelector('a[href="/docs/achievements"]')).not.toBeNull();
  });
});
