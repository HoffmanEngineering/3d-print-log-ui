import { inject, Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import {
  FilamentService,
  FilamentSummary,
} from '../../core/services/filament.service';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs';
import { filamentDetailToSummary } from '../../core/utils/filament-summary';

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
    ).pipe(map((details) => details.map(filamentDetailToSummary)));
  }
}
