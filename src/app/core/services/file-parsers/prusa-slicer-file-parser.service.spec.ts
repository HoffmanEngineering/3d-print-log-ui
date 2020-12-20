import { TestBed } from '@angular/core/testing';

import { PrusaSlicerFileParserService } from './prusa-slicer-file-parser.service';

describe('PrusaSlicerFileParserService', () => {
  let service: PrusaSlicerFileParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PrusaSlicerFileParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should parse the estimated print time using the normal mode when estimation exist in the gcode', () => {
    const testGcode = `; total filament used [g] = 0.0
; total filament cost = 0.0
; estimated printing time (normal mode) = 1h 00m 00s
; estimated printing time (silent mode) = 1h 26m 53s`;
    const expectedEstPrintTime = 3600;

    const actual = service.parse(testGcode);

    expect(actual.estimatedPrintTimeInSeconds).toBe(expectedEstPrintTime);
  });

  it('should set the estimated print time to undefined when no estimations exist in the gcode', () => {
    const testGcodeWithoutEstimations = `; total filament used [g] = 0.0
    ; total filament cost = 0.0`;

    const actual = service.parse(testGcodeWithoutEstimations);

    expect(actual.estimatedPrintTimeInSeconds).toBeUndefined();
  });
});
