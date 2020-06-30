import { TestBed } from '@angular/core/testing';

import { PrinterDetailResolverService } from './printer-detail-resolver.service';

xdescribe('PrinterDetailResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrinterDetailResolverService = TestBed.get(
      PrinterDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
