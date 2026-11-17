import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { resolveValue } from 'src/app/core/resolvers/testing/run-resolver';
import { filamentStorageLocationsResolver } from './filament-storage-locations.resolver';

describe('filamentStorageLocationsResolver', () => {
  let filamentService: MockedObject<FilamentService>;

  beforeEach(() => {
    filamentService = {
      getFilamentStorageLocations: vi
        .fn()
        .mockName('FilamentService.getFilamentStorageLocations'),
    } as unknown as MockedObject<FilamentService>;
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  it('resolves the storage location names', async () => {
    filamentService.getFilamentStorageLocations.mockReturnValue(
      of({ storageLocations: ['Shelf 1', 'Dry box'] })
    );

    await expect(
      resolveValue(filamentStorageLocationsResolver)
    ).resolves.toEqual(['Shelf 1', 'Dry box']);
  });

  it('resolves an empty list when the request fails', async () => {
    filamentService.getFilamentStorageLocations.mockReturnValue(
      throwError(() => new Error('500'))
    );

    await expect(
      resolveValue(filamentStorageLocationsResolver)
    ).resolves.toEqual([]);
  });
});
