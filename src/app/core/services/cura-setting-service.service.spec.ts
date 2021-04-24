import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CuraSettingServiceService } from './cura-setting-service.service';

describe('CuraSettingServiceService', () => {
  let service: CuraSettingServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(CuraSettingServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
