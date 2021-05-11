import { TestBed } from '@angular/core/testing';

import { CuraSlicerFileParserService } from './cura-slicer-file-parser.service';
import testGcodeFile from './cura-test-file';

fdescribe('CuraSlicerFileParserService', () => {
  let service: CuraSlicerFileParserService;
  let testGcode: string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CuraSlicerFileParserService);
    testGcode = testGcodeFile.data;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('estimated print time', () => {
    it('should parse the TIME row as the estimated print time in seconds', () => {
      const expectedTimeInSeconds = 6311;
      const actualPrint = service.parse(testGcode);

      expect(actualPrint.estimatedPrintTimeInSeconds).toEqual(
        expectedTimeInSeconds
      );
    });

    it('should set the estimated print time to null if the gcode does not contain a TIME row', () => {
      const expectedTimeInSeconds = 6311;
      const noTimeRowGcode = 'Test; Test; Test;';
      const actualPrint = service.parse(noTimeRowGcode);

      expect(actualPrint.estimatedPrintTimeInSeconds).toBeNull();
    });
  });
});
