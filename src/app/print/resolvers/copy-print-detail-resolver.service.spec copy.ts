import { TestBed } from '@angular/core/testing';

import { CopyPrintDetailResolverService } from './copy-print-detail-resolver.service';

describe('CopyPrintDetailResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CopyPrintDetailResolverService = TestBed.get(
      CopyPrintDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
