import { TestBed } from '@angular/core/testing';

import { PrintListResolverService } from './print-list-resolver.service';

xdescribe('PrintListResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: PrintListResolverService = TestBed.inject(
      PrintListResolverService
    );
    expect(service).toBeTruthy();
  });
});
