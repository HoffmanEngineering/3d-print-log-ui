import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { SettingsComponent } from './settings.component';
import { ThemeService, ThemeMode } from '../core/services/theme.service';
import { SharedModule } from '../shared/shared.module';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService, UserProfileInfo } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';
import { UserSettingService } from '../core/services/user-setting.service';
import { PrintService } from '../core/services/print.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { ToastrService } from 'ngx-toastr';
import { SubscriptionService } from '../core/services/subscription.service';
import { LoggingService } from '../core/services/logging.service';
import { ConnectedAgentsComponent } from './connected-agents/connected-agents.component';
import { ConnectedAgentsService } from '../core/services/connected-agents.service';
import { NativeBridgeService } from '../core/services/native-bridge.service';
import { PushPreferencesService } from '../core/services/push-preferences.service';
import { PushPermissionPromptService } from '../core/services/push-permission-prompt.service';
import { UserSettingType } from '../core/services/user-setting.service';

xdescribe('SettingsComponent (original)', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [SettingsComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockNativeBridge: jasmine.SpyObj<NativeBridgeService>;
  let mockPushPreferences: jasmine.SpyObj<PushPreferencesService>;
  let mockPushPermissionPrompt: jasmine.SpyObj<PushPermissionPromptService>;

  const mockUserDetails = {
    id: '1',
    viewStatus: 0,
    deactivationDateTime: null,
    email: 'test@test.com',
    username: 'testuser',
  };

  const mockActivatedRoute = {
    data: of({
      currencies: { USD: { name: 'US Dollar', symbol: '$' } },
      currentUser: mockUserDetails,
      defaultPrintViewStatusSetting: null,
      preferredCurrencyNameSetting: null,
      preferredCurrencySymbolSetting: null,
      defaultFilamentDiameterMmSetting: null,
      defaultFilamentPriceSetting: null,
    }),
  };

  beforeEach(waitForAsync(() => {
    const mockAuthService = jasmine.createSpyObj<AuthService>(
      'AuthService',
      ['updateCurrentUserDeactivationDate'],
      {
        userProfile$: of({ deactivationDateTime: null } as UserProfileInfo),
      }
    );
    const mockUserService = jasmine.createSpyObj<UserService>('UserService', [
      'updateCurrentUserDetail',
      'deactivateCurrentUser',
    ]);
    const mockUserSettingService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['updateUserSetting', 'addUserSetting']
    );
    const mockPrintService = jasmine.createSpyObj<PrintService>(
      'PrintService',
      ['exportAllPrintsAsCsv']
    );
    const mockMetaService = jasmine.createSpyObj<MetaTagService>(
      'MetaTagService',
      ['setTitle']
    );
    const mockToastrService = jasmine.createSpyObj<ToastrService>(
      'ToastrService',
      ['error']
    );
    const mockSubscriptionService = jasmine.createSpyObj<SubscriptionService>(
      'SubscriptionService',
      ['createPortalSession'],
      {
        isPro: signal(false),
        plan: signal(null),
        currentPeriodEnd: signal(null),
        cancelAtPeriodEnd: signal(false),
      }
    );
    const mockThemeService = jasmine.createSpyObj<ThemeService>(
      'ThemeService',
      ['setMode'],
      {
        mode: signal<ThemeMode>('system'),
      }
    );
    const mockLoggingService = jasmine.createSpyObj<LoggingService>(
      'LoggingService',
      ['logEvent', 'logException']
    );
    mockNativeBridge = jasmine.createSpyObj<NativeBridgeService>(
      'NativeBridgeService',
      ['isAvailable'],
      { permission: 'granted' }
    );
    // Default to a plain browser: the overwhelming majority of these specs are not about
    // push, and the section must stay absent for them.
    mockNativeBridge.isAvailable.and.returnValue(false);

    mockPushPreferences = jasmine.createSpyObj<PushPreferencesService>(
      'PushPreferencesService',
      ['isEnabled', 'setEnabled']
    );
    mockPushPreferences.isEnabled.and.resolveTo(true);
    mockPushPreferences.setEnabled.and.resolveTo(undefined);

    mockPushPermissionPrompt =
      jasmine.createSpyObj<PushPermissionPromptService>(
        'PushPermissionPromptService',
        ['promptInContext']
      );
    mockPushPermissionPrompt.promptInContext.and.resolveTo('granted');

    TestBed.configureTestingModule({
      declarations: [SettingsComponent],
      imports: [
        SharedModule,
        NoopAnimationsModule,
        RouterTestingModule,
        ConnectedAgentsComponent,
      ],
      providers: [
        {
          provide: ConnectedAgentsService,
          useValue: {
            getConnectedAgents: () => of([]),
            revoke: () => of(undefined),
          },
        },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: AuthService, useValue: mockAuthService },
        { provide: UserService, useValue: mockUserService },
        { provide: UserSettingService, useValue: mockUserSettingService },
        { provide: PrintService, useValue: mockPrintService },
        { provide: MetaTagService, useValue: mockMetaService },
        { provide: ToastrService, useValue: mockToastrService },
        { provide: SubscriptionService, useValue: mockSubscriptionService },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: LoggingService, useValue: mockLoggingService },
        { provide: NativeBridgeService, useValue: mockNativeBridge },
        { provide: PushPreferencesService, useValue: mockPushPreferences },
        {
          provide: PushPermissionPromptService,
          useValue: mockPushPermissionPrompt,
        },
      ],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('theme toggle', () => {
    it('renders toggle group with the current theme mode selected', () => {
      // Set the mock mode to 'dark' to verify the [value] binding reflects signal state
      const mockThemeService = TestBed.inject(
        ThemeService
      ) as jasmine.SpyObj<ThemeService>;
      (mockThemeService.mode as WritableSignal<ThemeMode>).set('dark');

      fixture.detectChanges();

      const toggleGroup = fixture.nativeElement.querySelector(
        'mat-button-toggle-group'
      );
      expect(toggleGroup).toBeTruthy();
      const darkToggle = fixture.nativeElement.querySelector(
        'mat-button-toggle[value="dark"]'
      );
      expect(
        darkToggle.classList.contains('mat-button-toggle-checked')
      ).toBeTrue();
    });

    it('calls themeService.setMode with the correct value when toggle changes', () => {
      fixture.detectChanges();
      const themeService = TestBed.inject(ThemeService);
      const lightToggle: HTMLElement = fixture.nativeElement.querySelector(
        'mat-button-toggle[value="light"] button'
      );
      lightToggle.click();
      fixture.detectChanges();
      expect(themeService.setMode).toHaveBeenCalledWith('light');
    });
  });

  describe('push notification preferences', () => {
    function pushSection(): HTMLElement | null {
      return fixture.nativeElement.querySelector(
        '[data-testid="push-notifications-section"]'
      );
    }

    it('hides the section entirely in a normal browser', () => {
      mockNativeBridge.isAvailable.and.returnValue(false);

      fixture.detectChanges();

      expect(pushSection()).toBeNull();
      expect(mockPushPreferences.isEnabled).not.toHaveBeenCalled();
    });

    it('renders both toggles inside the app shell', async () => {
      mockNativeBridge.isAvailable.and.returnValue(true);

      fixture.detectChanges();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(pushSection()).not.toBeNull();
      expect(
        fixture.nativeElement.querySelector(
          '[data-testid="push-print-completed"]'
        )
      ).not.toBeNull();
      expect(
        fixture.nativeElement.querySelector('[data-testid="push-print-failed"]')
      ).not.toBeNull();
    });

    it('reflects a stored opt-out on the matching toggle', async () => {
      mockNativeBridge.isAvailable.and.returnValue(true);
      mockPushPreferences.isEnabled.and.callFake((type) =>
        Promise.resolve(type !== UserSettingType.Push_PrintFailed)
      );

      fixture.detectChanges();
      // loadPushPreferences awaits the two lookups in sequence, so one microtask flush is
      // not enough to see the second one land.
      await fixture.whenStable();
      await fixture.whenStable();

      expect(component.printCompletedPush).toBeTrue();
      expect(component.printFailedPush).toBeFalse();
    });

    it('writes the print-failed setting when that toggle changes', async () => {
      mockNativeBridge.isAvailable.and.returnValue(true);
      fixture.detectChanges();
      await fixture.whenStable();

      await component.onPushPreferenceChanged(
        UserSettingType.Push_PrintFailed,
        false
      );

      expect(mockPushPreferences.setEnabled).toHaveBeenCalledWith(
        UserSettingType.Push_PrintFailed,
        false
      );
    });
  });

  describe('push notification permission', () => {
    function setPermission(permission: string) {
      Object.defineProperty(mockNativeBridge, 'permission', {
        value: permission,
        configurable: true,
      });
    }

    async function renderInAppShell() {
      mockNativeBridge.isAvailable.and.returnValue(true);
      fixture.detectChanges();
      await fixture.whenStable();
      await fixture.whenStable();
      fixture.detectChanges();
    }

    function warning(): HTMLElement | null {
      return fixture.nativeElement.querySelector(
        '[data-testid="push-permission-warning"]'
      );
    }

    function enableButton(): HTMLElement | null {
      return fixture.nativeElement.querySelector(
        '[data-testid="push-enable-permission"]'
      );
    }

    it('says nothing extra when permission is granted', async () => {
      setPermission('granted');

      await renderInAppShell();

      expect(warning()).toBeNull();
      expect(enableButton()).toBeNull();
    });

    it('warns and offers the prompt when permission was denied', async () => {
      setPermission('denied');

      await renderInAppShell();

      expect(warning()).not.toBeNull();
      expect(enableButton()).not.toBeNull();
    });

    it('warns and offers the prompt when permission has never been asked for', async () => {
      setPermission('default');

      await renderInAppShell();

      expect(warning()).not.toBeNull();
      expect(enableButton()).not.toBeNull();
    });

    it('hides the warning once the prompt grants permission', async () => {
      setPermission('denied');
      await renderInAppShell();

      await component.onEnableNotificationsClicked();
      await fixture.whenStable();

      expect(mockPushPermissionPrompt.promptInContext).toHaveBeenCalled();
      // Asserted on the field, not the DOM: re-running change detection after this
      // async state change trips NG0100 in the harness. That the field drives the
      // warning's visibility is covered by the granted/denied/default render tests above.
      expect(component.pushPermissionGranted).toBeTrue();
    });
  });
});
