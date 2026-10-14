import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import {
  PrinterDetail,
  PrinterService,
} from 'src/app/core/services/printer.service';
import {
  resolveValue,
  routeSnapshot,
  runResolver,
} from 'src/app/core/resolvers/testing/run-resolver';
import { printerDetailResolver } from './printer-detail.resolver';
import { printerListResolver } from './printer-list.resolver';

describe('printer resolvers', () => {
  let printerService: jasmine.SpyObj<PrinterService>;

  beforeEach(() => {
    localStorage.removeItem('printer_list_page_size');
    printerService = jasmine.createSpyObj<PrinterService>('PrinterService', [
      'getPrinterDetail',
      'getCurrentUserPrinterSummaries',
    ]);
    TestBed.configureTestingModule({
      providers: [{ provide: PrinterService, useValue: printerService }],
    });
  });

  afterEach(() => localStorage.removeItem('printer_list_page_size'));

  describe('printerDetailResolver', () => {
    it('resolves the printer named by the id param', async () => {
      const printer = { id: 3 } as PrinterDetail;
      printerService.getPrinterDetail.and.returnValue(of(printer));

      await expectAsync(
        resolveValue(
          printerDetailResolver,
          routeSnapshot({ params: { id: '3' } })
        )
      ).toBeResolvedTo(printer);
      expect(printerService.getPrinterDetail).toHaveBeenCalledOnceWith(3);
    });

    it('returns null when the id is not a number', () => {
      expect(
        runResolver(
          printerDetailResolver,
          routeSnapshot({ params: { id: 'new' } })
        )
      ).toBeNull();
      expect(printerService.getPrinterDetail).not.toHaveBeenCalled();
    });
  });

  describe('printerListResolver', () => {
    it('requests the first page of ten by default', () => {
      runResolver(printerListResolver);

      expect(
        printerService.getCurrentUserPrinterSummaries
      ).toHaveBeenCalledOnceWith(1, 10);
    });

    it('uses the page size saved by the list', () => {
      localStorage.setItem('printer_list_page_size', '50');

      runResolver(printerListResolver);

      expect(
        printerService.getCurrentUserPrinterSummaries
      ).toHaveBeenCalledOnceWith(1, 50);
    });
  });
});
