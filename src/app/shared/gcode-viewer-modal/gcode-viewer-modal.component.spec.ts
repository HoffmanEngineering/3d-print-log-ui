import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterService } from 'src/app/core/services/printer.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';
import { SharedModule } from '../shared.module';
import { GcodeViewerModalComponent } from './gcode-viewer-modal.component';

describe('GcodeViewerModalComponent', () => {
  let component: GcodeViewerModalComponent;
  let fixture: ComponentFixture<GcodeViewerModalComponent>;
  let dialogRef: jasmine.SpyObj<MatDialogRef<GcodeViewerModalComponent>>;
  let logging: jasmine.SpyObj<LoggingService>;

  beforeEach(async () => {
    dialogRef = jasmine.createSpyObj('MatDialogRef', ['close']);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
    ]);
    const mockUserSettingsService = jasmine.createSpyObj<UserSettingService>(
      'UserSettingService',
      { getCurrentUsersSettingByType: Promise.resolve(null) }
    );
    const mockPrinterService = jasmine.createSpyObj<PrinterService>(
      'PrinterService',
      { getPrinterDetail: of(null) }
    );

    await TestBed.configureTestingModule({
      imports: [SharedModule, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        {
          provide: MAT_DIALOG_DATA,
          useValue: { gcode: 'G28', fileName: 'raw_part.gcode' },
        },
        { provide: PrinterService, useValue: mockPrinterService },
        { provide: UserSettingService, useValue: mockUserSettingsService },
        { provide: LoggingService, useValue: logging },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GcodeViewerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and log the open', () => {
    expect(component).toBeTruthy();
    expect(logging.logEvent).toHaveBeenCalledWith('GcodeViewerModal_Opened', {
      fileSize: 3,
    });
  });

  it('derives overall progress and the active step from the two phases', () => {
    expect(component.step()).toBe('reading');
    component.onMessage({ data: { type: 'SET_LOAD_PROGRESS', progress: 50 } });
    expect(component.overallProgress()).toBe(25);
    component.onMessage({
      data: { type: 'SET_ANALYZE_PROGRESS', progress: 50 },
    });
    expect(component.step()).toBe('analyzing');
    expect(component.loadingProgress()).toBe(100);
    expect(component.overallProgress()).toBe(75);
  });

  it('maps MODEL_INFO into a print with one usage row per extruder', () => {
    component.onMessage({
      data: {
        type: 'MODEL_INFO',
        data: {
          printTime: '1234.6',
          totalFilament: 1500,
          // Real worker payload: keyed by extrusion axis letter, not tool.
          filamentByExtruder: { e: 1000, a: 0, b: 500 },
          layerCnt: 42,
          layerHeight: 0.2,
          modelSize: { x: 10, y: 20.5, z: 8.4 },
          max: { speed: 6000 },
          min: { speed: 1200 },
        },
      },
    });

    const print = dialogRef.close.calls.mostRecent().args[0];
    expect(print.estimatedPrintTimeInSeconds).toBe(1234);
    expect(print.filamentUsage.length).toBe(2);
    expect(print.filamentUsage[0].estimatedLengthInM).toBe(1);
    expect(print.filamentUsage[0].notes).toBe('Slot 1');
    expect(print.filamentUsage[1].estimatedLengthInM).toBe(0.5);
    expect(print.filamentUsage[1].notes).toBe('Slot 3');
    expect(print.title).toBe('Raw Part');
    expect(print.fileName).toBe('raw_part.gcode');
    expect(print.notes)
      .toBe(`Source: G-code toolpath analysis (slicer not recognized)
Estimated time is a floor — actual time is typically 15–40% longer.
  Layers: 42
  Layer Height: 0.20mm
  Model Size: 10.00 x 20.50 x 8.40mm
  Print Speed: 20–100 mm/s`);
    expect(component.step()).toBe('done');
  });

  it('falls back to a single row when only totalFilament is known', () => {
    component.onMessage({
      data: {
        type: 'MODEL_INFO',
        data: {
          totalFilament: 2500,
          filamentByExtruder: {},
          modelSize: { x: 1, y: 1, z: 1 },
        },
      },
    });
    const print = dialogRef.close.calls.mostRecent().args[0];
    expect(print.filamentUsage.length).toBe(1);
    expect(print.filamentUsage[0].estimatedLengthInM).toBe(2.5);
  });

  it('logs a cancel', () => {
    component.cancel();
    expect(logging.logEvent).toHaveBeenCalledWith('GcodeViewerModal_Cancelled');
    expect(dialogRef.close).toHaveBeenCalledWith(false);
  });

  it('renders a titled dialog with the file name and one progress bar', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[mat-dialog-title]')?.textContent).toContain(
      'Analyzing G-code'
    );
    expect(el.querySelector('.file-name')?.textContent).toContain(
      'raw_part.gcode'
    );
    expect(el.querySelectorAll('mat-progress-bar').length).toBe(1);
    expect(el.querySelectorAll('.step').length).toBe(3);
    expect(el.querySelector('.step.active')?.textContent).toContain(
      'Reading file'
    );
  });

  it('advances the active step', () => {
    component.onMessage({
      data: { type: 'SET_ANALYZE_PROGRESS', progress: 10 },
    });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.step.active')?.textContent).toContain(
      'Analyzing toolpath'
    );
    expect(el.querySelectorAll('.step.complete').length).toBe(1);
  });
});
