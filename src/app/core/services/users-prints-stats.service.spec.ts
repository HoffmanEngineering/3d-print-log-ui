import { TestBed } from '@angular/core/testing';

import { provideHttpClientTesting } from '@angular/common/http/testing';
import { UsersPrintsStatsService } from './users-prints-stats.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('UsersPrintsStatsService', () => {
  let service: UsersPrintsStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [], providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()] });
    service = TestBed.inject(UsersPrintsStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
