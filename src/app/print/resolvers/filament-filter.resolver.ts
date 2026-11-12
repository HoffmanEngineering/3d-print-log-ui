import { HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { forkJoin, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  FilamentService,
  FilamentSummary,
} from '../../core/services/filament.service';
import { filamentDetailToSummary } from '../../core/utils/filament-summary';

/**
 * The filaments the prints list is filtered by, from its `filterByFilamentId` query params.
 * A filament the API no longer has (404) or will not show (403) is left out: a rejected
 * resolver cancels the navigation, and a bookmarked filter can outlive its spool. The list
 * then drops that id from its filters.
 */
export const filamentFilterResolver: ResolveFn<FilamentSummary[]> = (route) => {
  const ids = route.queryParamMap.getAll('filterByFilamentId');
  if (ids.length === 0) {
    return of([] as FilamentSummary[]);
  }

  const filamentService = inject(FilamentService);
  return forkJoin(
    ids.map((id) =>
      filamentService
        .getFilamentDetail(id)
        .pipe(
          catchError((err: unknown) =>
            err instanceof HttpErrorResponse &&
            (err.status === 404 || err.status === 403)
              ? of(null)
              : throwError(() => err)
          )
        )
    )
  ).pipe(
    map((details) =>
      details.filter((d) => d !== null).map(filamentDetailToSummary)
    )
  );
};
