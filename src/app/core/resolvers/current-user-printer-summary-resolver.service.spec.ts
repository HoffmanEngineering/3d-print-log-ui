import { TestBed } from '@angular/core/testing';

import { PrinterService } from '../services/printer.service';
import { CurrentUserPrinterSummaryResolverService } from './current-user-printer-summary-resolver.service';

describe('CurrentUserPrinterSummaryResolverService', () => {
  beforeEach(() => {
    const mockPrinterService = jasmine.createSpyObj<PrinterService>(
      'PrinterService',
      ['getCurrentUserPrinterSummaries']
    );

    TestBed.configureTestingModule({
      providers: [{ provide: PrinterService, useValue: mockPrinterService }],
    });
  });

  it('should be created', () => {
    const service: CurrentUserPrinterSummaryResolverService = TestBed.get(
      CurrentUserPrinterSummaryResolverService
    );
    expect(service).toBeTruthy();
  });
});
