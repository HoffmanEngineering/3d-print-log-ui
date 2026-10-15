import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { resolveValue } from 'src/app/core/resolvers/testing/run-resolver';
import { filamentStorageLocationsResolver } from './filament-storage-locations.resolver';

describe('filamentStorageLocationsResolver', () => {
  let filamentService: jasmine.SpyObj<FilamentService>;

  beforeEach(() => {
    filamentService = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getFilamentStorageLocations',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  it('resolves the storage location names', async () => {
    filamentService.getFilamentStorageLocations.and.returnValue(
      of({ storageLocations: ['Shelf 1', 'Dry box'] })
    );

    await expectAsync(
      resolveValue(filamentStorageLocationsResolver)
    ).toBeResolvedTo(['Shelf 1', 'Dry box']);
  });

  it('resolves an empty list when the request fails', async () => {
    filamentService.getFilamentStorageLocations.and.returnValue(
      throwError(() => new Error('500'))
    );

    await expectAsync(
      resolveValue(filamentStorageLocationsResolver)
    ).toBeResolvedTo([]);
  });
});
