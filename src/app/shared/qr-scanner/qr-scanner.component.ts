import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  ViewEncapsulation,
  afterNextRender,
  inject,
  output,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import type { CameraDevice } from 'html5-qrcode';

import {
  QrScannerService,
  QrScanResult,
} from 'src/app/core/services/qr-scanner.service';

@Component({
  selector: 'app-qr-scanner',
  templateUrl: './qr-scanner.component.html',
  styleUrls: ['./qr-scanner.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
  ],
})
export class QrScannerComponent implements OnDestroy {
  private readonly scannerService = inject(QrScannerService);

  readonly scanning = signal(false);
  readonly initializing = signal(true);
  readonly error = signal<string | null>(null);
  readonly cameras = signal<CameraDevice[]>([]);
  readonly selectedCamera = signal<string | null>(null);

  readonly scanned = output<QrScanResult>();

  constructor() {
    afterNextRender(() => {
      this.initializeScanner();
    });
  }

  ngOnDestroy(): void {
    this.scannerService.stopScanning();
  }

  private async initializeScanner(): Promise<void> {
    this.initializing.set(true);
    this.error.set(null);

    try {
      const cameraList = await this.scannerService.getCameras();

      if (cameraList.length === 0) {
        this.error.set('No camera found on this device');
        this.initializing.set(false);
        return;
      }

      this.cameras.set(cameraList);

      // Prefer back camera (environment facing)
      const backCamera = cameraList.find(
        (cam) =>
          cam.label.toLowerCase().includes('back') ||
          cam.label.toLowerCase().includes('rear') ||
          cam.label.toLowerCase().includes('environment')
      );
      const defaultCamera = backCamera || cameraList[0];
      this.selectedCamera.set(defaultCamera.id);

      await this.startScanning(defaultCamera.id);
    } catch (err) {
      this.handleCameraError(err);
    } finally {
      this.initializing.set(false);
    }
  }

  private async startScanning(cameraId: string): Promise<void> {
    this.error.set(null);

    try {
      await this.scannerService.startScanning(
        'qr-reader',
        (result) => this.handleScanResult(result),
        cameraId
      );
      this.scanning.set(true);
    } catch (err) {
      this.handleCameraError(err);
    }
  }

  private handleScanResult(result: QrScanResult): void {
    this.scannerService.stopScanning();
    this.scanning.set(false);
    this.scanned.emit(result);
  }

  private handleCameraError(err: unknown): void {
    if (err instanceof Error) {
      if (
        err.message.includes('Permission') ||
        err.message.includes('NotAllowedError')
      ) {
        this.error.set(
          'Camera permission denied. Please allow camera access in your browser settings.'
        );
      } else if (
        err.message.includes('NotFoundError') ||
        err.message.includes('DevicesNotFoundError')
      ) {
        this.error.set('No camera found on this device');
      } else if (err.message.includes('NotReadableError')) {
        this.error.set(
          'Camera is in use by another application. Please close other apps using the camera.'
        );
      } else {
        this.error.set(`Camera error: ${err.message}`);
      }
    } else {
      this.error.set('An unexpected error occurred while accessing the camera');
    }
  }

  async onCameraChange(cameraId: string): Promise<void> {
    this.selectedCamera.set(cameraId);
    await this.scannerService.stopScanning();
    await this.startScanning(cameraId);
  }

  async retryScanning(): Promise<void> {
    this.error.set(null);
    await this.initializeScanner();
  }
}
