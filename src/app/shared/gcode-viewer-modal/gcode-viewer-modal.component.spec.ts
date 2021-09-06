import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { of } from 'rxjs';
import { PrinterService } from 'src/app/core/services/printer.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';

import { GcodeViewerModalComponent } from './gcode-viewer-modal.component';

describe('GcodeViewerModalComponent', () => {
  let component: GcodeViewerModalComponent;
  let fixture: ComponentFixture<GcodeViewerModalComponent>;

  beforeEach(async () => {
    const mockUserSettingsService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      ['getCurrentUsersSettingByType']
    );

    const mockPrinterService = jasmine.createSpyObj<PrinterService>(
      'PrinterService',
      { getPrinterDetail: of(null) }
    );

    await TestBed.configureTestingModule({
      declarations: [GcodeViewerModalComponent],
      providers: [
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: { gcode: '', fileName: '' } },
        { provide: PrinterService, useValue: mockPrinterService },
        { provide: UserSettingService, useValue: mockUserSettingsService },
      ],
    }).compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(GcodeViewerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
