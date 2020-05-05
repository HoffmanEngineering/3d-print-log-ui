import { TestBed } from '@angular/core/testing';

import { NavigatorShareService } from './navigator-share.service';

describe('NavigatorShareService', () => {
  let service: NavigatorShareService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavigatorShareService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
