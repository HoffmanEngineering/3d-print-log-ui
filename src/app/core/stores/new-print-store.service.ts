import { Injectable } from '@angular/core';
import { PrintDetail } from '../services/print.service';

/**
 * Stores a new print (generally from parsing a gcode).
 */
@Injectable({
  providedIn: 'root',
})
export class NewPrintStoreService {
  private newPrint: PrintDetail | null = null;

  constructor() {}

  public hasNewPrint(): boolean {
    return this.newPrint !== null;
  }

  public getNewPrint(): PrintDetail {
    return this.newPrint;
  }

  public setNewPrint(newPrint: PrintDetail) {
    this.newPrint = newPrint;
  }

  public clear() {
    this.newPrint = null;
  }
}
