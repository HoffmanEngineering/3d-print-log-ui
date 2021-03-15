import { TestBed } from '@angular/core/testing';
import { CopyFilamentDetailResolverService } from './copy-filament-detail-resolver.service';

xdescribe('CopyFilamentDetailResolverService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: CopyFilamentDetailResolverService = TestBed.inject(
      CopyFilamentDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
