import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  ColorPatternType,
  FilamentEffect,
  FilamentFinishType,
  FilamentService,
  FilamentSortColumns,
} from 'src/app/core/services/filament.service';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  routeSnapshot,
  runResolver,
} from 'src/app/core/resolvers/testing/run-resolver';
import { filamentListResolver } from './filament-list.resolver';

describe('filamentListResolver', () => {
  let filamentService: jasmine.SpyObj<FilamentService>;

  beforeEach(() => {
    localStorage.removeItem('filament_list_page_size');
    filamentService = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getCurrentUserFilamentSummaries',
    ]);
    filamentService.getCurrentUserFilamentSummaries.and.returnValue(of(null!));
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  afterEach(() => localStorage.removeItem('filament_list_page_size'));

  it('requests the first page sorted by remaining amount when the URL has no query', () => {
    runResolver(filamentListResolver);

    expect(
      filamentService.getCurrentUserFilamentSummaries
    ).toHaveBeenCalledOnceWith(
      1,
      10,
      FilamentSortColumns.FilamentRemaining,
      SortDirection.Desc,
      '',
      undefined,
      undefined,
      undefined,
      '',
      '',
      undefined,
      undefined,
      undefined
    );
  });

  it('uses the page size saved by the list', () => {
    localStorage.setItem('filament_list_page_size', '25');

    runResolver(filamentListResolver);

    expect(
      filamentService.getCurrentUserFilamentSummaries.calls.mostRecent().args[1]
    ).toBe(25);
  });

  it('forwards the multi-valued pattern, finish and effect filters as numbers', () => {
    runResolver(
      filamentListResolver,
      routeSnapshot({
        queryParams: {
          colorPatterns: [String(ColorPatternType.Solid)],
          finishTypes: [String(FilamentFinishType.Standard)],
          effects: [
            String(FilamentEffect.Sparkle),
            String(FilamentEffect.GlowInDark),
          ],
        },
      })
    );

    const args =
      filamentService.getCurrentUserFilamentSummaries.calls.mostRecent().args;
    expect(args[10]).toEqual([ColorPatternType.Solid]);
    expect(args[11]).toEqual([FilamentFinishType.Standard]);
    expect(args[12]).toEqual([
      FilamentEffect.Sparkle,
      FilamentEffect.GlowInDark,
    ]);
  });
});
