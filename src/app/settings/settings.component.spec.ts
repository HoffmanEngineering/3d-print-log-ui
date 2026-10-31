import type { MockedObject } from 'vitest';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal, WritableSignal } from '@angular/core';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { RouterTestingModule } from '@angular/router/testing';

import { SettingsComponent } from './settings.component';
import { ThemeService, ThemeMode } from '../core/services/theme.service';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { AuthService, UserProfileInfo } from '../core/services/auth.service';
import { UserService } from '../core/services/user.service';
import {
  UserSetting,
  UserSettingService,
} from '../core/services/user-setting.service';
import { PrintService } from '../core/services/print.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { ToastrService } from 'ngx-toastr';
import { SubscriptionService } from '../core/services/subscription.service';
import { LoggingService } from '../core/services/logging.service';
import { ConnectedAgentsComponent } from './connected-agents/connected-agents.component';
import { AchievementSettingsComponent } from './achievement-settings/achievement-settings.component';
import { ConnectedAgentsService } from '../core/services/connected-agents.service';
import { DeviceGrantsService } from '../core/services/device-grants.service';
import { SpoolmanConnectionService } from '../core/services/spoolman-connection.service';
import { SpoolmanConnectionsComponent } from './spoolman-connections/spoolman-connections.component';
import { NativeBridgeService } from '../core/services/native-bridge.service';
import { PushPreferencesService } from '../core/services/push-preferences.service';
import { PushPermissionPromptService } from '../core/services/push-permission-prompt.service';
import { UserSettingType } from '../core/services/user-setting.service';

describe('SettingsComponent', () => {
  let breakpoint$: BehaviorSubject<BreakpointState>;
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockNativeBridge: MockedObject<NativeBridgeService>;
  let mockPushPreferences: MockedObject<PushPreferencesService>;
  let mockPushPermissionPrompt: MockedObject<PushPermissionPromptService>;
  let userProfile: WritableSignal<UserProfileInfo | null>;

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

  beforeEach(async () => {
    userProfile = signal<UserProfileInfo | null>({
      deactivationDateTime: null,
    } as UserProfileInfo);
    const mockAuthService = {
      updateCurrentUserDeactivationDate: vi
        .fn()
        .mockName('AuthService.updateCurrentUserDeactivationDate'),
      userProfile,
    };
    const mockUserService = {
      updateCurrentUserDetail: vi
        .fn()
        .mockName('UserService.updateCurrentUserDetail'),
      deactivateCurrentUser: vi
        .fn()
        .mockName('UserService.deactivateCurrentUser'),
    };
    const mockUserSettingService = {
      updateUserSetting: vi
        .fn()
        .mockName('UserSettingService.updateUserSetting'),
      addUserSetting: vi.fn().mockName('UserSettingService.addUserSetting'),
      getCurrentUsersSettingByType: vi
        .fn()
        .mockName('UserSettingService.getCurrentUsersSettingByType'),
      addOrUpdateSetting: vi
        .fn()
        .mockName('UserSettingService.addOrUpdateSetting'),
    };
    mockUserSettingService.getCurrentUsersSettingByType.mockReturnValue(
      Promise.resolve(null)
    );
    const mockPrintService = {
      exportAllPrintsAsCsv: vi
        .fn()
        .mockName('PrintService.exportAllPrintsAsCsv'),
    };
    const mockMetaService = {
      setTitle: vi.fn().mockName('MetaTagService.setTitle'),
    };
    const mockToastrService = {
      error: vi.fn().mockName('ToastrService.error'),
    };
    const mockSubscriptionService = {
      createPortalSession: vi
        .fn()
        .mockName('SubscriptionService.createPortalSession'),
      isPro: signal(false),
      plan: signal(null),
      currentPeriodEnd: signal(null),
      cancelAtPeriodEnd: signal(false),
    };
    const mockThemeService = {
      setMode: vi.fn().mockName('ThemeService.setMode'),
      mode: signal<ThemeMode>('system'),
    };
    const mockLoggingService = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    };
    mockNativeBridge = {
      isAvailable: vi.fn().mockName('NativeBridgeService.isAvailable'),
      permission: 'granted',
    } as unknown as MockedObject<NativeBridgeService>;
    // Default to a plain browser: the overwhelming majority of these specs are not about
    // push, and the section must stay absent for them.
    mockNativeBridge.isAvailable.mockReturnValue(false);

    mockPushPreferences = {
      isEnabled: vi.fn().mockName('PushPreferencesService.isEnabled'),
      setEnabled: vi.fn().mockName('PushPreferencesService.setEnabled'),
    } as unknown as MockedObject<PushPreferencesService>;
    mockPushPreferences.isEnabled.mockResolvedValue(true);
    mockPushPreferences.setEnabled.mockResolvedValue(undefined);

    mockPushPermissionPrompt = {
      promptInContext: vi
        .fn()
        .mockName('PushPermissionPromptService.promptInContext'),
      promptOnUserRequest: vi
        .fn()
        .mockName('PushPermissionPromptService.promptOnUserRequest'),
    } as unknown as MockedObject<PushPermissionPromptService>;
    mockPushPermissionPrompt.promptInContext.mockResolvedValue({
      permission: 'granted',
      outcome: 'shown',
    });
    mockPushPermissionPrompt.promptOnUserRequest.mockResolvedValue({
      permission: 'granted',
      outcome: 'shown',
    });

    breakpoint$ = new BehaviorSubject<BreakpointState>({
      matches: false,
      breakpoints: {},
    });

    await TestBed.configureTestingModule({
      imports: [
        NoopAnimationsModule,
        RouterTestingModule,
        ConnectedAgentsComponent,
        SpoolmanConnectionsComponent,
        AchievementSettingsComponent,
        SettingsComponent,
      ],
      providers: [
        {
          provide: ConnectedAgentsService,
          useValue: {
            getConnectedAgents: () => of([]),
            revoke: () => of(undefined),
          },
        },
        {
          provide: DeviceGrantsService,
          useValue: { list: () => of([]), revoke: () => of(undefined) },
        },
        {
          provide: SpoolmanConnectionService,
          useValue: {
            getConnections: () => of([]),
            revoke: () => of(undefined),
          },
        },
        {
          provide: BreakpointObserver,
          useValue: { observe: () => breakpoint$.asObservable() },
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
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  describe('user profile', () => {
    it('tolerates a null user profile (logged out)', () => {
      fixture.detectChanges();

      expect(() => userProfile.set(null)).not.toThrow();
      expect(component.deactivateHasBeenClicked()).toBe(false);
    });
  });

  describe('theme toggle', () => {
    it('renders toggle group with the current theme mode selected', () => {
      // Set the mock mode to 'dark' to verify the [value] binding reflects signal state
      const mockThemeService = TestBed.inject(
        ThemeService
      ) as MockedObject<ThemeService>;
      (mockThemeService.mode as WritableSignal<ThemeMode>).set('dark');

      fixture.detectChanges();

      const toggleGroup = fixture.nativeElement.querySelector(
        'mat-button-toggle-group'
      );
      expect(toggleGroup).toBeTruthy();
      const darkToggle = fixture.nativeElement.querySelector(
        'mat-button-toggle[value="dark"]'
      );
      expect(darkToggle.classList.contains('mat-button-toggle-checked')).toBe(
        true
      );
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

  describe('filament display unit toggles (#152)', () => {
    const displayUnitGroup = (): HTMLElement =>
      fixture.nativeElement.querySelector(
        'mat-button-toggle-group[aria-label="Preferred filament display unit"]'
      );

    it('lays the toggles out in a row on wider screens', () => {
      fixture.detectChanges();

      const group = displayUnitGroup();
      expect(group.classList).not.toContain('mat-button-toggle-vertical');
      expect(group.classList).not.toContain('stacked-toggle-group');
    });

    it('stacks the toggles full width on a phone so the page cannot scroll sideways', () => {
      breakpoint$.next({ matches: true, breakpoints: {} });
      fixture.detectChanges();

      const group = displayUnitGroup();
      expect(group.classList).toContain('mat-button-toggle-vertical');
      expect(group.classList).toContain('stacked-toggle-group');
    });
  });

  describe('push notification preferences', () => {
    function pushSection(): HTMLElement | null {
      return fixture.nativeElement.querySelector(
        '[data-testid="push-notifications-section"]'
      );
    }

    it('hides the section entirely in a normal browser', () => {
      mockNativeBridge.isAvailable.mockReturnValue(false);

      fixture.detectChanges();

      expect(pushSection()).toBeNull();
      expect(mockPushPreferences.isEnabled).not.toHaveBeenCalled();
    });

    it('renders both toggles inside the app shell', async () => {
      mockNativeBridge.isAvailable.mockReturnValue(true);

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
      mockNativeBridge.isAvailable.mockReturnValue(true);
      mockPushPreferences.isEnabled.mockImplementation((type) =>
        Promise.resolve(type !== UserSettingType.Push_PrintFailed)
      );

      fixture.detectChanges();
      // loadPushPreferences awaits the two lookups in sequence, so one microtask flush is
      // not enough to see the second one land.
      await fixture.whenStable();
      await fixture.whenStable();

      expect(component.printCompletedPush()).toBe(true);
      expect(component.printFailedPush()).toBe(false);
    });

    it('writes the print-failed setting when that toggle changes', async () => {
      mockNativeBridge.isAvailable.mockReturnValue(true);
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

    it('offers an achievement toggle that reflects and writes its own setting', async () => {
      mockNativeBridge.isAvailable.mockReturnValue(true);
      mockPushPreferences.isEnabled.mockImplementation((type) =>
        Promise.resolve(type !== UserSettingType.Push_Achievement)
      );

      fixture.detectChanges();
      await fixture.whenStable();
      await fixture.whenStable();
      await fixture.whenStable();
      fixture.detectChanges();

      expect(
        fixture.nativeElement.querySelector('[data-testid="push-achievement"]')
      ).not.toBeNull();
      expect(component.achievementPush()).toBe(false);

      await component.onPushPreferenceChanged(
        UserSettingType.Push_Achievement,
        true
      );
      expect(mockPushPreferences.setEnabled).toHaveBeenCalledWith(
        UserSettingType.Push_Achievement,
        true
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
      mockNativeBridge.isAvailable.mockReturnValue(true);
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

      expect(mockPushPermissionPrompt.promptOnUserRequest).toHaveBeenCalled();
      // Asserted on the field, not the DOM: re-running change detection after this
      // async state change trips NG0100 in the harness. That the field drives the
      // warning's visibility is covered by the granted/denied/default render tests above.
      expect(component.pushPermissionGranted()).toBe(true);
    });
  });

  describe('once a response arrives', () => {
    const buttons = () =>
      Array.from(
        (
          fixture.nativeElement as HTMLElement
        ).querySelectorAll<HTMLButtonElement>('button')
      );
    const button = (label: string) =>
      buttons().find((b) => b.textContent!.trim() === label);

    it('drops the Save button once the setting is saved', () => {
      const saved = new Subject<UserSetting>();
      const settings = TestBed.inject(
        UserSettingService
      ) as MockedObject<UserSettingService>;
      settings.addUserSetting.mockReturnValue(saved);
      fixture.detectChanges();

      const diameter = (
        fixture.nativeElement as HTMLElement
      ).querySelector<HTMLInputElement>('#default-filament-diameter-mm')!;
      diameter.value = '1.75';
      diameter.dispatchEvent(new Event('input'));
      fixture.detectChanges();
      button('Save Default Filament Diameter')!.click();
      fixture.detectChanges();

      saved.next({ id: 9, value: '1.75' } as UserSetting);
      fixture.detectChanges();

      expect(button('Save Default Filament Diameter')).toBeUndefined();
    });

    it('re-enables Export when the export fails', () => {
      const exported = new Subject<Blob>();
      const prints = TestBed.inject(PrintService) as MockedObject<PrintService>;
      prints.exportAllPrintsAsCsv.mockReturnValue(exported);
      fixture.detectChanges();

      button('Export')!.click();
      fixture.detectChanges();
      expect(button('Export')!.disabled, 'exporting').toBe(true);

      exported.error(new Error('500'));
      fixture.detectChanges();

      expect(button('Export')!.disabled).toBe(false);
    });
  });
});
