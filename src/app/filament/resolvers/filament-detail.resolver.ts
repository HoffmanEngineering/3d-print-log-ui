import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import {
  FilamentDetail,
  FilamentService,
} from 'src/app/core/services/filament.service';

/** The filament being edited, or `null` on the new-filament route. */
export const filamentDetailResolver: ResolveFn<FilamentDetail | null> = (
  route
) => {
  const filamentId = route.paramMap.get('id');
  if (filamentId === 'new') {
    return null;
  }

  return inject(FilamentService).getFilamentDetail(filamentId);
};
