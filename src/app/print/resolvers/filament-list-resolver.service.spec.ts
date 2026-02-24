import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  FilamentService,
  FilamentSortColumns,
} from '../../core/services/filament.service';
import { SortDirection } from '../../core/types/sort-request';
import { FilamentListResolverService } from './filament-list-resolver.service';

describe('FilamentListResolverService', () => {
  let service: FilamentListResolverService;
  let mockFilamentService: jasmine.SpyObj<FilamentService>;

  const mockPagedResult = {
    items: [{ id: 'abc', displayName: 'Test Filament' } as any],
    paging: { currentPage: 1, pageSize: 1000, totalCount: 1, totalPages: 1 },
  };

  beforeEach(() => {
    mockFilamentService = jasmine.createSpyObj<FilamentService>(
      'FilamentService',
      ['getCurrentUserFilamentSummaries']
    );
    mockFilamentService.getCurrentUserFilamentSummaries.and.returnValue(
      of(mockPagedResult)
    );

    TestBed.configureTestingModule({
      providers: [
        FilamentListResolverService,
        { provide: FilamentService, useValue: mockFilamentService },
      ],
    });
    service = TestBed.inject(FilamentListResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should resolve to the items array from the paged result', (done) => {
    service.resolve(null, null).subscribe((items) => {
      expect(items).toEqual(mockPagedResult.items);
      done();
    });
  });

  it('should request page 1 with 1000 items sorted by display name ascending', () => {
    service.resolve(null, null).subscribe();

    expect(
      mockFilamentService.getCurrentUserFilamentSummaries
    ).toHaveBeenCalledWith(
      1,
      1000,
      FilamentSortColumns.DisplayName,
      SortDirection.Asc
    );
  });
});
