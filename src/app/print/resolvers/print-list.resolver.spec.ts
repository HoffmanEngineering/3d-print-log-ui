import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { printListResolver } from './print-list.resolver';
import { runResolver } from 'src/app/core/resolvers/testing/run-resolver';

describe('printListResolver', () => {
  let printService: jasmine.SpyObj<PrintService>;

  const routeWith = (queryParams: Record<string, string>) =>
    ({
      queryParams,
      queryParamMap: { getAll: () => [] },
    }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintSummaries',
    ]);
    printService.getPrintSummaries.and.returnValue(of(null!));

    TestBed.configureTestingModule({
      providers: [{ provide: PrintService, useValue: printService }],
    });
  });

  it('forwards a fromDate/toDate pair from the URL', () => {
    runResolver(
      printListResolver,
      routeWith({
        fromDate: '2026-07-01T00:00:00.000Z',
        toDate: '2026-07-02T00:00:00.000Z',
      })
    );

    // Asserted positionally rather than with jasmine.anything(): that matcher rejects null,
    // and filterByStatus legitimately defaults to null. What matters here is that the range
    // arrives as the ELEVENTH argument — the slot getPrintSummaries reads it from — and that
    // userId stays undefined, since sending one narrows the list to public prints.
    const args = printService.getPrintSummaries.calls.mostRecent().args;
    expect(args[8]).toBeUndefined();
    expect(args[9]).toBeUndefined();
    expect(args[10]).toEqual({
      fromDate: '2026-07-01T00:00:00.000Z',
      toDate: '2026-07-02T00:00:00.000Z',
    });
  });

  it('passes no range when only one end is present', () => {
    runResolver(
      printListResolver,
      routeWith({ fromDate: '2026-07-01T00:00:00.000Z' })
    );

    const args = printService.getPrintSummaries.calls.mostRecent().args;
    expect(args[10]).toBeUndefined();
  });

  it('forwards every filterByTagId from the URL as the tag filter', () => {
    const route = {
      queryParams: {},
      queryParamMap: {
        getAll: (key: string) => (key === 'filterByTagId' ? ['a', 'b'] : []),
      },
    } as unknown as ActivatedRouteSnapshot;

    runResolver(printListResolver, route);

    const args = printService.getPrintSummaries.calls.mostRecent().args;
    expect(args[11]).toEqual(['a', 'b']);
  });
});
