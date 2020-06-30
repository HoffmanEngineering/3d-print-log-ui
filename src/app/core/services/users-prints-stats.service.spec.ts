import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UsersPrintsStatsService } from './users-prints-stats.service';

describe('UsersPrintsStatsService', () => {
  let service: UsersPrintsStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(UsersPrintsStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
