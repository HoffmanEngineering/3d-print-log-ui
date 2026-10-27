import { Injectable } from '@angular/core';
import type { Html5Qrcode, CameraDevice } from 'html5-qrcode';

export interface QrScanResult {
  success: boolean;
  filamentId?: string;
  rawText: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class QrScannerService {
  private html5QrCode: Html5Qrcode | null = null;
  private labelElementId: string | null = null;

  // Cache the import *promise* (not the resolved module) so concurrent first
  // calls share one dynamic import instead of racing two.
  private html5QrcodeModule: Promise<typeof import('html5-qrcode')> | null =
    null;

  /** Loads the html5-qrcode library on demand, caching the promise after the first call. */
  private loadHtml5Qrcode(): Promise<typeof import('html5-qrcode')> {
    return (this.html5QrcodeModule ??= import('html5-qrcode'));
  }

  /**
   * Starts scanning for QR codes using the device camera.
   * @param elementId The ID of the HTML element to render the camera viewfinder
   * @param onSuccess Callback function when a QR code is successfully scanned
   * @param cameraId Optional specific camera ID to use
   */
  async startScanning(
    elementId: string,
    onSuccess: (result: QrScanResult) => void,
    cameraId?: string
  ): Promise<void> {
    await this.stopScanning();

    const { Html5Qrcode } = await this.loadHtml5Qrcode();
    this.html5QrCode = new Html5Qrcode(elementId);

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    };

    const successCallback = (decodedText: string) => {
      const result = this.parseFilamentUrl(decodedText);
      onSuccess(result);
    };

    const errorCallback = () => {
      // Silent errors during scanning - these are expected when no QR code is in frame
    };

    if (cameraId) {
      await this.html5QrCode.start(
        cameraId,
        config,
        successCallback,
        errorCallback
      );
    } else {
      await this.html5QrCode.start(
        { facingMode: 'environment' },
        config,
        successCallback,
        errorCallback
      );
    }
  }

  /**
   * Starts the back camera reading spool labels: QR codes plus the product and batch barcodes
   * labels carry, over the whole frame. Uses the browser's own BarcodeDetector where there is one
   * (Chrome on Android), which reads 1D codes far better than the JS fallback.
   * @param onDecoded Called with each decoded value and html5-qrcode's format name (EAN_13…)
   */
  async startLabelScanning(
    elementId: string,
    onDecoded: (text: string, format: string) => void
  ): Promise<void> {
    await this.stopScanning();

    const { Html5Qrcode, Html5QrcodeSupportedFormats: F } =
      await this.loadHtml5Qrcode();
    const scanner = new Html5Qrcode(elementId, {
      verbose: false,
      formatsToSupport: [
        F.QR_CODE,
        F.EAN_13,
        F.EAN_8,
        F.UPC_A,
        F.UPC_E,
        F.CODE_128,
        F.CODE_39,
      ],
      useBarCodeDetectorIfSupported: true,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
    });
    this.html5QrCode = scanner;
    this.labelElementId = elementId;

    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        // Without a size Chrome opens the camera at 640x480, too coarse for a label's small print
        // or a 1D barcode beyond a hand's width. Takes precedence over the first argument.
        videoConstraints: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      },
      (text, result) =>
        onDecoded(text, result?.result?.format?.formatName ?? 'UNKNOWN'),
      () => {
        // Expected on every frame without a code.
      }
    );
    // Stopped (or replaced) while the camera was starting: nothing else holds this stream.
    if (this.html5QrCode !== scanner) {
      await scanner.stop().catch(() => undefined);
    }
  }

  /** The camera's current frame at full resolution, or null when no label scan is running. */
  captureFrame(): HTMLCanvasElement | null {
    const video = this.labelElementId
      ? document
          .getElementById(this.labelElementId)
          ?.querySelector<HTMLVideoElement>('video')
      : null;
    if (!video || video.videoWidth === 0) {
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    return canvas;
  }

  /**
   * Holds the camera on its current frame and stops decoding, while a photo of it is read: the
   * user sees the picture that was taken, and OCR gets the CPU.
   */
  pauseLabelScanning(): void {
    // Html5QrcodeScannerState.SCANNING
    if (this.html5QrCode?.getState() === 2) this.html5QrCode.pause(true);
  }

  /** Back to the live camera after pauseLabelScanning. */
  resumeLabelScanning(): void {
    // Html5QrcodeScannerState.PAUSED
    if (this.html5QrCode?.getState() === 3) this.html5QrCode.resume();
  }

  /**
   * Stops the current scanning session.
   */
  async stopScanning(): Promise<void> {
    // Let go of it before awaiting, so a scan started meanwhile is never the one cleared.
    const scanner = this.html5QrCode;
    if (!scanner) return;
    this.html5QrCode = null;
    try {
      // SCANNING or PAUSED (a photo being read); one still starting stops itself once it has.
      if (scanner.getState() === 2 || scanner.getState() === 3) {
        await scanner.stop();
      }
    } catch {
      // Ignore errors when stopping - scanner may already be stopped
    }
  }

  /**
   * Parses a scanned URL to extract the filament ID.
   * Expected format: https://{origin}/materials/{filamentId}
   * @param scannedText The raw text from the QR code
   * @returns QrScanResult with success status and filament ID if valid
   */
  parseFilamentUrl(scannedText: string): QrScanResult {
    try {
      const url = new URL(scannedText);
      const match = url.pathname.match(/^\/materials\/([a-f0-9-]+)$/i);

      if (match) {
        return {
          success: true,
          filamentId: match[1],
          rawText: scannedText,
        };
      }

      return {
        success: false,
        error: 'This QR code is not a 3D Print Log filament label',
        rawText: scannedText,
      };
    } catch {
      return {
        success: false,
        error: 'This QR code is not a 3D Print Log filament label',
        rawText: scannedText,
      };
    }
  }

  /**
   * Gets the list of available cameras on the device.
   * @returns Promise resolving to an array of camera devices
   */
  async getCameras(): Promise<CameraDevice[]> {
    const { Html5Qrcode } = await this.loadHtml5Qrcode();
    return Html5Qrcode.getCameras();
  }
}
