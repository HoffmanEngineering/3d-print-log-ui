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
  selector: 'app-view-print-detail',
  templateUrl: './view-print-detail.component.html',
  styleUrls: ['./view-print-detail.component.scss'],
})
export class ViewPrintDetailComponent implements OnInit {
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
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Viewing Print - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.printers = data.printers;

      this.printForm = this.buildFormFromPrintDetail(data.print);
      this.printForm.disable();
    });
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
