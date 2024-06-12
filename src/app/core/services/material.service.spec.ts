import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { MaterialService } from './material.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('MaterialService', () => {
  let service: MaterialService;

  beforeEach(() => {
    TestBed.configureTestingModule({
    imports: [],
    providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()]
});
    service = TestBed.inject(MaterialService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
