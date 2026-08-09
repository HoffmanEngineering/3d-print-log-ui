import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { of, throwError, lastValueFrom } from 'rxjs';
import { PrintDetailResolverService } from './print-detail-resolver.service';
import { PrintService } from 'src/app/core/services/print.service';
import { UserService } from 'src/app/core/services/user.service';
import { NewPrintStoreService } from 'src/app/core/stores/new-print-store.service';
import { CuraParserService } from '../services/integration/cura-parser.service';
import { LoggingService } from 'src/app/core/services/logging.service';

describe('PrintDetailResolverService', () => {
  let service: PrintDetailResolverService;
  let printService: jasmine.SpyObj<PrintService>;
  let userService: jasmine.SpyObj<UserService>;
  let loggingService: jasmine.SpyObj<LoggingService>;

  const routeFor = (id: string) =>
    ({
      paramMap: new Map([['id', id]]) as any,
      queryParamMap: { has: () => false } as any,
    }) as unknown as ActivatedRouteSnapshot;

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintDetail',
    ]);
    userService = jasmine.createSpyObj<UserService>('UserService', [
      'getUserSummary',
    ]);
    const store = jasmine.createSpyObj<NewPrintStoreService>(
      'NewPrintStoreService',
      ['hasNewPrint', 'getNewPrint', 'clear']
    );
    store.hasNewPrint.and.returnValue(false);
    loggingService = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
    ]);

    TestBed.configureTestingModule({
      providers: [
        PrintDetailResolverService,
        { provide: LoggingService, useValue: loggingService },
        { provide: PrintService, useValue: printService },
        { provide: UserService, useValue: userService },
        { provide: NewPrintStoreService, useValue: store },
        {
          provide: CuraParserService,
          useValue: jasmine.createSpyObj<CuraParserService>(
            'CuraParserService',
            ['parse']
          ),
        },
      ],
    });
    service = TestBed.inject(PrintDetailResolverService);
  });

  it('resolves with a null user when getUserSummary fails', async () => {
    printService.getPrintDetail.and.returnValue(
      of({ id: 1, title: 'Public print', createdByUserId: 7 } as any)
    );
    userService.getUserSummary.and.returnValue(
      throwError(() => new Error('403'))
    );

    const result = service.resolve(routeFor('1'), {} as RouterStateSnapshot);
    const value = await lastValueFrom(result as any);

    expect((value as any).print.id).toBe(1);
    expect((value as any).user).toBeNull();
  });

  // Without this the resolver rejects, the router cancels navigation, and the
  // visitor lands on / — so the "Print not found" view was unreachable for the
  // one case it exists to handle (#66).
  it('resolves with a null print when the print request 404s', async () => {
    printService.getPrintDetail.and.returnValue(
      throwError(() => ({ status: 404 }))
    );

    const value = await lastValueFrom(
      service.resolve(routeFor('1'), {} as RouterStateSnapshot) as any
    );

    expect((value as any).print).toBeNull();
    expect((value as any).user).toBeNull();
    expect(loggingService.logException).not.toHaveBeenCalled();
  });

  it('resolves and logs when the print request fails unexpectedly', async () => {
    printService.getPrintDetail.and.returnValue(
      throwError(() => ({ status: 500 }))
    );

    const value = await lastValueFrom(
      service.resolve(routeFor('1'), {} as RouterStateSnapshot) as any
    );

    // The page still activates — a 500 must not bounce a visitor home either —
    // but the cause is reported rather than swallowed.
    expect((value as any).print).toBeNull();
    expect(loggingService.logException).toHaveBeenCalled();
  });
});
