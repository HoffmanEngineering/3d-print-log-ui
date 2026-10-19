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
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom, merge } from 'rxjs';
import {
  ColorPatternType,
  FilamentDetail,
  FilamentFinishType,
  FilamentService,
  FilamentSourceMeasurement,
} from '../../core/services/filament.service';
import { LoggingService } from '../../core/services/logging.service';
import {
  Material,
  MaterialService,
} from '../../core/services/material.service';
import { PrinterService } from '../../core/services/printer.service';
import { quickAddErrorText } from '../quick-add-error';

const DEFAULT_TYPE = 'PLA';
const DEFAULT_COLOR = '#ffffff';
const SPOOL_WEIGHT_MG = 1_000_000;
const DIAMETER_MM = 1.75;
const SAVE_FAILED = 'We could not save the material. Try again.';

/** The short label for a material: its acronym, falling back to its name. */
function materialLabel(material: Material | undefined): string {
  return material?.acronym || material?.name || '';
}

/**
 * A short form that creates a 1 kg spool of filament: a type (PLA pre-selected), an optional
 * brand and color, and a name that follows them until edited. Optionally loads the new spool
 * into slot 0 of a printer.
 */
@Component({
  selector: 'app-quick-add-material',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  templateUrl: './quick-add-material.component.html',
  styleUrl: './quick-add-material.component.scss',
})
export class QuickAddMaterialComponent implements OnInit {
  private readonly materialService = inject(MaterialService);
  private readonly filamentService = inject(FilamentService);
  private readonly printerService = inject(PrinterService);
  private readonly logging = inject(LoggingService);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly loadIntoPrinterId = input<number | null>(null);
  readonly submitLabel = input('Save material');
  readonly saved = output<FilamentDetail>();

  readonly form = this.fb.group({
    materialId: ['', Validators.required],
    brand: [''],
    colorName: [''],
    colorHex: [DEFAULT_COLOR],
    displayName: [''],
  });

  readonly saving = signal(false);
  /** Set once the spool exists: Save stays off while the step moves on. */
  readonly done = signal(false);
  readonly errorMessage = signal<string | null>(null);
  /** Filament types only, so the dropdown shows PETG and the rest below the PLA default. */
  readonly materials = signal<Material[]>([]);

  private readonly selectedId = toSignal(
    this.form.controls.materialId.valueChanges,
    { initialValue: '' }
  );
  private readonly selected = computed(() =>
    this.materials().find((m) => m.id === this.selectedId())
  );
  readonly density = computed(
    () => this.selected()?.densityGramPerCubicCm ?? null
  );

  private nameTouched = false;

  constructor() {
    merge(
      this.form.controls.materialId.valueChanges,
      this.form.controls.brand.valueChanges,
      this.form.controls.colorName.valueChanges
    )
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.syncName());
  }

  ngOnInit(): void {
    firstValueFrom(this.materialService.getMaterials())
      .then((list) => {
        const filament = list.filter(
          (m) => m.materialCategoryNickname === 'filament'
        );
        this.materials.set(filament);
        const pla = filament.find(
          (m) =>
            m.acronym?.toUpperCase() === DEFAULT_TYPE ||
            m.name?.toUpperCase() === DEFAULT_TYPE
        );
        const initial = pla ?? filament[0];
        if (initial) {
          this.form.controls.materialId.setValue(initial.id);
        }
      })
      .catch((error) => {
        this.logging.logException(error);
        this.errorMessage.set('We could not load the material types.');
      });
  }

  readonly label = materialLabel;

  onNameInput(): void {
    this.nameTouched = true;
  }

  async save(): Promise<void> {
    if (this.saving() || this.done()) {
      return;
    }
    const material = this.selected();
    if (this.form.invalid || !material) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.errorMessage.set(null);
    try {
      const filament = await firstValueFrom(
        this.filamentService.addFilament(this.buildFilament(material))
      );
      const printerId = this.loadIntoPrinterId();
      let loaded = false;
      if (printerId !== null) {
        try {
          await firstValueFrom(
            this.printerService.loadSlot(printerId, 0, filament.id)
          );
          loaded = true;
        } catch (error) {
          // The spool exists; failing to load it must not hide that from the user.
          this.logging.logException(error);
        }
      }
      this.logging.logEvent('QuickAddMaterial_Saved', {
        materialType: materialLabel(material),
        loadedIntoPrinter: loaded,
      });
      this.done.set(true);
      this.saved.emit(filament);
    } catch (error) {
      this.errorMessage.set(quickAddErrorText(error, SAVE_FAILED));
    } finally {
      this.saving.set(false);
    }
  }

  private syncName(): void {
    if (this.nameTouched) {
      return;
    }
    this.form.controls.displayName.setValue(this.generatedName(), {
      emitEvent: false,
    });
  }

  /** Brand, type and color, e.g. "Hatchbox PLA Black". */
  private generatedName(): string {
    const value = this.form.getRawValue();
    return [
      value.brand.trim(),
      materialLabel(this.selected()),
      value.colorName.trim(),
    ]
      .filter(Boolean)
      .join(' ');
  }

  private buildFilament(material: Material): FilamentDetail {
    const value = this.form.getRawValue();
    const hex = (value.colorHex || DEFAULT_COLOR).replace(/^#/, '');
    return {
      id: '',
      // A name cleared by hand falls back to the generated one.
      displayName: value.displayName.trim() || this.generatedName(),
      brand: value.brand.trim(),
      materialCategoryNickname: 'filament',
      materialType: materialLabel(material),
      materialDensityGramPerCubicCm: material.densityGramPerCubicCm,
      colorName: value.colorName.trim(),
      colorHex: hex,
      colorPattern: ColorPatternType.Solid,
      colors: [hex],
      finishType: FilamentFinishType.Standard,
      effects: [],
      diameterMm: DIAMETER_MM,
      initialTotalWeightMg: null,
      source: FilamentSourceMeasurement.Weight,
      initialNominalWeightMg: SPOOL_WEIGHT_MG,
      initialNominalLengthM: null,
      initialNominalVolumeMl: null,
      spoolWeightMg: null,
      tempRangeStart: null,
      tempRangeEnd: null,
      recommendedTemp: null,
      recommendedBedTemp: null,
      isActive: true,
      purchaseDate: null,
      purchaseLocation: '',
      purchasePriceValue: '',
      purchasePriceCurrency: '',
      purchaseNotes: '',
      storageLocation: '',
      initialLayerTimeS: null,
      layerTimeS: null,
      meltingTemperature: null,
      inertGas: '',
      materialRefreshRatio: null,
      notes: '',
      isFavorite: false,
      filamentAdjustments: [],
    };
  }
}
