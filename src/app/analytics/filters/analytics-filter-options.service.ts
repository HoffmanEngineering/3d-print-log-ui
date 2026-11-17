import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import {
  PrinterService,
  PrinterSummarySimple,
} from 'src/app/core/services/printer.service';

export interface FilterOption {
  id: string | number;
  label: string;
  colorHex?: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsFilterOptionsService {
  private readonly printerService = inject(PrinterService);
  private readonly filamentService = inject(FilamentService);

  private readonly printerSummaries = toSignal(
    this.printerService.getCurrentUserPrinterSummaries(1, 200, '', true).pipe(
      map((page) => page?.items ?? []),
      catchError(() => of([] as PrinterSummarySimple[]))
    ),
    { initialValue: [] as PrinterSummarySimple[] }
  );

  readonly printers = computed<FilterOption[]>(() =>
    this.printerSummaries().map((printer) => ({
      id: printer.id,
      label:
        printer.name?.trim() ||
        `${printer.make ?? ''} ${printer.model ?? ''}`.trim(),
    }))
  );

  /**
   * Printers whose category takes resin (3d-print-log-api#294). Their analytics gram figure
   * is the resin itself, weighed through each bottle's density, so they show mL only.
   */
  readonly resinPrinterIds = computed<ReadonlySet<number>>(
    () =>
      new Set(
        this.printerSummaries()
          .filter(
            (printer) =>
              printer.category?.materialCategory?.nickname === 'resin'
          )
          .map((printer) => printer.id)
      )
  );

  readonly materials = toSignal(
    this.filamentService.getCurrentUserFilamentSummaries(1, 200).pipe(
      map((page) =>
        (page?.items ?? []).map((filament) => ({
          id: filament.id,
          label: [
            filament.displayName,
            filament.brand,
            filament.materialType,
            filament.colorName,
          ]
            .filter(Boolean)
            .join(' - '),
          colorHex: filament.colorHex
            ? `#${filament.colorHex.replace(/^#/, '')}`
            : undefined,
        }))
      ),
      catchError(() => of([] as FilterOption[]))
    ),
    { initialValue: [] as FilterOption[] }
  );
}
