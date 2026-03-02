import { KeyValue } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../core/services/auth.service';
import { MetaTagService } from '../core/services/meta-tag.service';
import { PrintService, PrintViewStatus } from '../core/services/print.service';
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
import {
  Currencies,
  Currency,
} from '../core/resolvers/currencies-resolver.service';
import { SubscriptionService } from '../core/services/subscription.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  standalone: false,
})
export class SettingsComponent implements OnInit {
  userDetailsOnLoad: UserDetailDto;
  public defaultPrintViewStatusSettingOnLoad: UserSetting | null = null;

  public profileViewStatusTypes = ProfileViewStatus;
  public printViewStatusTypes = PrintViewStatus;

  public preferredCurrencyNameSettingOnLoad: UserSetting | null = null;
  public preferredCurrencySymbolSettingOnLoad: UserSetting | null = null;

  public defaultFilamentDiameterMmSettingOnLoad: UserSetting | null = null;
  public defaultFilamentPriceSettingOnLoad: UserSetting | null = null;

  public deactivateHasBeenClicked = false;

  /**
   * NgModel for Profile View Status
   */
  public profileViewStatus: ProfileViewStatus = null;
  /**
   * NgModel for Print View Status
   */
  public printViewStatus: PrintViewStatus = null;

  /**
   * NgModel for Currency
   */
  public preferredCurrency: string = null;

  /**
   * NgModel for Default Filament Diameter
   */
  public defaultFilamentDiameterMm: number = null;

  /**
   * NgModel for Default Filament Price
   */
  public defaultFilamentPrice: string = null;

  public exportInProgress = false;

  public deactivationAgreementChecked = false;

  public currencies: Currencies = null;

  constructor(
    private activatedRoute: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService,
    private userSettingService: UserSettingService,
    private readonly printService: PrintService,
    private readonly metaService: MetaTagService,
    private readonly toastrService: ToastrService
  ) {}

  readonly subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    this.metaService.setTitle('Settings - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.currencies = data.currencies;

      this.userDetailsOnLoad = data.currentUser;

      this.defaultPrintViewStatusSettingOnLoad =
        data.defaultPrintViewStatusSetting;

      this.preferredCurrencyNameSettingOnLoad =
        data.preferredCurrencyNameSetting;
      this.preferredCurrencySymbolSettingOnLoad =
        data.preferredCurrencySymbolSetting;

      this.defaultFilamentDiameterMmSettingOnLoad =
        data.defaultFilamentDiameterMmSetting;
      this.defaultFilamentPriceSettingOnLoad = data.defaultFilamentPriceSetting;

      // Default all the ngModels
      this.profileViewStatus = this.userDetailsOnLoad.viewStatus;
      this.printViewStatus = this.defaultPrintViewStatusSettingOnLoad
        ? +this.defaultPrintViewStatusSettingOnLoad.value
        : null;

      this.preferredCurrency = this.preferredCurrencyNameSettingOnLoad
        ? this.preferredCurrencyNameSettingOnLoad.value
        : 'USD';

      this.defaultFilamentDiameterMm = this
        .defaultFilamentDiameterMmSettingOnLoad
        ? +this.defaultFilamentDiameterMmSettingOnLoad.value
        : null;

      this.defaultFilamentPrice = this.defaultFilamentPriceSettingOnLoad
        ? this.defaultFilamentPriceSettingOnLoad.value
        : null;
    });

    this.authService.userProfile$.subscribe((user) => {
      if (user.deactivationDateTime) {
        this.deactivateHasBeenClicked = true;
      } else {
        // If the deactivate date time gets set back to null, then clear the click
        this.deactivateHasBeenClicked = false;
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
      ...this.userDetailsOnLoad,
      viewStatus: newViewStatus,
    };
    this.userService
      .updateCurrentUserDetail(newUserDetail)
      .subscribe((user) => {
        this.userDetailsOnLoad = user;
        this.profileViewStatus = this.userDetailsOnLoad.viewStatus;
      });
  }

  saveDefaultPrintViewStatus(newViewStatus: PrintViewStatus) {
    if (this.defaultPrintViewStatusSettingOnLoad) {
      this.userSettingService
        .updateUserSetting(
          this.defaultPrintViewStatusSettingOnLoad.id,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSettingOnLoad = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Prints_DefaultPrintViewStatus,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSettingOnLoad = setting;
        });
    }
  }

  cancelDefaultPrintViewStatus() {
    this.printViewStatus = this.defaultPrintViewStatusSettingOnLoad
      ? +this.defaultPrintViewStatusSettingOnLoad.value
      : null;
  }

  savePreferredCurrency(newCurrency: string) {
    if (this.preferredCurrencyNameSettingOnLoad) {
      this.userSettingService
        .updateUserSetting(
          this.preferredCurrencyNameSettingOnLoad.id,
          newCurrency.toString()
        )
        .subscribe((setting) => {
          this.preferredCurrencyNameSettingOnLoad = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(UserSettingType.Currency_Name, newCurrency.toString())
        .subscribe((setting) => {
          this.preferredCurrencyNameSettingOnLoad = setting;
        });
    }

    const symbol = this.currencies[newCurrency].symbol;

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
    this.preferredCurrency = this.preferredCurrencyNameSettingOnLoad
      ? this.preferredCurrencyNameSettingOnLoad.value
      : 'USD';
  }

  saveDefaultFilamentDiameterMm(newDiameterMm: number) {
    if (this.defaultFilamentDiameterMmSettingOnLoad) {
      this.userSettingService
        .updateUserSetting(
          this.defaultFilamentDiameterMmSettingOnLoad.id,
          newDiameterMm.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentDiameterMmSettingOnLoad = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Filaments_DefaultDiameterMm,
          newDiameterMm.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentDiameterMmSettingOnLoad = setting;
        });
    }
  }

  cancelDefaultFilamentDiameterMm() {
    this.defaultFilamentDiameterMm = this.defaultFilamentDiameterMmSettingOnLoad
      ? +this.defaultFilamentDiameterMmSettingOnLoad.value
      : null;
  }

  saveDefaultFilamentPrice(newPrice: string) {
    if (this.defaultFilamentPriceSettingOnLoad) {
      this.userSettingService
        .updateUserSetting(
          this.defaultFilamentPriceSettingOnLoad.id,
          newPrice.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentPriceSettingOnLoad = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Filaments_DefaultPrice,
          newPrice.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentPriceSettingOnLoad = setting;
        });
    }
  }

  cancelDefaultFilamentPrice() {
    this.defaultFilamentPrice = this.defaultFilamentPriceSettingOnLoad
      ? this.defaultFilamentPriceSettingOnLoad.value
      : null;
  }

  public manageSubscription(): void {
    this.subscriptionService.createPortalSession().subscribe((result) => {
      window.location.href = result.url;
    });
  }

  public export() {
    if (this.exportInProgress) {
      return; // prevent multiple exports;
    }

    this.exportInProgress = true;
    this.printService.exportAllPrintsAsCsv().subscribe(
      (file) => {
        this.downloadBlob(file);
        this.exportInProgress = false;
      },
      (err) => {
        this.toastrService.error(
          'An error has occurred while exporting data. Please try again in a few seconds.',
          'Error Exporting'
        );
        this.exportInProgress = false;
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
    this.deactivateHasBeenClicked = true;

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
