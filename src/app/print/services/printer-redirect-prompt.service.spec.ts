import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import {
  PrinterService,
  PrinterSummarySimple,
} from 'src/app/core/services/printer.service';
import { PagedList } from 'src/app/core/types/paging';

import { PrinterRedirectPromptService } from './printer-redirect-prompt.service';

describe('PrinterRedirectPromptService', () => {
  let printerService: jasmine.SpyObj<PrinterService>;
  let service: PrinterRedirectPromptService;

  const withActivePrinters = (totalCount: number) =>
    printerService.getCurrentUserPrinterSummaries.and.returnValue(
      of({
        items: [],
        paging: { totalCount },
      } as unknown as PagedList<PrinterSummarySimple>)
    );

  beforeEach(() => {
    printerService = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'getCurrentUserPrinterSummaries',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: PrinterService, useValue: printerService }],
    });
    service = TestBed.inject(PrinterRedirectPromptService);
  });

  it('prompts a user with no active printers', async () => {
    withActivePrinters(0);

    await expectAsync(
      firstValueFrom(service.shouldShowAddPrinterPrompt())
    ).toBeResolvedTo(true);
    expect(
      printerService.getCurrentUserPrinterSummaries
    ).toHaveBeenCalledOnceWith(1, 100, undefined, false);
  });

  it('does not prompt a user with an active printer', async () => {
    withActivePrinters(2);

    await expectAsync(
      firstValueFrom(service.shouldShowAddPrinterPrompt())
    ).toBeResolvedTo(false);
  });

  // The prints list reads this answer as "has no printers" on every visit, so
  // it must not go quiet after the first call.
  it('answers from the printer count every time it is asked', async () => {
    withActivePrinters(0);
    await firstValueFrom(service.shouldShowAddPrinterPrompt());

    await expectAsync(
      firstValueFrom(service.shouldShowAddPrinterPrompt())
    ).toBeResolvedTo(true);
  });
});
