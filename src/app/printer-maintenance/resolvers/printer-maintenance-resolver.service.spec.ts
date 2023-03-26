import { TestBed } from '@angular/core/testing';

import { PrinterMaintenanceResolverService } from './printer-maintenance-resolver.service';

xdescribe('PrinterMaintenanceResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrinterMaintenanceResolverService = TestBed.inject(
      PrinterMaintenanceResolverService
    );
    expect(service).toBeTruthy();
  });
});
