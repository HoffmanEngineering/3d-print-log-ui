import { TestBed } from '@angular/core/testing';

import { PrinterService } from './printer.service';

describe('PrinterService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrinterService = TestBed.get(PrinterService);
    expect(service).toBeTruthy();
  });
});
