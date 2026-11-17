import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  PrinterService,
  PrinterSummarySimple,
} from '../services/printer.service';
import { PagedList } from '../types/paging';
import { currentUserPrinterSummariesResolver } from './current-user-printer-summaries.resolver';
import { resolveValue } from './testing/run-resolver';

describe('currentUserPrinterSummariesResolver', () => {
  it("resolves the first hundred of the user's active printers", async () => {
    const printers = [{ id: 1 }, { id: 2 }] as PrinterSummarySimple[];
    const printerService = {
      getCurrentUserPrinterSummaries: vi
        .fn()
        .mockName('PrinterService.getCurrentUserPrinterSummaries'),
    };
    printerService.getCurrentUserPrinterSummaries.mockReturnValue(
      of({ items: printers } as PagedList<PrinterSummarySimple>)
    );
    TestBed.configureTestingModule({
      providers: [{ provide: PrinterService, useValue: printerService }],
    });

    await expect(
      resolveValue(currentUserPrinterSummariesResolver)
    ).resolves.toEqual(printers);
    expect(printerService.getCurrentUserPrinterSummaries).toHaveBeenCalledTimes(
      1
    );
    expect(printerService.getCurrentUserPrinterSummaries).toHaveBeenCalledWith(
      1,
      100,
      undefined,
      false
    );
  });
});
