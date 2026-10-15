import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { FilamentService } from '../core/services/filament.service';

/**
 * `/materials/spool/:number`, where the API sends Spoolman's web UI links (Fluidd's "Manage
 * spools" and its AFC panel's `/spool/show/{id}`). Spoolman clients know a spool by its spool
 * number, so this looks the number up as the signed-in user and opens that material, or the
 * materials list when no spool has it.
 */
export const spoolNumberRedirectGuard: CanActivateFn = (route) => {
  const router = inject(Router);
  const list = router.createUrlTree(['/materials']);
  const spoolNumber = Number(route.paramMap.get('number'));
  if (!Number.isInteger(spoolNumber) || spoolNumber < 1) {
    return list;
  }

  return inject(FilamentService)
    .getFilamentBySpoolNumber(spoolNumber)
    .pipe(
      map((filament) => router.createUrlTree(['/materials', filament.id])),
      catchError(() => of(list))
    );
};
