import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  FormControl,
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
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  map,
  switchMap,
} from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import { EMPTY_GUID } from 'src/app/core/services/print.service';
import {
  PrinterCatalogService,
  PrinterModel,
} from 'src/app/core/services/printer-catalog.service';
import { SubscriptionService } from 'src/app/core/services/subscription.service';
import { EntityImagesPanelComponent } from 'src/app/shared/entity-images-panel/entity-images-panel.component';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';
import {
  PrinterDetail,
  PrinterFilamentSummaryDto,
  PrinterService,
} from '../../core/services/printer.service';
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
import { isPlatformBrowser } from '@angular/common';
import {
  isRemainingTracked,
  RemainingPipe,
} from 'src/app/shared/pipes/remaining.pipe';
import { FilamentColorSwatchStylePipe } from '../../shared/pipes/filament-color-swatch-style.pipe';

const SEARCH_DEBOUNCE_MS = 150;
const FILL_DISMISSED_KEY_PREFIX = 'pl_fill_specs_dismissed_';

/**
 * The numeric spec controls a catalog model can fill on an existing printer. The heated bed
 * and chamber are left out: the form shows an unknown one as off, so "empty" can't be told
 * from a real "no".
 */
const FILLABLE_SPECS = [
  'nozzleDiameter',
  'filamentDiameter',
  'bedWidthMm',
  'bedDepthMm',
  'bedHeightMm',
] as const;
type FillableSpec = (typeof FILLABLE_SPECS)[number];

/** How the fill card names the fields it would set, in the order it lists them. */
const FILL_GROUPS: { label: string; fields: FillableSpec[] }[] = [
  { label: 'bed size', fields: ['bedWidthMm', 'bedDepthMm', 'bedHeightMm'] },
  { label: 'nozzle', fields: ['nozzleDiameter'] },
  { label: 'filament diameter', fields: ['filamentDiameter'] },
];

/** The form control each catalog spec maps to, the same mapping quick add uses. */
function catalogSpecs(m: PrinterModel) {
  return {
    nozzleDiameter: m.defaultNozzleMm ?? null,
    filamentDiameter: m.filamentDiameterMm ?? null,
    bedWidthMm: m.bedWidthMm ?? null,
    bedDepthMm: m.bedDepthMm ?? null,
    bedHeightMm: m.bedHeightMm ?? null,
    hasHeatedBed: m.hasHeatedBed ?? null,
    hasHeatedChamber: m.hasHeatedChamber ?? null,
  };
}

function label(m: PrinterModel): string {
  return `${m.make} ${m.model}`;
}

/** "a", "a and b", "a, b and c". */
function listInProse(items: string[]): string {
  return items.length < 2
    ? (items[0] ?? '')
    : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

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
    RemainingPipe,
    FilamentColorSwatchStylePipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrinterDetailComponent
  implements OnInit, ComponentCanDeactivate, OnDestroy
{
  /** False for a spool with no starting weight, whose remaining is null. */
  protected readonly isRemainingTracked = isRemainingTracked;

  /**
   * A resin bottle, shown in mL only (printlog-bridge#97). The summary carries no measurement
   * source, but a bottle has no diameter and so no length remaining, while a filament spool
   * tracked by weight always has one.
   */
  protected isMeasuredInMl(filament: FilamentSummary | null): boolean {
    return (
      isRemainingTracked(filament?.filamentVolumeRemainingInMl) &&
      !isRemainingTracked(filament?.filamentLengthRemainingInM)
    );
  }

  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);
  private formBuilder = inject(UntypedFormBuilder);
  private printerService = inject(PrinterService);
  private toastr = inject(ToastrService);
  private titleService = inject(Title);
  dialog = inject(MatDialog);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly catalog = inject(PrinterCatalogService);
  private readonly logging = inject(LoggingService);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

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
  protected readonly savedCatalogModelId = computed(
    () => this.printerDetail()?.catalogModelId ?? null
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

  /**
   * Finds a printer in the catalog. It only picks a model: make and model stay their own
   * free-text inputs, so a printer the catalog lacks is typed as before.
   */
  readonly catalogSearch = new FormControl<string | PrinterModel>('', {
    nonNullable: true,
  });
  readonly suggestions = signal<PrinterModel[]>([]);
  /** The label the last pick wrote into the search, which is not a new query. */
  private lastPickLabel = '';

  /** The model picked on this page, until a hand edit of make or model drops it. */
  private readonly pickedModel = signal<PrinterModel | null>(null);
  /** The model the saved printer links to, loaded by id. */
  private readonly linkedModel = signal<PrinterModel | null>(null);
  private linkedModelSubscription?: Subscription;
  private formChangesSubscription?: Subscription;

  /** Bumped on every form change, so computeds that read the form recompute. */
  private readonly formVersion = signal(0);

  /** Filled, or dismissed for this printer; a new pick opens it again. */
  private readonly fillCardClosed = signal(false);
  private fillShownLogged = false;

  /** The model the fill card offers: a fresh pick, otherwise the saved link. */
  private readonly fillModel = computed(
    () => this.pickedModel() ?? this.linkedModel()
  );

  /** The empty spec controls the fill card's model has values for. */
  protected readonly fillableSpecs = computed((): FillableSpec[] => {
    this.formVersion();
    const m = this.fillModel();
    if (!m) {
      return [];
    }
    const specs = catalogSpecs(m);
    const form = this.printerForm();
    return FILLABLE_SPECS.filter((key) => {
      const c = form.get(key);
      const v = c.value;
      return (
        specs[key] != null &&
        c.enabled &&
        !c.dirty &&
        (v === null || v === undefined || v === '' || v === 0)
      );
    });
  });

  /** Only on a saved printer: a new one takes the pick's specs straight away. */
  protected readonly showFillCard = computed(
    () =>
      this.printerDetail()?.id != null &&
      !this.fillCardClosed() &&
      this.fillableSpecs().length > 0
  );

  protected readonly fillCardText = computed(() => {
    const fields = this.fillableSpecs();
    const groups = FILL_GROUPS.filter((g) =>
      g.fields.some((f) => fields.includes(f))
    ).map((g) => g.label);
    return `We know this printer's specs: fill ${listInProse(groups)}?`;
  });

  protected readonly fillModelLabel = computed(() => {
    const m = this.fillModel();
    return m ? label(m) : '';
  });

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

  public wattageHasFocus = false;

  constructor() {
    this.catalogSearch.valueChanges
      .pipe(
        map((v) => (typeof v === 'string' ? v.trim() : '')),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((q) =>
          !q || q === this.lastPickLabel
            ? of([] as PrinterModel[])
            : this.catalog.search(q)
        ),
        takeUntilDestroyed()
      )
      .subscribe((list) => this.suggestions.set(list));

    effect(() => {
      const m = this.fillModel();
      if (!this.showFillCard() || this.fillShownLogged || !m) {
        return;
      }
      this.fillShownLogged = true;
      this.logging.logEvent('PrinterSpecs_FillShown', {
        printerId: this.printerDetail()?.id,
        catalogModelId: m.id,
        fields: this.fillableSpecs(),
      });
    });
  }

  /** The input shows the model's name, never the option object. */
  readonly displayOption = (v: string | PrinterModel | null): string =>
    typeof v === 'string' ? v : v ? label(v) : '';

  // Help to get all printer loaded filament controls as form array.
  get loadedFilaments(): UntypedFormArray {
    return this.printerForm().get('loadedFilaments') as UntypedFormArray;
  }

  ngOnDestroy(): void {
    this.printerCategorySubscription?.unsubscribe?.();
    this.linkedModelSubscription?.unsubscribe();
    this.formChangesSubscription?.unsubscribe();
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

      this.formChangesSubscription?.unsubscribe();
      this.formChangesSubscription = form.valueChanges.subscribe(() =>
        this.formVersion.update((n) => n + 1)
      );

      this.resetCatalogState(data.printer ?? null);
    });
  }

  /** A newly resolved printer starts with no pick, its own link and its own dismissal. */
  private resetCatalogState(printer: PrinterDetail | null): void {
    this.pickedModel.set(null);
    this.linkedModel.set(null);
    this.lastPickLabel = '';
    this.catalogSearch.setValue('', { emitEvent: false });
    this.suggestions.set([]);
    this.fillShownLogged = false;
    this.fillCardClosed.set(
      printer?.id != null && this.isFillDismissed(printer.id)
    );

    this.linkedModelSubscription?.unsubscribe();
    const linkedId = printer?.catalogModelId;
    if (linkedId) {
      // Fails soft: a retired or unknown id gives null, and the printer still saves.
      this.linkedModelSubscription = this.catalog
        .get(linkedId)
        .subscribe((m) => {
          this.linkedModel.set(m);
          this.showLinkedModelInSearch(m);
        });
    }
  }

  /**
   * The search names the model the printer already links to. It writes no event, so no search
   * runs, and the search control is not part of the printer form, so the form stays pristine.
   * Text the user typed meanwhile wins.
   */
  private showLinkedModelInSearch(m: PrinterModel | null): void {
    if (!m || this.catalogSearch.value !== '') {
      return;
    }
    this.lastPickLabel = label(m);
    this.catalogSearch.setValue(label(m), { emitEvent: false });
    this.changeDetector.markForCheck();
  }

  /**
   * A pick links the printer to the model and takes its make and model, so the link never
   * disagrees with the name on screen. A new printer also takes the model's specs, except in
   * controls the user has changed. An existing printer keeps its name and every spec: the
   * fill card offers the model's specs for the empty ones.
   */
  selectCatalogModel(m: PrinterModel): void {
    const form = this.printerForm();
    this.lastPickLabel = label(m);
    this.catalogSearch.setValue(label(m));
    this.suggestions.set([]);
    this.pickedModel.set(m);
    this.fillCardClosed.set(false);
    this.fillShownLogged = false;

    const link = form.get('catalogModelId');
    link.setValue(m.id);
    link.markAsDirty();

    // A programmatic patch fires no input event, so onMakeOrModelInput keeps the pick.
    form.patchValue({ make: m.make, model: m.model });
    if (form.get('id').value === null) {
      this.applyCatalogDefaults(m);
    }
    this.changeDetector.markForCheck();
  }

  private applyCatalogDefaults(m: PrinterModel): void {
    const form = this.printerForm();
    const fill = (name: string, value: unknown) => {
      const c = form.get(name);
      if (value !== null && value !== undefined && !c.dirty) {
        c.setValue(value);
      }
    };
    fill('name', m.model);
    const nickname = m.technology === 'Resin' ? 'MSLA' : 'FFF';
    if (this.printerCategories.some((c) => c.nickname === nickname)) {
      // Before the specs: the type decides which spec controls are enabled.
      fill('type', nickname);
    }
    fill('slotCount', m.defaultSlotCount);
    const specs = catalogSpecs(m);
    for (const key of Object.keys(specs) as (keyof typeof specs)[]) {
      fill(key, specs[key]);
    }
  }

  /**
   * A hand edit of make or model means the printer is no longer the picked model, so the
   * pick's link is dropped. Values it filled stay. A saved link is kept: the API keeps it
   * when the save sends no id.
   */
  onMakeOrModelInput(): void {
    if (!this.pickedModel()) {
      return;
    }
    this.pickedModel.set(null);
    this.printerForm()
      .get('catalogModelId')
      .setValue(this.savedCatalogModelId());
  }

  /** Sets only the empty controls, marked dirty. The user saves as usual. */
  fillMissingSpecs(): void {
    const m = this.fillModel();
    const fields = this.fillableSpecs();
    if (!m || fields.length === 0) {
      return;
    }
    const specs = catalogSpecs(m);
    const form = this.printerForm();
    for (const key of fields) {
      const c = form.get(key);
      c.setValue(specs[key]);
      c.markAsDirty();
    }
    this.fillCardClosed.set(true);
    this.logging.logEvent('PrinterSpecs_Filled', { fields });
    this.changeDetector.markForCheck();
  }

  dismissFillCard(): void {
    const printerId = this.printerDetail()?.id;
    this.fillCardClosed.set(true);
    if (printerId != null) {
      this.writeFillDismissed(printerId);
    }
    this.logging.logEvent('PrinterSpecs_FillDismissed', {
      printerId,
      catalogModelId: this.fillModel()?.id,
    });
  }

  /*
   * localStorage throws in private browsing and when site data is blocked, and does not
   * exist during prerender. Failing to read shows the card; failing to write only means it
   * comes back next visit.
   */
  private isFillDismissed(printerId: number): boolean {
    if (!this.isBrowser) {
      return false;
    }
    try {
      return (
        localStorage.getItem(FILL_DISMISSED_KEY_PREFIX + printerId) !== null
      );
    } catch {
      return false;
    }
  }

  private writeFillDismissed(printerId: number): void {
    if (!this.isBrowser) {
      return;
    }
    try {
      localStorage.setItem(
        FILL_DISMISSED_KEY_PREFIX + printerId,
        new Date().toISOString()
      );
    } catch {
      // Nothing to do: the card shows again next visit.
    }
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
      /** Hidden: the catalog model the printer links to, set by a pick. */
      catalogModelId: [printer?.catalogModelId ?? null],
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

  private changedCatalogModelId(): string | null {
    const id = this.printerForm().controls.catalogModelId.value as
      | string
      | null;
    return id && id !== this.savedCatalogModelId() ? id : null;
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
      // Only a new link is sent. Null keeps the saved one, even a model since retired.
      catalogModelId: this.changedCatalogModelId(),
    };

    return printer;
  }
}
