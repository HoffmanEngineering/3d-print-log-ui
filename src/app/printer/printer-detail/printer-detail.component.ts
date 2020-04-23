import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';

@Component({
  selector: 'app-printer-detail',
  templateUrl: './printer-detail.component.html',
  styleUrls: ['./printer-detail.component.scss'],
})
export class PrinterDetailComponent implements OnInit {
  public printerForm: FormGroup;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private printerService: PrinterService,
    private toastr: ToastrService,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('Printer Details - 3D Print Log');

    this.activatedRoute.data.subscribe(data => {
      this.printerForm = this.buildFormFromPrinterDetail(data.printer);
    });
  }

  buildFormFromPrinterDetail(printer: PrinterDetail): FormGroup {
    const form = this.formBuilder.group({
      id: [printer ? printer.id : null],
      name: [printer && printer.name ? printer.name : '', Validators.required],
      make: [printer && printer.make ? printer.make : '', Validators.required],
      model: [
        printer && printer.make ? printer.model : '',
        Validators.required,
      ],
      description: [printer && printer.description ? printer.description : ''],
      nozzleDiameter: [
        printer && printer.nozzleDiameter ? printer.nozzleDiameter : 0,
        Validators.required,
      ],
      filamentDiameter: [
        printer && printer.filamentDiameter ? printer.filamentDiameter : 0,
        Validators.required,
      ],
      isActive: [
        printer && printer.isActive !== null && printer.isActive !== undefined
          ? printer.isActive
          : true,
      ],
    });

    return form;
  }

  onSubmit() {
    const newPrinter: PrinterDetail = this.getPrinterFromForm();

    if (newPrinter.id === null) {
      this.printerService.addPrinter(newPrinter).subscribe(createdPrinter => {
        this.router.navigate(['/printers', createdPrinter.id]).then(() => {
          this.toastr.success('Save successful!');
        });
      });
    } else {
      this.printerService
        .updatePrinter(newPrinter)
        .subscribe(updatedPrinter => {
          this.toastr.success('Save successful!');
          this.printerForm = this.buildFormFromPrinterDetail(updatedPrinter);
        });
    }
  }

  handleClose() {
    this.router.navigate(['/printers']);
  }

  private getPrinterFromForm(): PrinterDetail {
    const printer: PrinterDetail = {
      id: this.printerForm.controls.id.value,
      name: this.printerForm.controls.name.value,
      make: this.printerForm.controls.make.value,
      model: this.printerForm.controls.model.value,
      description: this.printerForm.controls.description.value,
      nozzleDiameter: this.printerForm.controls.nozzleDiameter.value,
      filamentDiameter: this.printerForm.controls.filamentDiameter.value,
      isActive: this.printerForm.controls.isActive.value,
    };

    return printer;
  }
}
