import {
  ChangeDetectorRef,
  Component,
  HostListener,
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
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import parse from 'parse-duration';

import { Title } from '@angular/platform-browser';
import { forkJoin, Observable, of } from 'rxjs';
import { map, mergeMap, take } from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import { PrinterSummary } from 'src/app/core/services/printer.service';
import { environment } from 'src/environments/environment';
import {
  PrintDetail,
  PrintService,
  PrintStatus,
} from '../services/print.service';

export interface PrintImageValue {
  id?: number;
  url?: string;
  file?: File;
  isDefault: boolean;
}

@Component({
  selector: 'app-print-detail',
  templateUrl: './print-detail.component.html',
  styleUrls: ['./print-detail.component.scss'],
})
export class PrintDetailComponent implements OnInit, ComponentCanDeactivate {
  public printers: PrinterSummary[] = [];

  public printForm: FormGroup;

  public printStatusTypes = PrintStatus;

  public selectedImage: FormControl;

  public defaultImageIdOnLoad: number | null = null;

  private imageIdsToDelete = [];

  /**
   * If the form is currently saving.
   */
  public saving = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private printService: PrintService,
    private toastr: ToastrService,
    private cd: ChangeDetectorRef,
    private titleService: Title
  ) {}

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.printForm.dirty;
  }

  ngOnInit() {
    this.titleService.setTitle('Print Details - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.printers = data.printers;

      this.printForm = this.buildFormFromPrintDetail(data.print);
    });
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
          url: null,
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

    return this.formBuilder.group({
      id: [print ? print.id : null],
      title: [print ? print.title : '', Validators.required],
      printerId: [print ? print.printerId : null, Validators.required],
      startDate: [
        print
          ? print.startDate
            ? moment(print.startDate).toDate()
            : null
          : null,
        Validators.required,
      ],
      estimatedPrintTimeInSeconds: [
        print ? this.parseIntoString(print.estimatedPrintTimeInSeconds) : null,
      ],
      estimatedFilamentUsageG: [
        print ? print.estimatedFilamentUsageMg / 1000 : null,
      ],
      printTimeInSeconds: [
        print ? this.parseIntoString(print.printTimeInSeconds) : null,
      ],
      filamentUsageG: [print ? print.filamentUsageMg / 1000 : null],
      filamentType: [print ? print.filamentType : ''],
      notes: [print ? print.notes : ''],
      url: [print ? print.url : ''],
      status: [print ? print.status : PrintStatus.Pending],
      images: imageArray,
    });
  }

  // We will create multiple form controls inside defined form controls photos.
  createItem(data: PrintImageValue): FormControl {
    const newItem = this.formBuilder.control(data);

    return newItem;
  }

  // Help to get all photos controls as form array.
  get images(): FormArray {
    return this.printForm.get('images') as FormArray;
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

    const newPrint: PrintDetail = this.getPrintFromForm();

    const newImages = this.images.controls.filter(
      (control) => control.dirty && control.value.id === undefined
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
              return this.printService.uploadPrintImage(
                createdPrint.id,
                image.value.file,
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
              return this.printService.uploadPrintImage(
                updatedPrint.id,
                image.value.file,
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
          }
        );
    }
  }

  handleClose() {
    this.router.navigate(['/prints']);
  }

  getPrintFromForm(): PrintDetail {
    const existingPrintImages = this.images.controls
      .filter((control) => control.value.id !== undefined)
      .map((control) => {
        return {
          id: control.value.id,
          isDefault: control.value.isDefault,
        };
      });

    const print: PrintDetail = {
      id: this.printForm.controls.id.value,
      estimatedFilamentUsageMg:
        this.printForm.controls.estimatedFilamentUsageG.value * 1000,
      estimatedPrintTimeInSeconds: this.parseAsSeconds(
        this.printForm.controls.estimatedPrintTimeInSeconds.value
      ),
      filamentType: this.printForm.controls.filamentType.value,
      filamentUsageMg: this.printForm.controls.filamentUsageG.value * 1000,
      notes: this.printForm.controls.notes.value,
      printTimeInSeconds: this.parseAsSeconds(
        this.printForm.controls.printTimeInSeconds.value
      ),
      printerId: this.printForm.controls.printerId.value,
      startDate: this.printForm.controls.startDate.value,
      status: this.printForm.controls.status.value,
      title: this.printForm.controls.title.value,
      url: this.printForm.controls.url.value,
      images: existingPrintImages,
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

    if (duration.days() > 0) {
      result += `${duration.days()}d `;
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
}
