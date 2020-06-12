import { TestBed } from '@angular/core/testing';

import { UsersPrintsStatsService } from './users-prints-stats.service';

describe('UsersPrintsStatsService', () => {
  let service: UsersPrintsStatsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UsersPrintsStatsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
