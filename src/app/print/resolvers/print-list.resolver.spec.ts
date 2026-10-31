import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { printListResolver } from './print-list.resolver';
import { runResolver } from 'src/app/core/resolvers/testing/run-resolver';

describe('printListResolver', () => {
  let printService: MockedObject<PrintService>;

  const routeWith = (queryParams: Record<string, string>) =>
    ({
      queryParams,
      queryParamMap: { getAll: () => [] },
    }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    printService = {
      getPrintSummaries: vi.fn().mockName('PrintService.getPrintSummaries'),
    } as unknown as MockedObject<PrintService>;
    printService.getPrintSummaries.mockReturnValue(of(null!));

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

    // Asserted positionally rather than with expect.anything(): that matcher rejects null,
    // and filterByStatus legitimately defaults to null. What matters here is that the range
    // arrives as the ELEVENTH argument — the slot getPrintSummaries reads it from — and that
    // userId stays undefined, since sending one narrows the list to public prints.
    const args = vi.mocked(printService.getPrintSummaries).mock.lastCall;
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

    const args = vi.mocked(printService.getPrintSummaries).mock.lastCall;
    expect(args[10]).toBeUndefined();
  });
});
