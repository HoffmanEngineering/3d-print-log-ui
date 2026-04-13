import { TestBed, waitForAsync } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { AppComponent } from './app.component';
import { ThemeService } from './core/services/theme.service';
import { AuthService } from './core/services/auth.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { LoggingService } from './core/services/logging.service';
import { VersionReleaseNoteDialogService } from './core/services/version-release-note-dialog.service';
import { of } from 'rxjs';

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

  beforeEach(waitForAsync(() => {
    mockAuthService = jasmine.createSpyObj<AuthService>('AuthService', [
      'localAuthSetup',
    ]);
    mockAuthService.userProfile$ = of(null);

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

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      declarations: [AppComponent],
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
      ],
    }).compileComponents();
  }));

  it('calls themeService.initialize() on ngOnInit', () => {
    const themeService = TestBed.inject(ThemeService);
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(themeService.initialize).toHaveBeenCalledTimes(1);
  });
});
