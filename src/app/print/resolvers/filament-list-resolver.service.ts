import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  FilamentService,
  FilamentSummary,
} from '../../core/services/filament.service';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs';

@Injectable()
export class FilamentListResolverService {
  private readonly filamentService = inject(FilamentService);

  resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) {
    const ids = route.queryParamMap.getAll('filterByFilamentId');
    if (ids.length === 0) {
      return of([] as FilamentSummary[]);
    }
    return forkJoin(
      ids.map((id) => this.filamentService.getFilamentDetail(id))
    ).pipe(
      map((details) =>
        details.map(
          (d): FilamentSummary => ({
            id: d.id,
            displayName: d.displayName,
            brand: d.brand,
            materialCategoryNickname: d.materialCategoryNickname,
            materialType: d.materialType,
            materialDensityGramPerCubicCm: d.materialDensityGramPerCubicCm,
            colorName: d.colorName,
            colorHex: d.colorHex,
            colorPattern: d.colorPattern,
            colors: d.colors,
            finishType: d.finishType,
            effects: d.effects,
            recommendedTemp: d.recommendedTemp,
            isActive: d.isActive,
            notes: d.notes,
            isFavorite: d.isFavorite,
            createdDate: '',
            filamentRemaining: null,
            filamentLengthRemainingInM: null,
            filamentVolumeRemainingInMl: null,
            purchasePriceValue: d.purchasePriceValue,
            initialNominalWeightMg: d.initialNominalWeightMg,
            diameterMm: d.diameterMm ?? 0,
            loadedInPrinter: null,
            storageLocation: d.storageLocation,
            materialCategory: null as any,
          })
        )
      )
    );
  }
}
