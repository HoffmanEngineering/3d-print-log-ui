import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import { PrinterService } from 'src/app/core/services/printer.service';
import { UserSettingService } from 'src/app/core/services/user-setting.service';
import { GcodeViewerModalComponent } from './gcode-viewer-modal.component';

describe('GcodeViewerModalComponent', () => {
  let component: GcodeViewerModalComponent;
  let fixture: ComponentFixture<GcodeViewerModalComponent>;
  let dialogRef: MockedObject<MatDialogRef<GcodeViewerModalComponent>>;
  let logging: MockedObject<LoggingService>;

  beforeEach(async () => {
    dialogRef = {
      close: vi.fn().mockName('MatDialogRef.close'),
    } as unknown as MockedObject<MatDialogRef<GcodeViewerModalComponent, any>>;
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
    } as unknown as MockedObject<LoggingService>;
    const mockUserSettingsService = {
      getCurrentUsersSettingByType: vi
        .fn()
        .mockName('UserSettingService.getCurrentUsersSettingByType')
        .mockReturnValue(Promise.resolve(null)),
    };
    const mockPrinterService = {
      getPrinterDetail: vi
        .fn()
        .mockName('PrinterService.getPrinterDetail')
        .mockReturnValue(of(null)),
    };

    await TestBed.configureTestingModule({
      imports: [NoopAnimationsModule],
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

  const viewerWindow = () => component.iframe()!.nativeElement.contentWindow!;

  /** A message as the viewer posts it: from the iframe's window. */
  const fromViewer = ({ data }: { data: unknown }) =>
    component.onMessage(
      new MessageEvent('message', { data, source: viewerWindow() })
    );

  it('should create and log the open', () => {
    expect(component).toBeTruthy();
    expect(logging.logEvent).toHaveBeenCalledWith('GcodeViewerModal_Opened', {
      fileSize: 3,
    });
  });

  it('derives overall progress and the active step from the two phases', () => {
    expect(component.step()).toBe('reading');
    fromViewer({ data: { type: 'SET_LOAD_PROGRESS', progress: 50 } });
    expect(component.overallProgress()).toBe(25);
    fromViewer({
      data: { type: 'SET_ANALYZE_PROGRESS', progress: 50 },
    });
    expect(component.step()).toBe('analyzing');
    expect(component.loadingProgress()).toBe(100);
    expect(component.overallProgress()).toBe(75);
  });

  it('listens for progress the viewer iframe posts to its parent', async () => {
    const received = new Promise<void>((resolve) => {
      const listener = (e: MessageEvent) => {
        if (e.data?.type === 'SET_LOAD_PROGRESS') {
          window.removeEventListener('message', listener);
          resolve();
        }
      };
      window.addEventListener('message', listener);
    });

    // What adapter.js does, run inside the iframe so the event's source is the
    // iframe's window, as it is in the app.
    const doc = component.iframe()!.nativeElement.contentDocument!;
    const script = doc.createElement('script');
    script.textContent =
      "window.parent.postMessage({ type: 'SET_LOAD_PROGRESS', progress: 50 });";
    // The body may not be parsed yet while the viewer's scripts load.
    doc.documentElement.appendChild(script);
    await received;

    expect(component.overallProgress()).toBe(25);
  });

  describe('a message from another window', () => {
    const dispatch = (data: unknown) =>
      window.dispatchEvent(
        new MessageEvent('message', {
          origin: 'https://ads.example',
          source: window,
          data,
        })
      );

    it('is ignored, so it cannot close the dialog with its own values', () => {
      dispatch({
        type: 'MODEL_INFO',
        data: { printTime: 99999, totalFilament: 123456 },
      });
      dispatch({ type: 'SET_LOAD_PROGRESS', progress: 50 });

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.overallProgress()).toBe(0);
    });

    it('is ignored when it has no source', () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'SET_LOAD_PROGRESS', progress: 50 },
        })
      );

      expect(component.overallProgress()).toBe(0);
    });
  });

  it('tolerates a message whose data is not an object', async () => {
    await expect(fromViewer({ data: null })).resolves.toBeUndefined();
    await expect(fromViewer({ data: 'hello' })).resolves.toBeUndefined();
  });

  it('maps MODEL_INFO into a print with one usage row per extruder', () => {
    fromViewer({
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

    const print = vi.mocked(dialogRef.close).mock.lastCall[0];
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
    fromViewer({
      data: {
        type: 'MODEL_INFO',
        data: {
          totalFilament: 2500,
          filamentByExtruder: {},
          modelSize: { x: 1, y: 1, z: 1 },
        },
      },
    });
    const print = vi.mocked(dialogRef.close).mock.lastCall[0];
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
    fromViewer({
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
