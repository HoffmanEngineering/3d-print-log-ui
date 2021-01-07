import { Component, HostListener, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { uniq } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { map, startWith, tap } from 'rxjs/operators';
import { ComponentCanDeactivate } from 'src/app/core/guards/pending-changes.guard';
import {
  FilamentDetail,
  FilamentService,
} from '../../core/services/filament.service';

@Component({
  selector: 'app-filament-detail',
  templateUrl: './filament-detail.component.html',
  styleUrls: ['./filament-detail.component.scss'],
})
export class FilamentDetailComponent implements OnInit, ComponentCanDeactivate {
  public filamentForm: FormGroup;
  public saving = false;

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private formBuilder: FormBuilder,
    private filamentService: FilamentService,
    private toastr: ToastrService,
    private titleService: Title
  ) {}

  @HostListener('window:beforeunload')
  canDeactivate(): boolean | Observable<boolean> {
    return !this.filamentForm.dirty;
  }

  ngOnInit() {
    this.titleService.setTitle('Filament Details - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      this.filamentForm = this.buildFormFromFilamentDetail(data.filament);
    });
  }

  buildFormFromFilamentDetail(filament: FilamentDetail): FormGroup {
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
        filament && filament.colorHex ? '#' + filament.colorHex : null,
      ],
      diameterMm: [filament?.diameterMm],

      initialTotalWeightG: [filament?.initialTotalWeightMg / 1000],
      initialNominalWeightG: [filament?.initialNominalWeightMg / 1000],
      spoolWeightG: [filament?.spoolWeightMg / 1000],
      tempRangeStart: [filament?.tempRangeStart],
      tempRangeEnd: [filament?.tempRangeEnd],
      recommendedTemp: [filament?.recommendedTemp],
      purchaseDate: [filament?.purchaseDate],
      purchaseLocation: [filament?.purchaseLocation],
      purchasePriceValue: [filament?.purchasePriceValue],
      purchasePriceCurrency: [filament?.purchasePriceCurrency],
      notes: [filament?.notes],

      isActive: [
        filament &&
        filament.isActive !== null &&
        filament.isActive !== undefined
          ? filament.isActive
          : true,
      ],
    });

    console.log(form);

    return form;
  }

  onSubmit() {
    this.saving = true;

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
    this.router.navigate(['/filament']);
  }

  private getFilamentFromForm(): FilamentDetail {
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
