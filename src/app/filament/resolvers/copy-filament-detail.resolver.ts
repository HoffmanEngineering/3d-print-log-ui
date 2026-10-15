import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { map } from 'rxjs/operators';
import {
  FilamentDetail,
  FilamentService,
} from 'src/app/core/services/filament.service';

/** A filament prepared to be saved as a new spool, or `null` on the new-filament route. */
export const copyFilamentDetailResolver: ResolveFn<FilamentDetail | null> = (
  route
) => {
  const filamentId = route.paramMap.get('id');
  if (filamentId === 'new') {
    return null;
  }

  return inject(FilamentService)
    .getFilamentDetail(filamentId)
    .pipe(
      map((filament) => {
        // Reset any fields that we don't want carried over to the copied filament.
        const cleanedFilament: FilamentDetail = {
          ...filament,
          id: null,
          isActive: true,
          filamentAdjustments: [], // Remove any existing adjustments.
          // A material photo is of one physical spool. Unlike a print's slicer
          // render, it is not valid for the copy.
          images: [],
          // A tag is stuck to one physical spool, and the API lets a UID sit
          // on only one of the user's spools, so a copy that kept them would
          // fail to save with a 409.
          tagUids: [],
        };

        return cleanedFilament;
      })
    );
};
