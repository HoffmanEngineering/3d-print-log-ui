import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ActivatedRoute,
  ActivatedRouteSnapshot,
  Router,
} from '@angular/router';
import {
  PrintDetail,
  PrintDetailDTO,
  PrintService,
  PrintStatus,
} from '../services/print.service';

@Component({
  selector: 'app-print-detail',
  templateUrl: './print-detail.component.html',
  styleUrls: ['./print-detail.component.scss'],
})
export class PrintDetailComponent implements OnInit {
  print: PrintDetail;

  public printForm: FormGroup;

  public printStatusTypes = PrintStatus;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private printService: PrintService
  ) {}

  ngOnInit() {
    this.activatedRoute.data.subscribe(data => {
      console.log('data changed');
      this.print = data.print;

      this.printForm = this.buildFormFromPrintDetail(this.print);
    });
  }
  buildFormFromPrintDetail(print: PrintDetail): FormGroup {
    return this.formBuilder.group({
      id: [print ? print.id : null],
      title: [print ? print.title : '', Validators.required],
      printerId: [print ? print.printerId : null],
      startDate: [print ? print.startDate : null],
      estimatedPrintTimeInSeconds: [
        print ? print.estimatedPrintTimeInSeconds : null,
      ],
      estimatedFilamentUsageMg: [print ? print.estimatedFilamentUsageMg : null],
      printTimeInSeconds: [print ? print.printTimeInSeconds : null],
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
          // this.print = createdPrint;
          // this.printForm = this.buildFormFromPrintDetail(this.print);
        });
      });
    } else {
      this.printService.updatePrint(newPrint).subscribe(updatedPrint => {
        this.printForm = this.buildFormFromPrintDetail(updatedPrint);
      });
    }
  }
  getPrintFromForm(): PrintDetail {
    const print: PrintDetail = {
      id: this.printForm.controls.id.value,
      estimatedFilamentUsageMg: this.printForm.controls.estimatedFilamentUsageMg
        .value,
      estimatedPrintTimeInSeconds: this.printForm.controls
        .estimatedPrintTimeInSeconds.value,
      filamentType: this.printForm.controls.filamentType.value,
      filamentUsageMg: this.printForm.controls.filamentUsageMg.value,
      notes: this.printForm.controls.notes.value,
      printTimeInSeconds: this.printForm.controls.printTimeInSeconds.value,
      printerId: this.printForm.controls.printerId.value,
      startDate: this.printForm.controls.startDate.value,
      status: this.printForm.controls.status.value,
      title: this.printForm.controls.title.value,
      url: this.printForm.controls.url.value,
    };

    return print;
  }
}
