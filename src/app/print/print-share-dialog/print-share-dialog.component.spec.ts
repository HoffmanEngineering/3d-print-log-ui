import type { MockedObject } from 'vitest';
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
  let printService: MockedObject<PrintService>;
  let dialogRef: MockedObject<MatDialogRef<PrintShareDialogComponent>>;
  let clipboard: MockedObject<Clipboard>;
  let toastr: MockedObject<ToastrService>;
  let navigatorShare: MockedObject<NavigatorShareService>;

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
    printService = {
      getPrintDetail: vi
        .fn()
        .mockName('PrintService.getPrintDetail')
        .mockReturnValue(of(print)),
      patchPrint: vi
        .fn()
        .mockName('PrintService.patchPrint')
        .mockReturnValue(of(print)),
    } as unknown as MockedObject<PrintService>;
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close'),
    } as unknown as MockedObject<MatDialogRef<PrintShareDialogComponent, any>>;
    clipboard = {
      copy: vi.fn().mockName('Clipboard.copy'),
    } as unknown as MockedObject<Clipboard>;
    toastr = {
      success: vi.fn().mockName('ToastrService.success'),
    } as unknown as MockedObject<ToastrService>;
    navigatorShare = {
      canShare: vi.fn().mockName('NavigatorShareService.canShare'),
      share: vi.fn().mockName('NavigatorShareService.share'),
    } as unknown as MockedObject<NavigatorShareService>;

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

    expect(printService.getPrintDetail).toHaveBeenCalledTimes(1);

    expect(printService.getPrintDetail).toHaveBeenCalledWith(5);
    expect(component.printLink()).toBe(`${location.origin}/prints/5`);
  });

  // #263: changing who can see a print must not PUT back the whole print the dialog loaded,
  // which would revert anything a connector recorded while the dialog was open.
  it('changes only the view status', () => {
    const component = openDialog();

    component.updatePrint(PrintViewStatus.Public);

    expect(printService.patchPrint).toHaveBeenCalledTimes(1);

    expect(printService.patchPrint).toHaveBeenCalledWith(5, {
      viewStatus: PrintViewStatus.Public,
    });
    expect(component.print()!.viewStatus).toBe(PrintViewStatus.Public);
  });

  it('copies the link, confirms it and closes', () => {
    const component = openDialog();

    component.copyToClipboard();

    expect(clipboard.copy).toHaveBeenCalledTimes(1);

    expect(clipboard.copy).toHaveBeenCalledWith(`${location.origin}/prints/5`);
    expect(toastr.success).toHaveBeenCalled();
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('hands the print to the native share sheet and closes once shared', async () => {
    navigatorShare.canShare.mockReturnValue(true);
    navigatorShare.share.mockResolvedValue(undefined);
    const component = openDialog();

    component.share();
    await Promise.resolve();

    expect(navigatorShare.share).toHaveBeenCalledTimes(1);

    expect(navigatorShare.share).toHaveBeenCalledWith({
      title: 'Benchy | 3D Print Log',
      url: 'https://www.3dprintlog.com/prints/5',
    });
    expect(dialogRef.close).toHaveBeenCalled();
  });

  it('stays open when the user cancels the share sheet', async () => {
    navigatorShare.canShare.mockReturnValue(true);
    navigatorShare.share.mockRejectedValue(new DOMException('', 'AbortError'));
    const component = openDialog();

    component.share();
    await Promise.resolve();
    await Promise.resolve();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });

  it('does nothing when the browser cannot share', () => {
    navigatorShare.canShare.mockReturnValue(false);
    const component = openDialog();

    component.share();

    expect(navigatorShare.share).not.toHaveBeenCalled();
  });
});
