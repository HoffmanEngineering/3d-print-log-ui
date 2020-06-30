import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { UserSettingService } from './user-setting.service';

describe('UserSettingService', () => {
  let service: UserSettingService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(UserSettingService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
