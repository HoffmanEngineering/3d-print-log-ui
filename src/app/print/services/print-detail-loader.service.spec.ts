import { TestBed } from '@angular/core/testing';
import { lastValueFrom, of, throwError } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrintService } from 'src/app/core/services/print.service';
import { UserService } from 'src/app/core/services/user.service';
import { PrintDetailLoaderService } from './print-detail-loader.service';

describe('PrintDetailLoaderService', () => {
  let service: PrintDetailLoaderService;
  let printService: jasmine.SpyObj<PrintService>;
  let userService: jasmine.SpyObj<UserService>;
  let loggingService: jasmine.SpyObj<LoggingService>;

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'getPrintDetail',
    ]);
    userService = jasmine.createSpyObj<UserService>('UserService', [
      'getUserSummary',
    ]);
    loggingService = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logException',
    ]);

    TestBed.configureTestingModule({
      providers: [
        { provide: PrintService, useValue: printService },
        { provide: UserService, useValue: userService },
        { provide: LoggingService, useValue: loggingService },
      ],
    });
    service = TestBed.inject(PrintDetailLoaderService);
  });

  it('returns the print and its uploader', async () => {
    printService.getPrintDetail.and.returnValue(
      of({ id: 1, createdByUserId: 7 } as any)
    );
    userService.getUserSummary.and.returnValue(of({ id: 7 } as any));

    const result = await lastValueFrom(service.load(1));

    expect(result.print.id).toBe(1);
    expect(result.user.id).toBe(7);
  });

  it('degrades to a null user when getUserSummary fails', async () => {
    printService.getPrintDetail.and.returnValue(
      of({ id: 1, title: 'Public print', createdByUserId: 7 } as any)
    );
    userService.getUserSummary.and.returnValue(
      throwError(() => new Error('403'))
    );

    const result = await lastValueFrom(service.load(1));

    expect(result.print.id).toBe(1);
    expect(result.user).toBeNull();
  });

  // The view route has no resolver any more, so an error here would strand the
  // page on its skeleton forever rather than bouncing the visitor home — a
  // different symptom of the same #66 defect, and a worse one.
  it('degrades to a null print when the print request 404s', async () => {
    printService.getPrintDetail.and.returnValue(
      throwError(() => ({ status: 404 }))
    );

    const result = await lastValueFrom(service.load(1));

    expect(result.print).toBeNull();
    expect(result.user).toBeNull();
    expect(loggingService.logException).not.toHaveBeenCalled();
  });

  it('degrades and logs when the print request fails unexpectedly', async () => {
    printService.getPrintDetail.and.returnValue(
      throwError(() => ({ status: 500 }))
    );

    const result = await lastValueFrom(service.load(1));

    // The page still renders its empty state — but the cause is reported
    // rather than silently read as "this print does not exist".
    expect(result.print).toBeNull();
    expect(loggingService.logException).toHaveBeenCalled();
  });

  it('never emits an error, whatever the failure', async () => {
    printService.getPrintDetail.and.returnValue(
      throwError(() => new TypeError('network down'))
    );

    await expectAsync(lastValueFrom(service.load(1))).toBeResolved();
  });
});
