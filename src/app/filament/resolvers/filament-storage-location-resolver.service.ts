import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { FilamentService } from 'src/app/core/services/filament.service';

export const FilamentStorageLocationResolverService: ResolveFn<string[]> = (
  route,
  state,
  filamentService = inject(FilamentService)
) => {
  return filamentService.getFilamentStorageLocations().pipe(
    map((result) => result.storageLocations),
    catchError(() => of([]))
  );
};
