import { Injectable } from '@angular/core';
import { PrintDetail } from '../services/print.service';

/** What a parse found beside the print, kept off PrintDetail because that is the save payload. */
export interface NewPrintMeta {
  detectedPrinterName: string | null;
}

/**
 * Stores a new print (generally from parsing a gcode).
 */
@Injectable({
  providedIn: 'root',
})
export class NewPrintStoreService {
  private newPrint: PrintDetail | null = null;
  private meta: NewPrintMeta = { detectedPrinterName: null };

  public hasNewPrint(): boolean {
    return this.newPrint !== null;
  }

  public getNewPrint(): PrintDetail | null {
    return this.newPrint;
  }

  public getNewPrintMeta(): NewPrintMeta {
    return this.meta;
  }

  public setNewPrint(
    newPrint: PrintDetail,
    meta?: { detectedPrinterName?: string | null }
  ) {
    this.newPrint = newPrint;
    this.meta = { detectedPrinterName: meta?.detectedPrinterName ?? null };
  }

  public clear() {
    this.newPrint = null;
    this.meta = { detectedPrinterName: null };
  }
}
