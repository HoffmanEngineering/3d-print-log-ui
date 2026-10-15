import { BreakpointObserver } from '@angular/cdk/layout';
import { KeyValue, KeyValuePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { map } from 'rxjs';
import { AuthService } from '../core/services/auth.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import {
  PrintFilamentSourceMeasurement,
  PrintService,
  PrintViewStatus,
} from '../core/services/print.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from '../core/services/user-setting.service';
import {
  ProfileViewStatus,
  UserDetailDto,
  UserService,
} from '../core/services/user.service';
import { Currencies, Currency } from '../core/resolvers/currencies.resolver';
import { SubscriptionService } from '../core/services/subscription.service';
import { ThemeService, ThemeMode } from '../core/services/theme.service';
import { LoggingService } from '../core/services/logging.service';
import { NativeBridgeService } from '../core/services/native-bridge.service';
import {
  PushNotificationType,
  PushPreferencesService,
} from '../core/services/push-preferences.service';
import { PushPermissionPromptService } from '../core/services/push-permission-prompt.service';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultFlexDirective,
  DefaultLayoutGapDirective,
  FlexFillDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatCard } from '@angular/material/card';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MatButtonToggleGroup,
  MatButtonToggle,
} from '@angular/material/button-toggle';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { EmailSettingsComponent } from './email-settings/email-settings.component';
import { AchievementSettingsComponent } from './achievement-settings/achievement-settings.component';
import { ConnectedAgentsComponent } from './connected-agents/connected-agents.component';
import { SpoolmanConnectionsComponent } from './spoolman-connections/spoolman-connections.component';
import { MatCheckbox } from '@angular/material/checkbox';
import { LocaleDatePipe } from '../shared/pipes/locale-date.pipe';

@Component({
  selector: 'app-settings',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  imports: [
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    MatCard,
    DefaultFlexDirective,
    DefaultLayoutGapDirective,
    FlexFillDirective,
    MatTooltip,
    MatIcon,
    FormsModule,
    MatButton,
    MatButtonToggleGroup,
    MatButtonToggle,
    MatSlideToggle,
    EmailSettingsComponent,
    AchievementSettingsComponent,
    RouterLink,
    ConnectedAgentsComponent,
    SpoolmanConnectionsComponent,
    MatCheckbox,
    KeyValuePipe,
    LocaleDatePipe,
  ],
})
export class SettingsComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private userService = inject(UserService);
  private authService = inject(AuthService);
  private userSettingService = inject(UserSettingService);
  private readonly printService = inject(PrintService);
  private readonly metaService = inject(MetaTagService);
  private readonly toastrService = inject(ToastrService);

  readonly userDetailsOnLoad = signal<UserDetailDto | undefined>(undefined);
  readonly defaultPrintViewStatusSettingOnLoad = signal<UserSetting | null>(
    null
  );

  public profileViewStatusTypes = ProfileViewStatus;
  public printViewStatusTypes = PrintViewStatus;

  readonly preferredCurrencyNameSettingOnLoad = signal<UserSetting | null>(
    null
  );
  public preferredCurrencySymbolSettingOnLoad: UserSetting | null = null;

  readonly defaultFilamentDiameterMmSettingOnLoad = signal<UserSetting | null>(
    null
  );
  readonly defaultFilamentPriceSettingOnLoad = signal<UserSetting | null>(null);
  readonly defaultElectricityKwhRateSettingOnLoad = signal<UserSetting | null>(
    null
  );
  readonly defaultElectricityWattageSettingOnLoad = signal<UserSetting | null>(
    null
  );
  readonly preferredFilamentDisplayUnitSettingOnLoad =
    signal<UserSetting | null>(null);
  readonly preferredFilamentDisplayUnit =
    signal<PrintFilamentSourceMeasurement | null>(null);
  public printFilamentSourceMeasurementTypes = PrintFilamentSourceMeasurement;

  readonly deactivateHasBeenClicked = signal(false);

  /**
   * NgModel for Profile View Status
   */
  readonly profileViewStatus = signal<ProfileViewStatus | null>(null);
  /**
   * NgModel for Print View Status
   */
  readonly printViewStatus = signal<PrintViewStatus | null>(null);

  /**
   * NgModel for Currency
   */
  readonly preferredCurrency = signal<string | null>(null);

  /**
   * NgModel for Default Filament Diameter
   */
  readonly defaultFilamentDiameterMm = signal<number | null>(null);

  /**
   * NgModel for Default Filament Price
   */
  readonly defaultFilamentPrice = signal<string | null>(null);

  /**
   * NgModel for Default Electricity kWh Rate
   */
  readonly defaultElectricityKwhRate = signal<string | null>(null);

  /**
   * NgModel for Default Electricity Wattage
   */
  readonly defaultElectricityWattageW = signal<string | null>(null);

  readonly exportInProgress = signal(false);

  public deactivationAgreementChecked = false;

  readonly currencies = signal<Currencies | null>(null);

  /**
   * Whether the push section renders at all. Hidden in a normal browser: dead toggles that
   * cannot affect anything are worse than no toggles.
   */
  readonly pushAvailable = signal(false);
  readonly printCompletedPush = signal(true);
  readonly printFailedPush = signal(true);
  readonly achievementPush = signal(true);

  /**
   * The toggles write a preference, but a preference cannot make Android display anything.
   * When the OS permission is missing the toggles are honest but inert, so the section says
   * so and offers the request — this is the second chance for someone who declined earlier.
   */
  readonly pushPermissionGranted = signal(true);

  /** Exposed so the template can name the setting types it writes. */
  public readonly userSettingTypes = UserSettingType;

  readonly subscriptionService = inject(SubscriptionService);
  readonly themeService = inject(ThemeService);
  private readonly loggingService = inject(LoggingService);
  private readonly pushPreferences = inject(PushPreferencesService);
  private readonly nativeBridge = inject(NativeBridgeService);
  private readonly pushPermissionPrompt = inject(PushPermissionPromptService);
  private readonly destroyRef = inject(DestroyRef);

  /**
   * The filament display unit toggles are about 440px wide in a row, wider than a phone
   * viewport (#152). Below this width they stack vertically at full width instead, so the
   * page never scrolls sideways.
   */
  readonly stackDisplayUnitToggles = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 599.98px)')
      .pipe(map((state) => state.matches)),
    { initialValue: false }
  );

  private async loadPushPreferences(): Promise<void> {
    this.pushAvailable.set(this.nativeBridge.isAvailable());
    if (!this.pushAvailable()) {
      return;
    }

    this.printCompletedPush.set(
      await this.pushPreferences.isEnabled(UserSettingType.Push_PrintCompleted)
    );
    this.printFailedPush.set(
      await this.pushPreferences.isEnabled(UserSettingType.Push_PrintFailed)
    );
    this.achievementPush.set(
      await this.pushPreferences.isEnabled(UserSettingType.Push_Achievement)
    );
    this.pushPermissionGranted.set(this.nativeBridge.permission === 'granted');
  }

  async onEnableNotificationsClicked(): Promise<void> {
    // promptOnUserRequest, not promptInContext: the in-context cooldown must not apply to a
    // button the user deliberately pressed. This is the documented second chance, and
    // suppressing it would strand anyone who tapped "Not now" and changed their mind.
    const result = await this.pushPermissionPrompt.promptOnUserRequest(
      'Notifications are turned off for 3D Print Log on this device.'
    );
    this.pushPermissionGranted.set(result.permission === 'granted');
  }

  // One handler per toggle, with the type passed explicitly: a shared handler would have to
  // guess which toggle changed and could write the wrong setting.
  async onPushPreferenceChanged(
    type: PushNotificationType,
    enabled: boolean
  ): Promise<void> {
    await this.pushPreferences.setEnabled(type, enabled);
  }

  setThemeMode(mode: ThemeMode): void {
    this.themeService.setMode(mode);
    this.loggingService.logEvent('Settings_ThemeModeChanged', { mode });
  }

  ngOnInit(): void {
    this.metaService.setTitle('Settings - 3D Print Log');

    void this.loadPushPreferences();

    this.activatedRoute.data.subscribe((data) => {
      this.currencies.set(data.currencies);

      this.userDetailsOnLoad.set(data.currentUser);

      this.defaultPrintViewStatusSettingOnLoad.set(
        data.defaultPrintViewStatusSetting
      );

      this.preferredCurrencyNameSettingOnLoad.set(
        data.preferredCurrencyNameSetting
      );
      this.preferredCurrencySymbolSettingOnLoad =
        data.preferredCurrencySymbolSetting;

      this.defaultFilamentDiameterMmSettingOnLoad.set(
        data.defaultFilamentDiameterMmSetting
      );
      this.defaultFilamentPriceSettingOnLoad.set(
        data.defaultFilamentPriceSetting
      );

      // Default all the ngModels
      this.profileViewStatus.set(this.userDetailsOnLoad().viewStatus);
      this.printViewStatus.set(
        this.defaultPrintViewStatusSettingOnLoad()
          ? +this.defaultPrintViewStatusSettingOnLoad().value
          : null
      );

      this.preferredCurrency.set(
        this.preferredCurrencyNameSettingOnLoad()
          ? this.preferredCurrencyNameSettingOnLoad().value
          : 'USD'
      );

      this.defaultFilamentDiameterMm.set(
        this.defaultFilamentDiameterMmSettingOnLoad()
          ? +this.defaultFilamentDiameterMmSettingOnLoad().value
          : null
      );

      this.defaultFilamentPrice.set(
        this.defaultFilamentPriceSettingOnLoad()
          ? this.defaultFilamentPriceSettingOnLoad().value
          : null
      );

      this.defaultElectricityKwhRateSettingOnLoad.set(
        data.defaultElectricityKwhRateSetting
      );
      this.defaultElectricityWattageSettingOnLoad.set(
        data.defaultElectricityWattageSetting
      );
      this.defaultElectricityKwhRate.set(
        this.defaultElectricityKwhRateSettingOnLoad()?.value ?? null
      );
      this.defaultElectricityWattageW.set(
        this.defaultElectricityWattageSettingOnLoad()?.value ?? null
      );

      this.preferredFilamentDisplayUnitSettingOnLoad.set(
        data.preferredFilamentDisplayUnitSetting
      );
      this.preferredFilamentDisplayUnit.set(
        this.preferredFilamentDisplayUnitSettingOnLoad()
          ? (+this.preferredFilamentDisplayUnitSettingOnLoad()
              .value as PrintFilamentSourceMeasurement)
          : null
      );
    });

    this.authService.userProfile$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((user) => {
        if (user?.deactivationDateTime) {
          this.deactivateHasBeenClicked.set(true);
        } else {
          // If the deactivate date time gets set back to null, then clear the click
          this.deactivateHasBeenClicked.set(false);
        }
      });
  }

  public sortByName = (
    a: KeyValue<string, Currency>,
    b: KeyValue<string, Currency>
  ): number => {
    const nameA = a.value.name.toUpperCase(); // ignore upper and lowercase
    const nameB = b.value.name.toUpperCase(); // ignore upper and lowercase
    if (nameA < nameB) {
      return -1;
    }
    if (nameA > nameB) {
      return 1;
    }

    // names must be equal
    return 0;
  };

  public saveProfileVisibility(newViewStatus: ProfileViewStatus) {
    const newUserDetail: UserDetailDto = {
      ...this.userDetailsOnLoad(),
      viewStatus: newViewStatus,
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetailsOnLoad.set(user);
        this.profileViewStatus.set(this.userDetailsOnLoad().viewStatus);
      });
  }

  saveDefaultPrintViewStatus(newViewStatus: PrintViewStatus) {
    if (this.defaultPrintViewStatusSettingOnLoad()) {
      this.userSettingService
        .updateUserSetting(
          this.defaultPrintViewStatusSettingOnLoad().id,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSettingOnLoad.set(setting);
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Prints_DefaultPrintViewStatus,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSettingOnLoad.set(setting);
        });
    }
  }

  cancelDefaultPrintViewStatus() {
    this.printViewStatus.set(
      this.defaultPrintViewStatusSettingOnLoad()
        ? +this.defaultPrintViewStatusSettingOnLoad().value
        : null
    );
  }

  savePreferredCurrency(newCurrency: string) {
    if (this.preferredCurrencyNameSettingOnLoad()) {
      this.userSettingService
        .updateUserSetting(
          this.preferredCurrencyNameSettingOnLoad().id,
          newCurrency.toString()
        )
        .subscribe((setting) => {
          this.preferredCurrencyNameSettingOnLoad.set(setting);
        });
    } else {
      this.userSettingService
        .addUserSetting(UserSettingType.Currency_Name, newCurrency.toString())
        .subscribe((setting) => {
          this.preferredCurrencyNameSettingOnLoad.set(setting);
        });
    }

    const symbol = this.currencies()[newCurrency].symbol;

    if (this.preferredCurrencySymbolSettingOnLoad) {
      this.userSettingService
        .updateUserSetting(this.preferredCurrencySymbolSettingOnLoad.id, symbol)
        .subscribe((setting) => {
          this.preferredCurrencySymbolSettingOnLoad = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(UserSettingType.Currency_Symbol, symbol)
        .subscribe((setting) => {
          this.preferredCurrencySymbolSettingOnLoad = setting;
        });
    }
  }

  cancelPreferredCurrency() {
    this.preferredCurrency.set(
      this.preferredCurrencyNameSettingOnLoad()
        ? this.preferredCurrencyNameSettingOnLoad().value
        : 'USD'
    );
  }

  saveDefaultFilamentDiameterMm(newDiameterMm: number) {
    if (this.defaultFilamentDiameterMmSettingOnLoad()) {
      this.userSettingService
        .updateUserSetting(
          this.defaultFilamentDiameterMmSettingOnLoad().id,
          newDiameterMm.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentDiameterMmSettingOnLoad.set(setting);
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Filaments_DefaultDiameterMm,
          newDiameterMm.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentDiameterMmSettingOnLoad.set(setting);
        });
    }
  }

  cancelDefaultFilamentDiameterMm() {
    this.defaultFilamentDiameterMm.set(
      this.defaultFilamentDiameterMmSettingOnLoad()
        ? +this.defaultFilamentDiameterMmSettingOnLoad().value
        : null
    );
  }

  saveDefaultFilamentPrice(newPrice: string) {
    if (this.defaultFilamentPriceSettingOnLoad()) {
      this.userSettingService
        .updateUserSetting(
          this.defaultFilamentPriceSettingOnLoad().id,
          newPrice.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentPriceSettingOnLoad.set(setting);
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Filaments_DefaultPrice,
          newPrice.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentPriceSettingOnLoad.set(setting);
        });
    }
  }

  cancelDefaultFilamentPrice() {
    this.defaultFilamentPrice.set(
      this.defaultFilamentPriceSettingOnLoad()
        ? this.defaultFilamentPriceSettingOnLoad().value
        : null
    );
  }

  savePreferredFilamentDisplayUnit(newUnit: PrintFilamentSourceMeasurement) {
    if (this.preferredFilamentDisplayUnitSettingOnLoad()) {
      this.userSettingService
        .updateUserSetting(
          this.preferredFilamentDisplayUnitSettingOnLoad().id,
          newUnit.toString()
        )
        .subscribe((setting) => {
          this.preferredFilamentDisplayUnitSettingOnLoad.set(setting);
          this.loggingService.logEvent(
            'Settings_PreferredFilamentDisplayUnitChanged',
            { unit: newUnit }
          );
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Prints_PreferredFilamentDisplayUnit,
          newUnit.toString()
        )
        .subscribe((setting) => {
          this.preferredFilamentDisplayUnitSettingOnLoad.set(setting);
          this.loggingService.logEvent(
            'Settings_PreferredFilamentDisplayUnitChanged',
            { unit: newUnit }
          );
        });
    }
  }

  cancelPreferredFilamentDisplayUnit() {
    this.preferredFilamentDisplayUnit.set(
      this.preferredFilamentDisplayUnitSettingOnLoad()
        ? (+this.preferredFilamentDisplayUnitSettingOnLoad()
            .value as PrintFilamentSourceMeasurement)
        : null
    );
  }

  saveDefaultElectricityKwhRate(newRate: string) {
    const rateStr = newRate?.toString();
    if (this.defaultElectricityKwhRateSettingOnLoad()) {
      this.userSettingService
        .updateUserSetting(
          this.defaultElectricityKwhRateSettingOnLoad().id,
          rateStr
        )
        .subscribe((setting) => {
          this.defaultElectricityKwhRateSettingOnLoad.set(setting);
        });
    } else {
      this.userSettingService
        .addUserSetting(UserSettingType.Electricity_KwhRate, rateStr)
        .subscribe((setting) => {
          this.defaultElectricityKwhRateSettingOnLoad.set(setting);
        });
    }
    this.loggingService.logEvent('Settings_ElectricityKwhRateChanged');
  }

  saveDefaultElectricityWattage(newWattage: string) {
    const wattageStr = newWattage?.toString();
    if (this.defaultElectricityWattageSettingOnLoad()) {
      this.userSettingService
        .updateUserSetting(
          this.defaultElectricityWattageSettingOnLoad().id,
          wattageStr
        )
        .subscribe((setting) => {
          this.defaultElectricityWattageSettingOnLoad.set(setting);
        });
    } else {
      this.userSettingService
        .addUserSetting(UserSettingType.Electricity_DefaultWattageW, wattageStr)
        .subscribe((setting) => {
          this.defaultElectricityWattageSettingOnLoad.set(setting);
        });
    }
    this.loggingService.logEvent('Settings_ElectricityDefaultWattageChanged');
  }

  public manageSubscription(): void {
    this.subscriptionService.createPortalSession().subscribe((result) => {
      window.location.href = result.url;
    });
  }

  public export() {
    if (this.exportInProgress()) {
      return; // prevent multiple exports;
    }

    this.exportInProgress.set(true);
    this.printService.exportAllPrintsAsCsv().subscribe(
      (file) => {
        this.downloadBlob(file);
        this.exportInProgress.set(false);
      },
      (err) => {
        this.toastrService.error(
          'An error has occurred while exporting data. Please try again in a few seconds.',
          'Error Exporting'
        );
        this.exportInProgress.set(false);
      }
    );
  }

  private downloadBlob(newBlob: Blob): void {
    // IE doesn't allow using a blob object directly as link href
    // instead it is necessary to use msSaveOrOpenBlob
    // @ts-ignore
    if (window.navigator && window.navigator.msSaveOrOpenBlob) {
      // @ts-ignore
      window.navigator.msSaveOrOpenBlob(newBlob);
      return;
    }

    // For other browsers:
    // Create a link pointing to the ObjectURL containing the blob.
    const data = window.URL.createObjectURL(newBlob);

    const link = document.createElement('a');
    link.href = data;
    link.download = `PrintReport_${new Date().toISOString()}.csv`;
    // this is necessary as link.click() does not work on the latest firefox
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window,
      })
    );

    setTimeout(() => {
      // For Firefox it is necessary to delay revoking the ObjectURL
      window.URL.revokeObjectURL(data);
      link.remove();
    }, 100);
  }

  public deactivateAccount() {
    this.deactivateHasBeenClicked.set(true);

    this.userService.deactivateCurrentUser().subscribe((updatedUser) => {
      this.authService.updateCurrentUserDeactivationDate(
        updatedUser.deactivationDateTime
      );

      window.scroll({
        top: 0,
        left: 0,
        behavior: 'smooth',
      });
    });
  }
}
