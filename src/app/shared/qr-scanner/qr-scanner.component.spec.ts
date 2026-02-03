import {
  ComponentFixture,
  TestBed,
  fakeAsync,
  tick,
} from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { QrScannerComponent } from './qr-scanner.component';
import {
  QrScannerService,
  QrScanResult,
} from 'src/app/core/services/qr-scanner.service';
import { CameraDevice } from 'html5-qrcode';

describe('QrScannerComponent', () => {
  let component: QrScannerComponent;
  let fixture: ComponentFixture<QrScannerComponent>;
  let mockScannerService: jasmine.SpyObj<QrScannerService>;

  const mockCameras: CameraDevice[] = [
    { id: 'camera1', label: 'Front Camera' },
    { id: 'camera2', label: 'Back Camera' },
  ];

  beforeEach(async () => {
    mockScannerService = jasmine.createSpyObj('QrScannerService', [
      'getCameras',
      'startScanning',
      'stopScanning',
      'parseFilamentUrl',
    ]);

    mockScannerService.getCameras.and.resolveTo(mockCameras);
    mockScannerService.startScanning.and.resolveTo();
    mockScannerService.stopScanning.and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [QrScannerComponent, NoopAnimationsModule],
      providers: [{ provide: QrScannerService, useValue: mockScannerService }],
    }).compileComponents();

    fixture = TestBed.createComponent(QrScannerComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with initializing state', () => {
    expect(component.initializing()).toBeTrue();
    expect(component.scanning()).toBeFalse();
    expect(component.error()).toBeNull();
  });

  it('should initialize cameras after render', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(mockScannerService.getCameras).toHaveBeenCalled();
  }));

  it('should prefer back camera when available', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(mockScannerService.startScanning).toHaveBeenCalledWith(
      'qr-reader',
      jasmine.any(Function),
      'camera2'
    );
  }));

  it('should use first camera when no back camera found', fakeAsync(() => {
    const frontOnlyCameras: CameraDevice[] = [
      { id: 'front1', label: 'Front Camera' },
      { id: 'front2', label: 'Secondary Front' },
    ];
    mockScannerService.getCameras.and.resolveTo(frontOnlyCameras);

    fixture.detectChanges();
    tick();

    expect(mockScannerService.startScanning).toHaveBeenCalledWith(
      'qr-reader',
      jasmine.any(Function),
      'front1'
    );
  }));

  it('should show error when no cameras available', fakeAsync(() => {
    mockScannerService.getCameras.and.resolveTo([]);

    fixture.detectChanges();
    tick();

    expect(component.error()).toBe('No camera found on this device');
    expect(component.initializing()).toBeFalse();
    expect(mockScannerService.startScanning).not.toHaveBeenCalled();
  }));

  it('should show error when camera permission denied', fakeAsync(() => {
    mockScannerService.getCameras.and.rejectWith(
      new Error('NotAllowedError: Permission denied')
    );

    fixture.detectChanges();
    tick();

    expect(component.error()).toContain('Camera permission denied');
    expect(component.initializing()).toBeFalse();
  }));

  it('should stop scanning on destroy', () => {
    component.ngOnDestroy();

    expect(mockScannerService.stopScanning).toHaveBeenCalled();
  });

  it('should emit scanned event when QR code detected', fakeAsync(() => {
    const scanResult: QrScanResult = {
      success: true,
      filamentId: 'test-id',
      rawText: 'https://example.com/materials/test-id',
    };

    let emittedResult: QrScanResult | undefined;
    component.scanned.subscribe((result) => {
      emittedResult = result;
    });

    fixture.detectChanges();
    tick();

    // Get the callback that was passed to startScanning
    const callback = mockScannerService.startScanning.calls.mostRecent()
      .args[1] as (result: QrScanResult) => void;
    callback(scanResult);

    expect(emittedResult).toEqual(scanResult);
    expect(mockScannerService.stopScanning).toHaveBeenCalled();
    expect(component.scanning()).toBeFalse();
  }));

  it('should allow camera change', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    mockScannerService.startScanning.calls.reset();
    mockScannerService.stopScanning.calls.reset();

    component.onCameraChange('camera1');
    tick();

    expect(mockScannerService.stopScanning).toHaveBeenCalled();
    expect(mockScannerService.startScanning).toHaveBeenCalledWith(
      'qr-reader',
      jasmine.any(Function),
      'camera1'
    );
    expect(component.selectedCamera()).toBe('camera1');
  }));

  it('should retry scanning on retryScanning call', fakeAsync(() => {
    mockScannerService.getCameras.and.rejectWith(new Error('Some error'));
    fixture.detectChanges();
    tick();

    expect(component.error()).not.toBeNull();

    mockScannerService.getCameras.and.resolveTo(mockCameras);
    component.retryScanning();
    tick();

    expect(component.error()).toBeNull();
    expect(mockScannerService.getCameras).toHaveBeenCalledTimes(2);
  }));

  it('should handle camera in use error', fakeAsync(() => {
    mockScannerService.getCameras.and.rejectWith(
      new Error('NotReadableError: Could not start video source')
    );

    fixture.detectChanges();
    tick();

    expect(component.error()).toContain('Camera is in use');
  }));

  it('should handle device not found error', fakeAsync(() => {
    mockScannerService.getCameras.and.rejectWith(
      new Error('NotFoundError: Requested device not found')
    );

    fixture.detectChanges();
    tick();

    expect(component.error()).toBe('No camera found on this device');
  }));

  it('should populate cameras list after initialization', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.cameras()).toEqual(mockCameras);
    expect(component.cameras().length).toBe(2);
  }));

  it('should set scanning to true after successful start', fakeAsync(() => {
    fixture.detectChanges();
    tick();

    expect(component.scanning()).toBeTrue();
    expect(component.initializing()).toBeFalse();
  }));
});
