import type { MockedObject } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  convertToParamMap,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { firstValueFrom, Observable, of, throwError } from 'rxjs';
import {
  FilamentDetail,
  FilamentService,
} from '../core/services/filament.service';
import { spoolNumberRedirectGuard } from './spool-number-redirect.guard';

describe('spoolNumberRedirectGuard', () => {
  let filamentService: MockedObject<FilamentService>;

  beforeEach(() => {
    filamentService = {
      getFilamentBySpoolNumber: vi
        .fn()
        .mockName('FilamentService.getFilamentBySpoolNumber'),
    } as unknown as MockedObject<FilamentService>;
    TestBed.configureTestingModule({
      providers: [{ provide: FilamentService, useValue: filamentService }],
    });
  });

  async function run(number: string): Promise<string> {
    const route = {
      paramMap: convertToParamMap({ number }),
    } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() =>
      spoolNumberRedirectGuard(route, {} as RouterStateSnapshot)
    ) as Observable<UrlTree> | UrlTree;
    const tree =
      result instanceof UrlTree ? result : await firstValueFrom(result);
    return TestBed.inject(Router).serializeUrl(tree);
  }

  it('redirects a spool number to its material', async () => {
    filamentService.getFilamentBySpoolNumber.mockReturnValue(
      of({ id: 'abc-123' } as FilamentDetail)
    );

    expect(await run('7')).toBe('/materials/abc-123');
    expect(filamentService.getFilamentBySpoolNumber).toHaveBeenCalledWith(7);
  });

  it('falls back to the materials list when no spool has the number', async () => {
    filamentService.getFilamentBySpoolNumber.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 404 }))
    );

    expect(await run('99')).toBe('/materials');
  });

  it('falls back to the materials list without a lookup for a non-number', async () => {
    expect(await run('abc')).toBe('/materials');
    expect(filamentService.getFilamentBySpoolNumber).not.toHaveBeenCalled();
  });
});
