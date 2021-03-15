import { Location } from '@angular/common';
import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import { Material } from 'src/app/core/services/material.service';
import { MaterialNamePipe } from 'src/app/shared/pipes/material-name.pipe';
import {
  FilamentAdjustment,
  FilamentDetail,
  FilamentService,
} from '../../core/services/filament.service';

const EMPTY_GUID = '00000000-0000-0000-0000-000000000000';

@Component({
  selector: 'app-filament-detail',
  templateUrl: './filament-detail.component.html',
  styleUrls: ['./filament-detail.component.scss'],
})
export class FilamentDetailComponent implements OnInit, ComponentCanDeactivate {
  public filamentForm: FormGroup;
  public saving = false;

  public materials: Material[] = [];
  public filteredMaterials: Observable<Material[]> = null;

  public materialNamePipe: MaterialNamePipe = new MaterialNamePipe();

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private filamentService: FilamentService,
    private toastr: ToastrService,
    private titleService: Title,
    private el: ElementRef,
    private location: Location
  ) {}

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.filamentForm.dirty;
  }

  get filamentAdjustments() {
    return this.filamentForm.get('filamentAdjustments') as FormArray;
  }

  ngOnInit() {
    this.titleService.setTitle('Filament Details - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.filamentForm = this.buildFormFromFilamentDetail(data.filament);

      this.materials = data.materials ?? [];

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
    });
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

  buildFormFromFilamentDetail(filament: FilamentDetail): FormGroup {
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
      diameterMm: [filament?.diameterMm],

      initialTotalWeightG: [filament?.initialTotalWeightMg / 1000],
      initialNominalWeightG: [filament?.initialNominalWeightMg / 1000],
      spoolWeightG: [filament?.spoolWeightMg / 1000],
      tempRangeStart: [filament?.tempRangeStart],
      tempRangeEnd: [filament?.tempRangeEnd],
      recommendedTemp: [filament?.recommendedTemp],
      purchaseDate: [
        filament?.purchaseDate ? new Date(filament.purchaseDate) : null,
      ],
      purchaseLocation: [filament?.purchaseLocation],
      purchasePriceValue: [filament?.purchasePriceValue],
      purchasePriceCurrency: [filament?.purchasePriceCurrency],
      notes: [filament?.notes],
      filamentAdjustments: adjustments,
      isActive: [
        filament &&
        filament.isActive !== null &&
        filament.isActive !== undefined
          ? filament.isActive
          : true,
      ],
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
        this.saving = false;
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
      materialDensityGramPerCubicCm: this.filamentForm.controls
        .materialDensityGramPerCubicCm.value,
      materialType: this.filamentForm.controls.materialType.value,
      notes: this.filamentForm.controls.notes.value,
      purchaseDate: this.filamentForm.controls.purchaseDate.value,
      purchaseLocation: this.filamentForm.controls.purchaseLocation.value,
      purchasePriceCurrency: this.filamentForm.controls.purchasePriceCurrency
        .value,
      purchasePriceValue: this.filamentForm.controls.purchasePriceValue.value,
      recommendedTemp: this.filamentForm.controls.recommendedTemp.value,
      spoolWeightMg: Math.round(
        this.filamentForm.controls.spoolWeightG.value * 1000
      ),
      tempRangeEnd: this.filamentForm.controls.tempRangeEnd.value,
      tempRangeStart: this.filamentForm.controls.tempRangeStart.value,
      filamentAdjustments: adjustments,
      isActive: this.filamentForm.controls.isActive.value,
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
}
