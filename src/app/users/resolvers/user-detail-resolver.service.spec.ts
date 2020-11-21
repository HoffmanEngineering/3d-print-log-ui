import { TestBed } from '@angular/core/testing';
import { UserDetailResolverService } from './user-detail-resolver.service';

xdescribe('UserDetailResolverService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [UserDetailResolverService] })
  );

  it('should be created', () => {
    const service: UserDetailResolverService = TestBed.inject(
      UserDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
