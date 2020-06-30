import { TestBed } from '@angular/core/testing';

import { HttpClientTestingModule } from '@angular/common/http/testing';
import { PrintService } from './print.service';

describe('PrintService', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] })
  );

  it('should be created', () => {
    const service: PrintService = TestBed.get(PrintService);
    expect(service).toBeTruthy();
  });
});
