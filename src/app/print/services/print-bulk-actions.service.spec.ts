import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
} from 'src/app/core/services/print.service';
import { PrintBulkActionsService } from './print-bulk-actions.service';

function makePrint(id: number, title = `Print ${id}`): PrintSummary {
  return { id, title } as PrintSummary;
}

describe('PrintBulkActionsService', () => {
  let service: PrintBulkActionsService;
  let printService: jasmine.SpyObj<PrintService>;
  let logger: jasmine.SpyObj<LoggingService>;

  const printOne = makePrint(1, 'Benchy');
  const printTwo = makePrint(2, 'Calibration Cube');
  const printThree = makePrint(3, 'Bracket');

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'updatePrintStatus',
      'deletePrint',
    ]);
    logger = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);

    TestBed.configureTestingModule({
      providers: [
        PrintBulkActionsService,
        { provide: PrintService, useValue: printService },
        { provide: LoggingService, useValue: logger },
      ],
    });

    service = TestBed.inject(PrintBulkActionsService);
  });

  describe('selection', () => {
    it('starts empty', () => {
      expect(service.selectedCount()).toBe(0);
      expect(service.hasSelection()).toBeFalse();
      expect(service.isSelected(printOne.id)).toBeFalse();
    });

    it('toggles a print on and back off', () => {
      service.toggleSelection(printOne);
      expect(service.isSelected(printOne.id)).toBeTrue();
      expect(service.selectedCount()).toBe(1);

      service.toggleSelection(printOne);
      expect(service.isSelected(printOne.id)).toBeFalse();
      expect(service.selectedCount()).toBe(0);
    });

    it('selects every print on the page, then clears them', () => {
      const page = [printOne, printTwo, printThree];

      service.toggleSelectAllOnPage(page);
      expect(service.isAllOnPageSelected(page)).toBeTrue();
      expect(service.selectedCount()).toBe(3);

      service.toggleSelectAllOnPage(page);
      expect(service.isAllOnPageSelected(page)).toBeFalse();
      expect(service.selectedCount()).toBe(0);
    });

    it('reports an indeterminate page when only some rows are selected', () => {
      const page = [printOne, printTwo];
      service.toggleSelection(printOne);

      expect(service.isIndeterminate(page)).toBeTrue();
      expect(service.isAllOnPageSelected(page)).toBeFalse();

      service.toggleSelection(printTwo);
      expect(service.isIndeterminate(page)).toBeFalse();
    });

    it('treats an empty page as neither fully selected nor indeterminate', () => {
      expect(service.isAllOnPageSelected([])).toBeFalse();
      expect(service.isIndeterminate([])).toBeFalse();
    });

    it('leaves selections from other pages alone when selecting all on a page', () => {
      service.toggleSelection(printThree);
      service.toggleSelectAllOnPage([printOne, printTwo]);
      expect(service.selectedCount()).toBe(3);

      // Deselecting the visible page keeps the off-page selection.
      service.toggleSelectAllOnPage([printOne, printTwo]);
      expect(service.selectedCount()).toBe(1);
      expect(service.isSelected(printThree.id)).toBeTrue();
    });

    it('reports a page with none of its own rows selected as neither checked nor indeterminate', () => {
      // The header checkbox controls this page only, so it has to describe this
      // page only: an indeterminate box over rows that are all unselected reads
      // as "click to clear" while it would actually select more.
      service.toggleSelection(printThree);

      expect(service.isIndeterminate([printOne, printTwo])).toBeFalse();
      expect(service.isAllOnPageSelected([printOne, printTwo])).toBeFalse();
      expect(service.selectedCount()).toBe(1);
    });

    it('drops a single print from the selection and ignores unknown ids', () => {
      service.toggleSelectAllOnPage([printOne, printTwo]);

      service.deselect(printOne.id);
      expect(service.isSelected(printOne.id)).toBeFalse();
      expect(service.selectedCount()).toBe(1);

      service.deselect(printThree.id);
      expect(service.selectedCount()).toBe(1);
    });

    it('clears the selection', () => {
      service.toggleSelectAllOnPage([printOne, printTwo]);
      service.clearSelection();
      expect(service.hasSelection()).toBeFalse();
    });
  });

  describe('setStatusForSelected', () => {
    it('calls the single-item endpoint once per selected print', async () => {
      printService.updatePrintStatus.and.returnValue(of({}));
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const result = await service.setStatusForSelected(PrintStatus.Success);

      expect(printService.updatePrintStatus).toHaveBeenCalledTimes(2);
      expect(printService.updatePrintStatus).toHaveBeenCalledWith(
        printOne.id,
        PrintStatus.Success
      );
      expect(result.succeededIds).toEqual([printOne.id, printTwo.id]);
      expect(result.failedIds).toEqual([]);
      expect(result.failuresRetained).toBeFalse();
    });

    it('clears the selection when everything succeeds', async () => {
      printService.updatePrintStatus.and.returnValue(of({}));
      service.toggleSelectAllOnPage([printOne, printTwo]);

      await service.setStatusForSelected(PrintStatus.Success);

      expect(service.hasSelection()).toBeFalse();
    });

    it('continues the batch after a failure and keeps only the failures selected', async () => {
      printService.updatePrintStatus.and.callFake((id: number) =>
        id === printTwo.id
          ? throwError(() => new Error('boom'))
          : (of({}) as any)
      );
      service.toggleSelectAllOnPage([printOne, printTwo, printThree]);

      const result = await service.setStatusForSelected(PrintStatus.Failed);

      // The failure in the middle did not abort the batch.
      expect(printService.updatePrintStatus).toHaveBeenCalledTimes(3);
      expect(result.succeededIds).toEqual([printOne.id, printThree.id]);
      expect(result.failedIds).toEqual([printTwo.id]);
      expect(result.failuresRetained).toBeTrue();

      expect(service.selectedCount()).toBe(1);
      expect(service.isSelected(printTwo.id)).toBeTrue();
    });

    it('leaves the selection alone when the user clears it mid-batch, and says so', async () => {
      printService.updatePrintStatus.and.callFake((id: number) => {
        // The user changes the result set (which clears the selection) while
        // the batch is still running.
        service.clearSelection();
        return id === printOne.id
          ? throwError(() => new Error('boom'))
          : (of({}) as any);
      });
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const result = await service.setStatusForSelected(PrintStatus.Success);

      // The batch still finished from its own snapshot...
      expect(result.failedIds).toEqual([printOne.id]);
      // ...but the user's clear wins, and the caller is told not to promise a retry.
      expect(result.failuresRetained).toBeFalse();
      expect(service.hasSelection()).toBeFalse();
    });

    it('never swallows an error - each failure is logged', async () => {
      printService.updatePrintStatus.and.returnValue(
        throwError(() => new Error('boom'))
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      await service.setStatusForSelected(PrintStatus.Failed);

      expect(logger.logException).toHaveBeenCalledTimes(2);
    });

    it('logs the outcome with counts', async () => {
      printService.updatePrintStatus.and.callFake((id: number) =>
        id === printOne.id
          ? throwError(() => new Error('boom'))
          : (of({}) as any)
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      await service.setStatusForSelected(PrintStatus.Success);

      expect(logger.logEvent).toHaveBeenCalledWith(
        'PrintBulkActionBar_SetStatusCompleted',
        { attempted: 2, succeeded: 1, failed: 1 }
      );
    });

    it('reports determinate progress and stops running when finished', async () => {
      printService.updatePrintStatus.and.returnValue(of({}));
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const pending = service.setStatusForSelected(PrintStatus.Success);
      expect(service.isRunning()).toBeTrue();
      expect(service.totalCount()).toBe(2);

      await pending;

      expect(service.isRunning()).toBeFalse();
      expect(service.processedCount()).toBe(2);
      expect(service.progressPercent()).toBe(100);
    });

    it('does nothing when nothing is selected', async () => {
      const result = await service.setStatusForSelected(PrintStatus.Success);

      expect(printService.updatePrintStatus).not.toHaveBeenCalled();
      expect(result).toEqual({
        succeededIds: [],
        failedIds: [],
        failuresRetained: false,
      });
    });
  });

  describe('deleteSelected', () => {
    it('deletes each selected print sequentially', async () => {
      printService.deletePrint.and.returnValue(of({}));
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const result = await service.deleteSelected();

      expect(printService.deletePrint).toHaveBeenCalledTimes(2);
      expect(result.succeededIds).toEqual([printOne.id, printTwo.id]);
    });

    it('keeps failed deletions selected and logs the outcome', async () => {
      printService.deletePrint.and.callFake((id: number) =>
        id === printOne.id
          ? throwError(() => new Error('boom'))
          : (of({}) as any)
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const result = await service.deleteSelected();

      expect(result.failedIds).toEqual([printOne.id]);
      expect(service.isSelected(printOne.id)).toBeTrue();
      expect(logger.logEvent).toHaveBeenCalledWith(
        'PrintBulkActionBar_DeleteCompleted',
        { attempted: 2, succeeded: 1, failed: 1 }
      );
    });
  });
});
