import { TestBed } from '@angular/core/testing';

import { provideHttpClientTesting } from '@angular/common/http/testing';
import { PrintService } from './print.service';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

describe('PrintService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [], providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting()] })
  );

  it('should be created', () => {
    const service: PrintService = TestBed.inject(PrintService);
    expect(service).toBeTruthy();
  });
});
