import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  FilamentDetail,
  FilamentService,
} from 'src/app/core/services/filament.service';
import {
  resolveValue,
  routeSnapshot,
  runResolver,
} from 'src/app/core/resolvers/testing/run-resolver';
import { filamentDetailResolver } from './filament-detail.resolver';

describe('filamentDetailResolver', () => {
  let filamentService: MockedObject<FilamentService>;

  beforeEach(() => {
    filamentService = {
      getFilamentDetail: vi.fn().mockName('FilamentService.getFilamentDetail'),
    } as unknown as MockedObject<FilamentService>;
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  it('resolves the filament named by the id param', async () => {
    const filament = { id: 'abc' } as FilamentDetail;
    filamentService.getFilamentDetail.mockReturnValue(of(filament));

    await expect(
      resolveValue(
        filamentDetailResolver,
        routeSnapshot({ params: { id: 'abc' } })
      )
    ).resolves.toEqual(filament);
    expect(filamentService.getFilamentDetail).toHaveBeenCalledTimes(1);
    expect(filamentService.getFilamentDetail).toHaveBeenCalledWith('abc');
  });

  it('returns null for the new-filament route', () => {
    expect(
      runResolver(
        filamentDetailResolver,
        routeSnapshot({ params: { id: 'new' } })
      )
    ).toBeNull();
    expect(filamentService.getFilamentDetail).not.toHaveBeenCalled();
  });
});
