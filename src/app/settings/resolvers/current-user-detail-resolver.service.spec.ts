import { TestBed } from '@angular/core/testing';
import { CurrentUserDetailResolverService } from './current-user-detail-resolver.service';

xdescribe('CurrentUserDetailResolverService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [CurrentUserDetailResolverService],
    })
  );

  it('should be created', () => {
    const service: CurrentUserDetailResolverService = TestBed.inject(
      CurrentUserDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
