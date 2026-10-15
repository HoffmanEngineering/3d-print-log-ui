import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FilamentService } from 'src/app/core/services/filament.service';

/** Storage location names for the filter; an empty list if they cannot be fetched. */
export const filamentStorageLocationsResolver: ResolveFn<string[]> = () =>
  inject(FilamentService)
    .getFilamentStorageLocations()
    .pipe(
      map((result) => result.storageLocations),
      catchError(() => of([]))
    );
