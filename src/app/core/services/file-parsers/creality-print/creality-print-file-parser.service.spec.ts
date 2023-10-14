import { TestBed } from '@angular/core/testing';

import { CrealityPrintFileParserService } from './creality-print-file-parser.service';

describe('PrusaSlicerFileParserService', () => {
  let service: CrealityPrintFileParserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrealityPrintFileParserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should set the estimated filament usage', async () => {
    const testGcode = `;Filament used:1.65354m`;

    const actual = await service.parse(testGcode);

    expect(actual.filamentUsage[0].estimatedLengthInM).toBe(1.65354);
  });

  it('should set the estimated print time', async () => {
    const testGcode = `;TIME:627.134`;

    const actual = await service.parse(testGcode);

    expect(actual.estimatedPrintTimeInSeconds).toBe(628);
  });

  it('should parse all the settings as expected', async () => {
    const testGcode = `

;FLAVOR:Marlin
;TIME:627.134
;Filament used:1.65354m
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
;Layer Height:0.2
;Adaptive Layers:0
;---------------------End of Head--------------------------
M140 S60
M105
M190 S60
M104 S220
M82 ;absolute extrusion mode
M220 S100 ;Reset Feedrate
M221 S100 ;Reset Flowrate`;

    const actual = await service.parse(testGcode);

    expect(actual.notes).toBe(`Print Settings:
TIME:627.134
Filament used:1.65354m
;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;
Layer Height:0.2
Adaptive Layers:0`);
  });
});
