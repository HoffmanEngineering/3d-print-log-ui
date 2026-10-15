import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  AbstractControl,
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
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
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { EntityImagesPanelComponent } from 'src/app/shared/entity-images-panel/entity-images-panel.component';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';
import {
  PrinterDetail,
  PrinterFilamentSummaryDto,
  PrinterService,
} from '../../core/services/printer.service';
import defaultPrinters from './cura-exported-printers';
import { PrinterCategory } from 'src/app/core/services/printer-categories.service';
import { MaterialCategory } from 'src/app/core/services/material-categories.service';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultLayoutGapDirective,
  DefaultFlexDirective,
  FlexFillDirective,
} from '@ngbracket/ngx-layout/flex';
import {
  MatCard,
  MatCardTitle,
  MatCardContent,
  MatCardActions,
} from '@angular/material/card';
import { EntityImagesPanelComponent as EntityImagesPanelComponent_1 } from '../../shared/entity-images-panel/entity-images-panel.component';
import {
  MatFormField,
  MatLabel,
  MatError,
  MatHint,
} from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatOptgroup, MatOption } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import {
  MatAutocompleteTrigger,
  MatAutocomplete,
} from '@angular/material/autocomplete';
import { MatCheckbox } from '@angular/material/checkbox';
import { PrinterSlotsComponent } from '../printer-slots/printer-slots.component';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { PrinterConnectionsComponent } from '../printer-connections/printer-connections.component';
import { PrinterSpoolmanComponent } from '../printer-spoolman/printer-spoolman.component';
import { AdComponent } from '../../shared/ad/ad.component';
import { DefaultShowHideDirective } from '@ngbracket/ngx-layout/extended';
import { SidebarAdComponent } from '../../shared/ad/sidebar-ad.component';
import { AsyncPipe, DecimalPipe } from '@angular/common';
import { FilamentColorSwatchStylePipe } from '../../shared/pipes/filament-color-swatch-style.pipe';

@Component({
  selector: 'app-printer-detail',
  host: { '(window:beforeunload)': 'canDeactivate()' },
  templateUrl: './printer-detail.component.html',
  styleUrls: ['./printer-detail.component.scss'],
  imports: [
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    DefaultLayoutGapDirective,
    MatCard,
    DefaultFlexDirective,
    FormsModule,
    ReactiveFormsModule,
    MatCardTitle,
    MatCardContent,
    FlexFillDirective,
    EntityImagesPanelComponent_1,
    MatFormField,
    MatLabel,
    MatInput,
    MatError,
    MatSelect,
    MatOptgroup,
    MatOption,
    MatTooltip,
    MatAutocompleteTrigger,
    MatHint,
    MatAutocomplete,
    MatCheckbox,
    PrinterSlotsComponent,
    MatButton,
    MatIcon,
    PrinterConnectionsComponent,
    PrinterSpoolmanComponent,
    MatCardActions,
    AdComponent,
    DefaultShowHideDirective,
    SidebarAdComponent,
    AsyncPipe,
    DecimalPipe,
    FilamentColorSwatchStylePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterDetailComponent
  implements OnInit, ComponentCanDeactivate, OnDestroy
{
  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private formBuilder = inject(UntypedFormBuilder);
  private printerService = inject(PrinterService);
  private toastr = inject(ToastrService);
  private titleService = inject(Title);
  dialog = inject(MatDialog);
  private readonly changeDetector = inject(ChangeDetectorRef);

  /** Rebuilt whenever the route resolves a printer, including after a create. */
  readonly printerForm = signal<UntypedFormGroup>(
    this.buildFormFromPrinterDetail(null)
  );
  readonly saving = signal(false);

  protected readonly imagesPanel = viewChild(EntityImagesPanelComponent);

  private readonly subscriptionService = inject(SubscriptionService);

  /** Images allowed on one printer, by subscription tier. */
  protected readonly maxImages = this.subscriptionService.maxImages;

  /** The printer as resolved, kept only so the panel can render its stored photos. */
  private readonly printerDetail = signal<PrinterDetail | null>(null);

  protected readonly printerImages = computed(
    () => this.printerDetail()?.images ?? []
  );

  /**
   * Tracks the form's id rather than `printerDetail`, so a create that writes the new id
   * back onto the form immediately retargets the panel at the saved printer.
   */
  private readonly formPrinterId = signal<number | null>(null);

  /** Only a saved printer can have connections; the create route has no id yet. */
  protected readonly savedPrinterId = computed(() => this.formPrinterId());

  /**
   * The category, make and model as saved, for the Spoolman panel: it offers a connection
   * only to a saved FDM printer, and an unsaved edit to the form does not change that.
   */
  protected readonly savedCategory = computed(
    () => this.printerDetail()?.category ?? null
  );
  protected readonly savedMake = computed(
    () => this.printerDetail()?.make ?? null
  );
  protected readonly savedModel = computed(
    () => this.printerDetail()?.model ?? null
  );

  /** The slot count as saved. Slots are managed live, so they wait for the count to be saved. */
  private readonly savedSlotCount = computed(
    () => this.printerDetail()?.slotCount ?? 1
  );

  /** A saved multi-slot printer loads spools per slot instead of in the form's list. */
  protected readonly showSlots = computed(
    () => this.savedPrinterId() != null && this.savedSlotCount() > 1
  );

  protected readonly slotCount = this.savedSlotCount;

  protected readonly slotLoaded = computed(
    () => this.printerDetail()?.loadedFilaments ?? []
  );

  protected readonly imageTarget = computed(() =>
    this.printerService.imageTarget(this.formPrinterId())
  );

  /** See `canDeactivate`: suppresses the guard for app-initiated navigation. */
  private isSelfNavigating = false;

  // public referencePrinter = defaultPrinters;

  public autocompleteMakes: string[] = [];

  filteredMakes: Observable<string[]>;

  filteredModels: Observable<string[]>;

  public printerCategories: PrinterCategory[] = [];

  /** Printer Categories grouped by their material type name */
  readonly groupedPrinterCategories = signal<
    {
      name: string;
      categories: PrinterCategory[];
    }[]
  >([]);

  public materialCategories: MaterialCategory[] = [];

  public printerCategorySubscription: Subscription;

  public makeHasFocus = false;

  public modelHasFocus = false;

  public wattageHasFocus = false;

  // Help to get all printer loaded filament controls as form array.
  get loadedFilaments(): UntypedFormArray {
    return this.printerForm().get('loadedFilaments') as UntypedFormArray;
  }

  ngOnDestroy(): void {
    this.printerCategorySubscription?.unsubscribe?.();
  }

  canDeactivate(): boolean {
    // A navigation this component started itself is never the user abandoning work, so it
    // must not be second-guessed. Without this, rewriting the URL after a create prompts
    // "You have unsaved changes" about the very photos the save is uploading.
    if (this.isSelfNavigating) return true;

    // The form is blind to staged photos, so without the panel a user who has only picked
    // images would navigate away and silently lose them.
    return !this.printerForm().dirty && !this.imagesPanel()?.hasStagedImages();
  }

  /**
   * Points the URL at the saved printer without prompting. Used only after a create whose
   * photos failed, where the page stays put for the retry - the success path leaves for
   * the list instead.
   */
  private replaceUrlWithSaved(printerId: number): void {
    this.isSelfNavigating = true;
    this.router
      .navigate(['/printers', printerId], { replaceUrl: true })
      // Restore the guard however the navigation ends, or the rest of this component's
      // life would silently skip the unsaved-changes check.
      .finally(() => (this.isSelfNavigating = false));
  }

  ngOnInit() {
    this.titleService.setTitle('Printer Details - 3D Print Log');

    this.getReferencePrinterMakes();

    this.activatedRoute.data.subscribe((data) => {
      this.printerCategories = data.printerCategories;
      this.materialCategories = data.materialCategories;

      this.groupPrinterCategoriesByMaterial();

      this.printerDetail.set(data.printer ?? null);
      const form = this.buildFormFromPrinterDetail(data.printer);
      this.printerForm.set(form);
      this.formPrinterId.set(form.get('id').value ?? null);

      this.recalculateFormFieldsForSelectedPrinterCategory(
        form.get('type').value
      );

      this.printerCategorySubscription?.unsubscribe();
      this.printerCategorySubscription = form
        .get('type')
        .valueChanges.subscribe((categoryNickname) => {
          this.recalculateFormFieldsForSelectedPrinterCategory(
            categoryNickname
          );
        });

      this.filteredMakes = form.controls.make.valueChanges.pipe(
        startWith(''),
        map((value) => this._filterMakes(value))
      );

      this.filteredModels = form.valueChanges.pipe(
        startWith({ make: '', model: '' }),

        map((value) => this._filterModels(value))
      );
    });
  }

  /**
   * Group the printerCategories by their material category
   *  */
  private groupPrinterCategoriesByMaterial() {
    const groups: { name: string; categories: PrinterCategory[] }[] =
      this.printerCategories.reduce((acc, curr) => {
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
      }, []);

    // sort the grouped printer categories by their nickname
    groups.forEach((g) => {
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
    groups.sort((a, b) => {
      if (a.name < b.name) {
        return -1;
      }

      if (a.name > b.name) {
        return 1;
      }

      return 0;
    });

    this.groupedPrinterCategories.set(groups);
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
      const form = this.printerForm();

      if (selectedPrinterCategory.showNozzleDiameter) {
        form.get('nozzleDiameter').enable();
      } else {
        form.get('nozzleDiameter').disable();
      }

      if (selectedPrinterCategory.showFilamentDiameter) {
        form.get('filamentDiameter').enable();
      } else {
        form.get('filamentDiameter').disable();
      }

      if (selectedPrinterCategory.showBeamDiameter) {
        form.get('beamDiameter').enable();
      } else {
        form.get('beamDiameter').disable();
      }

      if (selectedPrinterCategory.showBedSize) {
        form.get('bedWidthMm').enable();
        form.get('bedDepthMm').enable();
        form.get('bedHeightMm').enable();
      } else {
        form.get('bedWidthMm').disable();
        form.get('bedDepthMm').disable();
        form.get('bedHeightMm').disable();
      }

      if (selectedPrinterCategory.showScreenResolution) {
        form.get('screenResolutionXPixels').enable();
        form.get('screenResolutionYPixels').enable();
      } else {
        form.get('screenResolutionXPixels').disable();
        form.get('screenResolutionYPixels').disable();
      }

      if (selectedPrinterCategory.showHasHeatedBed) {
        form.get('hasHeatedBed').enable();
      } else {
        form.get('hasHeatedBed').disable();
      }

      if (selectedPrinterCategory.showHasHeatedChamber) {
        form.get('hasHeatedChamber').enable();
      } else {
        form.get('hasHeatedChamber').disable();
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
      wattageW: [printer?.wattageW ?? null, [Validators.min(0)]],
      slotCount: [
        printer?.slotCount ?? 1,
        [Validators.required, Validators.min(1), Validators.max(64)],
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
          // The dialog closed outside this view, and a FormArray is not a signal.
          this.changeDetector.markForCheck();
        }
      });
  }

  public removeFilament(index: number) {
    this.loadedFilaments.removeAt(index);
  }

  /**
   * The slots saved a change already. Mirror it into the form so the printer PUT sends the
   * same list, and leave the form pristine: there is nothing unsaved.
   */
  protected onSlotsChanged(loaded: PrinterFilamentSummaryDto[]): void {
    this.loadedFilaments.clear({ emitEvent: false });
    loaded.forEach((pf) =>
      this.loadedFilaments.push(
        this.GetNewLoadedFilamentFormElement(pf.id, pf.filament),
        { emitEvent: false }
      )
    );
  }

  onSubmit() {
    this.saving.set(true);

    const newPrinter: PrinterDetail = this.getPrinterFromForm();

    let savePrinter: Observable<PrinterDetail>;
    const wasNew = newPrinter.id === null;

    if (wasNew) {
      savePrinter = this.printerService.addPrinter(newPrinter);
    } else {
      savePrinter = this.printerService.updatePrinter(newPrinter);
    }

    savePrinter.subscribe(
      (printer) => {
        this.printerForm().markAsPristine();

        // The record is no longer new. Write the ID back BEFORE any upload, so a retry is
        // an update and never a second POST.
        if (wasNew && printer?.id) {
          this.printerForm().get('id').setValue(printer.id);
          this.formPrinterId.set(printer.id);
        }

        const panel = this.imagesPanel();
        if (!panel?.hasStagedImages() || !printer?.id) {
          this.finishSave();
          return;
        }

        const printerId = printer.id;

        panel.uploadStagedImages(printerId).subscribe((result) => {
          // Clear `saving` either way, or the retry button stays disabled forever.
          this.saving.set(false);

          if (result.allSucceeded) {
            this.finishSave();
            return;
          }

          // Stay put: the printer is saved, and the user needs a surface on which to deal
          // with the photos. Navigating away would discard that chance. Only now is the
          // URL rewritten, so a reload lands on the saved printer rather than on `new`.
          if (wasNew) this.replaceUrlWithSaved(printerId);

          const failedCount =
            result.transientFailures.length + result.permanentFailures.length;
          this.toastr.warning(
            `Printer saved, but ${failedCount} image(s) failed to upload. See the photos panel below.`
          );
        });
      },
      (err) => {
        this.saving.set(false);
      }
    );
  }

  private finishSave(): void {
    this.saving.set(false);
    this.router.navigateByUrl(this.getRedirectUrl()).then(() => {
      this.toastr.success('Save successful!');
    });
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

    const form = this.printerForm();
    const printer: PrinterDetail = {
      id: form.controls.id.value,
      name: form.controls.name.value,
      make: form.controls.make.value,
      model: form.controls.model.value,
      description: form.controls.description.value,
      nozzleDiameter: form.controls.nozzleDiameter.enabled
        ? form.controls.nozzleDiameter.value
        : undefined,
      filamentDiameter: form.controls.filamentDiameter.enabled
        ? form.controls.filamentDiameter.value
        : undefined,
      isActive: form.controls.isActive.value,
      loadedFilaments: newLoadedFilament,
      category: this.printerCategories.find(
        (catergory) => catergory.nickname === form.controls.type.value
      ),
      beamDiameter: form.controls.beamDiameter.enabled
        ? form.controls.beamDiameter.value
        : undefined,
      bedDepthMm: form.controls.bedDepthMm.enabled
        ? form.controls.bedDepthMm.value
        : undefined,
      bedHeightMm: form.controls.bedHeightMm.enabled
        ? form.controls.bedHeightMm.value
        : undefined,
      bedWidthMm: form.controls.bedWidthMm.enabled
        ? form.controls.bedWidthMm.value
        : undefined,
      screenResolutionXPixels: form.controls.screenResolutionXPixels.enabled
        ? form.controls.screenResolutionXPixels.value
        : undefined,
      screenResolutionYPixels: form.controls.screenResolutionYPixels.enabled
        ? form.controls.screenResolutionYPixels.value
        : undefined,
      hasHeatedBed: form.controls.hasHeatedBed.enabled
        ? form.controls.hasHeatedBed.value
        : undefined,
      hasHeatedChamber: form.controls.hasHeatedChamber.enabled
        ? form.controls.hasHeatedChamber.value
        : undefined,
      wattageW: form.controls.wattageW.value ?? undefined,
      slotCount: form.controls.slotCount.value ?? undefined,
    };

    return printer;
  }
}
