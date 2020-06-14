import { TestBed } from '@angular/core/testing';
import { CurrentUserDetailResolverService } from './current-user-detail-resolver.service';

describe('PrinterListResolverService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [CurrentUserDetailResolverService],
    })
  );

  it('should be created', () => {
    const service: CurrentUserDetailResolverService = TestBed.get(
      CurrentUserDetailResolverService
    );
    expect(service).toBeTruthy();
  });
});
