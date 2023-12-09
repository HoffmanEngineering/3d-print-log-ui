import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface Material {
  /**
   * GUID
   */
  id: string;
  acronym: string | null;
  name: string | null;
  materialCategoryNickname: string | null;
  densityGramPerCubicCm: number;
}

@Injectable({
  providedIn: 'root',
})
export class MaterialService {
  private readonly baseApi = environment.printLogApiUrl;
  private cachedMaterials: Material[] = null;

  constructor(private readonly http: HttpClient) {}

  /**
   * Cached endpoint to get the list of materials
   */
  public getMaterials(): Observable<Material[]> {
    if (this.cachedMaterials) {
      return of(this.cachedMaterials);
    }

    const url = `${this.baseApi}/api/Materials`;
    return this.http.get<Material[]>(url).pipe(
      tap((materials) => {
        this.cachedMaterials = materials;
      })
    );
  }
}
