import { TestBed } from '@angular/core/testing';

import { FilamentService } from './filament.service';

describe('FilamentServiceService', () => {
  let service: FilamentService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FilamentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
