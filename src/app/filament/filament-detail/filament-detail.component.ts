import { Location } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import {
  UntypedFormArray,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subscription } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import { LoggingService } from 'src/app/core/services/logging.service';
import { Material } from 'src/app/core/services/material.service';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { MaterialNamePipe } from 'src/app/shared/pipes/material-name.pipe';
import {
  ColorPatternType,
  FilamentAdjustment,
  FilamentAdjustmentSourceMeasurement,
  FilamentDetail,
  FilamentEffect,
  FilamentFinishType,
  FilamentService,
  FilamentSourceMeasurement,
  FilamentSummary,
} from '../../core/services/filament.service';
import { MaterialCategory } from 'src/app/core/services/material-categories.service';
import { FilamentImagesPanelComponent } from './filament-images-panel/filament-images-panel.component';
import { MatDialog } from '@angular/material/dialog';
import { MatChipListboxChange } from '@angular/material/chips';
import {
  QrLabelDialogComponent,
  QrLabelDialogData,
} from 'src/app/shared/qr-label-dialog/qr-label-dialog.component';
import {
  SpoolWeightCalculatorDialogComponent,
  SpoolWeightCalculatorDialogData,
  SpoolWeightCalculatorDialogResult,
} from '../spool-weight-calculator-dialog/spool-weight-calculator-dialog.component';
import { resolveSpoolWeightMg } from '../spool-weight-calculator-dialog/spool-weight-adjustment.util';
import { PrintFilamentSourceMeasurement } from 'src/app/core/services/print.service';
import {
  AdjustmentRow,
  ProjectionResult,
  projectRemainingMg,
} from './remaining-projection';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

function gramsToMg(grams: number | null | undefined): number | null {
  return grams == null ? null : grams * 1000;
}

/**
 * Adjustment rows out of the form. Weight rows are converted from the form's
 * grams to milligrams; length and volume rows are passed through in their own
 * units, because `projectRemainingMg` converts them itself from the CURRENT
 * density and diameter rather than trusting the stale derived milligrams.
 */
function toFormAdjustmentRows(
  value: Record<string, unknown> | null
): AdjustmentRow[] {
  const rows = (value?.['filamentAdjustments'] ?? []) as {
    source?: number;
    amountG?: number | null;
    lengthInM?: number | null;
    volumeMl?: number | null;
  }[];

  return rows.map((row) => ({
    source:
      row.source == null
        ? PrintFilamentSourceMeasurement.Weight
        : (row.source as PrintFilamentSourceMeasurement),
    amountMg: row.amountG == null ? null : row.amountG * 1000,
    lengthInM: row.lengthInM ?? null,
    volumeMl: row.volumeMl ?? null,
  }));
}

/**
 * The same rows as last saved. Already in milligrams; no gram conversion.
 *
 * `FilamentAdjustmentSourceMeasurement` and `PrintFilamentSourceMeasurement`
 * both number Weight 1, Length 2, Volume 3, which is what makes this cast safe.
 * They are separate enums: if a future member diverges, map explicitly.
 */
function toServerAdjustmentRows(
  filament: FilamentDetail | null | undefined
): AdjustmentRow[] {
  return (filament?.filamentAdjustments ?? []).map((adjustment) => ({
    source: adjustment.source as unknown as PrintFilamentSourceMeasurement,
    amountMg: adjustment.amountMg ?? null,
    lengthInM: adjustment.lengthInM ?? null,
    volumeMl: adjustment.volumeMl ?? null,
  }));
}

@Component({
  selector: 'app-filament-detail',
  templateUrl: './filament-detail.component.html',
  styleUrls: ['./filament-detail.component.scss'],
  standalone: false,
})
export class FilamentDetailComponent
  implements OnInit, ComponentCanDeactivate, OnDestroy
{
  public filamentForm: UntypedFormGroup;
  public loadedFilament: FilamentDetail | null = null;

  protected readonly imagesPanel = viewChild(FilamentImagesPanelComponent);
  public saving = false;

  public materials: Material[] = [];
  public filteredMaterials: Observable<Material[]> = null;

  public materialNamePipe: MaterialNamePipe = new MaterialNamePipe();

  public preferredCurrencySymbol = '$';

  public defaultFilamentDiameterMmSetting: UserSetting | null = null;
  public defaultFilamentPriceSetting: UserSetting | null = null;

  public filamentStorageLocations: string[] = [];

  public filamentPurchaseLocations: string[] = [];

  public filteredFilamentStorageLocations: Observable<string[]> = null;

  public filteredFilamentPurchaseLocations: Observable<string[]> = null;
  filamentBrands: string[];
  filteredFilamentBrands: Observable<string[]>;

  materialCategorySubscription: Subscription;

  public materialCategories: MaterialCategory[] = [];

  public filamentAdjustmentSourceMeasurement =
    FilamentAdjustmentSourceMeasurement;

  public filamentSourceMeasurement = FilamentSourceMeasurement;

  public readonly ColorPatternType = ColorPatternType;
  public readonly FilamentFinishType = FilamentFinishType;
  public readonly FilamentEffect = FilamentEffect;

  public readonly rainbowPresets = [
    {
      label: 'Classic',
      colors: ['ff4d4d', 'ff9f40', 'ffe040', '6bcb77', '4d96ff', 'c44dff'],
    },
    {
      label: 'Ocean',
      colors: ['0077b6', '00b4d8', '48cae4', '90e0ef', 'ade8f4'],
    },
    { label: 'Sunset', colors: ['ff6b6b', 'ffd93d', 'ff9f40', 'f06543'] },
    { label: 'Galaxy', colors: ['1a1a2e', '7c8cf8', 'c44dff', 'f72585'] },
    { label: 'Forest', colors: ['2d6a4f', '52b788', '95d5b2', 'd8f3dc'] },
  ];

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: UntypedFormBuilder,
    private filamentService: FilamentService,
    private toastr: ToastrService,
    private titleService: Title,
    private el: ElementRef,
    private location: Location,
    private readonly loggingService: LoggingService,
    private readonly userSettingService: UserSettingService,
    private readonly dialog: MatDialog
  ) {}

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    // The form is blind to staged photos, so without the panel a user who has
    // only picked images would navigate away and silently lose them.
    return !this.filamentForm.dirty && !this.imagesPanel()?.hasStagedImages();
  }

  get filamentAdjustments() {
    return this.filamentForm.get('filamentAdjustments') as UntypedFormArray;
  }

  get colorsFormArray(): UntypedFormArray {
    return this.filamentForm.get('colors') as UntypedFormArray;
  }

  // Colors with '#' stripped — kept in sync via valueChanges so OnPush children react
  normalizedColors: string[] = [];
  private colorsSubscription: Subscription;

  /**
   * Mirrors the form value so computed signals can react to edits. Reading a
   * form's value never marks it dirty, so `PendingChangesGuard` is unaffected.
   */
  private readonly formValue = signal<Record<string, unknown> | null>(null);
  private formValueSubscription: Subscription;

  /** False in add mode (no filament) and copy mode (a clone is not the source spool). */
  protected readonly showUsagePanels = signal(false);

  /** The user's preferred filament unit, resolved on the route. */
  protected preferredFilamentUnit = PrintFilamentSourceMeasurement.Weight;

  /**
   * Public rather than protected: the spec asserts on it directly, and
   * `protected` would not compile from the test file.
   */
  public readonly remainingProjection = computed<ProjectionResult>(() => {
    const form = this.formValue();
    const filament = this.loadedFilament;

    return projectRemainingMg({
      serverRemainingMg: filament?.filamentRemaining ?? null,
      serverNominalMg: filament?.initialNominalWeightMg ?? null,
      formNominalMg: gramsToMg(
        form?.['initialNominalWeightG'] as number | null
      ),
      serverAdjustments: toServerAdjustmentRows(filament),
      formAdjustments: toFormAdjustmentRows(form),
      serverNominalM: filament?.initialNominalLengthM ?? null,
      formNominalM: (form?.['initialNominalLengthM'] as number | null) ?? null,
      serverNominalMl: filament?.initialNominalVolumeMl ?? null,
      formNominalMl:
        (form?.['initialNominalVolumeMl'] as number | null) ?? null,
      source:
        (form?.['source'] as PrintFilamentSourceMeasurement) ??
        PrintFilamentSourceMeasurement.Weight,
      filament: {
        materialDensityGramPerCubicCm: form?.[
          'materialDensityGramPerCubicCm'
        ] as number,
        diameterMm: form?.['diameterMm'] as number,
      },
      serverFilament: {
        materialDensityGramPerCubicCm: filament?.materialDensityGramPerCubicCm,
        diameterMm: filament?.diameterMm ?? undefined,
      },
    });
  });

  /**
   * Scrolls to and focuses the nominal field the spool actually shows. A
   * length- or volume-sourced spool never renders `initialNominalWeightG`, so
   * targeting it unconditionally would make the button do nothing there.
   */
  protected focusNominalWeight(): void {
    const controlName =
      {
        [FilamentSourceMeasurement.Length]: 'initialNominalLengthM',
        [FilamentSourceMeasurement.Volume]: 'initialNominalVolumeMl',
      }[this.filamentForm.get('source')?.value as FilamentSourceMeasurement] ??
      'initialNominalWeightG';

    const input = this.el.nativeElement.querySelector(
      `[formcontrolname="${controlName}"]`
    ) as HTMLInputElement | null;
    input?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    input?.focus();
  }

  ngOnInit() {
    this.titleService.setTitle('Filament Details - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.preferredCurrencySymbol =
        (data.preferredCurrencySymbolSetting as UserSetting | null)?.value ??
        '$';

      this.materials = data.materials ?? [];

      this.materialCategories = data.materialCategories;

      this.defaultFilamentDiameterMmSetting =
        data.defaultFilamentDiameterMmSetting;
      this.defaultFilamentPriceSetting = data.defaultFilamentPriceSetting;

      this.filamentForm = this.buildFormFromFilamentDetail(data.filament);
      this.loadedFilament = (data.filament as FilamentDetail) ?? null;

      // `AsRecorded` is 0, so `|| Weight` would silently coerce a valid
      // preference into the wrong unit. Test for null, not for falsiness.
      const unitSetting = (
        data.preferredFilamentDisplayUnitSetting as UserSetting | null
      )?.value;
      const parsedUnit = unitSetting == null ? NaN : Number(unitSetting);
      this.preferredFilamentUnit = Number.isFinite(parsedUnit)
        ? (parsedUnit as PrintFilamentSourceMeasurement)
        : PrintFilamentSourceMeasurement.Weight;

      // Copy mode nulls the id (CopyFilamentDetailResolverService), and add
      // mode has no filament at all, so the id alone rules out both: a clone's
      // remaining and prints belong to the source spool, not to the copy. This
      // is the same saved check canShowSpoolCalculator already uses.
      const filamentId = this.loadedFilament?.id;
      this.showUsagePanels.set(!!filamentId && filamentId !== EMPTY_GUID);

      this.formValue.set(this.filamentForm.getRawValue());
      this.formValueSubscription?.unsubscribe();
      this.formValueSubscription = this.filamentForm.valueChanges.subscribe(
        () => {
          this.formValue.set(this.filamentForm.getRawValue());
        }
      );

      this.normalizedColors = this.computeNormalizedColors();
      this.colorsSubscription = this.colorsFormArray.valueChanges.subscribe(
        () => {
          this.normalizedColors = this.computeNormalizedColors();
        }
      );

      this.recalculateFormFieldsForSelectedMaterialCategory(
        this.filamentForm.get('materialCategoryNickname').value
      );

      this.materialCategorySubscription = this.filamentForm
        .get('materialCategoryNickname')
        .valueChanges.subscribe((categoryNickname) => {
          this.recalculateFormFieldsForSelectedMaterialCategory(
            categoryNickname
          );

          this.filamentForm.get('materialType').enable();
        });

      this.filteredMaterials = this.filamentForm
        .get('materialType')
        .valueChanges.pipe(
          startWith(''),
          tap((value: string) => {
            if (
              value === '' ||
              +this.filamentForm.get('materialDensityGramPerCubicCm').value > 0
            ) {
              return;
            }

            const selectedMaterial = this.materials.find((m) => {
              return this.materialNamePipe.transform(m) === value;
            });

            const materialCategory = this.filamentForm.get(
              'materialCategoryNickname'
            ).value;

            const isMaterialCategoryMatch =
              materialCategory === '' ||
              materialCategory == null ||
              selectedMaterial?.materialCategoryNickname === materialCategory;

            if (selectedMaterial && isMaterialCategoryMatch) {
              // This means a user selected a default materials
              this.filamentForm
                .get('materialDensityGramPerCubicCm')
                .setValue(selectedMaterial.densityGramPerCubicCm);
            }
          }),
          map((value) => this._filter(value))
        );

      this.filamentService.getFilamentStorageLocations().subscribe((dto) => {
        this.filamentStorageLocations = dto.storageLocations;

        this.filteredFilamentStorageLocations = this.filamentForm
          .get('storageLocation')
          .valueChanges.pipe(
            startWith(''),
            map((value) => this._filterStorageLocations(value))
          );
      });

      this.filamentService.getFilamentPurchaseLocations().subscribe((dto) => {
        this.filamentPurchaseLocations = dto.purchaseLocations;

        this.filteredFilamentPurchaseLocations = this.filamentForm
          .get('purchaseLocation')
          .valueChanges.pipe(
            startWith(''),
            map((value) => this._filterPurchaseLocations(value))
          );
      });

      this.filamentService.getFilamentBrands().subscribe((dto) => {
        this.filamentBrands = dto.brands;

        this.filteredFilamentBrands = this.filamentForm
          .get('brand')
          .valueChanges.pipe(
            startWith(''),
            map((value) => this._filterBrands(value))
          );
      });
    });
  }

  /**
   * Adjust the form fields to match the settings for the material category
   */
  private recalculateFormFieldsForSelectedMaterialCategory(value: any) {
    const selectedMaterialCategory = this.materialCategories.find((m) => {
      return m.nickname === value;
    });

    if (selectedMaterialCategory) {
      // Adjust the form fields to match the settings for the material category
      if (selectedMaterialCategory.hasDiameter) {
        this.filamentForm.get('diameterMm').enable();
      } else {
        this.filamentForm.get('diameterMm').disable();
      }

      if (selectedMaterialCategory.showBedTemperature) {
        this.filamentForm.get('recommendedBedTemp').enable();
      } else {
        this.filamentForm.get('recommendedBedTemp').disable();
      }

      if (selectedMaterialCategory.showNozzleTemperature) {
        this.filamentForm.get('recommendedTemp').enable();
        this.filamentForm.get('tempRangeStart').enable();
        this.filamentForm.get('tempRangeEnd').enable();
      } else {
        this.filamentForm.get('recommendedTemp').disable();
        this.filamentForm.get('tempRangeStart').disable();
        this.filamentForm.get('tempRangeEnd').disable();
      }

      if (selectedMaterialCategory.showMeltingTemperature) {
        this.filamentForm.get('meltingTemperature').enable();
      } else {
        this.filamentForm.get('meltingTemperature').disable();
      }

      if (selectedMaterialCategory.showInertGas) {
        this.filamentForm.get('inertGas').enable();
      } else {
        this.filamentForm.get('inertGas').disable();
      }

      if (selectedMaterialCategory.showMaterialRefreshRatio) {
        this.filamentForm.get('materialRefreshRatio').enable();
      } else {
        this.filamentForm.get('materialRefreshRatio').disable();
      }

      if (selectedMaterialCategory.showRecommendedInitialLayerTimeInSeconds) {
        this.filamentForm.get('initialLayerTimeS').enable();
      } else {
        this.filamentForm.get('initialLayerTimeS').disable();
      }

      if (selectedMaterialCategory.showRecommendedLayerTimeInSeconds) {
        this.filamentForm.get('layerTimeS').enable();
      } else {
        this.filamentForm.get('layerTimeS').disable();
      }
    }
  }

  ngOnDestroy(): void {
    this.materialCategorySubscription?.unsubscribe();
    this.colorsSubscription?.unsubscribe();
    this.formValueSubscription?.unsubscribe();
  }

  private computeNormalizedColors(): string[] {
    return (this.colorsFormArray.value as string[]).map((c) =>
      c.replace('#', '')
    );
  }

  private _filter(value: string): Material[] {
    const filterValue = value.toLowerCase();
    const materialCategory = this.filamentForm.get(
      'materialCategoryNickname'
    ).value;

    return this.materials
      .filter(
        (option) =>
          (option.acronym?.toLowerCase().includes(filterValue) ||
            option.name?.toLowerCase().includes(filterValue)) &&
          (materialCategory === '' ||
            materialCategory == null ||
            option.materialCategoryNickname === materialCategory)
      )
      .sort();
  }

  private _filterStorageLocations(value: string): string[] {
    const filterValue = value.toLowerCase();

    if (value === '') {
      return this.filamentStorageLocations.sort();
    }

    return this.filamentStorageLocations
      .filter((option) => option.toLowerCase().includes(filterValue))
      .sort();
  }

  private _filterPurchaseLocations(value: string): string[] {
    const filterValue = value.toLowerCase();

    if (value === '') {
      return this.filamentPurchaseLocations.sort();
    }

    return this.filamentPurchaseLocations
      .filter((option) => option.toLowerCase().includes(filterValue))
      .sort();
  }

  private _filterBrands(value: string): string[] {
    const filterValue = value.toLowerCase();

    if (value === '') {
      return this.filamentBrands.sort();
    }

    return this.filamentBrands
      .filter((option) => option.toLowerCase().includes(filterValue))
      .sort();
  }

  private buildFilamentAdjustmentFormGroup(
    id: string,
    filamentId: string,
    source: FilamentAdjustmentSourceMeasurement,
    amountG: number | null,
    lengthInM: number | null,
    volumeMl: number | null,
    notes: string
  ) {
    return this.formBuilder.group({
      id,
      source,
      filamentId,
      amountG,
      lengthInM,
      volumeMl,
      notes,
    });
  }

  buildFormFromFilamentDetail(filament: FilamentDetail): UntypedFormGroup {
    const adjustments = this.formBuilder.array([]);
    if (filament?.filamentAdjustments?.length > 0) {
      filament.filamentAdjustments.forEach((adjustment) => {
        const adjustmentControl = this.buildFilamentAdjustmentFormGroup(
          adjustment.id,
          adjustment.filamentId,
          adjustment.source,
          adjustment.amountMg != null ? adjustment.amountMg / 1000 : null,
          adjustment.lengthInM,
          adjustment.volumeMl,
          adjustment.notes
        );
        adjustments.push(adjustmentControl);
      });
    }

    const form = this.formBuilder.group({
      id: [filament ? filament.id : null],
      displayName: [
        filament && filament.displayName ? filament.displayName : '',
        Validators.required,
      ],
      brand: [filament?.brand ?? ''],
      materialType: [filament?.materialType ?? '', Validators.required],
      materialDensityGramPerCubicCm: [
        filament?.materialDensityGramPerCubicCm,
        Validators.required,
      ],
      colorName: [filament?.colorName ?? ''],
      colorHex: [
        filament && filament.colorHex ? '#' + filament.colorHex : '#000000',
      ],
      colorPattern: [filament?.colorPattern ?? ColorPatternType.Solid],
      finishType: [filament?.finishType ?? FilamentFinishType.Standard],
      effects: [filament?.effects ?? []],
      colors: this.formBuilder.array(
        (filament?.colors?.length
          ? filament.colors
          : [filament?.colorHex ?? '000000']
        ).map((c) => this.formBuilder.control('#' + c.replace('#', '')))
      ),

      diameterMm: [
        filament?.diameterMm
          ? filament.diameterMm
          : this.defaultFilamentDiameterMmSetting
            ? +this.defaultFilamentDiameterMmSetting.value
            : null,
      ],
      initialTotalWeightG: [
        filament?.initialTotalWeightMg > 0
          ? filament?.initialTotalWeightMg / 1000
          : null,
      ],
      initialNominalWeightG: [
        filament?.initialNominalWeightMg > 0
          ? filament?.initialNominalWeightMg / 1000
          : null,
      ],
      initialNominalLengthM: [filament?.initialNominalLengthM],
      initialNominalVolumeMl: [filament?.initialNominalVolumeMl],
      source: [filament?.source ?? FilamentSourceMeasurement.Weight],
      spoolWeightG: [filament?.spoolWeightMg / 1000],
      tempRangeStart: [filament?.tempRangeStart],
      tempRangeEnd: [filament?.tempRangeEnd],
      recommendedTemp: [filament?.recommendedTemp],
      recommendedBedTemp: [filament?.recommendedBedTemp],
      purchaseDate: [
        filament?.purchaseDate ? new Date(filament.purchaseDate) : null,
      ],
      purchaseLocation: [filament?.purchaseLocation],
      purchasePriceValue: [
        filament?.purchasePriceValue ? filament.purchasePriceValue : null,
        Validators.pattern(/^[0-9,.]*$/),
      ],
      purchasePriceCurrency: [filament?.purchasePriceCurrency],
      purchaseNotes: [filament?.purchaseNotes],
      storageLocation: [filament?.storageLocation ?? ''],
      notes: [filament?.notes],
      filamentAdjustments: adjustments,
      isActive: [
        filament &&
        filament.isActive !== null &&
        filament.isActive !== undefined
          ? filament.isActive
          : true,
      ],
      isFavorite: [
        filament &&
        filament.isFavorite !== null &&
        filament.isFavorite !== undefined
          ? filament.isFavorite
          : false,
      ],
      materialCategoryNickname: [
        filament?.materialCategoryNickname ?? 'filament',
      ],
      inertGas: [filament?.inertGas ?? ''],
      initialLayerTimeS: [filament?.initialLayerTimeS ?? null],
      layerTimeS: [filament?.layerTimeS ?? null],
      meltingTemperature: [filament?.meltingTemperature ?? null],
      materialRefreshRatio: [filament?.materialRefreshRatio ?? null],
    });

    return form;
  }

  addAdjustment() {
    this.filamentAdjustments.push(
      this.buildFilamentAdjustmentFormGroup(
        EMPTY_GUID,
        this.filamentForm.get('id')?.value ?? EMPTY_GUID,
        FilamentAdjustmentSourceMeasurement.Weight,
        null,
        null,
        null,
        ''
      )
    );
  }

  removeAdjustment(index: number) {
    this.filamentAdjustments.removeAt(index);
  }

  get canShowSpoolCalculator(): boolean {
    const f = this.loadedFilament;
    if (!f || !f.id) {
      return false;
    }
    if (f.filamentRemaining === null || f.filamentRemaining === undefined) {
      return false;
    }
    return (
      resolveSpoolWeightMg(
        f.spoolWeightMg,
        f.initialTotalWeightMg,
        f.initialNominalWeightMg
      ) !== null
    );
  }

  get spoolCalculatorTooltip(): string {
    return this.filamentForm.dirty
      ? 'Save your changes before using the calculator'
      : "Calculate an adjustment from the spool's measured weight";
  }

  openSpoolWeightCalculator(): void {
    const f = this.loadedFilament;
    if (!f) {
      return;
    }

    // The launch button is disabled while the form is dirty; guard the method
    // too so the saved filamentRemaining the calculator reads always matches
    // the form (see spec: available only when pristine).
    if (this.filamentForm.dirty) {
      return;
    }

    const spoolWeightMg = resolveSpoolWeightMg(
      f.spoolWeightMg,
      f.initialTotalWeightMg,
      f.initialNominalWeightMg
    );
    if (
      spoolWeightMg === null ||
      f.filamentRemaining === null ||
      f.filamentRemaining === undefined
    ) {
      return;
    }

    const dialogRef = this.dialog.open(SpoolWeightCalculatorDialogComponent, {
      data: {
        spoolWeightMg,
        filamentRemainingMg: f.filamentRemaining,
      } as SpoolWeightCalculatorDialogData,
      width: '500px',
    });

    dialogRef
      .afterClosed()
      .subscribe((result: SpoolWeightCalculatorDialogResult | undefined) => {
        if (!result) {
          return;
        }

        this.filamentAdjustments.push(
          this.buildFilamentAdjustmentFormGroup(
            EMPTY_GUID,
            f.id ?? EMPTY_GUID,
            FilamentAdjustmentSourceMeasurement.Weight,
            result.adjustmentG,
            null,
            null,
            result.note
          )
        );
        this.filamentForm.markAsDirty();

        this.loggingService.logEvent('SpoolWeightCalculator_AdjustmentAdded', {
          measuredTotalWeightG: result.measuredTotalWeightG,
          adjustmentG: result.adjustmentG,
        });
      });
  }

  onColorPatternChange(): void {
    const pattern = this.filamentForm.get('colorPattern')!
      .value as ColorPatternType;
    const arr = this.colorsFormArray;

    if (pattern === ColorPatternType.Solid) {
      while (arr.length > 1) arr.removeAt(arr.length - 1);
    } else if (pattern === ColorPatternType.Gradient) {
      while (arr.length > 2) arr.removeAt(arr.length - 1);
      while (arr.length < 2) arr.push(this.formBuilder.control('#000000'));
    } else {
      // Multi, Rainbow: ensure at least 2
      while (arr.length < 2) arr.push(this.formBuilder.control('#000000'));
    }
  }

  addColorStop(): void {
    if (this.colorsFormArray.length < 8) {
      this.colorsFormArray.push(this.formBuilder.control('#000000'));
    }
  }

  removeColorStop(index: number): void {
    if (this.colorsFormArray.length > 2) {
      this.colorsFormArray.removeAt(index);
    }
  }

  applyRainbowPreset(colors: string[]): void {
    const arr = this.colorsFormArray;
    while (arr.length > 0) arr.removeAt(0);
    colors.forEach((c) =>
      arr.push(this.formBuilder.control('#' + c.replace('#', '')))
    );
  }

  onEffectsChange(event: MatChipListboxChange): void {
    this.filamentForm.get('effects')!.setValue(event.value ?? []);
  }

  onSubmit() {
    this.saving = true;

    // Validate
    this.filamentForm.markAllAsTouched();
    if (!this.filamentForm.valid) {
      this.saving = false;

      // Loop through all controls, focusing the first invalid control.
      for (const key of Object.keys(this.filamentForm.controls)) {
        if (this.filamentForm.controls[key].invalid) {
          const invalidControl = this.el.nativeElement.querySelector(
            '[formcontrolname="' + key + '"]'
          );
          invalidControl.focus();
          break;
        }
      }
      return;
    }

    const newFilament: FilamentDetail = this.getFilamentFromForm();

    let saveFilament: Observable<FilamentDetail>;
    const wasNew = newFilament.id === null;

    if (newFilament.id === null) {
      saveFilament = this.filamentService.addFilament(newFilament);
    } else {
      saveFilament = this.filamentService.updateFilament(newFilament);
    }

    saveFilament.subscribe(
      (filament) => {
        this.filamentForm.markAsPristine();

        // The record is no longer new. Write the ID back BEFORE any upload, so a
        // retry is an update and never a second POST, and replace the URL so a
        // reload lands on the saved material.
        if (wasNew && filament.id) {
          this.filamentForm.get('id')?.setValue(filament.id);
          this.router.navigate(['/filament', filament.id], {
            replaceUrl: true,
          });
        }

        const panel = this.imagesPanel();
        if (!panel?.hasStagedImages() || !filament.id) {
          this.finishSave();
          return;
        }

        panel.uploadStagedImages(filament.id).subscribe(({ failed }) => {
          // Clear `saving` either way, or the retry button stays disabled
          // forever.
          this.saving = false;

          if (failed.length === 0) {
            this.finishSave();
            return;
          }

          // Stay put: the material is saved, and the user needs a surface on
          // which to retry the photos. Navigating away would discard that
          // chance.
          this.toastr.warning(
            `Material saved, but ${failed.length} image(s) failed to upload. You can retry them below.`
          );
        });
      },
      (err) => {
        this.saving = false;
      }
    );
  }

  private finishSave(): void {
    this.saving = false;
    this.router.navigateByUrl('/filament').then(() => {
      this.toastr.success('Save successful!');
    });
  }

  handleClose() {
    this.location.back();
  }

  private isBlank(value: unknown): boolean {
    if (value === null || value === undefined) {
      return true;
    }
    // Whitespace-only text is empty; without trimming, +'   ' coerces to 0
    // and reintroduces the zero-vs-null bug on the unvalidated length/volume
    // inputs.
    if (typeof value === 'string') {
      return value.trim() === '';
    }
    return false;
  }

  // null when blank, non-numeric, or non-finite; otherwise
  // Math.round(value * multiplier). Number.isFinite rejects NaN AND Infinity,
  // which would otherwise round to Infinity and serialize to null over the wire.
  private toNullableRounded(value: unknown, multiplier = 1): number | null {
    if (this.isBlank(value)) {
      return null;
    }
    const n = +(value as number);
    return Number.isFinite(n) ? Math.round(n * multiplier) : null;
  }

  private getFilamentFromForm(): FilamentDetail {
    const adjustments = this.filamentAdjustments.controls
      .filter((adjustment) => {
        return (
          this.toNullableRounded(adjustment.get('amountG').value, 1000) !==
            null ||
          this.toNullableRounded(adjustment.get('lengthInM').value) !== null ||
          this.toNullableRounded(adjustment.get('volumeMl').value) !== null ||
          !this.isBlank(adjustment.get('notes').value)
        );
      })
      .map((adjustment) => {
        const newAdjustment: FilamentAdjustment = {
          id: adjustment.get('id')?.value ?? EMPTY_GUID,
          filamentId: adjustment.get('filamentId')?.value ?? EMPTY_GUID,
          source: adjustment.get('source').value,
          amountMg: this.toNullableRounded(
            adjustment.get('amountG').value,
            1000
          ),
          lengthInM: this.toNullableRounded(adjustment.get('lengthInM').value),
          volumeMl: this.toNullableRounded(adjustment.get('volumeMl').value),
          notes: adjustment.get('notes').value,
        };

        return newAdjustment;
      });

    const filament: FilamentDetail = {
      id: this.filamentForm.controls.id.value,
      brand: this.filamentForm.controls.brand.value,
      materialCategoryNickname:
        this.filamentForm.controls.materialCategoryNickname.value,
      colorHex: this.getColorHex(this.filamentForm.controls.colorHex.value),
      colorName: this.filamentForm.controls.colorName.value,
      diameterMm: this.filamentForm.controls.diameterMm.value,
      displayName: this.filamentForm.controls.displayName.value,
      source: this.filamentForm.controls.source.value,
      initialNominalWeightMg: this.toNullableRounded(
        this.filamentForm.controls.initialNominalWeightG.value,
        1000
      ),
      initialTotalWeightMg: Math.round(
        this.filamentForm.controls.initialTotalWeightG.value * 1000
      ),
      initialNominalLengthM: this.toNullableRounded(
        this.filamentForm.controls.initialNominalLengthM.value
      ),
      initialNominalVolumeMl: this.toNullableRounded(
        this.filamentForm.controls.initialNominalVolumeMl.value
      ),
      materialDensityGramPerCubicCm:
        this.filamentForm.controls.materialDensityGramPerCubicCm.value,
      materialType: this.filamentForm.controls.materialType.value,
      notes: this.filamentForm.controls.notes.value,
      purchaseDate: this.filamentForm.controls.purchaseDate.value,
      purchaseLocation: this.filamentForm.controls.purchaseLocation.value,
      purchasePriceCurrency:
        this.filamentForm.controls.purchasePriceCurrency.value,
      purchasePriceValue: this.filamentForm.controls.purchasePriceValue.value,
      purchaseNotes: this.filamentForm.controls.purchaseNotes.value,
      recommendedTemp: this.filamentForm.controls.recommendedTemp.value,
      recommendedBedTemp: this.filamentForm.controls.recommendedBedTemp.value,
      spoolWeightMg: Math.round(
        this.filamentForm.controls.spoolWeightG.value * 1000
      ),
      tempRangeEnd: this.filamentForm.controls.tempRangeEnd.value,
      tempRangeStart: this.filamentForm.controls.tempRangeStart.value,
      storageLocation: this.filamentForm.controls.storageLocation.value,
      inertGas: this.filamentForm.controls.inertGas.value,
      initialLayerTimeS: this.filamentForm.controls.initialLayerTimeS.value,
      layerTimeS: this.filamentForm.controls.layerTimeS.value,
      meltingTemperature: this.filamentForm.controls.meltingTemperature.value,
      materialRefreshRatio:
        this.filamentForm.controls.materialRefreshRatio.value,
      filamentAdjustments: adjustments,
      isActive: this.filamentForm.controls.isActive.value,
      isFavorite: this.filamentForm.controls.isFavorite.value,
      colorPattern: this.filamentForm.get('colorPattern')!.value,
      colors: this.normalizedColors,
      finishType: this.filamentForm.get('finishType')!.value,
      effects: this.filamentForm.get('effects')!.value ?? [],
    };

    // Keep colorHex in sync with colors[0]
    if (this.normalizedColors.length > 0) {
      filament.colorHex = this.normalizedColors[0];
    }

    return filament;
  }

  getColorHex(value: string | null): string {
    if (value && value !== '') {
      return value.replace('#', '');
    } else {
      return null;
    }
  }

  changeDefaultFilamentDiameter(newDiameterMm: number | null) {
    if (newDiameterMm === null) {
      return;
    }

    this.loggingService.logEvent('ChangedDefaultFilamentDiameter', {
      diameter: newDiameterMm,
    });
    if (this.defaultFilamentDiameterMmSetting) {
      this.userSettingService
        .updateUserSetting(
          this.defaultFilamentDiameterMmSetting.id,
          newDiameterMm.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentDiameterMmSetting = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Filaments_DefaultDiameterMm,
          newDiameterMm.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentDiameterMmSetting = setting;
        });
    }
  }

  changeDefaultFilamentPrice(newPrice: string | null) {
    if (newPrice === null) {
      return;
    }

    this.loggingService.logEvent('ChangedDefaultFilamentPrice', {
      price: newPrice,
      symbol: this.preferredCurrencySymbol,
    });
    if (this.defaultFilamentPriceSetting) {
      this.userSettingService
        .updateUserSetting(
          this.defaultFilamentPriceSetting.id,
          newPrice.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentPriceSetting = setting;
        });
    } else {
      this.userSettingService
        .addUserSetting(
          UserSettingType.Filaments_DefaultPrice,
          newPrice.toString()
        )
        .subscribe((setting) => {
          this.defaultFilamentPriceSetting = setting;
        });
    }
  }

  public getMaterialCategoryName(nickname: string): string {
    const category = this.materialCategories.find((m) => {
      return m.nickname === nickname;
    });

    return category?.name ?? '';
  }

  public printQrLabel(): void {
    const filamentId = this.filamentForm.get('id')?.value;
    if (!filamentId) {
      this.toastr.warning(
        'Please save the material first before printing a QR label.',
        'Material Not Saved'
      );
      return;
    }

    // Create a FilamentSummary from the current form data for the dialog
    const filamentSummary: FilamentSummary = {
      id: filamentId,
      displayName: this.filamentForm.get('displayName')?.value ?? '',
      brand: this.filamentForm.get('brand')?.value ?? '',
      materialCategoryNickname:
        this.filamentForm.get('materialCategoryNickname')?.value ?? '',
      materialType: this.filamentForm.get('materialType')?.value ?? '',
      materialDensityGramPerCubicCm:
        this.filamentForm.get('materialDensityGramPerCubicCm')?.value ?? 0,
      colorName: this.filamentForm.get('colorName')?.value ?? '',
      colorHex: this.getColorHex(this.filamentForm.get('colorHex')?.value),
      recommendedTemp: this.filamentForm.get('recommendedTemp')?.value ?? null,
      isActive: this.filamentForm.get('isActive')?.value ?? true,
      notes: this.filamentForm.get('notes')?.value ?? '',
      isFavorite: this.filamentForm.get('isFavorite')?.value ?? false,
      createdDate: new Date().toISOString(),
      filamentRemaining: null,
      filamentLengthRemainingInM: null,
      filamentVolumeRemainingInMl: null,
      purchasePriceValue:
        this.filamentForm.get('purchasePriceValue')?.value ?? '',
      initialNominalWeightMg:
        (this.filamentForm.get('initialNominalWeightG')?.value ?? 0) * 1000,
      diameterMm: this.filamentForm.get('diameterMm')?.value ?? 1.75,
      loadedInPrinter: null,
      storageLocation: this.filamentForm.get('storageLocation')?.value ?? '',
      materialCategory: null,
      colorPattern:
        this.filamentForm.get('colorPattern')?.value ?? ColorPatternType.Solid,
      colors:
        this.colorsFormArray.value?.length > 0
          ? this.colorsFormArray.value
          : [
              this.getColorHex(this.filamentForm.get('colorHex')?.value) ??
                '000000',
            ],
      finishType:
        this.filamentForm.get('finishType')?.value ??
        FilamentFinishType.Standard,
      effects:
        (this.filamentForm.get('effects')?.value as FilamentEffect[]) ?? [],
    };

    this.dialog.open(QrLabelDialogComponent, {
      data: { filaments: [filamentSummary] } as QrLabelDialogData,
      width: '600px',
    });
  }
}
