import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { PrintService } from 'src/app/core/services/print.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';
import { EditPrintDetailComponent } from './edit-print-detail.component';

import { MatMomentDateModule } from '@angular/material-moment-adapter';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';

describe('EditPrintDetailComponent', () => {
  let component: EditPrintDetailComponent;
  let fixture: ComponentFixture<EditPrintDetailComponent>;

  beforeEach(
    waitForAsync(() => {
      const mockPrintService = jasmine.createSpyObj<PrintService>(
        'PrintService',
        ['addPrint']
      );

      const mockToastrService = jasmine.createSpyObj<ToastrService>(
        'ToastrService',
        ['success', 'error']
      );

      const mockTitleService = jasmine.createSpyObj<Title>('Title', [
        'setTitle',
      ]);

      const mockUserSettingService = jasmine.createSpyObj<UserSettingService>(
        'UserSettingService',
        ['updateUserSetting']
      );

      const mockPrinterPromptService = jasmine.createSpyObj<PrinterRedirectPromptService>(
        'PrinterRedirectPromptService',
        {
          shouldShowAddPrinterPrompt: of(false),
        }
      );

      const mockLogger = jasmine.createSpyObj<LoggingService>(
        'LoggingService',
        ['logException', 'logEvent']
      );

      TestBed.configureTestingModule({
        declarations: [EditPrintDetailComponent],
        imports: [
          RouterTestingModule,
          FormsModule,
          ReactiveFormsModule,
          MatInputModule,
          MatSelectModule,
          MatDatepickerModule,
          MatMomentDateModule,
          MatCheckboxModule,
        ],
        providers: [
          { provide: PrintService, useValue: mockPrintService },
          { provide: ToastrService, useValue: mockToastrService },
          { provide: Title, useValue: mockTitleService },
          { provide: UserSettingService, useValue: mockUserSettingService },
          {
            provide: PrinterRedirectPromptService,
            useValue: mockPrinterPromptService,
          },
          { provide: LoggingService, useValue: mockLogger },
          {
            provide: ActivatedRoute,
            useValue: {
              data: of({
                printers: null,
                lastSelectedPrinterSetting: null,
                defaultPrintViewStatusSetting: null,
                print: { print: { printerId: 1, notes: '' } },
              }),
            },
          },
        ],
        schemas: [NO_ERRORS_SCHEMA],
      }).compileComponents();
    })
  );

  beforeEach(
    waitForAsync(() => {
      fixture = TestBed.createComponent(EditPrintDetailComponent);
      component = fixture.componentInstance;
      fixture.detectChanges();
    })
  );

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
