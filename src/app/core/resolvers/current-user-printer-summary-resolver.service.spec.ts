import { TestBed } from '@angular/core/testing';

import { CurrentUserPrinterSummaryResolverService } from './current-user-printer-summary-resolver.service';

describe('CurrentUserPrinterSummaryResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CurrentUserPrinterSummaryResolverService = TestBed.get(CurrentUserPrinterSummaryResolverService);
    expect(service).toBeTruthy();
  });
});
