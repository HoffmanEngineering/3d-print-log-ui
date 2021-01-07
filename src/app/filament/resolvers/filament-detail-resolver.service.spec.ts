import { TestBed } from '@angular/core/testing';

import { FilamentDetailResolverService } from './filament-detail-resolver.service';

xdescribe('FilamentDetailResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: FilamentDetailResolverService = TestBed.inject(
      FilamentDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
