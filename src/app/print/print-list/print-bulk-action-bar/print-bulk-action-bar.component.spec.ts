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
  PrintViewStatus,
} from 'src/app/core/services/print.service';
import { PrinterSummary } from 'src/app/core/services/printer.service';
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
      'bulkUpdatePrints',
      'bulkDeletePrints',
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
    // The chip stays short on screen; the cross-page scope is spelled out for
    // screen readers instead of widening the toolbar.
    const chip = bar.querySelector('[data-cy-bulk-selection-count]');
    expect(chip.querySelector('[aria-hidden="true"]').textContent).toContain(
      '2 selected'
    );
    expect(
      chip.querySelector('.visually-hidden').textContent.replace(/\s+/g, ' ')
    ).toContain('2 prints selected across all pages');
  });

  it('carries the count into the actions trigger and the open menu', () => {
    bulkActions.toggleSelectAllOnPage([printOne, printTwo]);
    fixture.detectChanges();

    // A bare "Delete" next to the table reads as a global action; the count is
    // what ties the actions to the selection. It has to be readable before the
    // menu opens and again while the choice is being made, because the open
    // menu covers the trigger that carried it.
    const trigger = fixture.nativeElement.querySelector(
      '[data-cy-bulk-actions]'
    );
    expect(trigger.textContent).toContain('Actions (2)');

    trigger.click();
    fixture.detectChanges();

    const menu = document.querySelector('.mat-mdc-menu-panel')!;
    expect(menu.querySelector('.bulk-menu__header')!.textContent).toContain(
      '2 selected'
    );
    expect(
      menu.querySelector('[data-cy-bulk-delete]')!.getAttribute('aria-label')
    ).toBe('Delete 2 selected prints');
    expect(
      menu
        .querySelector('[data-cy-bulk-set-status]')!
        .getAttribute('aria-label')
    ).toBe('Set status of 2 selected prints');
  });

  it('keeps the strip in the layout while nothing is selected', () => {
    fixture.detectChanges();

    // The placeholder is what stops the table from moving when a selection
    // appears, so it has to survive an empty selection.
    expect(fixture.nativeElement.querySelector('.bulk-bar')).not.toBeNull();
  });

  describe('set status', () => {
    it('updates every selected print and reports success', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [printOne.id, printTwo.id], failed: [] })
      );
      bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

      await component.setStatus(successStatusOption());

      expect(printService.bulkUpdatePrints).toHaveBeenCalledTimes(1);
      expect(toastr.success).toHaveBeenCalled();
      expect(toastr.error).not.toHaveBeenCalled();
      expect(component.resultMessage()).toBe('2 prints updated.');
    });

    it('reports a partial failure and says the failures stay selected', async () => {
      printService.bulkUpdatePrints.and.returnValue(
        of({
          succeeded: [printOne.id],
          failed: [{ id: printTwo.id, reason: 'Forbidden' }],
        })
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
      printService.bulkUpdatePrints.and.returnValue(
        of({ succeeded: [printOne.id], failed: [] })
      );
      bulkActions.toggleSelection(printOne);

      let emitted: BulkActionResult | null = null;
      component.batchCompleted.subscribe((r) => (emitted = r));

      await component.setStatus(successStatusOption());

      expect(emitted).toEqual({
        succeededIds: [printOne.id],
        failedIds: [],
        failuresRetained: false,
        errorMessage: null,
      });
    });
  });

  describe('delete', () => {
    it('confirms with a dialog naming the count before deleting', async () => {
      printService.bulkDeletePrints.and.returnValue(
        of({ succeeded: [printOne.id, printTwo.id], failed: [] })
      );
      bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

      await component.deleteSelected();

      expect(dialog.open).toHaveBeenCalled();
      expect(dialogRef.componentInstance['title']).toBe('Delete?');
      expect(dialogRef.componentInstance['body']).toContain('2 prints');
      expect(dialogRef.componentInstance['yesText']).toBe('Delete');
      expect(printService.bulkDeletePrints).toHaveBeenCalledWith([
        printOne.id,
        printTwo.id,
      ]);
    });

    it('uses the singular noun for a single print', async () => {
      printService.bulkDeletePrints.and.returnValue(
        of({ succeeded: [printOne.id], failed: [] })
      );
      bulkActions.toggleSelection(printOne);

      await component.deleteSelected();

      expect(dialogRef.componentInstance['body']).toContain('1 print?');
    });

    it('deletes nothing when the dialog is dismissed', async () => {
      dialogRef.afterClosed.and.returnValue(of(false));
      bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

      await component.deleteSelected();

      expect(printService.bulkDeletePrints).not.toHaveBeenCalled();
      expect(bulkActions.selectedCount()).toBe(2);
    });
  });

  it('clears the selection', () => {
    bulkActions.toggleSelectAllOnPage([printOne, printTwo]);

    component.clearSelection();

    expect(bulkActions.hasSelection()).toBeFalse();
  });

  describe('the new field actions', () => {
    /**
     * Selects a print and stubs the batch method under test. The TestBed provides the
     * REAL PrintBulkActionsService, so its methods are ordinary functions, not spies -
     * and every action returns immediately when nothing is selected, so a test that
     * forgets the selection asserts nothing.
     */
    function selectAndStub(method: keyof PrintBulkActionsService): jasmine.Spy {
      bulkActions.toggleSelection(printOne);
      fixture.detectChanges();
      return spyOn(bulkActions, method as never).and.resolveTo({
        succeededIds: [printOne.id],
        failedIds: [],
        failuresRetained: false,
        errorMessage: null,
      } as never);
    }

    it('opens the project dialog and assigns the chosen project', async () => {
      const setProject = selectAndStub('setProjectForSelected');
      dialogRef.afterClosed.and.returnValue(
        of({ projectId: 'chosen-id', projectName: 'Benchies', created: false })
      );

      await component.addToProject();

      expect(setProject).toHaveBeenCalledWith('chosen-id');
    });

    it('removes the project when the dialog asks for it', async () => {
      const removeProject = selectAndStub('removeProjectFromSelected');
      dialogRef.afterClosed.and.returnValue(of({ remove: true }));

      await component.addToProject();

      expect(removeProject).toHaveBeenCalled();
    });

    it('does nothing when the project dialog is cancelled', async () => {
      const setProject = selectAndStub('setProjectForSelected');
      dialogRef.afterClosed.and.returnValue(of(undefined));

      await component.addToProject();

      expect(setProject).not.toHaveBeenCalled();
    });

    it('names the newly created project when the assignment fails', async () => {
      bulkActions.toggleSelection(printOne);
      fixture.detectChanges();
      spyOn(bulkActions, 'setProjectForSelected').and.resolveTo({
        succeededIds: [],
        failedIds: [printOne.id],
        failuresRetained: true,
        errorMessage: null,
      });
      dialogRef.afterClosed.and.returnValue(
        of({ projectId: 'created-id', projectName: 'New Batch', created: true })
      );

      await component.addToProject();

      // The project survives a failed assignment, so the message has to name it -
      // otherwise the retry creates a second project with the same name.
      expect(component.resultMessage()).toContain('New Batch');
    });

    it('sets visibility from the overflow menu', async () => {
      const setViewStatus = selectAndStub('setViewStatusForSelected');

      await component.setVisibility(component.visibilityOptions[0]);

      expect(setViewStatus).toHaveBeenCalledWith(PrintViewStatus.Public);
    });

    it('reassigns the printer from the overflow menu', async () => {
      const setPrinter = selectAndStub('setPrinterForSelected');

      await component.setPrinter({ id: 7, name: 'Ender 3' } as PrinterSummary);

      expect(setPrinter).toHaveBeenCalledWith(7);
    });

    it('sets permissions from the overflow menu', async () => {
      const setPermissions = selectAndStub('setPermissionsForSelected');

      await component.setPermission({ allowComments: true });

      expect(setPermissions).toHaveBeenCalledWith({ allowComments: true });
    });

    it('does nothing when nothing is selected', async () => {
      const setProject = spyOn(
        bulkActions,
        'setProjectForSelected'
      ).and.resolveTo({
        succeededIds: [],
        failedIds: [],
        failuresRetained: false,
        errorMessage: null,
      });

      await component.addToProject();

      expect(dialog.open).not.toHaveBeenCalled();
      expect(setProject).not.toHaveBeenCalled();
    });
  });

  describe('select all on this page', () => {
    it('adds the whole page to the selection', () => {
      fixture.componentRef.setInput('pagePrints', [printOne, printTwo]);
      bulkActions.toggleSelection(printOne);
      fixture.detectChanges();

      component.selectAllOnPage();

      expect(bulkActions.selectedCount()).toBe(2);
    });

    // No page, nothing to select - and an empty menu item is worse than no item.
    it('is not offered when the page is empty', () => {
      bulkActions.toggleSelection(printOne);
      fixture.detectChanges();

      const menu = fixture.nativeElement.querySelector(
        '[data-cy-bulk-select-all-page]'
      );
      expect(menu).toBeNull();
    });
  });
});
