import { Location } from '@angular/common';
import {
  Component,
  Inject,
  OnDestroy,
  OnInit,
  DOCUMENT,
  inject,
  signal,
} from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  AuthService,
  UserProfileInfo,
} from 'src/app/core/services/auth.service';
import { MetaTagService } from 'src/app/core/services/meta-tag.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { UserSummaryDto } from 'src/app/core/services/user.service';
import { environment } from 'src/environments/environment';
import {
  ElectricityCost,
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintService,
  PrintStatus,
} from '../../core/services/print.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';

export interface PrintImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault: boolean;
  displayOrder: number;
}

@Component({
  selector: 'app-view-print-detail',
  templateUrl: './view-print-detail.component.html',
  styleUrls: ['./view-print-detail.component.scss'],
  standalone: false,
})
export class ViewPrintDetailComponent implements OnInit, OnDestroy {
  public printers: PrinterSummary[] = [];

  public printForm: UntypedFormGroup;

  public print: PrintDetail;
  public user: UserSummaryDto;

  public printImages: PrintImageValue[] = [];
  public selectedImage: PrintImageValue = null;
  public selectedImageIndex = 0;

  public printStatusTypes = PrintStatus;

  public isUserProfileFeatureEnabled = environment.features.userProfile;
  userProfileSubscription: Subscription;
  currentUser: UserProfileInfo;

  public printFilamentSourceMeasurementTypes = PrintFilamentSourceMeasurement;

  public preferredCurrencySymbolSetting: UserSetting | null = null;
  public defaultElectricityKwhRateSetting: UserSetting | null = null;
  public defaultElectricityWattageSetting: UserSetting | null = null;

  public preferredFilamentUnit = signal<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.Weight
  );
  private readonly userSettingService = inject(UserSettingService);

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private printService: PrintService,
    private authService: AuthService,
    private readonly metaService: MetaTagService,
    @Inject(DOCUMENT) private readonly document: Document,
    private location: Location
  ) {}
  ngOnDestroy(): void {
    if (this.userProfileSubscription) {
      this.userProfileSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.userProfileSubscription = this.authService.userProfile$.subscribe(
      (currentUser) => {
        this.currentUser = currentUser;
      }
    );

    this.activatedRoute.data.subscribe((data) => {
      this.printers = data.printers;

      this.print = data.print.print;
      this.user = data.print.user;

      this.preferredCurrencySymbolSetting = data.preferredCurrencySymbolSetting;
      this.defaultElectricityKwhRateSetting =
        data.defaultElectricityKwhRateSetting;
      this.defaultElectricityWattageSetting =
        data.defaultElectricityWattageSetting;

      if (this.print.images?.length > 0) {
        this.printImages = this.print.images
          .map((image) => ({
            id: image.id,
            url: `${environment.printLogApiUrl}/api/Prints/${this.print.id}/image/${image.id}`,
            file: null,
            isDefault: image.isDefault,
            displayOrder: image.displayOrder,
          }))
          .sort((a, b) => a.displayOrder - b.displayOrder);

        this.selectedImage =
          this.printImages.find((i) => i.isDefault) || this.printImages[0];
        this.selectedImageIndex = this.printImages.indexOf(this.selectedImage);
      }

      this.metaService.setTitle(`${this.print.title} - 3D Print Log`);

      this.setMetaTags();
    });

    this.userSettingService
      .getCurrentUsersSettingByType(
        UserSettingType.Prints_PreferredFilamentDisplayUnit
      )
      .then((setting) => {
        if (setting) {
          this.preferredFilamentUnit.set(
            +setting.value as PrintFilamentSourceMeasurement
          );
        }
      });
  }

  setMetaTags() {
    const url = `${this.document.location.origin}/prints/${this.print.id}`;
    const title = `${this.print.title} | 3D Print Log`;
    const description = `${this.print.title} printed by ${
      this.user.displayName
    } on ${new Intl.DateTimeFormat(navigator.language, { dateStyle: 'long' }).format(new Date(this.print.startDate))}`;
    const imageUrl = this.selectedImage
      ? `${environment.printLogApiUrl}/api/Prints/${this.print.id}/image/${this.selectedImage.id}`
      : '';

    this.metaService.setSocialMediaTags(url, title, description, imageUrl);
  }

  handleClose() {
    this.location.back();
  }

  getPrinterLabel(printer: PrinterSummary) {
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(
        printer.make +
        ' ' +
        printer.model
      ).trim()})`;
    } else {
      return `${(printer.make + ' ' + printer.model).trim()}`;
    }
  }

  public getStatus(status: PrintStatus) {
    if (status === PrintStatus.Cancelled) {
      return 'Cancelled';
    } else if (status === PrintStatus.Failed) {
      return 'Failed';
    } else if (status === PrintStatus.Pending) {
      return 'Pending';
    } else if (status === PrintStatus.Printing) {
      return 'Printing';
    } else if (status === PrintStatus.Success) {
      return 'Success';
    } else if (status === PrintStatus.PartialSuccess) {
      return 'Partial Success';
    } else {
      return 'Unknown';
    }
  }

  addComment(newComment: string) {
    this.printService
      .addPrintComment(this.print.id, newComment)
      .subscribe((comment) => {
        this.print.comments.push(comment);
      });
  }

  onImageSelected(image: PrintImageValue): void {
    this.selectedImage = image;
    this.selectedImageIndex = this.printImages.indexOf(image);
  }

  onCarouselIndexChange(index: number): void {
    this.selectedImageIndex = index;
    this.selectedImage = this.printImages[index];
  }

  public getElectricityCost(): ElectricityCost {
    return this.printService.calculateElectricityCost({
      printTimeSeconds:
        this.print.printTimeInSeconds ?? this.print.estimatedPrintTimeInSeconds,
      kwhRate: this.defaultElectricityKwhRateSetting?.value,
      printerWattageW: this.print.printer?.wattageW,
      defaultWattageW: this.defaultElectricityWattageSetting?.value,
      currencySymbol: this.preferredCurrencySymbolSetting?.value ?? '$',
    });
  }
}
