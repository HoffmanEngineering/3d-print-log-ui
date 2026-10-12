import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
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

xdescribe('PrintShareDialogComponent', () => {
  let component: PrintShareDialogComponent;
  let fixture: ComponentFixture<PrintShareDialogComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [PrintShareDialogComponent],
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintShareDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// #263: changing who can see a print must not PUT back the whole print the dialog loaded, which
// would revert anything a connector recorded while the dialog was open.
describe('PrintShareDialogComponent sharing', () => {
  let printService: jasmine.SpyObj<PrintService>;

  const print = {
    id: 5,
    title: 'Benchy',
    status: PrintStatus.Printing,
    viewStatus: PrintViewStatus.Private,
  } as PrintDetail;

  beforeEach(() => {
    printService = jasmine.createSpyObj<PrintService>('PrintService', {
      getPrintDetail: of(print),
      patchPrint: of(print),
    });

    TestBed.configureTestingModule({
      declarations: [PrintShareDialogComponent],
      providers: [
        { provide: PrintService, useValue: printService },
        { provide: MatDialogRef, useValue: { close: () => undefined } },
        { provide: MAT_DIALOG_DATA, useValue: { printId: 5 } },
        { provide: Clipboard, useValue: { copy: () => true } },
        { provide: ToastrService, useValue: { success: () => undefined } },
        {
          provide: NavigatorShareService,
          useValue: { canShare: () => false },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
  });

  it('changes only the view status', () => {
    const component = TestBed.createComponent(
      PrintShareDialogComponent
    ).componentInstance;
    component.ngOnInit();

    component.updatePrint(PrintViewStatus.Public);

    expect(printService.patchPrint).toHaveBeenCalledOnceWith(5, {
      viewStatus: PrintViewStatus.Public,
    });
    expect(component.print.viewStatus).toBe(PrintViewStatus.Public);
  });
});
