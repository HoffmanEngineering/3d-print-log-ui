import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { PrinterMaintenanceService } from './printer-maintenance.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PrinterMaintenanceService', () => {
  let service: PrinterMaintenanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [], providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()] });
    service = TestBed.inject(PrinterMaintenanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
