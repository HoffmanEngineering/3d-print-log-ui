import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import * as moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import parse from 'parse-duration';

import { PrinterSummary } from 'src/app/core/services/printer.service';
import {
  PrintDetail,
  PrintService,
  PrintStatus,
} from '../services/print.service';

@Component({
  selector: 'app-print-detail',
  templateUrl: './print-detail.component.html',
  styleUrls: ['./print-detail.component.scss'],
})
export class PrintDetailComponent implements OnInit {
  public printers: PrinterSummary[] = [];

  public printForm: FormGroup;

  public printStatusTypes = PrintStatus;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private printService: PrintService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.activatedRoute.data.subscribe(data => {
      console.log('data changed');
      this.printers = data.printers;

      this.printForm = this.buildFormFromPrintDetail(data.print);
    });
  }
  buildFormFromPrintDetail(print: PrintDetail): FormGroup {
    return this.formBuilder.group({
      id: [print ? print.id : null],
      title: [print ? print.title : '', Validators.required],
      printerId: [print ? print.printerId : null],
      startDate: [
        print
          ? print.startDate
            ? moment(print.startDate).toDate()
            : null
          : null,
      ],
      estimatedPrintTimeInSeconds: [
        print ? this.parseIntoString(print.estimatedPrintTimeInSeconds) : null,
      ],
      estimatedFilamentUsageMg: [print ? print.estimatedFilamentUsageMg : null],
      printTimeInSeconds: [
        print ? this.parseIntoString(print.printTimeInSeconds) : null,
      ],
      filamentUsageMg: [print ? print.filamentUsageMg : null],
      filamentType: [print ? print.filamentType : ''],
      notes: [print ? print.notes : ''],
      url: [print ? print.url : ''],
      status: [print ? print.status : PrintStatus.Pending],
    });
  }
  onSubmit() {
    console.log(this.printForm.getRawValue());

    const newPrint: PrintDetail = this.getPrintFromForm();

    if (newPrint.id === null) {
      this.printService.addPrint(newPrint).subscribe(createdPrint => {
        console.log('redirect to new id', createdPrint);
        this.router.navigate(['/prints', createdPrint.id]).then(() => {
          this.toastr.success('Save successful!');
        });
      });
    } else {
      this.printService.updatePrint(newPrint).subscribe(updatedPrint => {
        this.toastr.success('Save successful!');
        this.printForm = this.buildFormFromPrintDetail(updatedPrint);
      });
    }
  }

  handleClose() {
    this.router.navigate(['/prints']);
  }

  getPrintFromForm(): PrintDetail {
    const print: PrintDetail = {
      id: this.printForm.controls.id.value,
      estimatedFilamentUsageMg: this.printForm.controls.estimatedFilamentUsageMg
        .value,
      estimatedPrintTimeInSeconds: this.parseAsSeconds(
        this.printForm.controls.estimatedPrintTimeInSeconds.value
      ),
      filamentType: this.printForm.controls.filamentType.value,
      filamentUsageMg: this.printForm.controls.filamentUsageMg.value,
      notes: this.printForm.controls.notes.value,
      printTimeInSeconds: this.parseAsSeconds(
        this.printForm.controls.printTimeInSeconds.value
      ),
      printerId: this.printForm.controls.printerId.value,
      startDate: this.printForm.controls.startDate.value,
      status: this.printForm.controls.status.value,
      title: this.printForm.controls.title.value,
      url: this.printForm.controls.url.value,
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
}
