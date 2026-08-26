import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { map } from 'rxjs/operators';
import { EMPTY_GUID } from 'src/app/core/services/print.service';
import {
  FilamentDetail,
  FilamentService,
} from '../../core/services/filament.service';

@Injectable()
export class CopyFilamentDetailResolverService {
  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const filamentId = route.paramMap.get('id');

    if (filamentId === 'new') {
      return null;
    }

    return this.filamentService.getFilamentDetail(filamentId).pipe(
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
        };

        return cleanedFilament;
      })
    );
  }
  constructor(private filamentService: FilamentService) {}
}
