import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintViewStatus,
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
      'bulkUpdatePrints',
      'bulkDeletePrints',
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

  function makePrints(count: number): PrintSummary[] {
    return Array.from({ length: count }, (_, i) => makePrint(i + 1));
  }

  describe('setStatusForSelected', () => {
    it('sends one request per 25-id chunk', async () => {
      const prints = makePrints(60);
      printService.bulkUpdatePrints.and.callFake((request) =>
        of({ succeeded: request.printIds, failed: [] })
      );
      service.toggleSelectAllOnPage(prints);

      const result = await service.setStatusForSelected(PrintStatus.Success);

      expect(printService.bulkUpdatePrints).toHaveBeenCalledTimes(3);
      const sizes = printService.bulkUpdatePrints.calls
        .allArgs()
        .map(([request]) => request.printIds.length);
      expect(sizes).toEqual([25, 25, 10]);
      expect(printService.bulkUpdatePrints.calls.first().args[0].status).toBe(
        PrintStatus.Success
      );
      expect(result.succeededIds.length).toBe(60);
      expect(result.failedIds).toEqual([]);
    });

    // The off-by-one that matters: 25 must be one request, not two.
    [
      { count: 24, expected: [24] },
      { count: 25, expected: [25] },
      { count: 26, expected: [25, 1] },
    ].forEach(({ count, expected }) => {
      it(`splits ${count} ids into chunks of ${expected.join(' + ')}`, async () => {
        printService.bulkUpdatePrints.and.callFake((request) =>
          of({ succeeded: request.printIds, failed: [] })
        );
        service.toggleSelectAllOnPage(makePrints(count));

        await service.setStatusForSelected(PrintStatus.Success);

        const batches = printService.bulkUpdatePrints.calls
          .allArgs()
          .map(([request]) => request.printIds);
        expect(batches.map((ids) => ids.length)).toEqual(expected);

        // Sizes alone would pass with the ids shuffled, duplicated across
        // chunks, or dropped. Every id must appear exactly once, in order.
        const allIds = ([] as number[]).concat(...batches);
        expect(allIds).toEqual(Array.from({ length: count }, (_, i) => i + 1));
      });
    });

    it('sends a single request when the selection fits one chunk', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1, 2], failed: [] })
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      await service.setStatusForSelected(PrintStatus.Success);

      expect(printService.bulkUpdatePrints).toHaveBeenCalledTimes(1);
      expect(printService.bulkUpdatePrints).toHaveBeenCalledWith({
        printIds: [1, 2],
        status: PrintStatus.Success,
      });
    });

    it('clears the selection when everything succeeds', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1, 2], failed: [] })
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      await service.setStatusForSelected(PrintStatus.Success);

      expect(service.hasSelection()).toBeFalse();
    });

    it('reports per-id failures from the response and keeps them selected', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1], failed: [{ id: 2, reason: 'Forbidden' }] })
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const result = await service.setStatusForSelected(PrintStatus.Success);

      expect(result.succeededIds).toEqual([1]);
      expect(result.failedIds).toEqual([2]);
      expect(result.failuresRetained).toBeTrue();
      expect(service.isSelected(2)).toBeTrue();
      expect(service.isSelected(1)).toBeFalse();
    });

    it('fails only the chunk that errored and keeps going', async () => {
      const prints = makePrints(30);
      let call = 0;
      printService.bulkUpdatePrints.and.callFake((request) => {
        call++;
        return call === 1
          ? throwError(() => new HttpErrorResponse({ status: 500 }))
          : of({ succeeded: request.printIds, failed: [] });
      });
      service.toggleSelectAllOnPage(prints);

      const result = await service.setStatusForSelected(PrintStatus.Success);

      expect(printService.bulkUpdatePrints).toHaveBeenCalledTimes(2);
      expect(result.failedIds.length).toBe(25);
      expect(result.succeededIds.length).toBe(5);
    });

    it('stops sending after a 400 and keeps completed chunks intact', async () => {
      const prints = makePrints(75);
      let call = 0;
      printService.bulkUpdatePrints.and.callFake((request) => {
        call++;
        return call === 2
          ? throwError(
              () =>
                new HttpErrorResponse({
                  status: 400,
                  error: { detail: 'Project not found.' },
                })
            )
          : of({ succeeded: request.printIds, failed: [] });
      });
      service.toggleSelectAllOnPage(prints);

      const result = await service.setStatusForSelected(PrintStatus.Success);

      // Chunk one committed; chunk two failed; chunk three was never sent.
      expect(printService.bulkUpdatePrints).toHaveBeenCalledTimes(2);
      expect(result.succeededIds.length).toBe(25);
      expect(result.failedIds.length).toBe(50);
      expect(result.errorMessage).toBe('Project not found.');
    });

    it('leaves the selection alone when the user clears it mid-batch, and says so', async () => {
      printService.bulkUpdatePrints.and.callFake((request) => {
        // The user changes the result set (which clears the selection) while
        // the batch is still running.
        service.clearSelection();
        return of({
          succeeded: [],
          failed: request.printIds.map((id) => ({ id, reason: 'Forbidden' })),
        });
      });
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const result = await service.setStatusForSelected(PrintStatus.Success);

      // The batch still finished from its own snapshot...
      expect(result.failedIds).toEqual([printOne.id, printTwo.id]);
      // ...but the user's clear wins, and the caller is told not to promise a retry.
      expect(result.failuresRetained).toBeFalse();
      expect(service.hasSelection()).toBeFalse();
    });

    it('never swallows an error - each failed request is logged', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 500 }))
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      await service.setStatusForSelected(PrintStatus.Failed);

      expect(logger.logException).toHaveBeenCalledTimes(1);
    });

    it('logs the outcome with counts', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1], failed: [{ id: 2, reason: 'NotFound' }] })
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      await service.setStatusForSelected(PrintStatus.Success);

      expect(logger.logEvent).toHaveBeenCalledWith(
        'PrintBulkActionBar_SetStatusCompleted',
        { attempted: 2, succeeded: 1, failed: 1 }
      );
    });

    it('reports determinate progress and stops running when finished', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1, 2], failed: [] })
      );
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

      expect(printService.bulkUpdatePrints).not.toHaveBeenCalled();
      expect(result).toEqual({
        succeededIds: [],
        failedIds: [],
        failuresRetained: false,
        errorMessage: null,
      });
    });
  });

  it('sends the same project id in every chunk', async () => {
    // The dialog creates the project once and hands over an id, so a 60-print
    // assignment must reuse that one id rather than creating anything per chunk.
    printService.bulkUpdatePrints.and.callFake((request) =>
      of({ succeeded: request.printIds, failed: [] })
    );
    service.toggleSelectAllOnPage(makePrints(60));

    await service.setProjectForSelected('one-project-id');

    const projectIds = printService.bulkUpdatePrints.calls
      .allArgs()
      .map(([request]) => request.projectId);
    expect(projectIds).toEqual([
      'one-project-id',
      'one-project-id',
      'one-project-id',
    ]);
  });

  it('treats an id the response never mentions as failed', async () => {
    // A truncated or version-skewed body must not quietly deselect a print
    // that may not have been changed at all.
    printService.bulkUpdatePrints.and.returnValue(
      of({ succeeded: [1], failed: [] })
    );
    service.toggleSelectAllOnPage([printOne, printTwo]);

    const result = await service.setStatusForSelected(PrintStatus.Success);

    expect(result.succeededIds).toEqual([1]);
    expect(result.failedIds).toEqual([2]);
    expect(service.isSelected(2)).toBeTrue();
  });

  describe('setProjectForSelected', () => {
    it('sends the project id', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1], failed: [] })
      );
      service.toggleSelection(printOne);

      await service.setProjectForSelected('a-project-id');

      expect(printService.bulkUpdatePrints).toHaveBeenCalledWith({
        printIds: [1],
        projectId: 'a-project-id',
      });
    });
  });

  describe('removeProjectFromSelected', () => {
    it('sends the clear list', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1], failed: [] })
      );
      service.toggleSelection(printOne);

      await service.removeProjectFromSelected();

      expect(printService.bulkUpdatePrints).toHaveBeenCalledWith({
        printIds: [1],
        clear: ['projectId'],
      });
    });

    it('logs its own event, not the assignment one', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1], failed: [] })
      );
      service.toggleSelection(printOne);

      await service.removeProjectFromSelected();

      expect(logger.logEvent).toHaveBeenCalledWith(
        'PrintBulkActionBar_RemoveProjectCompleted',
        jasmine.anything()
      );
    });
  });

  describe('the remaining field actions', () => {
    beforeEach(() => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [1], failed: [] })
      );
      service.toggleSelection(printOne);
    });

    it('sets visibility', async () => {
      await service.setViewStatusForSelected(PrintViewStatus.Public);

      expect(printService.bulkUpdatePrints).toHaveBeenCalledWith({
        printIds: [1],
        viewStatus: PrintViewStatus.Public,
      });
    });

    it('reassigns the printer', async () => {
      await service.setPrinterForSelected(7);

      expect(printService.bulkUpdatePrints).toHaveBeenCalledWith({
        printIds: [1],
        printerId: 7,
      });
    });

    it('sets only the permission that was passed', async () => {
      await service.setPermissionsForSelected({ allowFileDownloads: false });

      expect(printService.bulkUpdatePrints).toHaveBeenCalledWith({
        printIds: [1],
        allowFileDownloads: false,
      });
    });
  });

  describe('deleteSelected', () => {
    it('posts the ids to the bulk delete endpoint', async () => {
      printService.bulkDeletePrints.and.returnValue(
        of({ succeeded: [1, 2], failed: [] })
      );
      service.toggleSelectAllOnPage([printOne, printTwo]);

      const result = await service.deleteSelected();

      expect(printService.bulkDeletePrints).toHaveBeenCalledWith([1, 2]);
      expect(result.succeededIds).toEqual([1, 2]);
    });

    it('keeps refused deletions selected and logs the outcome', async () => {
      printService.bulkDeletePrints.and.returnValue(
        of({ succeeded: [2], failed: [{ id: 1, reason: 'Forbidden' }] })
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
