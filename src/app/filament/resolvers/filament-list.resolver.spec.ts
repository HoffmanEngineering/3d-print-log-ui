import type { MockedObject } from 'vitest';
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
  let filamentService: MockedObject<FilamentService>;

  beforeEach(() => {
    localStorage.removeItem('filament_list_page_size');
    filamentService = {
      getCurrentUserFilamentSummaries: vi
        .fn()
        .mockName('FilamentService.getCurrentUserFilamentSummaries'),
    } as unknown as MockedObject<FilamentService>;
    filamentService.getCurrentUserFilamentSummaries.mockReturnValue(of(null!));
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  afterEach(() => localStorage.removeItem('filament_list_page_size'));

  it('requests the first page sorted by remaining amount when the URL has no query', () => {
    runResolver(filamentListResolver);

    expect(
      filamentService.getCurrentUserFilamentSummaries
    ).toHaveBeenCalledTimes(1);

    expect(
      filamentService.getCurrentUserFilamentSummaries
    ).toHaveBeenCalledWith(
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
      vi.mocked(filamentService.getCurrentUserFilamentSummaries).mock
        .lastCall[1]
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

    const args = vi.mocked(filamentService.getCurrentUserFilamentSummaries).mock
      .lastCall;
    expect(args[10]).toEqual([ColorPatternType.Solid]);
    expect(args[11]).toEqual([FilamentFinishType.Standard]);
    expect(args[12]).toEqual([
      FilamentEffect.Sparkle,
      FilamentEffect.GlowInDark,
    ]);
  });
});
