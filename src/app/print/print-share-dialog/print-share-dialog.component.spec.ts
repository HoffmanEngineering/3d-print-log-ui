import { TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Clipboard } from '@angular/cdk/clipboard';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';

import { PrintShareDialogComponent } from './print-share-dialog.component';
import {
  PrintDetail,
  PrintService,
  PrintStatus,
  PrintViewStatus,
} from 'src/app/core/services/print.service';
import { NavigatorShareService } from 'src/app/core/services/navigator-share.service';

describe('PrintShareDialogComponent sharing', () => {
  let printService: jasmine.SpyObj<PrintService>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<PrintShareDialogComponent>>;
  let clipboard: jasmine.SpyObj<Clipboard>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let navigatorShare: jasmine.SpyObj<NavigatorShareService>;

  const print = {
    id: 5,
    title: 'Benchy',
    status: PrintStatus.Printing,
    viewStatus: PrintViewStatus.Private,
  } as PrintDetail;

  const openDialog = () => {
    const component = TestBed.createComponent(
      PrintShareDialogComponent
    ).componentInstance;
    component.ngOnInit();
    return component;
  };

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', {
      getPrintDetail: of(print),
      patchPrint: of(print),
    });
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    clipboard = jasmine.createSpyObj<Clipboard>('Clipboard', ['copy']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success']);
    navigatorShare = jasmine.createSpyObj<NavigatorShareService>(
      'NavigatorShareService',
      ['canShare', 'share']
    );

    TestBed.configureTestingModule({
      imports: [PrintShareDialogComponent],
      providers: [
        { provide: PrintService, useValue: printService },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { printId: 5 } },
        { provide: Clipboard, useValue: clipboard },
        { provide: ToastrService, useValue: toastr },
        { provide: NavigatorShareService, useValue: navigatorShare },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('links to the print on the current origin', () => {
    const component = openDialog();

    expect(printService.getPrintDetail).toHaveBeenCalledOnceWith(5);
    expect(component.printLink()).toBe(`${location.origin}/prints/5`);
  });

  // #263: changing who can see a print must not PUT back the whole print the dialog loaded,
  // which would revert anything a connector recorded while the dialog was open.
  it('changes only the view status', () => {
    const component = openDialog();

    component.updatePrint(PrintViewStatus.Public);

    expect(printService.patchPrint).toHaveBeenCalledOnceWith(5, {
      viewStatus: PrintViewStatus.Public,
    });
    expect(component.print()!.viewStatus).toBe(PrintViewStatus.Public);
  });

  it('copies the link, confirms it and closes', () => {
    const component = openDialog();

    component.copyToClipboard();

    expect(clipboard.copy).toHaveBeenCalledOnceWith(
      `${location.origin}/prints/5`
    );
    expect(toastr.success).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('hands the print to the native share sheet and closes once shared', async () => {
    navigatorShare.canShare.and.returnValue(true);
    navigatorShare.share.and.resolveTo();
    const component = openDialog();

    component.share();
    await Promise.resolve();

    expect(navigatorShare.share).toHaveBeenCalledOnceWith({
      title: 'Benchy | 3D Print Log',
      url: 'https://www.3dprintlog.com/prints/5',
    });
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('stays open when the user cancels the share sheet', async () => {
    navigatorShare.canShare.and.returnValue(true);
    navigatorShare.share.and.rejectWith(new DOMException('', 'AbortError'));
    const component = openDialog();

    component.share();
    await Promise.resolve();
    await Promise.resolve();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('does nothing when the browser cannot share', () => {
    navigatorShare.canShare.and.returnValue(false);
    const component = openDialog();

    component.share();

    expect(navigatorShare.share).not.toHaveBeenCalled();
  });
});
