import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { ThemeService } from './core/services/theme.service';
import { AuthService, UserProfileInfo } from './core/services/auth.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { LoggingService } from './core/services/logging.service';
import { VersionReleaseNoteDialogService } from './core/services/version-release-note-dialog.service';
import { AdsenseLoaderService } from './core/services/adsense-loader.service';
import { PushRegistrationService } from './core/services/push-registration.service';
import { NativeBridgeService } from './core/services/native-bridge.service';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA, signal, WritableSignal } from '@angular/core';

describe('AppComponent (ThemeService)', () => {
  let mockAuthService: MockedObject<AuthService>;
  let userProfile: WritableSignal<UserProfileInfo | null>;
  let mockGoogleAnalyticsService: MockedObject<GoogleAnalyticsService>;
  let mockLoggingService: MockedObject<LoggingService>;
  let mockReleaseNotesService: MockedObject<VersionReleaseNoteDialogService>;
  let mockThemeService: MockedObject<ThemeService>;
  let mockPushRegistration: MockedObject<PushRegistrationService>;
  let mockNativeBridge: MockedObject<NativeBridgeService>;

  beforeEach(async () => {
    userProfile = signal<UserProfileInfo | null>(null);
    mockAuthService = {
      localAuthSetup: vi.fn().mockName('AuthService.localAuthSetup'),
      getTokenSilently$: vi.fn().mockName('AuthService.getTokenSilently$'),
      userProfile,
    } as unknown as MockedObject<AuthService>;
    mockAuthService.getTokenSilently$.mockReturnValue(of('bearer-abc'));

    mockPushRegistration = {
      onAuthenticated: vi
        .fn()
        .mockName('PushRegistrationService.onAuthenticated'),
      onLogout: vi.fn().mockName('PushRegistrationService.onLogout'),
      handlePendingTap: vi
        .fn()
        .mockName('PushRegistrationService.handlePendingTap'),
    } as unknown as MockedObject<PushRegistrationService>;
    mockNativeBridge = {
      onPendingTap: vi.fn().mockName('NativeBridgeService.onPendingTap'),
    } as unknown as MockedObject<NativeBridgeService>;
    mockNativeBridge.onPendingTap.mockReturnValue(true);
    mockPushRegistration.onAuthenticated.mockResolvedValue(undefined);
    mockPushRegistration.onLogout.mockResolvedValue(undefined);
    mockPushRegistration.handlePendingTap.mockResolvedValue(undefined);

    mockGoogleAnalyticsService = {} as MockedObject<GoogleAnalyticsService>;

    mockLoggingService = {} as MockedObject<LoggingService>;

    mockReleaseNotesService = {
      checkLastLoggedInVersion: vi
        .fn()
        .mockName('VersionReleaseNoteDialogService.checkLastLoggedInVersion'),
    } as unknown as MockedObject<VersionReleaseNoteDialogService>;

    mockThemeService = {
      initialize: vi.fn().mockName('ThemeService.initialize'),
    } as unknown as MockedObject<ThemeService>;
    (mockThemeService as any).isDark = signal(false);

    const mockAdsenseLoader = {
      load: vi.fn().mockName('AdsenseLoaderService.load'),
    };

    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, AppComponent],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        {
          provide: GoogleAnalyticsService,
          useValue: mockGoogleAnalyticsService,
        },
        { provide: LoggingService, useValue: mockLoggingService },
        {
          provide: VersionReleaseNoteDialogService,
          useValue: mockReleaseNotesService,
        },
        { provide: ThemeService, useValue: mockThemeService },
        { provide: AdsenseLoaderService, useValue: mockAdsenseLoader },
        { provide: PushRegistrationService, useValue: mockPushRegistration },
        { provide: NativeBridgeService, useValue: mockNativeBridge },
      ],
    })
      // The shell's children each need their own services; these specs are about
      // the shell, so its template renders them as inert elements.
      .overrideComponent(AppComponent, {
        set: { imports: [], schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();
  });

  // #254: signed-in users see the notifier notice wherever they land, not only on a printer page.
  it('mounts the notifier notice in the shell', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector(
        'app-notifier-notice'
      )
    ).not.toBeNull();
  });

  // The shell is OnPush, so the bar repaints only because it reads the theme as a signal.
  it('recolors the loading bar when the theme flips after first paint', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const bar = (fixture.nativeElement as HTMLElement).querySelector(
      'ngx-loading-bar'
    ) as HTMLElement & {
      color: string;
    };
    expect(bar.color).toBe('#3f51b5');

    (mockThemeService.isDark as ReturnType<typeof signal<boolean>>).set(true);
    fixture.detectChanges();

    expect(bar.color).toBe('#283593');
  });

  it('calls themeService.initialize() on ngOnInit', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(themeService.initialize).toHaveBeenCalledTimes(1);
  });

  describe('push registration', () => {
    it('does not register while no profile has been emitted', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(mockPushRegistration.onAuthenticated).not.toHaveBeenCalled();
    });

    it('registers with a bearer once a profile is emitted', () => {
      userProfile.set({ id: 1 } as UserProfileInfo);

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(mockPushRegistration.onAuthenticated).toHaveBeenCalledWith(
        'bearer-abc'
      );
    });

    it('installs the logout teardown hook', async () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(mockAuthService.pushTeardown).toBeTruthy();
      await mockAuthService.pushTeardown!('bearer-abc');
      expect(mockPushRegistration.onLogout).toHaveBeenCalledWith('bearer-abc');
    });

    /**
     * Native signals the tap; we do NOT listen for Cordova's `resume`. cordova.js is absent
     * on this origin, so a `resume` listener never fires in the real app — an earlier
     * version of this test dispatched a synthetic `resume` event and passed while the
     * feature was broken in production.
     */
    it('registers a pending-tap listener with the native bridge', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(mockNativeBridge.onPendingTap).toHaveBeenCalled();
    });

    it('drains the pending tap when native signals one arrived', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      const listener = vi.mocked(mockNativeBridge.onPendingTap).mock
        .lastCall[0] as () => void;
      listener();

      expect(mockPushRegistration.handlePendingTap).toHaveBeenCalled();
    });

    /**
     * The app shell injects window.PrintLogNative on page load, which can land after Angular
     * has bootstrapped. A one-shot attempt in ngOnInit therefore silently installs nothing,
     * and every later warm-start tap is signalled into an empty listener list.
     */
    it('retries installing the tap listener when the bridge was not ready', () => {
      mockNativeBridge.onPendingTap.mockReturnValue(false);
      userProfile.set({ id: 1 } as UserProfileInfo);

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(mockNativeBridge.onPendingTap).toHaveBeenCalledTimes(2);
    });

    it('does not reinstall the tap listener once one is installed', () => {
      mockNativeBridge.onPendingTap.mockReturnValue(true);
      userProfile.set({ id: 1 } as UserProfileInfo);

      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      expect(mockNativeBridge.onPendingTap).toHaveBeenCalledTimes(1);
    });

    it('does not listen for the Cordova resume event', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      document.dispatchEvent(new Event('resume'));

      expect(mockPushRegistration.handlePendingTap).not.toHaveBeenCalled();
    });
  });
});
