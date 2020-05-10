import { TestBed } from '@angular/core/testing';
import { UserDetailResolverService } from './user-detail-resolver.service';

describe('PrinterListResolverService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [UserDetailResolverService] })
  );

  it('should be created', () => {
    const service: UserDetailResolverService = TestBed.get(
      UserDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
