import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot } from '@angular/router';
import { of, throwError, lastValueFrom } from 'rxjs';
import { printDetailResolver } from './print-detail.resolver';
import { runResolver } from 'src/app/core/resolvers/testing/run-resolver';
import { PrintService } from 'src/app/core/services/print.service';
import { UserService } from 'src/app/core/services/user.service';
import { NewPrintStoreService } from 'src/app/core/stores/new-print-store.service';
import { CuraParserService } from '../services/integration/cura-parser.service';
import { LoggingService } from 'src/app/core/services/logging.service';

describe('printDetailResolver', () => {
  let printService: MockedObject<PrintService>;
  let userService: MockedObject<UserService>;
  let loggingService: MockedObject<LoggingService>;
  let store: MockedObject<NewPrintStoreService>;

  const routeFor = (id: string) =>
    ({
      paramMap: new Map([['id', id]]) as any,
      queryParamMap: { has: () => false } as any,
    }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    printService = {
      getPrintDetail: vi.fn().mockName('PrintService.getPrintDetail'),
    } as unknown as MockedObject<PrintService>;
    userService = {
      getUserSummary: vi.fn().mockName('UserService.getUserSummary'),
    } as unknown as MockedObject<UserService>;
    store = {
      hasNewPrint: vi.fn().mockName('NewPrintStoreService.hasNewPrint'),
      getNewPrint: vi.fn().mockName('NewPrintStoreService.getNewPrint'),
      getNewPrintMeta: vi.fn().mockName('NewPrintStoreService.getNewPrintMeta'),
      clear: vi.fn().mockName('NewPrintStoreService.clear'),
    } as unknown as MockedObject<NewPrintStoreService>;
    store.hasNewPrint.mockReturnValue(false);
    loggingService = {
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;

    TestBed.configureTestingModule({
      providers: [
        { provide: LoggingService, useValue: loggingService },
        { provide: PrintService, useValue: printService },
        { provide: UserService, useValue: userService },
        { provide: NewPrintStoreService, useValue: store },
        {
          provide: CuraParserService,
          useValue: {
            parse: vi.fn().mockName('CuraParserService.parse'),
          },
        },
      ],
    });
  });

  it('resolves with a null user when getUserSummary fails', async () => {
    printService.getPrintDetail.mockReturnValue(
      of({ id: 1, title: 'Public print', createdByUserId: 7 } as any)
    );
    userService.getUserSummary.mockReturnValue(
      throwError(() => new Error('403'))
    );

    const result = runResolver(printDetailResolver, routeFor('1'));
    const value = await lastValueFrom(result as any);

    expect((value as any).print.id).toBe(1);
    expect((value as any).user).toBeNull();
  });

  // Without this the resolver rejects, the router cancels navigation, and the
  // visitor lands on / — so the "Print not found" view was unreachable for the
  // one case it exists to handle (#66).
  it('resolves with a null print when the print request 404s', async () => {
    printService.getPrintDetail.mockReturnValue(
      throwError(() => ({ status: 404 }))
    );

    const value = await lastValueFrom(
      runResolver(printDetailResolver, routeFor('1')) as any
    );

    expect((value as any).print).toBeNull();
    expect((value as any).user).toBeNull();
    expect(loggingService.logException).not.toHaveBeenCalled();
  });

  it('resolves and logs when the print request fails unexpectedly', async () => {
    printService.getPrintDetail.mockReturnValue(
      throwError(() => ({ status: 500 }))
    );

    const value = await lastValueFrom(
      runResolver(printDetailResolver, routeFor('1')) as any
    );

    // The page still activates — a 500 must not bounce a visitor home either —
    // but the cause is reported rather than swallowed.
    expect((value as any).print).toBeNull();
    expect(loggingService.logException).toHaveBeenCalled();
  });

  it('hands a stored new print to the form with its detected printer names', () => {
    const print = { id: null, title: 'Cube' } as any;
    store.hasNewPrint.mockReturnValue(true);
    store.getNewPrint.mockReturnValue(print);
    store.getNewPrintMeta.mockReturnValue({
      detectedPrinterNames: ['X1C', 'Bambu Lab X1 Carbon'],
    });

    const value = runResolver(printDetailResolver, routeFor('new')) as any;

    expect(value).toEqual({
      print,
      user: null,
      detectedPrinterNames: ['X1C', 'Bambu Lab X1 Carbon'],
    });
    expect(store.clear).toHaveBeenCalled();
  });

  it('resolves a manual new print with no detected printer', () => {
    store.hasNewPrint.mockReturnValue(false);

    const value = runResolver(printDetailResolver, routeFor('new')) as any;

    expect(value).toEqual({
      print: null,
      user: null,
      detectedPrinterNames: [],
    });
    expect(store.getNewPrintMeta).not.toHaveBeenCalled();
  });
});
