import type { MockedObject } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
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
  let mockScannerService: MockedObject<QrScannerService>;

  const mockCameras: CameraDevice[] = [
    { id: 'camera1', label: 'Front Camera' },
    { id: 'camera2', label: 'Back Camera' },
  ];

  beforeEach(async () => {
    mockScannerService = {
      getCameras: vi.fn().mockName('QrScannerService.getCameras'),
      startScanning: vi.fn().mockName('QrScannerService.startScanning'),
      stopScanning: vi.fn().mockName('QrScannerService.stopScanning'),
      parseFilamentUrl: vi.fn().mockName('QrScannerService.parseFilamentUrl'),
    } as unknown as MockedObject<QrScannerService>;

    mockScannerService.getCameras.mockResolvedValue(mockCameras);
    mockScannerService.startScanning.mockResolvedValue(undefined);
    mockScannerService.stopScanning.mockResolvedValue(undefined);

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
    expect(component.initializing()).toBe(true);
    expect(component.scanning()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('should initialize cameras after render', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockScannerService.getCameras).toHaveBeenCalled();
  });

  it('should prefer back camera when available', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockScannerService.startScanning).toHaveBeenCalledWith(
      'qr-reader',
      expect.any(Function),
      'camera2'
    );
  });

  it('should use first camera when no back camera found', async () => {
    vi.useFakeTimers();
    const frontOnlyCameras: CameraDevice[] = [
      { id: 'front1', label: 'Front Camera' },
      { id: 'front2', label: 'Secondary Front' },
    ];
    mockScannerService.getCameras.mockResolvedValue(frontOnlyCameras);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(mockScannerService.startScanning).toHaveBeenCalledWith(
      'qr-reader',
      expect.any(Function),
      'front1'
    );
  });

  it('should show error when no cameras available', async () => {
    vi.useFakeTimers();
    mockScannerService.getCameras.mockResolvedValue([]);

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.error()).toBe('No camera found on this device');
    expect(component.initializing()).toBe(false);
    expect(mockScannerService.startScanning).not.toHaveBeenCalled();
  });

  it('should show error when camera permission denied', async () => {
    vi.useFakeTimers();
    mockScannerService.getCameras.mockRejectedValue(
      new Error('NotAllowedError: Permission denied')
    );

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.error()).toContain('Camera permission denied');
    expect(component.initializing()).toBe(false);
  });

  it('should stop scanning on destroy', () => {
    component.ngOnDestroy();

    expect(mockScannerService.stopScanning).toHaveBeenCalled();
  });

  it('should emit scanned event when QR code detected', async () => {
    vi.useFakeTimers();
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
    await vi.advanceTimersByTimeAsync(0);

    // Get the callback that was passed to startScanning
    const callback = vi.mocked(mockScannerService.startScanning).mock
      .lastCall[1] as (result: QrScanResult) => void;
    callback(scanResult);

    expect(emittedResult).toEqual(scanResult);
    expect(mockScannerService.stopScanning).toHaveBeenCalled();
    expect(component.scanning()).toBe(false);
  });

  it('should allow camera change', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    mockScannerService.startScanning.mockClear();
    mockScannerService.stopScanning.mockClear();

    component.onCameraChange('camera1');
    await vi.advanceTimersByTimeAsync(0);

    expect(mockScannerService.stopScanning).toHaveBeenCalled();
    expect(mockScannerService.startScanning).toHaveBeenCalledWith(
      'qr-reader',
      expect.any(Function),
      'camera1'
    );
    expect(component.selectedCamera()).toBe('camera1');
  });

  it('should retry scanning on retryScanning call', async () => {
    vi.useFakeTimers();
    mockScannerService.getCameras.mockRejectedValue(new Error('Some error'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.error()).not.toBeNull();

    mockScannerService.getCameras.mockResolvedValue(mockCameras);
    component.retryScanning();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.error()).toBeNull();
    expect(mockScannerService.getCameras).toHaveBeenCalledTimes(2);
  });

  it('should handle camera in use error', async () => {
    vi.useFakeTimers();
    mockScannerService.getCameras.mockRejectedValue(
      new Error('NotReadableError: Could not start video source')
    );

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.error()).toContain('Camera is in use');
  });

  it('should handle device not found error', async () => {
    vi.useFakeTimers();
    mockScannerService.getCameras.mockRejectedValue(
      new Error('NotFoundError: Requested device not found')
    );

    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.error()).toBe('No camera found on this device');
  });

  it('should populate cameras list after initialization', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.cameras()).toEqual(mockCameras);
    expect(component.cameras().length).toBe(2);
  });

  it('should set scanning to true after successful start', async () => {
    vi.useFakeTimers();
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(0);

    expect(component.scanning()).toBe(true);
    expect(component.initializing()).toBe(false);
  });
});
