import { Injectable } from '@angular/core';

export interface QrCodeOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: {
    dark?: string;
    light?: string;
  };
}

const DEFAULT_OPTIONS: QrCodeOptions = {
  width: 200,
  margin: 1,
  errorCorrectionLevel: 'H',
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
};

@Injectable({
  providedIn: 'root',
})
export class QrCodeService {
  // Cache the import *promise* (not the resolved module) so concurrent first
  // calls share one dynamic import instead of racing two.
  private qrcodeModule: Promise<typeof import('qrcode')> | null = null;

  /** Loads the qrcode library on demand, caching the promise after the first call. */
  private loadQrcode(): Promise<typeof import('qrcode')> {
    return (this.qrcodeModule ??= import('qrcode'));
  }

  /**
   * Generates a QR code as an SVG string.
   * @param data The data to encode in the QR code
   * @param options Optional configuration for the QR code
   * @returns Promise resolving to an SVG string
   */
  async generateSvg(
    data: string,
    options: QrCodeOptions = {}
  ): Promise<string> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const QRCode = await this.loadQrcode();

    return QRCode.toString(data, {
      type: 'svg',
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      color: mergedOptions.color,
    });
  }

  /**
   * Generates a QR code as a data URL (base64 PNG).
   * @param data The data to encode in the QR code
   * @param options Optional configuration for the QR code
   * @returns Promise resolving to a data URL string
   */
  async generateDataUrl(
    data: string,
    options: QrCodeOptions = {}
  ): Promise<string> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const QRCode = await this.loadQrcode();

    return QRCode.toDataURL(data, {
      width: mergedOptions.width,
      margin: mergedOptions.margin,
      errorCorrectionLevel: mergedOptions.errorCorrectionLevel,
      color: mergedOptions.color,
    });
  }

  /**
   * Generates the deep link URL for a filament.
   * @param filamentId The ID of the filament
   * @returns The full URL to the filament detail page
   */
  generateFilamentUrl(filamentId: string): string {
    return `${window.location.origin}/materials/${filamentId}`;
  }
}
