import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  FilamentService,
  FilamentSummary,
} from '../../core/services/filament.service';
import { filamentDetailToSummary } from '../../core/utils/filament-summary';

/** The filaments the prints list is filtered by, from its `filterByFilamentId` query params. */
export const filamentFilterResolver: ResolveFn<FilamentSummary[]> = (route) => {
  const ids = route.queryParamMap.getAll('filterByFilamentId');
  if (ids.length === 0) {
    return of([] as FilamentSummary[]);
  }

  const filamentService = inject(FilamentService);
  return forkJoin(ids.map((id) => filamentService.getFilamentDetail(id))).pipe(
    map((details) => details.map(filamentDetailToSummary))
  );
};
