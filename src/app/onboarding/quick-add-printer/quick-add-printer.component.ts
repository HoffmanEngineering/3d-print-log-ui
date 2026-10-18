import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { firstValueFrom, map, startWith } from 'rxjs';
import { LoggingService } from '../../core/services/logging.service';
import {
  PrinterCategory,
  PrinterCategoryService,
} from '../../core/services/printer-categories.service';
import {
  PrinterDetail,
  PrinterService,
} from '../../core/services/printer.service';
import { InlineEmailNoticeComponent } from '../inline-email-notice/inline-email-notice.component';
import { OnboardingService } from '../onboarding.service';
import {
  CatalogPrinter,
  loadPrinterCatalog,
  searchCatalog,
} from './printer-catalog';

export type QuickAddSource = 'welcome' | 'print-form' | 'checklist';

const DEFAULT_SLOT_COUNT = 4;
/** Types that have their own toggle button; "Other" offers the rest. */
const TOGGLE_NICKNAMES = ['FFF', 'MSLA'];

/**
 * A short form that creates a printer from the catalog (or free text), a type and an optional
 * slot count. Used on the welcome page and, inside a dialog, from the print form and checklist.
 */
@Component({
  selector: 'app-quick-add-printer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    InlineEmailNoticeComponent,
  ],
  templateUrl: './quick-add-printer.component.html',
  styleUrl: './quick-add-printer.component.scss',
})
export class QuickAddPrinterComponent implements OnInit {
  private readonly printerService = inject(PrinterService);
  private readonly categoryService = inject(PrinterCategoryService);
  private readonly onboarding = inject(OnboardingService);
  private readonly logging = inject(LoggingService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly source = input.required<QuickAddSource>();
  readonly showEmailNotice = input(false);
  readonly saved = output<PrinterDetail>();

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
  });

  readonly saving = signal(false);
  readonly errorMessage = signal<string | null>(null);
  readonly showManual = signal(false);
  readonly categories = signal<PrinterCategory[]>([]);
  readonly otherCategories = computed(() =>
    this.categories().filter((c) => !TOGGLE_NICKNAMES.includes(c.nickname))
  );

  private readonly catalog = signal<CatalogPrinter[]>([]);
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

  readonly suggestions = computed(() =>
    searchCatalog(this.catalog(), this.searchText())
  );
  readonly isOther = computed(() => this.typeValue() === 'Other');
  readonly isMultiMaterial = computed(() => this.multiValue());

  private nameTouched = false;
  private fromCatalog = false;

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
  }

  ngOnInit(): void {
    this.logging.logEvent('QuickAddPrinter_Opened', { source: this.source() });
    loadPrinterCatalog()
      .then((list) => this.catalog.set(list))
      .catch(() => this.catalog.set([]));
    firstValueFrom(this.categoryService.getPrinterCategories())
      .then((list) => this.categories.set(list))
      .catch(() => this.categories.set([]));
  }

  /** The input shows what the user typed or picked, never the option object. */
  readonly displayOption = (): string => this.form.controls.search.value;

  selectCatalogPrinter(printer: CatalogPrinter): void {
    this.fromCatalog = true;
    this.form.controls.search.setValue(`${printer.make} ${printer.model}`);
    this.form.patchValue({ make: printer.make, model: printer.model });
  }

  /** On blur with no catalog pick: the first word is the make, the rest the model. */
  commitFreeText(): void {
    const text = this.form.controls.search.value.trim();
    const current = `${this.form.controls.make.value} ${this.form.controls.model.value}`;
    if (!text || (this.fromCatalog && text === current)) {
      return;
    }
    this.fromCatalog = false;
    const space = text.indexOf(' ');
    const make = space === -1 ? text : text.slice(0, space);
    const model = space === -1 ? text : text.slice(space + 1).trim();
    this.form.patchValue({ make, model });
  }

  /** Editing make or model by hand means the printer no longer comes from the catalog. */
  onManualInput(): void {
    this.fromCatalog = false;
  }

  onNameInput(): void {
    this.nameTouched = true;
  }

  async save(): Promise<void> {
    if (this.saving()) {
      return;
    }
    this.commitFreeText();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const printer = await this.createPrinter();
      if (this.showEmailNotice()) {
        await this.onboarding.acknowledgeEmailNotice();
      }
      this.logging.logEvent('QuickAddPrinter_Saved', {
        source: this.source(),
        fromCatalog: this.fromCatalog,
        multiSlot: this.form.controls.multiMaterial.value,
      });
      this.saved.emit(printer);
    } catch (error) {
      this.errorMessage.set(errorText(error));
    } finally {
      this.saving.set(false);
    }
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
    return firstValueFrom(
      this.printerService.addPrinter({
        id: null,
        name: value.name.trim(),
        make: value.make.trim(),
        model: value.model.trim(),
        description: '',
        nozzleDiameter: null,
        filamentDiameter: null,
        beamDiameter: null,
        isActive: true,
        loadedFilaments: [],
        category,
        slotCount: value.multiMaterial ? value.slotCount : 1,
      })
    );
  }
}

function errorText(error: unknown): string {
  const e = error as {
    error?: { message?: string; detail?: string; title?: string } | string;
    message?: string;
  };
  if (typeof e?.error === 'string' && e.error) {
    return e.error;
  }
  const body = typeof e?.error === 'object' ? e.error : undefined;
  return (
    body?.message ??
    body?.detail ??
    body?.title ??
    e?.message ??
    'We could not save the printer. Try again.'
  );
}
