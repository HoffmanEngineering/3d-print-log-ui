import { TestBed } from '@angular/core/testing';

import { NewPrintStoreService } from './new-print-store.service';

describe('NewPrintStoreService', () => {
  let service: NewPrintStoreService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NewPrintStoreService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
