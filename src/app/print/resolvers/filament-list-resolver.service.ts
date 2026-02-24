import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  FilamentService,
  FilamentSortColumns,
} from '../../core/services/filament.service';
import { map } from 'rxjs';

@Injectable()
export class FilamentListResolverService {
  private readonly filamentService = inject(FilamentService);

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    // Known limitation: fetches up to 1000 filaments. Users with more than 1000
    // filaments will have chips fail to restore on page load for IDs beyond the
    // first 1000 results, though the server-side filter still applies correctly.
    return this.filamentService
      .getCurrentUserFilamentSummaries(
        1,
        1000,
        FilamentSortColumns.DisplayName,
        SortDirection.Asc
      )
      .pipe(map((pagedResult) => pagedResult.items));
  }
}
