import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrinterService } from './printer.service';

describe('PrinterService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] })
  );

  it('should be created', () => {
    const service: PrinterService = TestBed.get(PrinterService);
    expect(service).toBeTruthy();
  });
});
