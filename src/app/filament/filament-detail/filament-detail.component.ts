import { Location } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
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
  FilamentAdjustment,
  FilamentDetail,
  FilamentService,
} from '../../core/services/filament.service';
import { MaterialCategory } from 'src/app/core/services/material-categories.service';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

@Component({
  selector: 'app-filament-detail',
  templateUrl: './filament-detail.component.html',
  styleUrls: ['./filament-detail.component.scss'],
})
export class FilamentDetailComponent
  implements OnInit, ComponentCanDeactivate, OnDestroy
{
  public filamentForm: UntypedFormGroup;
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

    private readonly userSettingService: UserSettingService
  ) {}

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.filamentForm.dirty;
  }

  get filamentAdjustments() {
    return this.filamentForm.get('filamentAdjustments') as UntypedFormArray;
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

      this.recalculateFormFieldsForSelectedMaterialCategory(
        this.filamentForm.get('materialCategoryNickname').value
      );

      this.materialCategorySubscription = this.filamentForm
        .get('materialCategoryNickname')
        .valueChanges.subscribe((categoryNickname) => {
          this.recalculateFormFieldsForSelectedMaterialCategory(
            categoryNickname
          );
        });

      this.filteredMaterials = this.filamentForm
        .get('materialType')
        .valueChanges.pipe(
          startWith(''),
          tap((value) => {
            if (
              value === '' ||
              +this.filamentForm.get('materialDensityGramPerCubicCm').value > 0
            ) {
              return;
            }

            const selectedMaterial = this.materials.find((m) => {
              return this.materialNamePipe.transform(m) === value;
            });
            if (selectedMaterial) {
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
  }

  private _filter(value: string): Material[] {
    const filterValue = value.toLowerCase();

    return this.materials
      .filter(
        (option) =>
          option.acronym?.toLowerCase().includes(filterValue) ||
          option.name?.toLowerCase().includes(filterValue)
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
    amountG: number,
    notes: string
  ) {
    return this.formBuilder.group({
      id,
      filamentId,
      amountG,
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
          adjustment.amountMg / 1000,
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

      diameterMm: [
        filament?.diameterMm
          ? filament.diameterMm
          : this.defaultFilamentDiameterMmSetting
          ? +this.defaultFilamentDiameterMmSetting.value
          : null,
      ],

      initialTotalWeightG: [filament?.initialTotalWeightMg / 1000],
      initialNominalWeightG: [filament?.initialNominalWeightMg / 1000],
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
        0,
        ''
      )
    );
  }

  removeAdjustment(index: number) {
    this.filamentAdjustments.removeAt(index);
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

    if (newFilament.id === null) {
      saveFilament = this.filamentService.addFilament(newFilament);
    } else {
      saveFilament = this.filamentService.updateFilament(newFilament);
    }

    saveFilament.subscribe(
      (filament) => {
        this.filamentForm.markAsPristine();

        this.router.navigateByUrl('/filament').then(() => {
          this.toastr.success('Save successful!');
        });
      },
      (err) => {
        this.saving = false;
      }
    );
  }

  handleClose() {
    this.location.back();
  }

  private getFilamentFromForm(): FilamentDetail {
    const adjustments = this.filamentAdjustments.controls
      .filter((adjustment) => {
        return (
          adjustment.get('amountG').value !== 0 ||
          adjustment.get('notes').value !== ''
        );
      })
      .map((adjustment) => {
        const newAdjustment: FilamentAdjustment = {
          id: adjustment.get('id')?.value ?? EMPTY_GUID,
          filamentId: adjustment.get('filamentId')?.value ?? EMPTY_GUID,
          amountMg: Math.round(+adjustment.get('amountG').value * 1000),
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
      initialNominalWeightMg: Math.round(
        this.filamentForm.controls.initialNominalWeightG.value * 1000
      ),
      initialTotalWeightMg: Math.round(
        this.filamentForm.controls.initialTotalWeightG.value * 1000
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
    };

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
          this.defaultFilamentDiameterMmSetting.id,
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
}
