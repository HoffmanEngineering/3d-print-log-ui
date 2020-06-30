import { TestBed } from '@angular/core/testing';
import { PrinterListResolverService } from './printer-list-resolver.service';

xdescribe('PrinterListResolverService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [PrinterListResolverService] })
  );

  it('should be created', () => {
    const service: PrinterListResolverService = TestBed.get(
      PrinterListResolverService
    );
    expect(service).toBeTruthy();
  });
});
