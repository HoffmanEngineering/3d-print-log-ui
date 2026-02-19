import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  DestroyRef,
} from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import moment from 'moment';
import { ActiveToast, ToastrService } from 'ngx-toastr';
import parse from 'parse-duration';
import { environment } from 'src/environments/environment';

import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { concat, forkJoin, Observable, of, Subscription } from 'rxjs';
import { map, mergeMap, take, toArray } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrinterService,
  PrinterSummary,
} from 'src/app/core/services/printer.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  EMPTY_GUID,
  FilamentPrice,
  FilamentPriceInvalid,
  PrintDetail,
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintImage,
  PrintService,
  PrintStatus,
  PrintViewStatus,
} from '../../core/services/print.service';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';
import { ThumbnailImage } from 'src/app/shared/image-thumbnail-strip/image-thumbnail-strip.component';
import {
  Currencies,
  Currency,
} from 'src/app/core/resolvers/currencies-resolver.service';
import { GoogleAnalyticsService } from 'src/app/core/services/google-analytics.service';

export interface PrintImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault?: boolean;
  displayOrder?: number;
}

export interface PrintFilamentUsageFormValue {
  id: string;
  amountG: number | null;
  lengthInM: number | null;
  volumeMl: number | null;
  source: PrintFilamentSourceMeasurement;
  estimatedAmountG: number | null;
  estimatedLengthInM: number | null;
  estimatedVolumeMl: number | null;
  estimatedSource: PrintFilamentSourceMeasurement;
  filament: FilamentSummary | null;
  notes: string | null;
}

export type FilamentUsageFormGroup = FormGroup<{
  id: FormControl<string>;
  amountG: FormControl<number | null>;
  lengthInM: FormControl<number | null>;
  volumeMl: FormControl<number | null>;
  source: FormControl<PrintFilamentSourceMeasurement>;
  estimatedAmountG: FormControl<number | null>;
  estimatedLengthInM: FormControl<number | null>;
  estimatedVolumeMl: FormControl<number | null>;
  estimatedSource: FormControl<PrintFilamentSourceMeasurement>;
  filament: FormControl<FilamentSummary | null>;
  notes: FormControl<string | null>;
}>;

export interface PrintFormValue {
  id: number | null;
  title: string;
  printerId: number | null;
  startDate: Date;
  startTime: string;
  estimatedPrintTimeInSeconds: string | null;
  estimatedFilamentUsageG: number | null;
  printTimeInSeconds: string | null;
  filamentUsageG: number | null;
  filamentType: string;
  filamentUsage: PrintFilamentUsageFormValue[];
  notes: string;
  url: string;
  fileName: string;
  status: PrintStatus;
  viewStatus: PrintViewStatus;
  images: PrintImageValue[];
  allowComments: boolean;
}

@Component({
  selector: 'app-print-detail',
  templateUrl: './edit-print-detail.component.html',
  styleUrls: ['./edit-print-detail.component.scss'],
  standalone: false,
  host: {
    '(window:beforeunload)': 'canDeactivate()',
  },
})
export class EditPrintDetailComponent
  implements OnInit, ComponentCanDeactivate, OnDestroy
{
  public static OTHER_FILAMENT_OPTION: Partial<FilamentSummary> = {
    id: EMPTY_GUID,
    displayName: 'Other',
  } as const;

  private static readonly MEASURE_TYPE_MAP: Record<
    string,
    PrintFilamentSourceMeasurement
  > = {
    Weight: PrintFilamentSourceMeasurement.Weight,
    Length: PrintFilamentSourceMeasurement.Length,
    Volume: PrintFilamentSourceMeasurement.Volume,
  };

  private static readonly MATERIAL_CATEGORY_TO_USER_SETTING: Record<
    string,
    UserSettingType
  > = {
    filament: UserSettingType.Prints_LastSelectedFilamentMeasureType,
    resin: UserSettingType.Prints_LastSelectedResinMeasureType,
    powder: UserSettingType.Prints_LastSelectedPowderMeasureType,
    wire: UserSettingType.Prints_LastSelectedWireMeasureType,
  };

  public printers: PrinterSummary[] = [];

  private printerLabelCache = new Map<number, string>();
  private priceCache = new Map<string, string>();

  public printForm!: FormGroup<{
    id: FormControl<number | null>;
    title: FormControl<string>;
    printerId: FormControl<number | null>;
    startDate: FormControl<Date>;
    startTime: FormControl<string>;
    estimatedPrintTimeInSeconds: FormControl<string | null>;
    estimatedFilamentUsageG: FormControl<number | null>;
    printTimeInSeconds: FormControl<string | null>;
    filamentUsageG: FormControl<number | null>;
    filamentType: FormControl<string>;
    filamentUsage: FormArray<FormGroup>;
    notes: FormControl<string>;
    url: FormControl<string>;
    fileName: FormControl<string>;
    status: FormControl<PrintStatus>;
    viewStatus: FormControl<PrintViewStatus>;
    images: FormArray<FormControl<PrintImageValue>>;
    allowComments: FormControl<boolean>;
  }>;

  public printStatusTypes = PrintStatus;
  public printViewStatusTypes = PrintViewStatus;
  public printFilamentSourceMeasurementTypes = PrintFilamentSourceMeasurement;

  public selectedImage: FormControl<PrintImageValue> | null = null;

  public defaultImageIdOnLoad: number | null = null;

  private imageIdsToDelete: number[] = [];

  /**
   * Cached images for thumbnail strip - memoized to prevent re-creation
   * during drag-drop operations which would break CDK drag state
   */
  public cachedImagesForStrip: ThumbnailImage[] = [];

  /**
   * If the form is currently saving.
   */
  public saving = false;

  public lastSelectedPrinterSetting: UserSetting | null = null;

  public defaultPrintViewStatusSetting: UserSetting | null = null;

  public lastAllowCommentsSetting: UserSetting | null = null;

  public lastMaterialMeasureSettings: {
    [materialCategoryNickname: string]: UserSetting | null;
  } = {};

  printerRedirectPromptSubscription: Subscription | undefined;
  printerRedirectToast: ActiveToast<any> | undefined;
  printerRedirectSubscription: Subscription | undefined;

  /** The estimated datetime of completion. Used just as display, based on the startDate and EstimatedPrintTimeInSeconds controls. */
  public estimatedCompletedDate: Date | null = null;
  estimatedCompletedDateSubscription: Subscription | undefined;
  /** The actual datetime of completion. Used as a display and input, but any changes will drive the PrintTimeInSeconds control. */
  public actualCompletedDate: Date | null = null;
  actualCompletedDateSubscription: Subscription | undefined;

  public currencies: Currencies;

  public preferredCurrency: Currency | undefined = undefined;

  public preferredCurrencyNameSetting: UserSetting | null = null;

  public defaultFilamentPriceSetting: UserSetting | null = null;

  /**
   * The name of the selected printer's material category. Defaults to 'material' is none is selected
   */
  public materialCategoryNameForSelectedPrinter: string = 'material';

  /**
   * Whether a file is being dragged over the drop zone
   */
  public isDragOver = false;

  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(FormBuilder);
  private readonly printService = inject(PrintService);
  private readonly printerService = inject(PrinterService);
  private readonly toastr = inject(ToastrService);
  private readonly titleService = inject(Title);
  private readonly userSettingService = inject(UserSettingService);
  private readonly printerRedirectPromptService = inject(
    PrinterRedirectPromptService
  );
  private readonly loggingService = inject(LoggingService);
  private readonly el = inject(ElementRef);
  public readonly dialog = inject(MatDialog);
  private readonly analyticsService = inject(GoogleAnalyticsService);
  private readonly destroyRef = inject(DestroyRef);

  // Help to get all photos controls as form array.
  get images(): FormArray<FormControl<PrintImageValue>> {
    return this.printForm.get('images') as FormArray<
      FormControl<PrintImageValue>
    >;
  }

  // Help to get all print filament usage controls as form array.
  get filamentUsage(): FormArray<FilamentUsageFormGroup> {
    return this.printForm.get(
      'filamentUsage'
    ) as FormArray<FilamentUsageFormGroup>;
  }

  ngOnDestroy(): void {
    this.printerRedirectPromptSubscription?.unsubscribe?.();

    this.printerRedirectSubscription?.unsubscribe?.();

    this.estimatedCompletedDateSubscription?.unsubscribe?.();

    this.actualCompletedDateSubscription?.unsubscribe?.();
  }

  canDeactivate(): boolean | Observable<boolean> {
    return !this.printForm.dirty;
  }

  async ngOnInit() {
    this.titleService.setTitle('Print Details - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.preferredCurrencyNameSetting = data.preferredCurrencyNameSetting;
      this.currencies = data.currencies;

      const preferredCurrencyName =
        this.preferredCurrencyNameSetting?.value ?? 'USD';
      this.preferredCurrency = this.currencies[preferredCurrencyName];

      this.printers = data.printers;

      // Build printer label cache for performance
      this.buildPrinterLabelCache();

      this.lastSelectedPrinterSetting = data.lastSelectedPrintSetting;
      this.defaultPrintViewStatusSetting = data.defaultPrintViewStatusSetting;
      this.lastAllowCommentsSetting = data.lastAllowCommentsSetting;
      this.lastMaterialMeasureSettings = data.lastMaterialMeasureSettings;

      this.defaultFilamentPriceSetting = data.defaultFilamentPriceSetting;

      this.printForm = this.buildFormFromPrintDetail(data.print.print);
      this.updateCachedImagesForStrip();

      // update print form with the last loaded filament
      const printIsNew = this.printForm.get('id').value === null;
      const filamentIsEmpty =
        this.filamentUsage.length === 0 ||
        this.filamentUsage.at(0)?.get('filament')?.value ===
          EditPrintDetailComponent.OTHER_FILAMENT_OPTION ||
        this.filamentUsage.at(0)?.get('filament')?.value?.id === EMPTY_GUID;

      const printerHasBeenSelected =
        this.printForm.get('printerId').value !== null;

      this.setMaterialCategoryNameForPrinterId(
        this.printForm.get('printerId').value
      );

      if (printIsNew && filamentIsEmpty && printerHasBeenSelected) {
        this.printerService
          .getLoadedFilamentForPrinter(this.printForm.get('printerId').value)
          .subscribe((loadedFilament) => {
            const defaultMeasureType =
              this.getDefaultMeasureTypeForSelectedPrinter(
                this.printForm.get('printerId').value
              );

            for (let i = 1; i <= loadedFilament.length; i++) {
              // If there is a filament usage with OTHER in this index, just update the filament
              const filament = loadedFilament[i - 1].filament;

              if (
                this.filamentUsage.length >= i &&
                (this.filamentUsage.at(i - 1).get('filament').value ===
                  EditPrintDetailComponent.OTHER_FILAMENT_OPTION ||
                  this.filamentUsage.at(i - 1).get('filament').value?.id ===
                    EMPTY_GUID)
              ) {
                this.filamentUsage
                  .at(i - 1)
                  .get('filament')
                  .setValue(filament);
              }
              // Else, add a new control:
              else {
                const newFormGroup = this.GetNewFilamentUsageForm(
                  EMPTY_GUID,
                  0,
                  0,
                  0,
                  defaultMeasureType,
                  0,
                  0,
                  0,
                  defaultMeasureType,
                  filament,
                  ''
                );

                this.filamentUsage.push(newFormGroup);
              }
            }

            this.filamentUsage.markAsPristine();
          });
      }

      this.onChanges();
      this.getEstimatedCompletedDate();
      this.getActualCompletedDate();
    });

    /**
     * Show the Add Printer prompt if needed.
     */
    this.printerRedirectPromptSubscription = this.printerRedirectPromptService
      .shouldShowAddPrinterPrompt()
      .subscribe((shouldShowPrompt) => {
        if (shouldShowPrompt) {
          this.printerRedirectToast = this.toastr.info(
            'Click here to add a new 3D Printer before logging prints.',
            'No Active Printers',
            {
              disableTimeOut: true,
            }
          );

          this.printerRedirectSubscription =
            this.printerRedirectToast.onTap.subscribe(() => {
              this.router.navigate(['printers', 'new'], {
                queryParams: {
                  returnUrl: this.activatedRoute.snapshot['_routerState'].url,
                },
              });
              this.printerRedirectSubscription.unsubscribe();
            });
        }
      });
  }

  getDefaultMeasureTypeForSelectedPrinter(printerId: number | null) {
    // Get the printer by Id
    const { userSetting: lastMeasureSetting } =
      this.getMeasureUserSettingForPrinterMaterial(printerId);

    // Get the default measure type for that material category using lookup map
    const defaultMeasureType =
      EditPrintDetailComponent.MEASURE_TYPE_MAP[lastMeasureSetting?.value] ??
      PrintFilamentSourceMeasurement.Weight;

    return defaultMeasureType;
  }

  private getMeasureUserSettingForPrinterMaterial(printerId: number | null) {
    const printer = this.printers.find((p) => p.id === printerId);

    // Get the material category name for that printer
    const materialCategoryName = (
      printer?.category?.materialCategory?.nickname ?? 'filament'
    ).toLowerCase();

    // Get the last filament measure setting for that material category
    const lastMeasureSetting =
      this.lastMaterialMeasureSettings?.[materialCategoryName];
    return { materialCategoryName, userSetting: lastMeasureSetting };
  }

  /**
   * Build cache of printer labels for performance optimization in templates
   */
  private buildPrinterLabelCache(): void {
    this.printerLabelCache.clear();
    this.printers.forEach((printer) => {
      const label =
        printer.name && printer.name !== ''
          ? `${printer.name} - (${(printer.make + ' ' + printer.model).trim()})`
          : `${(printer.make + ' ' + printer.model).trim()}`;
      this.printerLabelCache.set(printer.id, label);
    });
  }

  /**
   * Generate cache key for price calculations
   */
  private getPriceCacheKey(
    filamentId: string | undefined,
    source: PrintFilamentSourceMeasurement,
    weightG: number | null,
    lengthM: number | null,
    volumeMl: number | null,
    type: 'estimated' | 'actual'
  ): string {
    return `${type}_${filamentId}_${source}_${weightG}_${lengthM}_${volumeMl}`;
  }

  /**
   * Clear price cache when form values change
   */
  private clearPriceCache(): void {
    this.priceCache.clear();
  }

  private onChanges() {
    this.SaveSettingWhenSelectedPrinterIdChanges();
    this.SaveSettingWhenAllowCommentsChanges();
    this.loadLoadedFilamentOnPrinterChange();
    this.getEstimatedCompletedDateChanges();
    this.getActualCompletedDateChanges();
    this.clearPriceCacheOnFilamentChanges();
  }

  /**
   * Clear price cache when filament usage form values change
   */
  private clearPriceCacheOnFilamentChanges(): void {
    this.filamentUsage.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.clearPriceCache();
      });
  }

  private getEstimatedCompletedDateChanges() {
    this.estimatedCompletedDateSubscription = new Subscription();

    this.estimatedCompletedDateSubscription.add(
      this.printForm.get('startDate').valueChanges.subscribe(() => {
        this.getEstimatedCompletedDate();
      })
    );

    this.estimatedCompletedDateSubscription.add(
      this.printForm.get('startTime').valueChanges.subscribe(() => {
        this.getEstimatedCompletedDate();
      })
    );

    this.estimatedCompletedDateSubscription.add(
      this.printForm
        .get('estimatedPrintTimeInSeconds')
        .valueChanges.subscribe(() => {
          this.getEstimatedCompletedDate();
        })
    );
  }

  private getActualCompletedDateChanges() {
    this.actualCompletedDateSubscription = new Subscription();

    this.actualCompletedDateSubscription.add(
      this.printForm.get('startDate').valueChanges.subscribe(() => {
        this.getActualCompletedDate();
      })
    );

    this.actualCompletedDateSubscription.add(
      this.printForm.get('startTime').valueChanges.subscribe(() => {
        this.getActualCompletedDate();
      })
    );

    this.actualCompletedDateSubscription.add(
      this.printForm.get('printTimeInSeconds').valueChanges.subscribe(() => {
        this.getActualCompletedDate();
      })
    );
  }

  loadLoadedFilamentOnPrinterChange() {
    this.printForm
      .get('printerId')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newPrinterId: number | null) => {
        const isFilamentPristine = this.filamentUsage.pristine;
        const isPrintNew = this.printForm.get('id')?.value === null;

        if (isPrintNew && isFilamentPristine) {
          this.printerService
            .getLoadedFilamentForPrinter(newPrinterId)
            .subscribe((loadedFilament) => {
              // Add a new filament usage for the currently loaded filament for that printer.

              const defaultMeasureType =
                this.getDefaultMeasureTypeForSelectedPrinter(newPrinterId);

              for (let i = 1; i <= loadedFilament.length; i++) {
                // If there is a filament usage with OTHER in this index, just update the filament
                const filament = loadedFilament[i - 1].filament;

                if (this.filamentUsage.length >= i) {
                  this.filamentUsage
                    .at(i - 1)
                    .get('filament')
                    .setValue(filament);
                }
                // Else, add a new control:
                else {
                  const newFormGroup = this.GetNewFilamentUsageForm(
                    EMPTY_GUID,
                    0,
                    0,
                    0,
                    defaultMeasureType,
                    0,
                    0,
                    0,
                    defaultMeasureType,
                    filament,
                    ''
                  );

                  this.filamentUsage.push(newFormGroup);
                }
              }
            });
        }
      });
  }
  public HandleFilamentMeasureTypeChange(
    source: PrintFilamentSourceMeasurement
  ) {
    const newValue =
      source === PrintFilamentSourceMeasurement.Weight
        ? 'Weight'
        : source === PrintFilamentSourceMeasurement.Length
          ? 'Length'
          : 'Volume';

    // Find the last filament measure setting for the selected printer's material category
    const { materialCategoryName, userSetting } =
      this.getMeasureUserSettingForPrinterMaterial(
        this.printForm.get('printerId').value
      );

    if (userSetting) {
      this.userSettingService
        .updateUserSetting(userSetting.id, newValue)
        .subscribe((setting) => {
          this.lastMaterialMeasureSettings[materialCategoryName] = setting;
        });
    } else {
      const materialUserSettingType =
        EditPrintDetailComponent.MATERIAL_CATEGORY_TO_USER_SETTING[
          materialCategoryName
        ];

      if (!materialUserSettingType) {
        console.warn(
          `Unknown material type ${materialCategoryName}, unable to save user setting.`
        );
        return;
      }

      this.userSettingService
        .addUserSetting(materialUserSettingType, newValue)
        .subscribe((setting) => {
          this.lastMaterialMeasureSettings[materialCategoryName] = setting;
        });
    }
  }

  private SaveSettingWhenSelectedPrinterIdChanges() {
    this.printForm
      .get('printerId')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((newPrinterId: number | null) => {
        // Save the name of the selected printer's material category. Defaults to 'material' is none is selected
        this.setMaterialCategoryNameForPrinterId(newPrinterId);

        // Save the last selected printer setting.
        if (this.lastSelectedPrinterSetting) {
          this.userSettingService
            .updateUserSetting(
              this.lastSelectedPrinterSetting.id,
              newPrinterId.toString()
            )
            .subscribe((setting) => {
              this.lastSelectedPrinterSetting = setting;
            });
        } else {
          this.userSettingService
            .addUserSetting(
              UserSettingType.Prints_LastSelectedPrinterId,
              newPrinterId.toString()
            )
            .subscribe((setting) => {
              this.lastSelectedPrinterSetting = setting;
            });
        }
      });
  }

  private setMaterialCategoryNameForPrinterId(newPrinterId: number | null) {
    const printer = this.printers.find((p) => p.id === newPrinterId);
    this.materialCategoryNameForSelectedPrinter =
      printer?.category?.materialCategory.name ?? 'material';
  }

  private SaveSettingWhenAllowCommentsChanges() {
    this.printForm
      .get('allowComments')
      .valueChanges.pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((allowComments: boolean) => {
        if (this.lastAllowCommentsSetting) {
          this.userSettingService
            .updateUserSetting(
              this.lastAllowCommentsSetting.id,
              allowComments.toString()
            )
            .subscribe((setting) => {
              this.lastAllowCommentsSetting = setting;
            });
        } else {
          this.userSettingService
            .addUserSetting(
              UserSettingType.Prints_LastSelectedAllowComments,
              allowComments.toString()
            )
            .subscribe((setting) => {
              this.lastAllowCommentsSetting = setting;
            });
        }
      });
  }

  changeDefaultViewStatus(newViewStatus: PrintViewStatus) {
    this.loggingService.logEvent('ChangedDefaultViewStatus', {
      status: newViewStatus,
    });
    if (this.defaultPrintViewStatusSetting) {
      this.userSettingService
        .updateUserSetting(
          this.defaultPrintViewStatusSetting.id,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSetting = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Prints_DefaultPrintViewStatus,
          newViewStatus.toString()
        )
        .subscribe((setting) => {
          this.defaultPrintViewStatusSetting = setting;
        });
    }
  }

  buildFormFromPrintDetail(print: PrintDetail): FormGroup<{
    id: FormControl<number | null>;
    title: FormControl<string>;
    printerId: FormControl<number | null>;
    startDate: FormControl<Date>;
    startTime: FormControl<string>;
    estimatedPrintTimeInSeconds: FormControl<string | null>;
    estimatedFilamentUsageG: FormControl<number | null>;
    printTimeInSeconds: FormControl<string | null>;
    filamentUsageG: FormControl<number | null>;
    filamentType: FormControl<string>;
    filamentUsage: FormArray<FormGroup>;
    notes: FormControl<string>;
    url: FormControl<string>;
    fileName: FormControl<string>;
    status: FormControl<PrintStatus>;
    viewStatus: FormControl<PrintViewStatus>;
    images: FormArray<FormControl<PrintImageValue>>;
    allowComments: FormControl<boolean>;
  }> {
    const imageArray = this.formBuilder.array<FormControl<PrintImageValue>>([]);

    if (print && print.images) {
      // Sort images by displayOrder before adding to form array
      const sortedImages = [...print.images].sort(
        (a, b) => a.displayOrder - b.displayOrder
      );

      sortedImages.forEach((image) => {
        const newImage: PrintImageValue = {
          id: image.id,
          url: `${environment.printLogApiUrl}/api/Prints/${print.id}/image/${image.id}`,
          file: null,
          isDefault: image.isDefault,
          displayOrder: image.displayOrder,
        };
        const newControl = this.createItem(newImage);
        imageArray.push(newControl);

        if (newImage.isDefault) {
          this.selectedImage = newControl;
          this.defaultImageIdOnLoad = image.id;
        }
      });
    }

    // Handle PrintFilament Usage
    const printFilamentUsageArray = this.formBuilder.array<FormGroup>([]);

    if (print && print.filamentUsage && print.filamentUsage.length >= 0) {
      print.filamentUsage.forEach((pf) => {
        const newFormGroup = this.GetNewFilamentUsageForm(
          pf.id,
          pf.amountMg / 1000,
          pf.lengthInM,
          pf.volumeMl,
          pf.source,
          pf.estimatedAmountMg / 1000,
          pf.estimatedLengthInM,
          pf.estimatedVolumeMl,
          pf.estimatedSource,
          pf.filament,
          pf.notes
        );

        printFilamentUsageArray.push(newFormGroup);
      });
    }

    // Convert the old filamentType/FilamentUsage properties into the new Filament Usage format.
    if (
      print &&
      (!(print.filamentType === null || print.filamentType === '') ||
        print.filamentUsageMg > 0 ||
        print.estimatedFilamentUsageMg > 0)
    ) {
      const newFormGroup = this.GetNewFilamentUsageForm(
        EMPTY_GUID,
        print.filamentUsageMg / 1000,
        null,
        null,
        PrintFilamentSourceMeasurement.Weight,
        print.estimatedFilamentUsageMg / 1000,
        null,
        null,
        PrintFilamentSourceMeasurement.Weight,
        EditPrintDetailComponent.OTHER_FILAMENT_OPTION as FilamentSummary,
        print.filamentType
      );

      printFilamentUsageArray.push(newFormGroup);
    }

    return this.formBuilder.group({
      id: [print ? print.id : null],
      title: [print ? print.title : '', Validators.required],
      printerId: [
        print && print.printerId !== null
          ? print.printerId
          : this.lastSelectedPrinterSetting
            ? +this.lastSelectedPrinterSetting.value
            : null,
        Validators.required,
      ],
      startDate: [
        print
          ? print.startDate
            ? moment(print.startDate).toDate()
            : moment().toDate()
          : moment().toDate(),
        Validators.required,
      ],
      startTime: [
        print
          ? print.startDate
            ? moment(print.startDate).format('HH:mm:ss')
            : moment().format('HH:mm:ss')
          : moment().format('HH:mm:ss'),
        Validators.required,
      ],
      estimatedPrintTimeInSeconds: [
        print ? this.parseIntoString(print.estimatedPrintTimeInSeconds) : null,
      ],
      estimatedFilamentUsageG: [
        print ? print.estimatedFilamentUsageMg / 1000 : null,
        [Validators.min(0)],
      ],
      printTimeInSeconds: [
        print ? this.parseIntoString(print.printTimeInSeconds) : null,
      ],
      filamentUsageG: [
        print ? print.filamentUsageMg / 1000 : null,
        [Validators.min(0)],
      ],
      filamentType: [print ? print.filamentType : ''],
      filamentUsage: printFilamentUsageArray,
      notes: [print?.notes ?? ''],
      url: [print ? print.url : ''],
      fileName: [print?.fileName ?? ''],
      status: [print ? print.status : PrintStatus.Pending],
      viewStatus: [
        print && print.viewStatus !== null
          ? print.viewStatus
          : this.defaultPrintViewStatusSetting
            ? +this.defaultPrintViewStatusSetting.value
            : PrintViewStatus.Private,
      ],
      images: imageArray,
      allowComments: [
        print && print.allowComments !== null
          ? print.allowComments
          : this.lastAllowCommentsSetting
            ? !!this.lastAllowCommentsSetting.value
            : true,
      ],
    });
  }

  private GetNewFilamentUsageForm(
    id: string,
    amountG: number | null,
    lengthInM: number | null,
    volumeMl: number | null,
    source: PrintFilamentSourceMeasurement,
    estimatedAmountG: number | null,
    estimatedLengthInM: number | null,
    estimatedVolumeMl: number | null,
    estimatedSource: PrintFilamentSourceMeasurement,
    filament: FilamentSummary | null,
    notes: string | null
  ): FilamentUsageFormGroup {
    return this.formBuilder.group({
      id: this.formBuilder.control(id, { nonNullable: true }),
      amountG: this.formBuilder.control<number | null>(amountG),
      lengthInM: this.formBuilder.control<number | null>(lengthInM),
      volumeMl: this.formBuilder.control<number | null>(volumeMl),
      source: this.formBuilder.control(source, { nonNullable: true }),
      estimatedAmountG: this.formBuilder.control<number | null>(
        estimatedAmountG
      ),
      estimatedLengthInM: this.formBuilder.control<number | null>(
        estimatedLengthInM
      ),
      estimatedVolumeMl: this.formBuilder.control<number | null>(
        estimatedVolumeMl
      ),
      estimatedSource: this.formBuilder.control(estimatedSource, {
        nonNullable: true,
      }),
      filament: this.formBuilder.control<FilamentSummary | null>(filament),
      notes: this.formBuilder.control<string | null>(notes),
    });
  }

  public getEstimatedPrice(printFilamentGroup: FilamentUsageFormGroup): string {
    const filament = printFilamentGroup.get('filament')!
      .value as FilamentSummary;
    const source = printFilamentGroup.get('estimatedSource').value;
    const weightG = printFilamentGroup.get('estimatedAmountG').value;
    const lengthM = printFilamentGroup.get('estimatedLengthInM').value;
    const volumeMl = printFilamentGroup.get('estimatedVolumeMl').value;

    // Generate cache key
    const cacheKey = this.getPriceCacheKey(
      filament?.id,
      source,
      weightG,
      lengthM,
      volumeMl,
      'estimated'
    );

    // Check cache first
    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey)!;
    }

    // Calculate and cache
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
    const symbol = this.preferredCurrency.symbol;

    const result = this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament,
        source,
        weightG,
        lengthM,
        volumeMl,
        currencySymbol: symbol,
        defaultFilamentPrice: defaultPrice,
      })
    );

    this.priceCache.set(cacheKey, result);
    return result;
  }

  public getActualPrice(printFilamentGroup: FilamentUsageFormGroup): string {
    const filament = printFilamentGroup.get('filament')!
      .value as FilamentSummary;
    const source = printFilamentGroup.get('source').value;
    const weightG = printFilamentGroup.get('amountG').value;
    const lengthM = printFilamentGroup.get('lengthInM').value;
    const volumeMl = printFilamentGroup.get('volumeMl').value;

    // Generate cache key
    const cacheKey = this.getPriceCacheKey(
      filament?.id,
      source,
      weightG,
      lengthM,
      volumeMl,
      'actual'
    );

    // Check cache first
    if (this.priceCache.has(cacheKey)) {
      return this.priceCache.get(cacheKey)!;
    }

    // Calculate and cache
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
    const symbol = this.preferredCurrency.symbol;

    const result = this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament,
        source,
        weightG,
        lengthM,
        volumeMl,
        currencySymbol: symbol,
        defaultFilamentPrice: defaultPrice,
      })
    );

    this.priceCache.set(cacheKey, result);
    return result;
  }

  public formatFilamentPrice(price: FilamentPrice) {
    if (price.valid) {
      let result = price.formattedPrice;
      if (price.usesDefaultPrice) {
        result += '*';
      }
      return result;
    } else {
      return (price as FilamentPriceInvalid).message;
    }
  }

  // We will create multiple form controls inside defined form controls photos.
  createItem(data: PrintImageValue): FormControl<PrintImageValue> {
    const newItem = this.formBuilder.control(data);

    return newItem;
  }

  detectFiles(event: Event) {
    const target = event.target as HTMLInputElement;
    const files = target.files;
    if (files) {
      const currentCount = this.images.length;
      const maxAllowed = 5 - currentCount;

      if (maxAllowed <= 0) {
        this.toastr.warning('Maximum 5 images allowed', 'Limit Reached');
        return;
      }

      const filesToProcess = Array.from(files).slice(0, maxAllowed);

      for (const file of filesToProcess) {
        if (!file.type.match(/image.*/)) {
          this.toastr.error(
            'Please select an image.',
            'Selected file is not an Image'
          );
          continue;
        }

        const reader = new FileReader();
        reader.onload = (e: any) => {
          const maxOrder = this.images.controls.reduce(
            (max, ctrl) => Math.max(max, ctrl.value.displayOrder ?? -1),
            -1
          );

          const newItem = this.createItem({
            file,
            url: e.target.result, // Base64 string for preview image
            isDefault: this.images.length === 0,
            id: undefined,
            displayOrder: maxOrder + 1,
          });

          newItem.markAllAsTouched();
          newItem.markAsDirty();
          this.images.push(newItem);
          this.updateCachedImagesForStrip();

          if (!this.selectedImage) {
            this.selectedImage = newItem;
          }
        };
        reader.readAsDataURL(file);
      }
    }
  }

  selectImage(image: FormControl<PrintImageValue>) {
    this.selectedImage = image;
    this.setAsDefault(image); // TODO: Get right-click menu to make default
  }

  removeImage(image: FormControl<PrintImageValue>) {
    const imageId = image.value.id;
    if (imageId) {
      this.imageIdsToDelete.push(imageId);
    }

    const controlIndex = this.images.value.findIndex(
      (value) => value === image.value
    );

    if (controlIndex > -1) {
      this.images.removeAt(controlIndex);
    }

    if (image === this.selectedImage) {
      this.selectedImage = null;
    }
  }

  setAsDefault(image: FormControl<PrintImageValue>) {
    this.images.controls.forEach((control) => {
      control.setValue({ ...control.value, isDefault: false });
    });

    image.setValue({ ...image.value, isDefault: true });
  }

  onImagesReordered(event: {
    previousIndex: number;
    currentIndex: number;
  }): void {
    const { previousIndex, currentIndex } = event;

    // Get all current form values to preserve data
    const allValues = this.images.controls.map((ctrl) => ctrl.getRawValue());

    // Reorder the values array
    const reorderedValues = [...allValues];
    const [movedValue] = reorderedValues.splice(previousIndex, 1);
    reorderedValues.splice(currentIndex, 0, movedValue);

    // Update displayOrder for all values
    reorderedValues.forEach((value, index) => {
      value.displayOrder = index;
    });

    // Rebuild the FormArray with reordered values
    // Clear existing controls
    while (this.images.length > 0) {
      this.images.removeAt(0);
    }

    // Add controls back in new order
    reorderedValues.forEach((value) => {
      this.images.push(this.createItem(value));
    });

    this.images.markAsDirty();
    this.updateCachedImagesForStrip();
  }

  onDefaultChanged(image: ThumbnailImage): void {
    // Find the control by matching displayOrder since that's the stable identifier after sorting
    const control = this.images.controls.find(
      (c) => c.value.displayOrder === image.displayOrder
    );

    if (!control) {
      return;
    }

    // Clear existing default - must preserve all other properties when patching
    this.images.controls.forEach((ctrl) => {
      if (ctrl.value.isDefault) {
        ctrl.setValue({ ...ctrl.value, isDefault: false });
      }
    });

    // Set new default - must preserve all other properties when patching
    control.setValue({ ...control.value, isDefault: true });
    this.selectedImage = control;

    this.images.markAsDirty();
    this.updateCachedImagesForStrip();
  }

  onImageDeleted(image: ThumbnailImage): void {
    const index = this.images.controls.findIndex(
      (c) => c.value.id === image.id || c.value.url === image.url
    );
    if (index === -1) return;

    const control = this.images.at(index);
    const wasDefault = control.value.isDefault;

    // Track for API deletion if existing image
    if (control.value.id) {
      this.imageIdsToDelete.push(control.value.id);
    }

    this.images.removeAt(index);

    // If deleted was default, promote next image
    if (wasDefault && this.images.length > 0) {
      const nextDefault = this.images.at(0);
      nextDefault.setValue({ ...nextDefault.value, isDefault: true });
      this.selectedImage = nextDefault;
    } else if (this.images.length === 0) {
      this.selectedImage = null;
    }

    this.images.markAsDirty();
    this.updateCachedImagesForStrip();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files) {
      this.processDroppedFiles(files);
    }
  }

  private processDroppedFiles(files: FileList): void {
    const currentCount = this.images.length;
    const maxAllowed = 5 - currentCount;

    if (maxAllowed <= 0) {
      this.toastr.warning('Maximum 5 images allowed', 'Limit Reached');
      return;
    }

    const filesToProcess = Array.from(files).slice(0, maxAllowed);

    for (const file of filesToProcess) {
      if (!file.type.match(/image.*/)) {
        this.toastr.error(`${file.name} is not an image`, 'Invalid File');
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: any) => {
        const maxOrder = this.images.controls.reduce(
          (max, ctrl) => Math.max(max, ctrl.value.displayOrder ?? -1),
          -1
        );

        const newItem = this.createItem({
          file,
          url: e.target.result,
          isDefault: this.images.length === 0,
          displayOrder: maxOrder + 1,
        });
        newItem.markAllAsTouched();
        newItem.markAsDirty();
        this.images.push(newItem);
        this.updateCachedImagesForStrip();

        if (!this.selectedImage) {
          this.selectedImage = newItem;
        }
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Update the cached images for strip. Called whenever images change.
   * This is separate from the template to prevent re-creation during change detection.
   */
  private updateCachedImagesForStrip(): void {
    this.cachedImagesForStrip = this.images.controls
      .map((ctrl, index) => ({
        id: ctrl.value.id,
        url: ctrl.value.url,
        isDefault: ctrl.value.isDefault,
        displayOrder: ctrl.value.displayOrder,
        _index: index, // Keep track of original index for stable sorting
      }))
      .sort((a, b) => {
        const orderA = a.displayOrder ?? a._index;
        const orderB = b.displayOrder ?? b._index;
        if (orderA !== orderB) return orderA - orderB;
        // Stable sort: if displayOrder is the same, use original index
        return a._index - b._index;
      })
      .map(({ _index, ...item }) => item); // Remove _index from final array
  }

  getImagesForStrip(): ThumbnailImage[] {
    return this.cachedImagesForStrip;
  }

  onThumbnailSelected(image: ThumbnailImage): void {
    const control = this.images.controls.find(
      (c) => c.value.id === image.id || c.value.url === image.url
    );
    if (control) {
      this.selectedImage = control;
    }
  }

  onSubmit() {
    this.saving = true;

    // Validate
    this.printForm.markAllAsTouched();
    if (!this.printForm.valid) {
      this.saving = false;

      // Loop through all controls, focusing the first invalid control.
      for (const key of Object.keys(this.printForm.controls)) {
        if (this.printForm.controls[key].invalid) {
          const invalidControl = this.el.nativeElement.querySelector(
            '[formcontrolname="' + key + '"]'
          );
          invalidControl.focus();
          break;
        }
      }
      return;
    }

    const newPrint: Omit<PrintDetail, 'comments'> = this.getPrintFromForm();

    const newImages = this.images.controls.filter(
      (control) => control.value.id === undefined || control.value.id === null
    );

    // Check the selected default.
    const selectedDefaultImage = this.images.controls.filter(
      (control) => control.value.isDefault
    );

    let newDefaultImageId = null;
    // If the default image changed to another previously-saved image, then update the default.
    if (selectedDefaultImage.length > 0) {
      const defaultImage = selectedDefaultImage[0];
      if (
        defaultImage.value.id !== undefined &&
        defaultImage.value.id !== this.defaultImageIdOnLoad
      ) {
        newDefaultImageId = defaultImage.value.id;
      }
    }

    if (newPrint.id === null) {
      this.printService
        .addPrint(newPrint)
        .pipe(
          mergeMap((createdPrint: PrintDetail) => {
            if (newImages.length === 0) {
              return of(createdPrint);
            }

            // Sort by displayOrder to ensure correct sequence
            const sortedImages = [...newImages].sort(
              (a, b) =>
                (a.value.displayOrder ?? 0) - (b.value.displayOrder ?? 0)
            );

            const imagesToUpload = sortedImages.map((image) => {
              if (image.value.file !== null && image.value.file !== undefined) {
                return this.printService.uploadPrintImage(
                  createdPrint.id,
                  image.value.file,
                  image.value.isDefault
                );
              }

              // otherwise, assume its a new image from a data url:
              return this.printService.uploadPrintImageFromDataUrl(
                createdPrint.id,
                image.value.url,
                image.value.isDefault
              );
            });

            // Upload images sequentially to preserve displayOrder
            return concat(...imagesToUpload).pipe(
              toArray(),
              map(() => createdPrint)
            );
          }),
          mergeMap((createdPrint) => {
            if (newDefaultImageId) {
              return this.printService
                .setImageAsDefault(createdPrint.id, newDefaultImageId)
                .pipe(map(() => createdPrint));
            } else {
              return of(createdPrint);
            }
          }),
          mergeMap((createdPrint: PrintDetail) => {
            if (this.imageIdsToDelete.length === 0) {
              return of(createdPrint);
            }

            const imagesToDelete = this.imageIdsToDelete.map((imageId) => {
              return this.printService.deleteImage(createdPrint.id, imageId);
            });

            return forkJoin(imagesToDelete).pipe(
              take(1),
              map(() => createdPrint)
            );
          }),
          mergeMap((createdPrint: PrintDetail) => {
            // Reorder images if there are existing images with IDs
            const imagesToReorder = this.images.controls
              .filter((c) => c.value.id)
              .map((c) => ({
                imageId: c.value.id,
                displayOrder: c.value.displayOrder,
              }));

            if (imagesToReorder.length > 0) {
              return this.printService
                .reorderImages(createdPrint.id, imagesToReorder)
                .pipe(map(() => createdPrint));
            }
            return of(createdPrint);
          })
        )
        .subscribe(
          (createdPrint) => {
            this.analyticsService.emitConversion(
              environment.googleAds.trafficSearchConversion
            );

            this.printForm.markAsPristine();
            this.router.navigate(['/prints']).then(() => {
              this.toastr.success('Save successful!');
            });
          },
          (err) => {
            this.saving = false;
            this.loggingService.logTrace(
              `PrintErr: ${JSON.stringify(newPrint)}`
            );
            this.loggingService.logException(err);
          }
        );
    } else {
      this.printService
        .updatePrint(newPrint)
        .pipe(
          mergeMap((updatedPrint: PrintDetail) => {
            if (newImages.length === 0) {
              return of(updatedPrint);
            }

            // Sort by displayOrder to ensure correct sequence
            const sortedImages = [...newImages].sort(
              (a, b) =>
                (a.value.displayOrder ?? 0) - (b.value.displayOrder ?? 0)
            );

            const imagesToUpload = sortedImages.map((image) => {
              if (image.value.file !== null && image.value.file !== undefined) {
                return this.printService.uploadPrintImage(
                  updatedPrint.id,
                  image.value.file,
                  image.value.isDefault
                );
              }

              // otherwise, assume its a new image from a data url:
              return this.printService.uploadPrintImageFromDataUrl(
                updatedPrint.id,
                image.value.url,
                image.value.isDefault
              );
            });

            // Upload images sequentially to preserve displayOrder
            return concat(...imagesToUpload).pipe(
              toArray(),
              map(() => updatedPrint)
            );
          }),
          mergeMap((updatedPrint) => {
            if (newDefaultImageId) {
              return this.printService
                .setImageAsDefault(updatedPrint.id, newDefaultImageId)
                .pipe(map(() => updatedPrint));
            } else {
              return of(updatedPrint);
            }
          }),
          mergeMap((updatedPrint: PrintDetail) => {
            if (this.imageIdsToDelete.length === 0) {
              return of(updatedPrint);
            }

            const imagesToDelete = this.imageIdsToDelete.map((imageId) => {
              return this.printService.deleteImage(updatedPrint.id, imageId);
            });

            return forkJoin(imagesToDelete).pipe(
              take(1),
              map(() => updatedPrint)
            );
          }),
          mergeMap((updatedPrint: PrintDetail) => {
            // Reorder images if there are existing images with IDs
            const imagesToReorder = this.images.controls
              .filter((c) => c.value.id)
              .map((c) => ({
                imageId: c.value.id,
                displayOrder: c.value.displayOrder,
              }));

            if (imagesToReorder.length > 0) {
              return this.printService
                .reorderImages(updatedPrint.id, imagesToReorder)
                .pipe(map(() => updatedPrint));
            }
            return of(updatedPrint);
          })
        )
        .subscribe(
          (updatedPrint) => {
            this.printForm.markAsPristine();
            this.router.navigate(['/prints']).then(() => {
              this.toastr.success('Save successful!');
            });
          },
          (err) => {
            this.saving = false;
            this.loggingService.logTrace(
              `PrintErr: ${JSON.stringify(newPrint)}`
            );
            this.loggingService.logException(err);
          }
        );
    }
  }

  handleClose() {
    this.router.navigate(['/prints']);
  }

  /**
   * Helper function to convert empty strings to null for numeric fields
   */
  private parseNumericValue(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = +value;
    return isNaN(parsed) ? null : parsed;
  }

  getPrintFromForm(): Omit<PrintDetail, 'comments'> {
    const existingPrintImages: PrintImage[] = this.images.controls
      .filter((control) => control.value.id !== undefined)
      .map((control, index) => {
        return {
          id: control.value.id,
          isDefault: control.value.isDefault ?? false,
          displayOrder: control.value.displayOrder ?? index,
          url: null,
        };
      });

    const filamentUsage = this.filamentUsage.controls.map((printFilament) => {
      const estimatedAmountG = this.parseNumericValue(
        printFilament.get('estimatedAmountG').value
      );
      const amountG = this.parseNumericValue(
        printFilament.get('amountG').value
      );

      const newPf: PrintFilamentSummaryDto = {
        id: printFilament.get('id').value ?? EMPTY_GUID,
        estimatedAmountMg:
          estimatedAmountG !== null
            ? Math.round(estimatedAmountG * 1000)
            : null,
        estimatedLengthInM: this.parseNumericValue(
          printFilament.get('estimatedLengthInM').value
        ),
        estimatedVolumeMl: this.parseNumericValue(
          printFilament.get('estimatedVolumeMl').value
        ),
        estimatedSource: printFilament.get('estimatedSource').value,
        filament: printFilament.get('filament')?.value,
        amountMg: amountG !== null ? Math.round(amountG * 1000) : null,
        lengthInM: this.parseNumericValue(printFilament.get('lengthInM').value),
        volumeMl: this.parseNumericValue(printFilament.get('volumeMl').value),
        source: printFilament.get('source').value,
        notes: printFilament.get('notes').value,
      };

      return newPf;
    });

    /** Check if the Other Filament Option is in use. If so, then save it into the dedicated fields. */
    // const filamentUsageWithOtherOption = this.filamentUsage.controls.find(
    //   (f) => f.get('filament').value === EditPrintDetailComponent.OTHER_FILAMENT_OPTION
    // );

    const print: Omit<PrintDetail, 'comments'> = {
      id: this.printForm.controls.id.value,
      estimatedFilamentUsageMg: null,
      estimatedPrintTimeInSeconds: this.parseAsSeconds(
        this.printForm.controls.estimatedPrintTimeInSeconds.value
      ),
      filamentType: null,
      filamentUsageMg: null,
      filamentUsage,
      notes: this.printForm.controls.notes.value,
      printTimeInSeconds: this.parseAsSeconds(
        this.printForm.controls.printTimeInSeconds.value
      ),
      printerId: this.printForm.controls.printerId.value,
      startDate: this.getCombinedStartDateTime(),
      status: this.printForm.controls.status.value,
      viewStatus: this.printForm.controls.viewStatus.value,
      title: this.printForm.controls.title.value,
      url: this.printForm.controls.url.value,
      fileName: this.printForm.controls.fileName.value,
      images: existingPrintImages,
      createdByUserId: null,
      allowComments: this.printForm.controls.allowComments.value,
    };

    return print;
  }

  parseAsSeconds(input: string): number | null {
    if (input == null || input.trim() === '') {
      return null;
    }
    const durationAsMs = parse(input);
    const durationAsSeconds = durationAsMs / 1000;
    return Math.floor(durationAsSeconds);
  }

  parseIntoString(seconds: number | null): string {
    if (seconds == null) {
      return '';
    }

    const duration = moment.duration(seconds, 'seconds');
    let result = '';

    if (Math.floor(duration.asDays()) > 0) {
      result += `${Math.floor(duration.asDays())}d `;
    }

    if (duration.hours() > 0) {
      result += `${duration.hours()}h `;
    }

    if (duration.minutes() > 0) {
      result += `${duration.minutes()}m `;
    }

    if (duration.seconds() > 0) {
      result += `${duration.seconds()}s `;
    }

    if (duration.milliseconds() > 0) {
      result += `${duration.milliseconds()}ms `;
    }
    return result;
  }

  /**
   * Get printer label from cache for performance.
   * Called in template loops, so caching prevents recalculation on every change detection.
   */
  getPrinterLabel(printer: PrinterSummary): string {
    return this.printerLabelCache.get(printer.id) ?? '';
  }

  public addNewFilamentUsage() {
    const defaultMaterialType = this.getDefaultMeasureTypeForSelectedPrinter(
      this.printForm.get('printerId').value
    );

    const newFormGroup = this.GetNewFilamentUsageForm(
      EMPTY_GUID,
      0,
      0,
      0,
      defaultMaterialType,
      0,
      0,
      0,
      defaultMaterialType,
      null,
      ''
    );

    this.filamentUsage.push(newFormGroup);
  }

  public searchFilament(filamentControl: AbstractControl) {
    const material = this.printers.find(
      (p) => p.id === this.printForm.get('printerId').value
    )?.category?.materialCategory.nickname;

    const dialogRef = this.dialog.open(FilamentSearchModalComponent, {
      data: {
        otherFilamentOption: EditPrintDetailComponent.OTHER_FILAMENT_OPTION,
        filterByMaterialCategory: material,
      },
      height: '80vh',
      width: '80vw',
    });

    dialogRef.componentInstance.dialogRef
      .afterClosed()
      .subscribe((filament) => {
        if (filament) {
          if (filament === EditPrintDetailComponent.OTHER_FILAMENT_OPTION) {
            filamentControl.setValue(null);
          } else {
            filamentControl.setValue(filament);
          }
        }
      });
  }

  public removeFilament(index: number) {
    const filamentFormGroup = this.filamentUsage.at(
      index
    ) as FilamentUsageFormGroup;

    // Check if the filament has any non-zero data
    const hasNonZeroData =
      (filamentFormGroup.get('amountG')?.value &&
        filamentFormGroup.get('amountG')?.value > 0) ||
      (filamentFormGroup.get('lengthInM')?.value &&
        filamentFormGroup.get('lengthInM')?.value > 0) ||
      (filamentFormGroup.get('volumeMl')?.value &&
        filamentFormGroup.get('volumeMl')?.value > 0) ||
      (filamentFormGroup.get('estimatedAmountG')?.value &&
        filamentFormGroup.get('estimatedAmountG')?.value > 0) ||
      (filamentFormGroup.get('estimatedLengthInM')?.value &&
        filamentFormGroup.get('estimatedLengthInM')?.value > 0) ||
      (filamentFormGroup.get('estimatedVolumeMl')?.value &&
        filamentFormGroup.get('estimatedVolumeMl')?.value > 0) ||
      (filamentFormGroup.get('notes')?.value &&
        filamentFormGroup.get('notes')?.value.trim() !== '');

    if (hasNonZeroData) {
      const dialogRef = this.dialog.open(SimpleDialogComponent, {
        maxWidth: '350px',
      });
      (dialogRef.componentInstance as any).title = 'Remove Filament Record?';
      (dialogRef.componentInstance as any).body =
        'Are you sure? This filament record has usage data that will be lost.';
      (dialogRef.componentInstance as any).yesText = 'Delete';
      (dialogRef.componentInstance as any).yesColor = 'warn';
      (dialogRef.componentInstance as any).noText = 'Cancel';

      dialogRef.afterClosed().subscribe((shouldDelete) => {
        if (shouldDelete) {
          this.filamentUsage.removeAt(index);
        }
      });
    } else {
      this.filamentUsage.removeAt(index);
    }
  }

  public dropFilament(event: CdkDragDrop<any[]>) {
    const filamentArray = this.filamentUsage.controls;
    moveItemInArray(filamentArray, event.previousIndex, event.currentIndex);
    this.filamentUsage.setValue(
      filamentArray.map((control) => control.getRawValue())
    );
  }

  public swapFilamentData(fromIndex: number, toIndex: number) {
    const fromGroup = this.filamentUsage.at(
      fromIndex
    ) as FilamentUsageFormGroup;
    const toGroup = this.filamentUsage.at(toIndex) as FilamentUsageFormGroup;

    // Get the current values using getRawValue to get all fields
    const fromValue = fromGroup.getRawValue();
    const toValue = toGroup.getRawValue();

    // Keep the original ids and filament selections
    const fromId = fromValue.id!;
    const toId = toValue.id!;
    const fromFilament = fromValue.filament;
    const toFilament = toValue.filament;

    // Set the swapped values (swap usage data but keep filament selections)
    fromGroup.setValue({
      ...toValue,
      id: fromId, // Keep original id
      filament: fromFilament, // Keep original filament
    });

    toGroup.setValue({
      ...fromValue,
      id: toId, // Keep original id
      filament: toFilament, // Keep original filament
    });

    // Mark both as dirty since data changed
    fromGroup.markAsDirty();
    toGroup.markAsDirty();
  }

  public compareByFilamentId(
    itemOne: FilamentSummary,
    itemTwo: FilamentSummary
  ) {
    return itemOne && itemTwo && itemOne.id === itemTwo.id;
  }

  public setStartDateToNow() {
    const now = new Date();
    this.printForm.get('startDate').setValue(now);
    this.printForm.get('startTime').setValue(moment(now).format('HH:mm:ss'));
  }

  public getEstimatedCompletedDate() {
    const startDate = this.getCombinedStartDateTime();

    if (!startDate) {
      return '';
    }

    const estimatedPrintTimeInSeconds = this.parseAsSeconds(
      this.printForm.controls.estimatedPrintTimeInSeconds.value
    );

    if (
      estimatedPrintTimeInSeconds === null ||
      estimatedPrintTimeInSeconds === undefined ||
      estimatedPrintTimeInSeconds <= 0
    ) {
      this.estimatedCompletedDate = null;
      return;
    }

    this.estimatedCompletedDate = moment(startDate)
      .add(estimatedPrintTimeInSeconds, 's')
      .toDate();
  }

  getActualCompletedDate() {
    const startDate = this.getCombinedStartDateTime();

    if (!startDate) {
      return '';
    }

    const printTimeInSeconds = this.parseAsSeconds(
      this.printForm.controls.printTimeInSeconds.value
    );

    if (
      printTimeInSeconds === null ||
      printTimeInSeconds === undefined ||
      printTimeInSeconds <= 0
    ) {
      this.actualCompletedDate = null;
      return;
    }

    this.actualCompletedDate = moment(startDate)
      .add(printTimeInSeconds, 's')
      .toDate();
  }

  public updateActualCompletedDate(newDate: Date) {
    const startDate = this.getCombinedStartDateTime();

    if (!startDate) {
      return '';
    }

    const difference = moment(newDate).diff(startDate, 's');

    this.printForm.controls.printTimeInSeconds.setValue(
      this.parseIntoString(difference)
    );
    this.getActualCompletedDate();
  }

  public setActualCompletedDateToNow() {
    this.updateActualCompletedDate(new Date());
  }

  // Helper methods for the separate date/time picker implementation
  public getEstimatedCompletedDateOnly(): Date | null {
    return this.estimatedCompletedDate ? this.estimatedCompletedDate : null;
  }

  public getEstimatedCompletedTimeOnly(): string {
    return this.estimatedCompletedDate
      ? moment(this.estimatedCompletedDate).format('HH:mm:ss')
      : '';
  }

  public getActualCompletedDateOnly(): Date | null {
    return this.actualCompletedDate ? this.actualCompletedDate : null;
  }

  public getActualCompletedTimeOnly(): string {
    return this.actualCompletedDate
      ? moment(this.actualCompletedDate).format('HH:mm:ss')
      : '';
  }

  public updateActualCompletedDateOnly(newDate: Date) {
    if (!newDate) {
      this.actualCompletedDate = null;
      return;
    }

    // Combine the new date with the existing time (if any)
    const existingTime = this.getActualCompletedTimeOnly();
    const [hours, minutes, seconds] = existingTime
      ? existingTime.split(':').map(Number)
      : [0, 0, 0];

    const combinedDateTime = moment(newDate)
      .hour(hours)
      .minute(minutes)
      .second(seconds)
      .toDate();

    this.updateActualCompletedDate(combinedDateTime);
  }

  public updateActualCompletedTimeOnly(newTime: string) {
    if (!newTime) {
      return;
    }

    const existingDate = this.getActualCompletedDateOnly();
    if (!existingDate) {
      return;
    }

    const [hours, minutes, seconds] = newTime.split(':').map(Number);

    const combinedDateTime = moment(existingDate)
      .hour(hours)
      .minute(minutes)
      .second(seconds || 0)
      .toDate();

    this.updateActualCompletedDate(combinedDateTime);
  }

  // Helper method to get the combined datetime for API calls
  public getCombinedStartDateTime(): Date {
    const date = this.printForm.get('startDate').value;
    const time = this.printForm.get('startTime').value;

    if (!date || !time) {
      return date || new Date();
    }

    const [hours, minutes, seconds] = time.split(':').map(Number);

    return moment(date)
      .hour(hours)
      .minute(minutes)
      .second(seconds || 0)
      .toDate();
  }
}
