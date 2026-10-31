import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  AccountEmail,
  AccountEmailService,
} from '../../core/services/account-email.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../../core/services/user-setting.service';
import { EmailSettingsComponent } from './email-settings.component';

describe('EmailSettingsComponent', () => {
  let fixture: ComponentFixture<EmailSettingsComponent>;
  let settings: MockedObject<UserSettingService>;
  let logging: MockedObject<LoggingService>;
  let accountEmail: MockedObject<AccountEmailService>;
  let stored: Partial<Record<UserSettingType, string>>;
  let account: AccountEmail | Error;

  async function render(): Promise<HTMLElement> {
    settings = {
      getCurrentUsersSettingByType: vi
        .fn()
        .mockName('UserSettingService.getCurrentUsersSettingByType'),
      addOrUpdateSetting: vi
        .fn()
        .mockName('UserSettingService.addOrUpdateSetting'),
    } as unknown as MockedObject<UserSettingService>;
    settings.getCurrentUsersSettingByType.mockImplementation((type) =>
      Promise.resolve(
        stored[type] !== undefined
          ? ({ value: stored[type] } as UserSetting)
          : null
      )
    );
    settings.addOrUpdateSetting.mockReturnValue(Promise.resolve());
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
    accountEmail = {
      get: vi.fn().mockName('AccountEmailService.get'),
    } as unknown as MockedObject<AccountEmailService>;
    accountEmail.get.mockReturnValue(
      account instanceof Error ? throwError(() => account) : of(account)
    );

    await TestBed.configureTestingModule({
      imports: [EmailSettingsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: UserSettingService, useValue: settings },
        { provide: LoggingService, useValue: logging },
        { provide: AccountEmailService, useValue: accountEmail },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EmailSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    // The settings load is a promise chain, which whenStable does not track.
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    stored = {};
    account = { email: 'ada@example.com', verified: true };
  });

  it('shows the account address', async () => {
    const el = await render();

    expect(
      el.querySelector('[data-testid="email-address"]')?.textContent
    ).toContain('ada@example.com');
    expect(el.querySelector('[data-testid="email-unverified"]')).toBeNull();
  });

  it('warns when the address is unverified', async () => {
    account = { email: 'ada@example.com', verified: false };
    const el = await render();

    expect(el.querySelector('[data-testid="email-unverified"]')).not.toBeNull();
  });

  it('says when there is no address on file', async () => {
    account = { email: null, verified: false };
    const el = await render();

    expect(el.querySelector('[data-testid="email-missing"]')).not.toBeNull();
  });

  it('renders absent settings as on', async () => {
    await render();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      all: true,
      onboarding: true,
      monthlyRecap: true,
      printerSilent: true,
    });
  });

  it('loads stored values', async () => {
    stored = {
      [UserSettingType.Email_MonthlyRecap]: 'false',
      [UserSettingType.Email_PrinterSilent]: 'true',
    };
    await render();

    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      all: true,
      onboarding: true,
      monthlyRecap: false,
      printerSilent: true,
    });
  });

  it('disables the categories while the master switch is off', async () => {
    stored = { [UserSettingType.Email_All]: 'false' };
    await render();
    const form = fixture.componentInstance.form;

    expect(form.controls.onboarding.disabled).toBe(true);
    expect(form.controls.monthlyRecap.disabled).toBe(true);
    expect(form.controls.printerSilent.disabled).toBe(true);

    form.controls.all.setValue(true);

    expect(form.controls.monthlyRecap.enabled).toBe(true);
  });

  it('saves and logs a category change', async () => {
    await render();

    fixture.componentInstance.form.controls.monthlyRecap.setValue(false);
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));

    expect(settings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.Email_MonthlyRecap,
      'false'
    );
    expect(logging.logEvent).toHaveBeenCalledWith('EmailSettings_Changed', {
      setting: 'monthlyRecap',
      value: false,
    });
  });

  it('puts a toggle back and says so when its save fails', async () => {
    const el = await render();
    settings.addOrUpdateSetting.mockReturnValue(
      Promise.reject(new Error('offline'))
    );

    fixture.componentInstance.form.controls.monthlyRecap.setValue(false);
    await new Promise((r) => setTimeout(r));
    fixture.detectChanges();

    expect(fixture.componentInstance.form.controls.monthlyRecap.value).toBe(
      true
    );
    expect(el.querySelector('[data-testid="email-save-error"]')).not.toBeNull();
    expect(logging.logEvent).not.toHaveBeenCalledWith(
      'EmailSettings_Changed',
      expect.anything()
    );
  });

  it('restores the categories when a failed master-switch save is undone', async () => {
    await render();
    settings.addOrUpdateSetting.mockReturnValue(
      Promise.reject(new Error('offline'))
    );
    const form = fixture.componentInstance.form;

    form.controls.all.setValue(false);
    await new Promise((r) => setTimeout(r));

    expect(form.controls.all.value).toBe(true);
    expect(form.controls.monthlyRecap.enabled).toBe(true);
  });

  it('saves the master switch', async () => {
    await render();

    fixture.componentInstance.form.controls.all.setValue(false);
    await new Promise((r) => setTimeout(r));

    expect(settings.addOrUpdateSetting).toHaveBeenCalledWith(
      UserSettingType.Email_All,
      'false'
    );
  });

  it('keeps the controls disabled when settings fail to load', async () => {
    stored = {};
    settings = undefined as unknown as MockedObject<UserSettingService>;
    await TestBed.configureTestingModule({
      imports: [EmailSettingsComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        {
          provide: UserSettingService,
          useValue: {
            getCurrentUsersSettingByType: () =>
              Promise.reject(new Error('boom')),
            addOrUpdateSetting: () => Promise.resolve(),
          },
        },
        {
          provide: LoggingService,
          useValue: {
            logEvent: vi.fn().mockName('LoggingService.logEvent'),
            logException: vi.fn().mockName('LoggingService.logException'),
          },
        },
        {
          provide: AccountEmailService,
          useValue: { get: () => of({ email: null, verified: false }) },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(EmailSettingsComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((r) => setTimeout(r));

    expect(fixture.componentInstance.form.disabled).toBe(true);
  });

  it('renders as the settings anchor target', async () => {
    const el = await render();

    expect(el.querySelector('#email')).not.toBeNull();
  });
});
