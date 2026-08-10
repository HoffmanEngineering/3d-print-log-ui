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
});
