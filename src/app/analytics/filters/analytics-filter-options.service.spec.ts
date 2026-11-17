import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import {
  PrinterService,
  PrinterSummarySimple,
} from 'src/app/core/services/printer.service';
import { AnalyticsFilterOptionsService } from './analytics-filter-options.service';

const printer = (
  id: number,
  materialCategory: string | null
): PrinterSummarySimple =>
  ({
    id,
    name: `Printer ${id}`,
    make: '',
    model: '',
    isActive: true,
    loadedFilaments: [],
    category: materialCategory
      ? { materialCategory: { nickname: materialCategory } }
      : null,
  }) as unknown as PrinterSummarySimple;

describe('AnalyticsFilterOptionsService', () => {
  let printerService: MockedObject<PrinterService>;

  const create = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PrinterService, useValue: printerService },
        {
          provide: FilamentService,
          useValue: {
            getCurrentUserFilamentSummaries: () => of({ items: [] }),
          },
        },
      ],
    });
    return TestBed.inject(AnalyticsFilterOptionsService);
  };

  beforeEach(() => {
    printerService = {
      getCurrentUserPrinterSummaries: vi
        .fn()
        .mockName('PrinterService.getCurrentUserPrinterSummaries'),
    } as unknown as MockedObject<PrinterService>;
  });

  // 3d-print-log-api#294: a resin printer's grams are its resin, so it shows mL only.
  it('lists the printers whose category takes resin', () => {
    printerService.getCurrentUserPrinterSummaries.mockReturnValue(
      of({
        items: [printer(1, 'filament'), printer(2, 'resin'), printer(3, null)],
      } as never)
    );

    const service = create();

    expect(service.resinPrinterIds()).toEqual(new Set([2]));
    expect(service.printers().map((p) => p.id)).toEqual([1, 2, 3]);
  });

  it('knows no resin printers when the list fails to load', () => {
    printerService.getCurrentUserPrinterSummaries.mockReturnValue(
      throwError(() => new Error('boom'))
    );

    const service = create();

    expect(service.resinPrinterIds()).toEqual(new Set());
    expect(service.printers()).toEqual([]);
  });
});
