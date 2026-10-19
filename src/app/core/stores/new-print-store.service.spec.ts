import { TestBed } from '@angular/core/testing';

import { PrintDetail } from '../services/print.service';
import { NewPrintStoreService } from './new-print-store.service';

describe('NewPrintStoreService', () => {
  let service: NewPrintStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewPrintStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('keeps the detected printer names beside the print until cleared', () => {
    const print = { title: 'Cube' } as PrintDetail;
    service.setNewPrint(print, {
      detectedPrinterNames: ['MK4S', 'Original Prusa MK4S'],
    });

    expect(service.getNewPrint()).toBe(print);
    expect(service.getNewPrintMeta()).toEqual({
      detectedPrinterNames: ['MK4S', 'Original Prusa MK4S'],
    });

    service.clear();
    expect(service.getNewPrintMeta()).toEqual({ detectedPrinterNames: [] });
  });

  it('has no detected printer when none is given', () => {
    service.setNewPrint({ title: 'Cube' } as PrintDetail, {
      detectedPrinterNames: ['Old'],
    });
    service.setNewPrint({ title: 'Other' } as PrintDetail);
    expect(service.getNewPrintMeta()).toEqual({ detectedPrinterNames: [] });
  });
});
