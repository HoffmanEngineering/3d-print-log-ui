import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PrinterMaintenanceService } from './printer-maintenance.service';

describe('PrinterMaintenanceService', () => {
  let service: PrinterMaintenanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PrinterMaintenanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
