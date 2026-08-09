import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { of, throwError } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
} from 'src/app/core/services/print.service';
import {
  BulkActionResult,
  PrintBulkActionsService,
} from '../../services/print-bulk-actions.service';
import { PrintBulkActionBarComponent } from './print-bulk-action-bar.component';

function makePrint(id: number, title = `Print ${id}`): PrintSummary {
  return { id, title } as PrintSummary;
}

describe('PrintBulkActionBarComponent', () => {
  let fixture: ComponentFixture<PrintBulkActionBarComponent>;
  let component: PrintBulkActionBarComponent;
  let bulkActions: PrintBulkActionsService;
  let printService: jasmine.SpyObj<PrintService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let dialogRef: {
    componentInstance: Record<string, unknown>;
    afterClosed: jasmine.Spy;
  };

  const printOne = makePrint(1, 'Benchy');
  const printTwo = makePrint(2, 'Calibration Cube');

  const successStatusOption = () =>
    component.statusOptions.find((o) => o.status === PrintStatus.Success)!;

  beforeEach(async () => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', [
      'updatePrintStatus',
      'deletePrint',
    ]);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'success',
      'error',
    ]);
    dialogRef = {
      componentInstance: {},
      afterClosed: jasmine.createSpy('afterClosed').and.returnValue(of(true)),
    };
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(dialogRef as any);

    await TestBed.configureTestingModule({
      imports: [PrintBulkActionBarComponent, NoopAnimationsModule],
      providers: [
        PrintBulkActionsService,
        { provide: PrintService, useValue: printService },
        { provide: ToastrService, useValue: toastr },
        { provide: MatDialog, useValue: dialog },
        {
          provide: LoggingService,
          useValue: jasmine.createSpyObj<LoggingService>('LoggingService', [
            'logEvent',
            'logException',
          ]),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrintBulkActionBarComponent);
    component = fixture.componentInstance;
    bulkActions = TestBed.inject(PrintBulkActionsService);
  });

  it('stays hidden while nothing is selected', () => {
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[data-cy-bulk-action-bar]')
    ).toBeNull();
  });

  it('shows the selection count once prints are selected', () => {
    bulkActions.toggleSelectAllOnPage([printOne, printTwo]);
    fixture.detectChanges();

    const bar = fixture.nativeElement.querySelector(
      '[data-cy-bulk-action-bar]'
    );
    expect(bar).not.toBeNull();
    expect(
      bar.querySelector('[data-cy-bulk-selection-count]').textContent
    ).toContain('2 selected on this page');
  });

  describe('set status', () => {
    it('updates every selected print and reports success', async () => {
      printService.updatePrintStatus.and.returnValue(of({}));
      bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

      await component.setStatus(successStatusOption());

      expect(printService.updatePrintStatus).toHaveBeenCalledTimes(2);
      expect(toastr.success).toHaveBeenCalled();
      expect(toastr.error).not.toHaveBeenCalled();
      expect(component.resultMessage()).toBe('2 prints updated.');
    });

    it('reports a partial failure and says the failures stay selected', async () => {
      printService.updatePrintStatus.and.callFake((id: number) =>
        id === printTwo.id
          ? throwError(() => new Error('boom'))
          : (of({}) as any)
      );
      bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

      await component.setStatus(successStatusOption());

      expect(toastr.error).toHaveBeenCalled();
      expect(toastr.success).not.toHaveBeenCalled();
      expect(component.resultMessage()).toContain('1 updated, 1 failed');
      expect(bulkActions.isSelected(printTwo.id)).toBeTrue();
      expect(bulkActions.selectedCount()).toBe(1);
    });

    it('emits batchCompleted so the list can refresh', async () => {
      printService.updatePrintStatus.and.returnValue(of({}));
      bulkActions.toggleSelection(printOne);

      let emitted: BulkActionResult | null = null;
      component.batchCompleted.subscribe((r) => (emitted = r));

      await component.setStatus(successStatusOption());

      expect(emitted).toEqual({
        succeededIds: [printOne.id],
        failedIds: [],
        failuresRetained: false,
      });
    });
  });

  describe('delete', () => {
    it('confirms with a dialog naming the count before deleting', async () => {
      printService.deletePrint.and.returnValue(of({}));
      bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

      await component.deleteSelected();

      expect(dialog.open).toHaveBeenCalled();
      expect(dialogRef.componentInstance['title']).toBe('Delete?');
      expect(dialogRef.componentInstance['body']).toContain('2 prints');
      expect(dialogRef.componentInstance['yesText']).toBe('Delete');
      expect(printService.deletePrint).toHaveBeenCalledTimes(2);
    });

    it('uses the singular noun for a single print', async () => {
      printService.deletePrint.and.returnValue(of({}));
      bulkActions.toggleSelection(printOne);

      await component.deleteSelected();

      expect(dialogRef.componentInstance['body']).toContain('1 print?');
    });

    it('deletes nothing when the dialog is dismissed', async () => {
      dialogRef.afterClosed.and.returnValue(of(false));
      bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

      await component.deleteSelected();

      expect(printService.deletePrint).not.toHaveBeenCalled();
      expect(bulkActions.selectedCount()).toBe(2);
    });
  });

  it('clears the selection', () => {
    bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

    component.clearSelection();

    expect(bulkActions.hasSelection()).toBeFalse();
  });
});
