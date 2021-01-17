import { TestBed } from '@angular/core/testing';

import { MaterialResolverService } from './material-resolver.service';

xdescribe('MaterialResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: MaterialResolverService = TestBed.inject(
      MaterialResolverService
    );
    expect(service).toBeTruthy();
  });
});
