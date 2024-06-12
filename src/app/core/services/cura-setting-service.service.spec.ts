import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { CuraSettingServiceService } from './cura-setting-service.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('CuraSettingServiceService', () => {
  let service: CuraSettingServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [], providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()] });
    service = TestBed.inject(CuraSettingServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
