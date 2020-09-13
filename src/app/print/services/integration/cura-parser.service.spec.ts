import { TestBed } from '@angular/core/testing';

import { CuraParserService } from './cura-parser.service';

describe('CuraParserService', () => {
  let service: CuraParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuraParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
