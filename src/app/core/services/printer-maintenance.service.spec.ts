import { TestBed } from '@angular/core/testing';

import { PrinterMaintenanceService } from './printer-maintenance.service';

describe('PrinterMaintenanceService', () => {
  let service: PrinterMaintenanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrinterMaintenanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
