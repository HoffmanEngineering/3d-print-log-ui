import { TestBed } from '@angular/core/testing';

import { GcodeFileParserService } from './gcode-file-parser.service';

describe('GcodeFileParserService', () => {
  let service: GcodeFileParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(GcodeFileParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
