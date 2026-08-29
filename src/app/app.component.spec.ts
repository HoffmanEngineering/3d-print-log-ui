import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { LoggingService } from './core/services/logging.service';
import { VersionReleaseNoteDialogService } from './core/services/version-release-note-dialog.service';
import { AdsenseLoaderService } from './core/services/adsense-loader.service';
import { PushRegistrationService } from './core/services/push-registration.service';
import { of } from 'rxjs';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';

xdescribe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
    }).compileComponents();
  }));

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'print-log-ui'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('print-log-ui');
  });

  it('should render title', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('.content span').textContent).toContain(
      'print-log-ui app is running!'
    );
  });
});

describe('AppComponent (ThemeService)', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockGoogleAnalyticsService: jasmine.SpyObj<GoogleAnalyticsService>;
  let mockLoggingService: jasmine.SpyObj<LoggingService>;
  let mockReleaseNotesService: jasmine.SpyObj<VersionReleaseNoteDialogService>;
  let mockThemeService: jasmine.SpyObj<ThemeService>;
  let mockPushRegistration: jasmine.SpyObj<PushRegistrationService>;

  beforeEach(waitForAsync(() => {
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'localAuthSetup',
      'getTokenSilently$',
    ]);
    mockAuthService.userProfile$ = of(null);
    mockAuthService.getTokenSilently$.and.returnValue(of('bearer-abc'));

    mockPushRegistration = jasmine.createSpyObj<PushRegistrationService>(
      'PushRegistrationService',
      ['onAuthenticated', 'onLogout', 'handlePendingTap']
    );
    mockPushRegistration.onAuthenticated.and.resolveTo(undefined);
    mockPushRegistration.onLogout.and.resolveTo(undefined);
    mockPushRegistration.handlePendingTap.and.resolveTo(undefined);

    mockGoogleAnalyticsService = {} as jasmine.SpyObj<GoogleAnalyticsService>;

    mockLoggingService = {} as jasmine.SpyObj<LoggingService>;

    mockReleaseNotesService =
      jasmine.createSpyObj<VersionReleaseNoteDialogService>(
        'VersionReleaseNoteDialogService',
        ['checkLastLoggedInVersion']
      );

    mockThemeService = jasmine.createSpyObj<ThemeService>('ThemeService', [
      'initialize',
    ]);
    (mockThemeService as any).isDark = signal(false);

    const mockAdsenseLoader = jasmine.createSpyObj<AdsenseLoaderService>(
      'AdsenseLoaderService',
      ['load']
    );

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
      schemas: [NO_ERRORS_SCHEMA],
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
      ],
    }).compileComponents();
  }));

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
      mockAuthService.userProfile$ = of({ id: 1 } as never);

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

    it('drains a pending tap when the app resumes', () => {
      const fixture = TestBed.createComponent(AppComponent);
      fixture.detectChanges();

      document.dispatchEvent(new Event('resume'));

      expect(mockPushRegistration.handlePendingTap).toHaveBeenCalled();
    });
  });
});
