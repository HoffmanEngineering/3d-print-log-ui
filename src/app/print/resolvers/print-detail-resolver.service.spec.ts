import { TestBed } from '@angular/core/testing';

import { PrintDetailResolverService } from './print-detail-resolver.service';

xdescribe('PrintDetailResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrintDetailResolverService = TestBed.inject(
      PrintDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
