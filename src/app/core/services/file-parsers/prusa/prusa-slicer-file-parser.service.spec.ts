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

  it('should parse the estimated print time using the normal mode when estimation exist in the gcode', async () => {
    const testGcode = `; total filament used [g] = 0.0
; total filament cost = 0.0
; estimated printing time (normal mode) = 1h 00m 00s
; estimated printing time (silent mode) = 1h 26m 53s`;
    const expectedEstPrintTime = 3600;

    const actual = await service.parse(testGcode);

    expect(actual.estimatedPrintTimeInSeconds).toBe(expectedEstPrintTime);
  });

  it('should set the estimated print time to undefined when no estimations exist in the gcode', async () => {
    const testGcodeWithoutEstimations = `; total filament used [g] = 0.0
    ; total filament cost = 0.0`;

    const actual = await service.parse(testGcodeWithoutEstimations);

    expect(actual.estimatedPrintTimeInSeconds).toBeUndefined();
  });
  describe('estimateFilamentUsageInMg', () => {
    it('should convert the reported gram total to milligrams when the slicer provides one', () => {
      const testGcode = `; total filament used [g] = 12.5`;

      expect(service.estimateFilamentUsageInMg(testGcode)).toBe(12500);
    });

    it('should compute the weight from length and diameter when no gram total is reported', () => {
      const testGcode = `; total filament used [g] = 0.0
; filament_type = PLA
; filament_diameter = 1.75
; filament used [mm] = 1000`;

      const actual = service.estimateFilamentUsageInMg(testGcode);

      expect(actual).toBeGreaterThan(0);
    });

    it('should return undefined for a material it has no density for', () => {
      const testGcode = `; total filament used [g] = 0.0
; filament_type = TPU
; filament_diameter = 1.75
; filament used [mm] = 1000`;

      expect(service.estimateFilamentUsageInMg(testGcode)).toBeUndefined();
    });

    it('should estimate Nylon weight from filament length and diameter', () => {
      const testGcode = `; total filament used [g] = 0.0
; filament_type = Nylon
; filament_diameter = 1.75
; filament used [mm] = 1000`;

      expect(service.estimateFilamentUsageInMg(testGcode)).toBe(2549);
    });

    it('should return undefined when the diameter is missing', () => {
      const testGcode = `; total filament used [g] = 0.0
; filament_type = PLA
; filament used [mm] = 1000`;

      expect(service.estimateFilamentUsageInMg(testGcode)).toBeUndefined();
    });

    it('should return undefined when the filament length is missing', () => {
      const testGcode = `; total filament used [g] = 0.0
; filament_type = PLA
; filament_diameter = 1.75`;

      expect(service.estimateFilamentUsageInMg(testGcode)).toBeUndefined();
    });

    it('should return undefined when the diameter or filament length is zero', () => {
      const zeroDiameter = `; total filament used [g] = 0.0
; filament_type = PLA
; filament_diameter = 0
; filament used [mm] = 1000`;
      const zeroLength = `; total filament used [g] = 0.0
; filament_type = PLA
; filament_diameter = 1.75
; filament used [mm] = 0`;

      expect(service.estimateFilamentUsageInMg(zeroDiameter)).toBeUndefined();
      expect(service.estimateFilamentUsageInMg(zeroLength)).toBeUndefined();
    });
  });
});
