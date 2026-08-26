import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  convertToParamMap,
} from '@angular/router';
import { Observable, of } from 'rxjs';
import {
  FilamentDetail,
  FilamentService,
} from 'src/app/core/services/filament.service';
import { CopyFilamentDetailResolverService } from './copy-filament-detail-resolver.service';

describe('CopyFilamentDetailResolverService', () => {
  let service: CopyFilamentDetailResolverService;
  let filamentService: jasmine.SpyObj<FilamentService>;

  const aFilament = { id: 'orig', displayName: 'Blue PLA' } as FilamentDetail;

  const routeWithId = (id: string) =>
    ({ paramMap: convertToParamMap({ id }) }) as ActivatedRouteSnapshot;

  beforeEach(() => {
    filamentService = jasmine.createSpyObj<FilamentService>('FilamentService', [
      'getFilamentDetail',
    ]);

    TestBed.configureTestingModule({
      providers: [
        CopyFilamentDetailResolverService,
        { provide: FilamentService, useValue: filamentService },
      ],
    });

    service = TestBed.inject(CopyFilamentDetailResolverService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('does not carry images into the copy', (done) => {
    filamentService.getFilamentDetail.and.returnValue(
      of({
        ...aFilament,
        images: [
          {
            id: 1,
            url: 'u',
            thumbnailUrl: 't',
            isDefault: true,
            displayOrder: 0,
          },
        ],
      } as FilamentDetail)
    );

    (
      service.resolve(
        routeWithId('orig'),
        {} as RouterStateSnapshot
      ) as Observable<FilamentDetail>
    ).subscribe((copied: FilamentDetail) => {
      // The resolver clones with { ...filament }, so a new property is carried
      // by default. A spool photo shows one physical spool; on a different spool
      // it shows the user the wrong object.
      expect(copied.images).toEqual([]);
      done();
    });
  });

  it('returns null for the new-filament route', () => {
    expect(
      service.resolve(routeWithId('new'), {} as RouterStateSnapshot)
    ).toBeNull();
  });
});
