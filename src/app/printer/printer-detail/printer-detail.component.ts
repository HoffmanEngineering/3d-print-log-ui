import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { uniq } from 'lodash';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';
import defaultPrinters from './cura-exported-printers';

@Component({
  selector: 'app-printer-detail',
  templateUrl: './printer-detail.component.html',
  styleUrls: ['./printer-detail.component.scss'],
})
export class PrinterDetailComponent implements OnInit, ComponentCanDeactivate {
  public printerForm: FormGroup;
  public saving = false;

  // public referencePrinter = defaultPrinters;

  public autocompleteMakes: string[] = [];

  filteredMakes: Observable<string[]>;

  filteredModels: Observable<string[]>;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private printerService: PrinterService,
    private toastr: ToastrService,
    private titleService: Title
  ) {}

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.printerForm.dirty;
  }

  ngOnInit() {
    this.titleService.setTitle('Printer Details - 3D Print Log');

    this.getReferencePrinterMakes();

    this.activatedRoute.data.subscribe((data) => {
      this.printerForm = this.buildFormFromPrinterDetail(data.printer);

      this.filteredMakes = this.printerForm.controls.make.valueChanges.pipe(
        startWith(''),
        map((value) => this._filterMakes(value))
      );

      this.filteredModels = this.printerForm.valueChanges.pipe(
        startWith({ make: '', model: '' }),
        tap((value) => console.log(value)),
        map((value) => this._filterModels(value))
      );
    });
  }

  /**
   * Get the uniq list of printer makes.
   */
  getReferencePrinterMakes() {
    this.autocompleteMakes = uniq(defaultPrinters.printers.map((p) => p.make));
  }

  /**
   * Filter the makes based on the user's input for use in autocomplete
   */
  private _filterMakes(value: string): string[] {
    const filterValue = value.toLowerCase();

    return this.autocompleteMakes.filter((option) =>
      option.toLowerCase().includes(filterValue.toLowerCase())
    );
  }

  /**
   * Filter the models based on the supplied inputs to the form for use in autocomplete
   */
  private _filterModels({
    make,
    model,
  }: {
    make: string;
    model: string;
  }): string[] {
    const models = this.findModelsForMake(make);

    return models.filter((option) =>
      option.toLowerCase().includes(model.toLowerCase())
    );
  }

  /**
   * Finds the models for the supplied make from the list of default printers.
   */
  private findModelsForMake(make: string) {
    const modelsForMake = defaultPrinters.printers
      .filter((printer) => printer.make.toLowerCase() === make.toLowerCase())
      .map((printer) => printer.model);
    const uniqueModels = uniq(modelsForMake);

    return uniqueModels;
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
        [Validators.required, Validators.min(0)],
      ],
      filamentDiameter: [
        printer && printer.filamentDiameter ? printer.filamentDiameter : 0,
        [Validators.required, Validators.min(0)],
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
    this.saving = true;

    const newPrinter: PrinterDetail = this.getPrinterFromForm();

    let savePrinter: Observable<PrinterDetail>;

    if (newPrinter.id === null) {
      savePrinter = this.printerService.addPrinter(newPrinter);
    } else {
      savePrinter = this.printerService.updatePrinter(newPrinter);
    }

    savePrinter.subscribe(
      (printer) => {
        this.saving = false;
        this.router.navigate(['/printers']).then(() => {
          this.toastr.success('Save successful!');
        });
      },
      (err) => {
        this.saving = false;
      }
    );
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
