import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import {
  AbstractControl,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { uniq } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription } from 'rxjs';
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
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { MaterialCategory } from 'src/app/core/services/material-categories.service';

@Component({
  selector: 'app-printer-detail',
  templateUrl: './printer-detail.component.html',
  styleUrls: ['./printer-detail.component.scss'],
  standalone: false,
})
export class PrinterDetailComponent
  implements OnInit, ComponentCanDeactivate, OnDestroy
{
  public printerForm: UntypedFormGroup;
  public saving = false;

  // public referencePrinter = defaultPrinters;

  public autocompleteMakes: string[] = [];

  filteredMakes: Observable<string[]>;

  filteredModels: Observable<string[]>;

  public printerCategories: PrinterCategory[] = [];

  /** Printer Categories grouped by their material type name */
  public groupedPrinterCategories: {
    name: string;
    categories: PrinterCategory[];
  }[] = [];

  public materialCategories: MaterialCategory[] = [];

  public printerCategorySubscription: Subscription;

  public makeHasFocus = false;

  public modelHasFocus = false;

  // Help to get all printer loaded filament controls as form array.
  get loadedFilaments(): UntypedFormArray {
    return this.printerForm.get('loadedFilaments') as UntypedFormArray;
  }

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private printerService: PrinterService,
    private toastr: ToastrService,
    private titleService: Title,
    public dialog: MatDialog
  ) {}

  ngOnDestroy(): void {
    this.printerCategorySubscription?.unsubscribe?.();
  }

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.printerForm.dirty;
  }

  ngOnInit() {
    this.titleService.setTitle('Printer Details - 3D Print Log');

    this.getReferencePrinterMakes();

    this.activatedRoute.data.subscribe((data) => {
      this.printerCategories = data.printerCategories;
      this.materialCategories = data.materialCategories;

      this.groupPrinterCategoriesByMaterial();

      this.printerForm = this.buildFormFromPrinterDetail(data.printer);

      this.recalculateFormFieldsForSelectedPrinterCategory(
        this.printerForm.get('type').value
      );

      this.printerCategorySubscription = this.printerForm
        .get('type')
        .valueChanges.subscribe((categoryNickname) => {
          this.recalculateFormFieldsForSelectedPrinterCategory(
            categoryNickname
          );
        });

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
   * Group the printerCategories by their material category
   *  */
  private groupPrinterCategoriesByMaterial() {
    this.groupedPrinterCategories = this.printerCategories.reduce(
      (acc, curr) => {
        const existingGroup = acc.find(
          (g) => g.name === curr.materialCategory.name
        );

        if (existingGroup) {
          existingGroup.categories.push(curr);
        } else {
          acc.push({
            name: curr?.materialCategory?.name ?? 'Other',
            categories: [curr],
          });
        }

        return acc;
      },
      []
    );

    // sort the grouped printer categories by their nickname
    this.groupedPrinterCategories.forEach((g) => {
      g.categories = g.categories.sort((a, b) => {
        if (a.nickname < b.nickname) {
          return -1;
        }

        if (a.nickname > b.nickname) {
          return 1;
        }

        return 0;
      });
    });

    // Sort the groups by their name
    this.groupedPrinterCategories.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }

      if (a.name > b.name) {
        return 1;
      }

      return 0;
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

  /**
   * Adjust the form fields to match the settings for the printer category
   */
  private recalculateFormFieldsForSelectedPrinterCategory(value: any) {
    const selectedPrinterCategory = this.printerCategories.find((m) => {
      return m.nickname === value;
    });

    if (selectedPrinterCategory) {
      // Adjust the form fields to match the settings for the printer category

      if (selectedPrinterCategory.showNozzleDiameter) {
        this.printerForm.get('nozzleDiameter').enable();
      } else {
        this.printerForm.get('nozzleDiameter').disable();
      }

      if (selectedPrinterCategory.showFilamentDiameter) {
        this.printerForm.get('filamentDiameter').enable();
      } else {
        this.printerForm.get('filamentDiameter').disable();
      }

      if (selectedPrinterCategory.showBeamDiameter) {
        this.printerForm.get('beamDiameter').enable();
      } else {
        this.printerForm.get('beamDiameter').disable();
      }

      if (selectedPrinterCategory.showBedSize) {
        this.printerForm.get('bedWidthMm').enable();
        this.printerForm.get('bedDepthMm').enable();
        this.printerForm.get('bedHeightMm').enable();
      } else {
        this.printerForm.get('bedWidthMm').disable();
        this.printerForm.get('bedDepthMm').disable();
        this.printerForm.get('bedHeightMm').disable();
      }

      if (selectedPrinterCategory.showScreenResolution) {
        this.printerForm.get('screenResolutionXPixels').enable();
        this.printerForm.get('screenResolutionYPixels').enable();
      } else {
        this.printerForm.get('screenResolutionXPixels').disable();
        this.printerForm.get('screenResolutionYPixels').disable();
      }

      if (selectedPrinterCategory.showHasHeatedBed) {
        this.printerForm.get('hasHeatedBed').enable();
      } else {
        this.printerForm.get('hasHeatedBed').disable();
      }

      if (selectedPrinterCategory.showHasHeatedChamber) {
        this.printerForm.get('hasHeatedChamber').enable();
      } else {
        this.printerForm.get('hasHeatedChamber').disable();
      }
    }
  }

  buildFormFromPrinterDetail(printer: PrinterDetail): UntypedFormGroup {
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
        [Validators.min(0)],
      ],
      filamentDiameter: [
        printer && printer.filamentDiameter ? printer.filamentDiameter : 0,
        [Validators.min(0)],
      ],
      beamDiameter: [
        printer && printer.beamDiameter ? printer.beamDiameter : 0,
        [Validators.min(0)],
      ],
      isActive: [
        printer && printer.isActive !== null && printer.isActive !== undefined
          ? printer.isActive
          : true,
      ],
      loadedFilaments: loadedFilamentsForm,
      type: [printer?.category?.nickname ?? 'FFF', Validators.required],
      bedWidthMm: [
        printer && printer.bedWidthMm ? printer.bedWidthMm : 0,
        [Validators.min(0)],
      ],
      bedDepthMm: [
        printer && printer.bedDepthMm ? printer.bedDepthMm : 0,
        [Validators.min(0)],
      ],
      bedHeightMm: [
        printer && printer.bedHeightMm ? printer.bedHeightMm : 0,
        [Validators.min(0)],
      ],
      screenResolutionXPixels: [
        printer && printer.screenResolutionXPixels
          ? printer.screenResolutionXPixels
          : 0,
        [Validators.min(0)],
      ],
      screenResolutionYPixels: [
        printer && printer.screenResolutionYPixels
          ? printer.screenResolutionYPixels
          : 0,
        [Validators.min(0)],
      ],
      hasHeatedBed: [
        printer &&
        printer.hasHeatedBed !== null &&
        printer.hasHeatedBed !== undefined
          ? printer.hasHeatedBed
          : false,
      ],
      hasHeatedChamber: [
        printer &&
        printer.hasHeatedChamber !== null &&
        printer.hasHeatedChamber !== undefined
          ? printer.hasHeatedChamber
          : false,
      ],
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
      height: '90svh',
      width: '95vw',
      maxWidth: '100vw',
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
      nozzleDiameter: this.printerForm.controls.nozzleDiameter.enabled
        ? this.printerForm.controls.nozzleDiameter.value
        : undefined,
      filamentDiameter: this.printerForm.controls.filamentDiameter.enabled
        ? this.printerForm.controls.filamentDiameter.value
        : undefined,
      isActive: this.printerForm.controls.isActive.value,
      loadedFilaments: newLoadedFilament,
      category: this.printerCategories.find(
        (catergory) =>
          catergory.nickname === this.printerForm.controls.type.value
      ),
      beamDiameter: this.printerForm.controls.beamDiameter.enabled
        ? this.printerForm.controls.beamDiameter.value
        : undefined,
      bedDepthMm: this.printerForm.controls.bedDepthMm.enabled
        ? this.printerForm.controls.bedDepthMm.value
        : undefined,
      bedHeightMm: this.printerForm.controls.bedHeightMm.enabled
        ? this.printerForm.controls.bedHeightMm.value
        : undefined,
      bedWidthMm: this.printerForm.controls.bedWidthMm.enabled
        ? this.printerForm.controls.bedWidthMm.value
        : undefined,
      screenResolutionXPixels: this.printerForm.controls.screenResolutionXPixels
        .enabled
        ? this.printerForm.controls.screenResolutionXPixels.value
        : undefined,
      screenResolutionYPixels: this.printerForm.controls.screenResolutionYPixels
        .enabled
        ? this.printerForm.controls.screenResolutionYPixels.value
        : undefined,
      hasHeatedBed: this.printerForm.controls.hasHeatedBed.enabled
        ? this.printerForm.controls.hasHeatedBed.value
        : undefined,
      hasHeatedChamber: this.printerForm.controls.hasHeatedChamber.enabled
        ? this.printerForm.controls.hasHeatedChamber.value
        : undefined,
    };

    return printer;
  }
}
