import { TestBed } from '@angular/core/testing';
import { FilamentListResolverService } from './filament-list-resolver.service';

xdescribe('FilamentListResolverService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [FilamentListResolverService] })
  );

  it('should be created', () => {
    const service: FilamentListResolverService = TestBed.inject(
      FilamentListResolverService
    );
    expect(service).toBeTruthy();
  });
});
