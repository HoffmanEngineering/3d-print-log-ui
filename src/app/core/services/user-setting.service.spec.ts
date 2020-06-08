import { TestBed } from '@angular/core/testing';

import { UserSettingService } from './user-setting.service';

describe('UserSettingService', () => {
  let service: UserSettingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserSettingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
