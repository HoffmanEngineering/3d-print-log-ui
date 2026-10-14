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
  let filamentService: jasmine.SpyObj<FilamentService>;

  beforeEach(() => {
    filamentService = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getFilamentDetail',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  it('resolves the filament named by the id param', async () => {
    const filament = { id: 'abc' } as FilamentDetail;
    filamentService.getFilamentDetail.and.returnValue(of(filament));

    await expectAsync(
      resolveValue(
        filamentDetailResolver,
        routeSnapshot({ params: { id: 'abc' } })
      )
    ).toBeResolvedTo(filament);
    expect(filamentService.getFilamentDetail).toHaveBeenCalledOnceWith('abc');
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
