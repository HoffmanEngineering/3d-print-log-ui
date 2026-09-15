import { TestBed } from '@angular/core/testing';

import { CuraSlicerFileParserService } from './cura-slicer-file-parser.service';
import multipleExtruderTestFile from './cura-test-file-multiple-extruders';
import singleExtruderTestFile from './cura-test-file-single-extruder';

describe('CuraSlicerFileParserService', () => {
  let service: CuraSlicerFileParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuraSlicerFileParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('estimated print time', () => {
    it('should parse the TIME row as the estimated print time in seconds', async () => {
      const testGcode = multipleExtruderTestFile.data;
      const expectedTimeInSeconds = 6311;
      const actualPrint = await service.parse(testGcode);

      expect(actualPrint.estimatedPrintTimeInSeconds).toEqual(
        expectedTimeInSeconds
      );
    });

    it('should set the estimated print time to null if the gcode does not contain a TIME row', async () => {
      // const testGcode = multipleExtruderTestFile.data;
      // const expectedTimeInSeconds = 669;
      const noTimeRowGcode = 'Test; Test; Test;';
      const actualPrint = await service.parse(noTimeRowGcode);

      expect(actualPrint.estimatedPrintTimeInSeconds).toBeNull();
    });
  });

  describe('Single Extruder Parsing', () => {
    it('should parse the settings for a single extruder correctly', async () => {
      const testGcode = singleExtruderTestFile.data;
      const expectedTimeInSeconds = 669;
      const actualPrint = await service.parse(testGcode);

      expect(actualPrint.estimatedPrintTimeInSeconds).toEqual(
        expectedTimeInSeconds
      );
      expect(actualPrint.filamentUsage.length).toBe(1);
      expect(actualPrint.filamentUsage[0].estimatedLengthInM).toBe(0.838);
      expect(actualPrint.notes).toContain('Profile:');
    });
  });

  it('detects Cura by its engine marker', () => {
    expect(service.detect(';Generated with Cura_SteamEngine 4.9.0')).toBeTrue();
    expect(service.detect(';FLAVOR:Marlin')).toBeFalse();
  });

  it('emits one usage row per extruder from the Filament used header', async () => {
    const print = await service.parse(';Filament used: 1.2m, 0.5m\n;TIME:10');
    expect(print.filamentUsage.map((f) => f.estimatedLengthInM)).toEqual([
      1.2, 0.5,
    ]);
  });
});
