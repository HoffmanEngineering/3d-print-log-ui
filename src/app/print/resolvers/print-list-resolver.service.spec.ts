import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { PrintListResolverService } from './print-list-resolver.service';

describe('PrintListResolverService', () => {
  let resolver: PrintListResolverService;
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
      providers: [
        PrintListResolverService,
        { provide: PrintService, useValue: printService },
      ],
    });
    resolver = TestBed.inject(PrintListResolverService);
  });

  it('should be created', () => {
    expect(resolver).toBeTruthy();
  });

  it('forwards a fromDate/toDate pair from the URL', () => {
    resolver.resolve(
      routeWith({
        fromDate: '2026-07-01T00:00:00.000Z',
        toDate: '2026-07-02T00:00:00.000Z',
      }),
      {} as RouterStateSnapshot
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
    resolver.resolve(
      routeWith({ fromDate: '2026-07-01T00:00:00.000Z' }),
      {} as RouterStateSnapshot
    );

    const args = printService.getPrintSummaries.calls.mostRecent().args;
    expect(args[10]).toBeUndefined();
  });
});
