import { Injectable } from '@angular/core';
import { PrintDetail } from '../services/print.service';

/** What a parse found beside the print, kept off PrintDetail because that is the save payload. */
export interface NewPrintMeta {
  /** The slicer's names for the printer, in the order to try them; empty when none. */
  detectedPrinterNames: string[];
}

/**
 * Stores a new print (generally from parsing a gcode).
 */
@Injectable({
  providedIn: 'root',
})
export class NewPrintStoreService {
  private newPrint: PrintDetail | null = null;
  private meta: NewPrintMeta = { detectedPrinterNames: [] };

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
    meta?: { detectedPrinterNames?: string[] }
  ) {
    this.newPrint = newPrint;
    this.meta = { detectedPrinterNames: meta?.detectedPrinterNames ?? [] };
  }

  public clear() {
    this.newPrint = null;
    this.meta = { detectedPrinterNames: [] };
  }
}
