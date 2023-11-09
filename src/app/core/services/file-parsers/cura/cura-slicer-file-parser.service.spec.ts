import { TestBed } from '@angular/core/testing';

import { CuraSlicerFileParserService } from './cura-slicer-file-parser.service';
import multipleExtruderTestFile from './cura-test-file-multiple-extruders';
import singleExtruderTestFile from './cura-test-file-single-extruder';

xdescribe('CuraSlicerFileParserService', () => {
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
      // const expectedTimeInSeconds = 6311;
      const noTimeRowGcode = 'Test; Test; Test;';
      const actualPrint = await service.parse(noTimeRowGcode);

      expect(actualPrint.estimatedPrintTimeInSeconds).toBeNull();
    });
  });

  describe('Single Extruder Parsing', () => {
    it('should parse the settings for a single extruder correctly', async () => {
      const testGcode = singleExtruderTestFile.data;
      const expectedTimeInSeconds = 6311;
      const actualPrint = await service.parse(testGcode);

      expect(actualPrint.estimatedPrintTimeInSeconds).toEqual(
        expectedTimeInSeconds
      );
    });
  });
});
