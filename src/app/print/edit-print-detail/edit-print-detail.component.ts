import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
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
import * as moment from 'moment';
import { ActiveToast, ToastrService } from 'ngx-toastr';
import parse from 'parse-duration';

import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { forkJoin, Observable, of, Subscription } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
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
import {
  EMPTY_GUID,
  PrintDetail,
  PrintFilamentSummaryDto,
  PrintService,
  PrintStatus,
  PrintViewStatus,
} from '../../core/services/print.service';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';

export interface PrintImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault: boolean;
}

@Component({
  selector: 'app-print-detail',
  templateUrl: './edit-print-detail.component.html',
  styleUrls: ['./edit-print-detail.component.scss'],
})
export class EditPrintDetailComponent
  implements OnInit, ComponentCanDeactivate, OnDestroy
{
  public OTHER_FILAMENT_OPTION: Partial<FilamentSummary> = {
    id: EMPTY_GUID,
    displayName: 'Other',
  } as const;

  public printers: PrinterSummary[] = [];

  public printForm: FormGroup;

  public printStatusTypes = PrintStatus;
  public printViewStatusTypes = PrintViewStatus;

  public selectedImage: FormControl;

  public defaultImageIdOnLoad: number | null = null;

  private imageIdsToDelete = [];

  /**
   * If the form is currently saving.
   */
  public saving = false;

  public lastSelectedPrinterSetting: UserSetting | null = null;
  printerIdValueChangesSub: Subscription;

  public defaultPrintViewStatusSetting: UserSetting | null = null;
  viewStatusValueChangesSub: Subscription;

  public lastAllowCommentsSetting: UserSetting | null = null;
  lastAllowCommentsChangesSub: Subscription;
  public lastFilamentMeasureSetting: UserSetting | null = null;

  printerRedirectPromptSubscription: Subscription;
  printerRedirectToast: ActiveToast<any>;
  printerRedirectSubscription: Subscription;
  loadFilamentOnPrinterChangeSub: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private readonly printService: PrintService,
    private readonly printerService: PrinterService,
    private readonly toastr: ToastrService,
    private cd: ChangeDetectorRef,
    private titleService: Title,
    private readonly userSettingService: UserSettingService,
    private readonly printerRedirectPromptService: PrinterRedirectPromptService,
    private readonly loggingService: LoggingService,
    private el: ElementRef,
    public dialog: MatDialog
  ) {}

  // Help to get all photos controls as form array.
  get images(): FormArray {
    return this.printForm.get('images') as FormArray;
  }

  // Help to get all print filament usage controls as form array.
  get filamentUsage(): FormArray {
    return this.printForm.get('filamentUsage') as FormArray;
  }

  ngOnDestroy(): void {
    this.printerIdValueChangesSub?.unsubscribe?.();

    this.viewStatusValueChangesSub?.unsubscribe?.();

    this.lastAllowCommentsChangesSub?.unsubscribe?.();

    this.printerRedirectPromptSubscription?.unsubscribe?.();

    this.printerRedirectSubscription?.unsubscribe?.();

    this.loadFilamentOnPrinterChangeSub?.unsubscribe?.();
  }

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.printForm.dirty;
  }

  async ngOnInit() {
    this.titleService.setTitle('Print Details - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.printers = data.printers;

      this.lastSelectedPrinterSetting = data.lastSelectedPrintSetting;
      this.defaultPrintViewStatusSetting = data.defaultPrintViewStatusSetting;
      this.lastAllowCommentsSetting = data.lastAllowCommentsSetting;
      this.lastFilamentMeasureSetting = data.lastFilamentMeasureSetting;

      this.printForm = this.buildFormFromPrintDetail(data.print.print);

      // update print form with the last loaded filament
      const printIsNew = this.printForm.get('id').value === null;
      const filamentIsEmpty =
        this.filamentUsage.length === 0 ||
        this.filamentUsage.at(0)?.get('filament')?.value ===
          this.OTHER_FILAMENT_OPTION;
      const printerHasBeenSelected =
        this.printForm.get('printerId').value !== null;

      if (printIsNew && filamentIsEmpty && printerHasBeenSelected) {
        this.printerService
          .getLoadedFilamentForPrinter(this.printForm.get('printerId').value)
          .subscribe((loadedFilament) => {
            let isLengthTheDefaultMeasureType = false;

            if (this.lastFilamentMeasureSetting !== null) {
              isLengthTheDefaultMeasureType =
                this.lastFilamentMeasureSetting?.value === 'Length'
                  ? true
                  : false;
            }

            for (let i = 1; i <= loadedFilament.length; i++) {
              // If there is a filament usage with OTHER in this index, just update the filament
              const filament = loadedFilament[i - 1].filament;

              if (
                this.filamentUsage.length >= i &&
                this.filamentUsage.at(i - 1).get('filament').value ===
                  this.OTHER_FILAMENT_OPTION
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
                  isLengthTheDefaultMeasureType,
                  0,
                  0,
                  isLengthTheDefaultMeasureType,
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
                  // eslint-disable-next-line @typescript-eslint/dot-notation
                  returnUrl: this.activatedRoute.snapshot['_routerState'].url,
                },
              });
              this.printerRedirectSubscription.unsubscribe();
            });
        }
      });
  }

  private onChanges() {
    this.SaveSettingWhenSelectedPrinterIdChanges();
    this.SaveSettingWhenAllowCommentsChanges();
    this.loadLoadedFilamentOnPrinterChange();

    this.printForm.valueChanges.subscribe(() => {
      this.getEstimatedCompletedDate();
      this.getActualCompletedDate();
    });
  }
  loadLoadedFilamentOnPrinterChange() {
    if (this.loadFilamentOnPrinterChangeSub) {
      this.loadFilamentOnPrinterChangeSub.unsubscribe();
    }
    this.loadFilamentOnPrinterChangeSub = this.printForm
      .get('printerId')
      .valueChanges.subscribe((newPrinterId) => {
        const isFilamentPristine = this.filamentUsage.pristine;
        const isPrintNew = this.printForm.get('id')?.value === null;

        if (isPrintNew && isFilamentPristine) {
          this.printerService
            .getLoadedFilamentForPrinter(newPrinterId)
            .subscribe((loadedFilament) => {
              // Add a new filament usage for the currently loaded filament for that printer.
              let isLengthTheDefaultMeasureType = false;

              if (this.lastFilamentMeasureSetting !== null) {
                isLengthTheDefaultMeasureType =
                  this.lastFilamentMeasureSetting?.value === 'Length'
                    ? true
                    : false;
              }

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
                    isLengthTheDefaultMeasureType,
                    0,
                    0,
                    isLengthTheDefaultMeasureType,
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
  public HandleFilamentMeasureTypeChange(isLength: boolean) {
    const newValue = isLength ? 'Length' : 'Weight';

    if (this.lastFilamentMeasureSetting) {
      this.userSettingService
        .updateUserSetting(
          this.lastFilamentMeasureSetting.id,
          isLength ? 'Length' : 'Weight'
        )
        .subscribe((setting) => {
          this.lastFilamentMeasureSetting = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Prints_LastSelectedFilamentMeasureType,
          newValue
        )
        .subscribe((setting) => {
          this.lastFilamentMeasureSetting = setting;
        });
    }
  }

  private SaveSettingWhenSelectedPrinterIdChanges() {
    if (this.printerIdValueChangesSub) {
      this.printerIdValueChangesSub.unsubscribe();
    }
    this.printerIdValueChangesSub = this.printForm
      .get('printerId')
      .valueChanges.subscribe((newPrintId) => {
        if (this.lastSelectedPrinterSetting) {
          this.userSettingService
            .updateUserSetting(
              this.lastSelectedPrinterSetting.id,
              newPrintId.toString()
            )
            .subscribe((setting) => {
              this.lastSelectedPrinterSetting = setting;
            });
        } else {
          this.userSettingService
            .addUserSetting(
              UserSettingType.Prints_LastSelectedPrinterId,
              newPrintId.toString()
            )
            .subscribe((setting) => {
              this.lastSelectedPrinterSetting = setting;
            });
        }
      });
  }

  private SaveSettingWhenAllowCommentsChanges() {
    if (this.lastAllowCommentsChangesSub) {
      this.lastAllowCommentsChangesSub.unsubscribe();
    }
    this.lastAllowCommentsChangesSub = this.printForm
      .get('allowComments')
      .valueChanges.subscribe((allowComments) => {
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

  onFileChange(event) {
    const reader = new FileReader();

    if (event.target.files && event.target.files.length) {
      const [file] = event.target.files;
      reader.readAsDataURL(file);

      reader.onload = () => {
        this.printForm.patchValue({
          file: reader.result,
        });

        // need to run CD since file load runs outside of zone
        this.cd.markForCheck();
      };
    }
  }
  buildFormFromPrintDetail(print: PrintDetail): FormGroup {
    const imageArray = this.formBuilder.array([]);

    if (print && print.images) {
      print.images.forEach((image) => {
        const newImage: PrintImageValue = {
          id: image.id,
          url: image.url ?? null,
          file: null,
          isDefault: image.isDefault,
        };
        if (newImage.isDefault) {
          const newControl = this.createItem(newImage);
          imageArray.insert(0, newControl);
          this.selectedImage = newControl;
          this.defaultImageIdOnLoad = image.id;
        } else {
          imageArray.push(this.createItem(newImage));
        }
      });
    }

    // Handle PrintFilament Usage
    const printFilamentUsageArray = this.formBuilder.array([]);

    if (print && print.filamentUsage && print.filamentUsage.length >= 0) {
      print.filamentUsage.forEach((pf) => {
        const newFormGroup = this.GetNewFilamentUsageForm(
          pf.id,
          pf.amountMg / 1000,
          pf.lengthInM,
          pf.isActualLengthSource,
          pf.estimatedAmountMg / 1000,
          pf.estimatedLengthInM,
          pf.isEstimatedLengthSource,
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
        false,
        print.estimatedFilamentUsageMg / 1000,
        null,
        false,
        this.OTHER_FILAMENT_OPTION as FilamentSummary,
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
    amountG: number,
    lengthInM: number,
    isActualLengthSource: boolean,
    estimatedAmountG: number,
    estimatedLengthInM: number,
    isEstimatedLengthSource: boolean,
    filament: FilamentSummary | null,
    notes: string | null
  ) {
    return this.formBuilder.group({
      id,
      amountG,
      lengthInM,
      isActualLengthSource,
      estimatedAmountG,
      estimatedLengthInM,
      isEstimatedLengthSource,
      filament,
      notes,
    });
  }

  // We will create multiple form controls inside defined form controls photos.
  createItem(data: PrintImageValue): FormControl {
    const newItem = this.formBuilder.control(data);

    return newItem;
  }

  detectFiles(event) {
    const files = event.target.files;
    if (files) {
      for (const file of files) {
        if (!file.type.match(/image.*/)) {
          this.toastr.error(
            'Please select an image.',
            'Selected file is not an Image'
          );
          continue;
        }

        const reader = new FileReader();
        reader.onload = (e: any) => {
          const newItem = this.createItem({
            file,
            url: e.target.result, // Base64 string for preview image
            isDefault: false,
            id: undefined,
          });

          newItem.markAllAsTouched();
          newItem.markAsDirty();
          this.images.push(newItem);
          this.selectImage(newItem);
        };
        reader.readAsDataURL(file);
      }
    }
  }

  selectImage(image: FormControl) {
    this.selectedImage = image;
    this.setAsDefault(image); // TODO: Get right-click menu to make default
  }

  removeImage(image: FormControl) {
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

  setAsDefault(image: FormControl) {
    this.images.controls.forEach((control) => {
      control.value.isDefault = false;
    });

    image.value.isDefault = true;
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

            const imagesToUpload = newImages.map((image) => {
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

            return forkJoin(imagesToUpload).pipe(
              take(1),
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
          })
        )
        .subscribe(
          (createdPrint) => {
            this.saving = false;
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

            const imagesToUpload = newImages.map((image) => {
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

            return forkJoin(imagesToUpload).pipe(
              take(1),
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
          })
        )
        .subscribe(
          (updatedPrint) => {
            this.saving = false;
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

  getPrintFromForm(): Omit<PrintDetail, 'comments'> {
    const existingPrintImages = this.images.controls
      .filter((control) => control.value.id !== undefined)
      .map((control) => {
        return {
          id: control.value.id,
          isDefault: control.value.isDefault,
        };
      });

    const filamentUsage = this.filamentUsage.controls.map((printFilament) => {
      const newPf: PrintFilamentSummaryDto = {
        id: printFilament.get('id').value ?? EMPTY_GUID,
        estimatedAmountMg: Math.round(
          +printFilament.get('estimatedAmountG').value * 1000
        ),
        estimatedLengthInM: printFilament.get('estimatedLengthInM').value,
        isEstimatedLengthSource: printFilament.get('isEstimatedLengthSource')
          .value,
        filament: printFilament.get('filament')?.value,
        amountMg: Math.round(+printFilament.get('amountG').value * 1000),
        lengthInM: printFilament.get('lengthInM').value,
        isActualLengthSource: printFilament.get('isActualLengthSource').value,
        notes: printFilament.get('notes').value,
      };

      return newPf;
    });

    /** Check if the Other Filament Option is in use. If so, then save it into the dedicated fields. */
    // const filamentUsageWithOtherOption = this.filamentUsage.controls.find(
    //   (f) => f.get('filament').value === this.OTHER_FILAMENT_OPTION
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
      startDate: this.printForm.controls.startDate.value,
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

  setDateToNoon(control: AbstractControl) {
    const date = control.value;
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

    if (+duration.asDays().toFixed(0) > 0) {
      result += `${duration.asDays().toFixed(0)}d `;
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

  public addNewFilamentUsage() {
    let isLengthTheDefaultMeasureType = false;

    if (this.lastFilamentMeasureSetting !== null) {
      isLengthTheDefaultMeasureType =
        this.lastFilamentMeasureSetting.value === 'Length' ? true : false;
    }

    const newFormGroup = this.GetNewFilamentUsageForm(
      EMPTY_GUID,
      0,
      0,
      isLengthTheDefaultMeasureType,
      0,
      0,
      isLengthTheDefaultMeasureType,
      null,
      ''
    );

    this.filamentUsage.push(newFormGroup);
  }

  public searchFilament(filamentControl: AbstractControl) {
    const dialogRef = this.dialog.open(FilamentSearchModalComponent, {
      data: {
        otherFilamentOption: this.OTHER_FILAMENT_OPTION,
      },
      height: '80vh',
      width: '80vw',
    });

    dialogRef.componentInstance.dialogRef
      .afterClosed()
      .subscribe((filament) => {
        if (filament) {
          if (filament === this.OTHER_FILAMENT_OPTION) {
            filamentControl.setValue(null);
          } else {
            filamentControl.setValue(filament);
          }
        }
      });
  }

  public removeFilament(index: number) {
    this.filamentUsage.removeAt(index);
  }

  public compareByFilamentId(
    itemOne: FilamentSummary,
    itemTwo: FilamentSummary
  ) {
    return itemOne && itemTwo && itemOne.id === itemTwo.id;
  }

  public setStartDateToNow() {
    this.printForm.get('startDate').setValue(new Date());
  }

  public estimatedCompletedDate: Date = null;
  public actualCompletedDate: Date = null;

  public getEstimatedCompletedDate() {
    const startDate = this.printForm.get('startDate').value;

    if (!startDate) {
      return '';
    }

    const estimatedPrintTimeInSeconds = this.parseAsSeconds(
      this.printForm.controls.estimatedPrintTimeInSeconds.value
    );

    //return moment(startDate).add(estimatedPrintTimeInSeconds, 's').toDate();
    //.format('l, LTS');

    if (
      estimatedPrintTimeInSeconds === null ||
      estimatedPrintTimeInSeconds === undefined ||
      estimatedPrintTimeInSeconds <= 0
    ) {
      console.log(estimatedPrintTimeInSeconds);
      this.estimatedCompletedDate = null;
      return;
    }

    this.estimatedCompletedDate = moment(startDate)
      .add(estimatedPrintTimeInSeconds, 's')
      .toDate();
  }

  getActualCompletedDate() {
    const startDate = this.printForm.get('startDate').value;

    if (!startDate) {
      return '';
    }

    const printTimeInSeconds = this.parseAsSeconds(
      this.printForm.controls.printTimeInSeconds.value
    );

    //return moment(startDate).add(estimatedPrintTimeInSeconds, 's').toDate();
    //.format('l, LTS');

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
    const startDate = this.printForm.get('startDate').value;

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
}
