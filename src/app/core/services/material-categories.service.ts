import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface MaterialCategory {
  nickname: string;
  name: string;
  description: string;
  hasDiameter: boolean;
  showNozzleTemperature: boolean;
  showBedTemperature: boolean;
  showMeltingTemperature: boolean;
  showRecommendedInitialLayerTimeInSeconds: boolean;
  showRecommendedLayerTimeInSeconds: boolean;
  showMaterialRefreshRatio: boolean;
  showInertGas: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class MaterialCategoryService {
  private readonly baseApi = environment.printLogApiUrl;
  private cachedMaterialCategories: MaterialCategory[] | null = null;

  constructor(private readonly http: HttpClient) {}

  /**
   * Cached endpoint to get the list of material categories
   */
  public getMaterialCategories(): Observable<MaterialCategory[]> {
    if (this.cachedMaterialCategories) {
      return of(this.cachedMaterialCategories);
    }

    const url = `${this.baseApi}/api/MaterialCategories`;
    return this.http.get<MaterialCategory[]>(url).pipe(
      tap((materials) => {
        this.cachedMaterialCategories = materials;
      })
    );
  }
}
