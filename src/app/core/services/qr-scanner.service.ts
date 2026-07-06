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
   * Stops the current scanning session.
   */
  async stopScanning(): Promise<void> {
    if (this.html5QrCode) {
      try {
        const state = this.html5QrCode.getState();
        if (state === 2) {
          // Html5QrcodeScannerState.SCANNING
          await this.html5QrCode.stop();
        }
      } catch {
        // Ignore errors when stopping - scanner may already be stopped
      }
      this.html5QrCode = null;
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
