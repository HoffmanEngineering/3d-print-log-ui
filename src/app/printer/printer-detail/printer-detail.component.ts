import { Component, HostListener, OnInit } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { uniq } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { EMPTY_GUID } from 'src/app/core/services/print.service';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';
import {
  PrinterDetail,
  PrinterFilamentSummaryDto,
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

  // Help to get all printer loaded filament controls as form array.
  get loadedFilaments(): FormArray {
    return this.printerForm.get('loadedFilaments') as FormArray;
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private printerService: PrinterService,
    private toastr: ToastrService,
    private titleService: Title,
    public dialog: MatDialog
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
    const loadedFilamentsForm = this.formBuilder.array([]);

    if (
      printer &&
      printer.loadedFilaments &&
      printer.loadedFilaments.length >= 0
    ) {
      printer.loadedFilaments.forEach((pf) => {
        const newFormGroup = this.GetNewLoadedFilamentFormElement(
          pf.id,
          pf.filament
        );

        loadedFilamentsForm.push(newFormGroup);
      });
    }

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
      loadedFilaments: loadedFilamentsForm,
    });

    return form;
  }

  private GetNewLoadedFilamentFormElement(
    id: string,
    filament: FilamentSummary | null
  ) {
    return this.formBuilder.group({
      id,
      filament,
    });
  }

  public loadFilament() {
    const dialogRef = this.dialog.open(FilamentSearchModalComponent, {
      data: {
        otherFilamentOption: null,
      },
    });

    dialogRef.componentInstance.dialogRef
      .afterClosed()
      .subscribe((filament) => {
        if (filament) {
          const newFilament = this.GetNewLoadedFilamentFormElement(
            EMPTY_GUID,
            filament
          );

          this.loadedFilaments.push(newFilament);
        }
      });
  }

  public removeFilament(index: number) {
    this.loadedFilaments.removeAt(index);
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
        this.printerForm.markAsPristine();

        const url = this.getRedirectUrl();

        this.router.navigateByUrl(url).then(() => {
          this.toastr.success('Save successful!');
        });
      },
      (err) => {
        this.saving = false;
      }
    );
  }

  /**
   * Get the proper URL to redirect to.
   */
  getRedirectUrl(): string {
    // Sometimes we want to redirect to a specific url after a printer is created (ie, the first printer)
    if (this.activatedRoute.snapshot.queryParamMap.has('returnUrl')) {
      return this.activatedRoute.snapshot.queryParamMap.get('returnUrl');
    }

    return '/printers';
  }

  handleClose() {
    this.router.navigate(['/printers']);
  }

  private getPrinterFromForm(): PrinterDetail {
    const newLoadedFilament = this.loadedFilaments.controls.map(
      (printerFilament) => {
        const newPf: PrinterFilamentSummaryDto = {
          id: printerFilament.get('id').value ?? EMPTY_GUID,
          filament: printerFilament.get('filament')?.value,
        };

        return newPf;
      }
    );

    const printer: PrinterDetail = {
      id: this.printerForm.controls.id.value,
      name: this.printerForm.controls.name.value,
      make: this.printerForm.controls.make.value,
      model: this.printerForm.controls.model.value,
      description: this.printerForm.controls.description.value,
      nozzleDiameter: this.printerForm.controls.nozzleDiameter.value,
      filamentDiameter: this.printerForm.controls.filamentDiameter.value,
      isActive: this.printerForm.controls.isActive.value,
      loadedFilaments: newLoadedFilament,
    };

    return printer;
  }
}
