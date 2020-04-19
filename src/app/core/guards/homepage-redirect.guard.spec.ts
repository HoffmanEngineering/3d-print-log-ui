import { TestBed, async, inject } from '@angular/core/testing';

import { HomepageRedirectGuard } from './homepage-redirect.guard';

describe('HomepageRedirectGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [HomepageRedirectGuard]
    });
  });

  it('should ...', inject([HomepageRedirectGuard], (guard: HomepageRedirectGuard) => {
    expect(guard).toBeTruthy();
  }));
});
