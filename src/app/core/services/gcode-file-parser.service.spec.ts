import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { GcodeParserBase } from './file-parsers/core/gcode-parser-base';
import { createDefaultPrintDetail } from './file-parsers/core/print-detail-defaults';
import {
  ResolvedParser,
  SlicerRegistry,
} from './file-parsers/core/slicer-registry';
import { GcodeFileParserService } from './gcode-file-parser.service';
import { LoggingService } from './logging.service';

describe('GcodeFileParserService', () => {
  let service: GcodeFileParserService;
  let registry: jasmine.SpyObj<SlicerRegistry>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let logging: jasmine.SpyObj<LoggingService>;
  let parser: jasmine.SpyObj<GcodeParserBase>;

  beforeEach(() => {
    registry = jasmine.createSpyObj<SlicerRegistry>('SlicerRegistry', [
      'resolve',
      'getSupportedSlicerNames',
    ]);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', [
      'error',
      'info',
    ]);
    logging = jasmine.createSpyObj<LoggingService>('LoggingService', [
      'logEvent',
      'logException',
    ]);
    // parse() goes through parseWithMeta, so the parser's own parse() is never called.
    parser = jasmine.createSpyObj<GcodeParserBase>(
      'Parser',
      ['parseWithMeta'],
      {
        slicerName: 'Orca Slicer',
      }
    );
    parser.parseWithMeta.and.resolveTo({
      print: { ...createDefaultPrintDetail(), title: 'Parsed' },
      detectedPrinterName: 'Bambu Lab X1 Carbon',
    });

    TestBed.configureTestingModule({
      providers: [
        { provide: SlicerRegistry, useValue: registry },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        { provide: LoggingService, useValue: logging },
      ],
    });
    service = TestBed.inject(GcodeFileParserService);
  });

  function resolveAs(result: Partial<ResolvedParser>) {
    registry.resolve.and.returnValue({
      parser,
      confidence: 'detected',
      score: 1,
      ...result,
    });
  }

  it('parses with the detected parser without a toast or dialog', async () => {
    resolveAs({ confidence: 'detected' });
    const print = await service.parse('gcode', 'file.gcode');
    expect(parser.parseWithMeta).toHaveBeenCalledWith('gcode', 'file.gcode');
    expect(print?.title).toBe('Parsed');
    expect(toastr.info).not.toHaveBeenCalled();
    expect(dialog.open).not.toHaveBeenCalled();
    expect(logging.logEvent).toHaveBeenCalledWith('GcodeAnalyzed', {
      slicer: 'Orca Slicer',
      confidence: 'detected',
      score: 1,
    });
  });

  it('parses with the closest parser and tells the user on a heuristic match', async () => {
    resolveAs({ confidence: 'heuristic', score: 0.9 });
    await service.parse('gcode');
    expect(parser.parseWithMeta).toHaveBeenCalled();
    expect(toastr.info).toHaveBeenCalledWith(
      'Slicer not recognized — parsed as Orca Slicer. Some settings may be missing.'
    );
    expect(dialog.open).not.toHaveBeenCalled();
  });

  it('opens the generic viewer when no parser matches', async () => {
    resolveAs({ parser: null, confidence: 'none', score: 0 });
    const fromModal = { ...createDefaultPrintDetail(), title: 'Modal' };
    dialog.open.and.returnValue({ afterClosed: () => of(fromModal) } as any);
    const print = await service.parse('G28', 'raw.gcode');
    expect(dialog.open).toHaveBeenCalled();
    expect(print?.title).toBe('Modal');
    expect(logging.logEvent).toHaveBeenCalledWith('GcodeAnalyzed', {
      slicer: 'unknown',
      confidence: 'none',
      score: 0,
    });
  });

  it('returns null and toasts an error when the parser throws', async () => {
    resolveAs({});
    parser.parseWithMeta.and.rejectWith(new Error('boom'));
    const print = await service.parse('gcode');
    expect(print).toBeNull();
    expect(toastr.error).toHaveBeenCalled();
    expect(logging.logException).toHaveBeenCalled();
  });

  it('lists supported slicers from the registry', () => {
    registry.getSupportedSlicerNames.and.returnValue(['Orca Slicer', 'Cura']);
    expect(service.getSupportedSlicers()).toEqual(['Orca Slicer', 'Cura']);
  });

  describe('parseWithMeta', () => {
    it("returns the parser's print and detected printer name", async () => {
      resolveAs({ confidence: 'detected' });
      const result = await service.parseWithMeta('gcode', 'file.gcode');
      expect(parser.parseWithMeta).toHaveBeenCalledWith('gcode', 'file.gcode');
      expect(result?.print.title).toBe('Parsed');
      expect(result?.detectedPrinterName).toBe('Bambu Lab X1 Carbon');
    });

    it('detects no printer from the generic viewer', async () => {
      resolveAs({ parser: null, confidence: 'none', score: 0 });
      const fromModal = { ...createDefaultPrintDetail(), title: 'Modal' };
      dialog.open.and.returnValue({ afterClosed: () => of(fromModal) } as any);
      const result = await service.parseWithMeta('G28', 'raw.gcode');
      expect(result).toEqual({ print: fromModal, detectedPrinterName: null });
    });

    it('is null when the viewer is canceled', async () => {
      resolveAs({ parser: null, confidence: 'none', score: 0 });
      dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);
      expect(await service.parseWithMeta('G28')).toBeNull();
    });

    it('is null and toasts an error when the parser throws', async () => {
      resolveAs({});
      parser.parseWithMeta.and.rejectWith(new Error('boom'));
      expect(await service.parseWithMeta('gcode')).toBeNull();
      expect(toastr.error).toHaveBeenCalled();
    });
  });
});
