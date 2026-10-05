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
  let settings: jasmine.SpyObj<UserSettingService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let accountEmail: jasmine.SpyObj<AccountEmailService>;
  let stored: Partial<Record<UserSettingType, string>>;
  let account: AccountEmail | Error;

  async function render(): Promise<HTMLElement> {
    settings = jasmine.createSpyObj<UserSettingService>('UserSettingService', [
      'getCurrentUsersSettingByType',
      'addOrUpdateSetting',
    ]);
    settings.getCurrentUsersSettingByType.and.callFake((type) =>
      Promise.resolve(
        stored[type] !== undefined
          ? ({ value: stored[type] } as UserSetting)
          : null
      )
    );
    settings.addOrUpdateSetting.and.returnValue(Promise.resolve());
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    accountEmail = jasmine.createSpyObj<AccountEmailService>(
      'AccountEmailService',
      ['get']
    );
    accountEmail.get.and.returnValue(
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

    expect(form.controls.onboarding.disabled).toBeTrue();
    expect(form.controls.monthlyRecap.disabled).toBeTrue();
    expect(form.controls.printerSilent.disabled).toBeTrue();

    form.controls.all.setValue(true);

    expect(form.controls.monthlyRecap.enabled).toBeTrue();
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
    settings = undefined as unknown as jasmine.SpyObj<UserSettingService>;
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
          useValue: jasmine.createSpyObj('LoggingService', [
            'logEvent',
            'logException',
          ]),
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

    expect(fixture.componentInstance.form.disabled).toBeTrue();
  });

  it('renders as the settings anchor target', async () => {
    const el = await render();

    expect(el.querySelector('#email')).not.toBeNull();
  });
});
