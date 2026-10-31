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
import { copyFilamentDetailResolver } from './copy-filament-detail.resolver';

describe('copyFilamentDetailResolver', () => {
  let filamentService: MockedObject<FilamentService>;

  const aFilament = { id: 'orig', displayName: 'Blue PLA' } as FilamentDetail;
  const copyOf = (filament: Partial<FilamentDetail>) => {
    filamentService.getFilamentDetail.mockReturnValue(
      of({ ...aFilament, ...filament } as FilamentDetail)
    );
    return resolveValue(
      copyFilamentDetailResolver,
      routeSnapshot({ params: { id: 'orig' } })
    );
  };

  beforeEach(() => {
    filamentService = {
      getFilamentDetail: vi.fn().mockName('FilamentService.getFilamentDetail'),
    } as unknown as MockedObject<FilamentService>;
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  it('copies the filament as a new, active spool with no adjustments', async () => {
    const copied = await copyOf({
      isActive: false,
      filamentAdjustments: [
        { id: 'a' },
      ] as FilamentDetail['filamentAdjustments'],
    });

    expect(filamentService.getFilamentDetail).toHaveBeenCalledTimes(1);

    expect(filamentService.getFilamentDetail).toHaveBeenCalledWith('orig');
    expect(copied!.displayName).toBe('Blue PLA');
    expect(copied!.id).toBeNull();
    expect(copied!.isActive).toBe(true);
    expect(copied!.filamentAdjustments).toEqual([]);
  });

  it('does not carry images into the copy', async () => {
    // The resolver clones with { ...filament }, so a new property is carried
    // by default. A spool photo shows one physical spool; on a different spool
    // it shows the user the wrong object.
    const copied = await copyOf({
      images: [
        {
          id: 1,
          url: 'u',
          thumbnailUrl: 't',
          isDefault: true,
          displayOrder: 0,
        },
      ],
    });

    expect(copied!.images).toEqual([]);
  });

  it('does not carry tag UIDs into the copy', async () => {
    // A tag is stuck to one physical spool, and the API allows it on only
    // one of the user's spools, so carrying it over would 409 the save.
    const copied = await copyOf({ tagUids: ['04A23F11'] });

    expect(copied!.tagUids).toEqual([]);
  });

  it('returns null for the new-filament route', () => {
    expect(
      runResolver(
        copyFilamentDetailResolver,
        routeSnapshot({ params: { id: 'new' } })
      )
    ).toBeNull();
    expect(filamentService.getFilamentDetail).not.toHaveBeenCalled();
  });
});
