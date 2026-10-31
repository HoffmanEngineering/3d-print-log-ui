import type { MockedObject } from 'vitest';
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
  let registry: MockedObject<SlicerRegistry>;
  let dialog: MockedObject<MatDialog>;
  let toastr: MockedObject<ToastrService>;
  let logging: MockedObject<LoggingService>;
  let parser: MockedObject<GcodeParserBase>;

  beforeEach(() => {
    registry = {
      resolve: vi.fn().mockName('SlicerRegistry.resolve'),
      getSupportedSlicerNames: vi
        .fn()
        .mockName('SlicerRegistry.getSupportedSlicerNames'),
    } as unknown as MockedObject<SlicerRegistry>;
    dialog = {
      open: vi.fn().mockName('MatDialog.open'),
    } as unknown as MockedObject<MatDialog>;
    toastr = {
      error: vi.fn().mockName('ToastrService.error'),
      info: vi.fn().mockName('ToastrService.info'),
    } as unknown as MockedObject<ToastrService>;
    logging = {
      logEvent: vi.fn().mockName('LoggingService.logEvent'),
      logException: vi.fn().mockName('LoggingService.logException'),
    } as unknown as MockedObject<LoggingService>;
    // parse() goes through parseWithMeta, so the parser's own parse() is never called.
    parser = {
      parseWithMeta: vi.fn().mockName('Parser.parseWithMeta'),
      slicerName: 'Orca Slicer',
    } as unknown as MockedObject<GcodeParserBase>;
    parser.parseWithMeta.mockResolvedValue({
      print: { ...createDefaultPrintDetail(), title: 'Parsed' },
      detectedPrinterNames: ['Bambu Lab X1 Carbon'],
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
    registry.resolve.mockReturnValue({
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
    dialog.open.mockReturnValue({ afterClosed: () => of(fromModal) } as any);
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
    parser.parseWithMeta.mockRejectedValue(new Error('boom'));
    const print = await service.parse('gcode');
    expect(print).toBeNull();
    expect(toastr.error).toHaveBeenCalled();
    expect(logging.logException).toHaveBeenCalled();
  });

  it('lists supported slicers from the registry', () => {
    registry.getSupportedSlicerNames.mockReturnValue(['Orca Slicer', 'Cura']);
    expect(service.getSupportedSlicers()).toEqual(['Orca Slicer', 'Cura']);
  });

  describe('parseWithMeta', () => {
    it("returns the parser's print and detected printer names", async () => {
      resolveAs({ confidence: 'detected' });
      const result = await service.parseWithMeta('gcode', 'file.gcode');
      expect(parser.parseWithMeta).toHaveBeenCalledWith('gcode', 'file.gcode');
      expect(result?.print.title).toBe('Parsed');
      expect(result?.detectedPrinterNames).toEqual(['Bambu Lab X1 Carbon']);
    });

    it('detects no printer from the generic viewer', async () => {
      resolveAs({ parser: null, confidence: 'none', score: 0 });
      const fromModal = { ...createDefaultPrintDetail(), title: 'Modal' };
      dialog.open.mockReturnValue({ afterClosed: () => of(fromModal) } as any);
      const result = await service.parseWithMeta('G28', 'raw.gcode');
      expect(result).toEqual({ print: fromModal, detectedPrinterNames: [] });
    });

    it('is null when the viewer is canceled', async () => {
      resolveAs({ parser: null, confidence: 'none', score: 0 });
      dialog.open.mockReturnValue({ afterClosed: () => of(undefined) } as any);
      expect(await service.parseWithMeta('G28')).toBeNull();
    });

    it('is null and toasts an error when the parser throws', async () => {
      resolveAs({});
      parser.parseWithMeta.mockRejectedValue(new Error('boom'));
      expect(await service.parseWithMeta('gcode')).toBeNull();
      expect(toastr.error).toHaveBeenCalled();
    });
  });
});
