import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  map,
  of,
  startWith,
  switchMap,
} from 'rxjs';
import { LoggingService } from '../../core/services/logging.service';
import {
  PrinterCategory,
  PrinterCategoryService,
} from '../../core/services/printer-categories.service';
import {
  PrinterCatalogService,
  PrinterModel,
} from '../../core/services/printer-catalog.service';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';
import { InlineEmailNoticeComponent } from '../inline-email-notice/inline-email-notice.component';
import { OnboardingService } from '../onboarding.service';
import { quickAddErrorText } from '../quick-add-error';

export type QuickAddSource = 'welcome' | 'print-form' | 'checklist';
/** 'welcome' adds Save and add another and a step Continue; 'dialog' has one Add printer. */
export type QuickAddMode = 'welcome' | 'dialog';
/** What happens after a successful save. */
type AfterSave = 'done' | 'continue' | 'another';

const DEFAULT_SLOT_COUNT = 4;
const POPULAR_COUNT = 8;
const SEARCH_DEBOUNCE_MS = 150;
const NOT_LISTED_QUERY_MAX = 40;
const SAVE_FAILED = 'We could not save the printer. Try again.';
const PRINTER_MISSING = 'Search for your printer, or type its make and model.';
/** Types that have their own toggle button; "Other" offers the rest. */
const TOGGLE_NICKNAMES = ['FFF', 'MSLA'];

/** The spec fields a catalog model prefills and the user may edit. */
interface SpecValues {
  nozzleDiameter: number | null;
  filamentDiameter: number | null;
  bedWidthMm: number | null;
  bedDepthMm: number | null;
  bedHeightMm: number | null;
  hasHeatedBed: boolean | null;
  hasHeatedChamber: boolean | null;
}

const EMPTY_SPECS: SpecValues = {
  nozzleDiameter: null,
  filamentDiameter: null,
  bedWidthMm: null,
  bedDepthMm: null,
  bedHeightMm: null,
  hasHeatedBed: null,
  hasHeatedChamber: null,
};

const SPEC_KEYS = Object.keys(EMPTY_SPECS) as (keyof SpecValues)[];

function specsFrom(m: PrinterModel): SpecValues {
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

/** Everything a catalog pick patches besides make and model. */
interface CatalogPatch extends SpecValues {
  type: string;
  multiMaterial: boolean;
  slotCount: number;
}

/** What the form holds before any catalog pick. */
const FREE_TEXT_DEFAULTS: CatalogPatch = {
  type: 'FFF',
  multiMaterial: false,
  slotCount: DEFAULT_SLOT_COUNT,
  ...EMPTY_SPECS,
};

const NO_MODEL: PrinterModel = { id: '', make: '', model: '', technology: '' };

function label(m: PrinterModel): string {
  return `${m.make} ${m.model}`;
}

/**
 * A short form that creates a printer from the catalog (or free text), a type and an optional
 * slot count. A catalog pick also prefills the printer's specs, which the user can edit.
 * Used on the welcome page and, inside a dialog, from the print form and checklist.
 */
@Component({
  selector: 'app-quick-add-printer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    NgTemplateOutlet,
    InlineEmailNoticeComponent,
  ],
  templateUrl: './quick-add-printer.component.html',
  styleUrl: './quick-add-printer.component.scss',
})
export class QuickAddPrinterComponent implements OnInit {
  private readonly printerService = inject(PrinterService);
  private readonly categoryService = inject(PrinterCategoryService);
  private readonly catalog = inject(PrinterCatalogService);
  private readonly onboarding = inject(OnboardingService);
  private readonly logging = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly source = input.required<QuickAddSource>();
  readonly showEmailNotice = input(false);
  /** A catalog model to preselect, such as one detected from a slicer file. */
  readonly initialModelId = input<string | null>(null);
  readonly mode = input<QuickAddMode>('dialog');
  /** Welcome mode: the user already has a printer, so an untouched form can just continue. */
  readonly hasSavedPrinters = input(false);
  readonly saved = output<PrinterDetail>();
  /** Welcome mode: move on to the next step, after a save or without one. */
  readonly continued = output<void>();

  readonly form = this.fb.group({
    search: [''],
    make: ['', Validators.required],
    model: ['', Validators.required],
    name: ['', Validators.required],
    type: ['FFF'],
    otherCategory: [''],
    multiMaterial: [false],
    slotCount: [
      DEFAULT_SLOT_COUNT,
      [
        Validators.required,
        Validators.min(2),
        Validators.max(64),
        Validators.pattern(/^\d+$/),
      ],
    ],
    nozzleDiameter: this.fb.control<number | null>(null),
    filamentDiameter: this.fb.control<number | null>(null, Validators.min(0)),
    bedWidthMm: this.fb.control<number | null>(null, Validators.min(0)),
    bedDepthMm: this.fb.control<number | null>(null, Validators.min(0)),
    bedHeightMm: this.fb.control<number | null>(null, Validators.min(0)),
    hasHeatedBed: this.fb.control<boolean | null>(null),
    hasHeatedChamber: this.fb.control<boolean | null>(null),
  });

  readonly saving = signal(false);
  /** Set once the printer exists: Save stays off while a dialog closes or a step moves on. */
  readonly done = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showManual = signal(false);
  readonly specsOpen = signal(false);
  readonly categories = signal<PrinterCategory[]>([]);
  readonly otherCategories = computed(() =>
    this.categories().filter((c) => !TOGGLE_NICKNAMES.includes(c.nickname))
  );

  /** The catalog model the printer links to, or null for free text. */
  readonly catalogModel = signal<PrinterModel | null>(null);
  /** The last model picked. Its nozzle options stay after the link is dropped. */
  private readonly pickedModel = signal<PrinterModel | null>(null);
  readonly popular = signal<PrinterModel[]>([]);
  readonly suggestions = signal<PrinterModel[]>([]);

  private readonly searchText = toSignal(
    this.form.controls.search.valueChanges.pipe(
      startWith(''),
      map((v) => (typeof v === 'string' ? v : ''))
    ),
    { initialValue: '' }
  );
  private readonly typeValue = toSignal(
    this.form.controls.type.valueChanges.pipe(startWith('FFF')),
    { initialValue: 'FFF' }
  );
  private readonly multiValue = toSignal(
    this.form.controls.multiMaterial.valueChanges.pipe(startWith(false)),
    { initialValue: false }
  );
  private readonly formValue = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() }
  );

  /** Something is picked or typed, so the primary button saves it. */
  readonly inProgress = computed(() => {
    if (this.catalogModel()) {
      return true;
    }
    const v = this.formValue();
    return [v.search, v.make, v.model].some((text) => text.trim() !== '');
  });
  /** Welcome mode with a saved printer and nothing new: the primary only moves on. */
  readonly continueOnly = computed(
    () =>
      this.mode() === 'welcome' && this.hasSavedPrinters() && !this.inProgress()
  );
  readonly primaryLabel = computed(() => {
    if (this.mode() === 'dialog') {
      return 'Add printer';
    }
    return this.continueOnly() ? 'Continue' : 'Add printer and continue';
  });
  /** Nickname shows after a pick, or on the manual path once make or model has text. */
  readonly showName = computed(() => {
    if (this.catalogModel()) {
      return true;
    }
    const v = this.formValue();
    return this.showManual() && (v.make.trim() !== '' || v.model.trim() !== '');
  });
  readonly isOther = computed(() => this.typeValue() === 'Other');
  readonly isMultiMaterial = computed(() => this.multiValue());
  readonly showPopular = computed(
    () =>
      this.popular().length > 0 &&
      !this.catalogModel() &&
      !this.searchText().trim()
  );
  /** Specs show while a model is linked or any spec field holds a value. */
  readonly hasSpecs = computed(() => {
    if (this.catalogModel()) {
      return true;
    }
    const v = this.formValue();
    return SPEC_KEYS.some((key) => v[key] !== null);
  });
  readonly nozzleOptions = computed(() => {
    const m = this.pickedModel();
    if (!m) {
      return [];
    }
    if (m.nozzleOptionsMm?.length) {
      return m.nozzleOptionsMm;
    }
    return m.defaultNozzleMm ? [m.defaultNozzleMm] : [];
  });
  readonly selectedNozzle = computed(() => this.formValue().nozzleDiameter);
  /** The summary follows the user's edits, so it describes what will be saved. */
  readonly specSummary = computed(() => {
    if (!this.hasSpecs()) {
      return '';
    }
    const m = this.pickedModel() ?? NO_MODEL;
    const v = this.formValue();
    return PrinterCatalogService.specSummary(
      {
        ...m,
        bedWidthMm: v.bedWidthMm,
        bedDepthMm: v.bedDepthMm,
        bedHeightMm: v.bedHeightMm,
        filamentDiameterMm: v.filamentDiameter,
        hasHeatedBed: v.hasHeatedBed,
        hasHeatedChamber: v.hasHeatedChamber,
        defaultNozzleMm: v.nozzleDiameter,
      },
      v.nozzleDiameter ?? undefined,
      v.multiMaterial ? v.slotCount : 1
    );
  });

  private nameTouched = false;
  private fromPopularChip = false;
  /** Set by any catalog pick, so a later free-text save is not "not listed". */
  private pickedThisSession = false;
  /** The search text last turned into make and model, so a hand edit is not overwritten. */
  private committedSearch = '';
  /** What the last pick patched, to tell which fields the user has changed since. */
  private catalogPatch: CatalogPatch | null = null;

  constructor() {
    // A hidden slot count must not block Save, so it only validates while it is shown.
    this.form.controls.slotCount.disable();
    this.form.controls.multiMaterial.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((on) => {
        if (on) {
          this.form.controls.slotCount.enable();
        } else {
          this.form.controls.slotCount.disable();
        }
      });
    this.form.controls.model.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((model) => {
        if (!this.nameTouched) {
          this.form.controls.name.setValue(model);
        }
      });
    // Typing over a selection means the printer no longer comes from the catalog.
    this.form.controls.search.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((v) => {
        const m = this.catalogModel();
        if (typeof v === 'string' && m && v !== label(m)) {
          this.unlinkCatalogModel();
          this.resetCatalogDefaults();
        }
      });
    this.form.controls.search.valueChanges
      .pipe(
        map((v) => (typeof v === 'string' ? v.trim() : '')),
        debounceTime(SEARCH_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((q) => {
          const m = this.catalogModel();
          return !q || (m && q === label(m))
            ? of([] as PrinterModel[])
            : this.catalog.search(q);
        }),
        takeUntilDestroyed()
      )
      .subscribe((list) => this.suggestions.set(list));
  }

  ngOnInit(): void {
    this.logging.logEvent('QuickAddPrinter_Opened', { source: this.source() });
    this.catalog
      .popular(POPULAR_COUNT)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((list) => this.popular.set(list));
    const initialId = this.initialModelId();
    if (initialId) {
      this.catalog
        .get(initialId)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe((m) => {
          if (m && !this.catalogModel() && !this.form.controls.search.value) {
            this.selectCatalogPrinter(m);
          }
        });
    }
    firstValueFrom(this.categoryService.getPrinterCategories())
      .then((list) => this.categories.set(list))
      .catch(() => this.categories.set([]));
  }

  /** The input shows what the user typed or picked, never the option object. */
  readonly displayOption = (): string => this.form.controls.search.value;

  selectPopular(m: PrinterModel): void {
    this.logging.logEvent('QuickAddPrinter_PopularChipClicked', { id: m.id });
    this.selectCatalogPrinter(m);
    this.fromPopularChip = true;
  }

  selectCatalogPrinter(m: PrinterModel): void {
    this.catalogModel.set(m);
    this.pickedModel.set(m);
    this.pickedThisSession = true;
    this.fromPopularChip = false;
    this.specsOpen.set(false);
    this.committedSearch = label(m);
    this.form.controls.search.setValue(label(m));
    const slots = m.defaultSlotCount ?? 1;
    const patch: CatalogPatch = {
      type: m.technology === 'Resin' ? 'MSLA' : 'FFF',
      multiMaterial: slots > 1,
      slotCount: slots > 1 ? slots : DEFAULT_SLOT_COUNT,
      ...specsFrom(m),
    };
    this.catalogPatch = patch;
    this.form.patchValue({ make: m.make, model: m.model, ...patch });
  }

  selectNozzle(mm: number): void {
    this.form.controls.nozzleDiameter.setValue(mm);
  }

  /** On blur with no catalog pick: the first word is the make, the rest the model. */
  commitFreeText(): void {
    const text = this.form.controls.search.value.trim();
    if (!text || text === this.committedSearch) {
      return;
    }
    this.committedSearch = text;
    const space = text.indexOf(' ');
    const make = space === -1 ? text : text.slice(0, space);
    const model = space === -1 ? text : text.slice(space + 1).trim();
    this.form.patchValue({ make, model });
  }

  /**
   * Editing make or model by hand means the printer no longer links to the catalog model,
   * but the specs it filled in are still the user's to keep.
   */
  onManualInput(): void {
    this.unlinkCatalogModel();
  }

  onNameInput(): void {
    this.nameTouched = true;
  }

  /**
   * Clears the catalog pick and brings back the grid and search. Defaults the pick set are
   * undone; a value the user changed since stays, as when typing over a pick.
   */
  changePick(): void {
    const m = this.catalogModel();
    if (!m) {
      return;
    }
    this.logging.logEvent('QuickAddPrinter_PickChanged', { id: m.id });
    this.unlinkCatalogModel();
    this.resetCatalogDefaults();
    this.committedSearch = '';
    this.form.patchValue({ search: '', make: '', model: '' });
    this.suggestions.set([]);
    this.specsOpen.set(false);
  }

  /** The submit button: Continue in welcome mode when nothing new is entered, else save. */
  async submit(): Promise<void> {
    if (this.mode() === 'dialog') {
      await this.save();
    } else if (this.continueOnly()) {
      this.continued.emit();
    } else {
      await this.save('continue');
    }
  }

  async saveAndAddAnother(): Promise<void> {
    await this.save('another');
  }

  /**
   * Saves the printer. In a dialog the form then stays disabled while it closes; on the
   * welcome page it resets, so the next printer (or a return to this step) starts clean.
   */
  async save(then: AfterSave = 'done'): Promise<void> {
    if (this.saving() || this.done()) {
      return;
    }
    this.commitFreeText();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const { make, model } = this.form.controls;
      this.errorMessage.set(
        make.invalid || model.invalid ? PRINTER_MISSING : null
      );
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const printer = await this.createPrinter();
      if (this.showEmailNotice()) {
        await this.onboarding.acknowledgeEmailNotice();
      }
      const m = this.catalogModel();
      if (!m && !this.pickedThisSession) {
        this.logging.logEvent('QuickAddPrinter_NotListed', {
          query: this.notListedQuery(),
        });
      }
      this.logging.logEvent('QuickAddPrinter_Saved', {
        source: this.source(),
        fromCatalog: m !== null,
        multiSlot: this.form.controls.multiMaterial.value,
        catalogModelId: m?.id ?? null,
        popularChip: m !== null && this.fromPopularChip,
        specsEdited: this.specsEdited(),
      });
      if (then === 'another') {
        this.logging.logEvent('QuickAddPrinter_SaveAndAddAnother', {
          source: this.source(),
        });
      }
      if (then === 'done') {
        this.done.set(true);
      } else {
        this.resetToStart();
      }
      this.saved.emit(printer);
      if (then === 'continue') {
        this.continued.emit();
      }
    } catch (error) {
      this.errorMessage.set(quickAddErrorText(error, SAVE_FAILED));
    } finally {
      this.saving.set(false);
    }
  }

  /** Back to the form as it first opened: grid, empty search, a name that follows the model. */
  private resetToStart(): void {
    this.catalogModel.set(null);
    this.pickedModel.set(null);
    this.catalogPatch = null;
    this.committedSearch = '';
    this.nameTouched = false;
    this.fromPopularChip = false;
    this.pickedThisSession = false;
    this.form.reset();
    this.suggestions.set([]);
    this.showManual.set(false);
    this.specsOpen.set(false);
    this.errorMessage.set(null);
  }

  /** The printer no longer links to a catalog model. The form values stay. */
  private unlinkCatalogModel(): void {
    this.catalogModel.set(null);
    this.fromPopularChip = false;
  }

  /**
   * Undoes the last pick's defaults field by field, where the value is still the one the
   * catalog set. Anything the user changed since stays. Multi-material and the slot count
   * go together: a changed slot count keeps multi-material on.
   */
  private resetCatalogDefaults(): void {
    const patch = this.catalogPatch;
    if (!patch) {
      return;
    }
    this.catalogPatch = null;
    const value = this.form.getRawValue();
    const unchanged = (key: keyof CatalogPatch) => value[key] === patch[key];
    const reset: Partial<CatalogPatch> = {};
    if (unchanged('type')) {
      reset.type = FREE_TEXT_DEFAULTS.type;
    }
    if (unchanged('multiMaterial') && unchanged('slotCount')) {
      reset.multiMaterial = FREE_TEXT_DEFAULTS.multiMaterial;
      reset.slotCount = FREE_TEXT_DEFAULTS.slotCount;
    }
    const keptSpecs = SPEC_KEYS.filter((key) => !unchanged(key));
    for (const key of SPEC_KEYS) {
      if (!keptSpecs.includes(key)) {
        Object.assign(reset, { [key]: null });
      }
    }
    if (keptSpecs.length === 0) {
      this.specsOpen.set(false);
    }
    this.form.patchValue(reset);
  }

  private specsEdited(): boolean {
    const defaults = this.catalogPatch;
    if (!defaults || !this.catalogModel()) {
      return false;
    }
    const value = this.form.getRawValue();
    return SPEC_KEYS.some((key) => value[key] !== defaults[key]);
  }

  private notListedQuery(): string {
    const { search, make, model } = this.form.getRawValue();
    const text = search.trim() || `${make} ${model}`.trim();
    return text.slice(0, NOT_LISTED_QUERY_MAX);
  }

  private async createPrinter(): Promise<PrinterDetail> {
    const value = this.form.getRawValue();
    const nickname = value.type === 'Other' ? value.otherCategory : value.type;
    if (this.categories().length === 0) {
      this.categories.set(
        await firstValueFrom(this.categoryService.getPrinterCategories())
      );
    }
    const category = this.categories().find((c) => c.nickname === nickname);
    if (!category) {
      throw new Error('Choose a printer type.');
    }
    // The user's values are sent as they stand; the API fills only what is still empty.
    return firstValueFrom(
      this.printerService.addPrinter({
        id: null,
        name: value.name.trim(),
        make: value.make.trim(),
        model: value.model.trim(),
        description: '',
        nozzleDiameter: value.nozzleDiameter,
        filamentDiameter: value.filamentDiameter,
        beamDiameter: null,
        isActive: true,
        loadedFilaments: [],
        category,
        slotCount: value.multiMaterial ? value.slotCount : 1,
        catalogModelId: this.catalogModel()?.id ?? null,
        bedWidthMm: value.bedWidthMm ?? undefined,
        bedDepthMm: value.bedDepthMm ?? undefined,
        bedHeightMm: value.bedHeightMm ?? undefined,
        hasHeatedBed: value.hasHeatedBed ?? undefined,
        hasHeatedChamber: value.hasHeatedChamber ?? undefined,
      })
    );
  }
}
