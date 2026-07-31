import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, of } from 'rxjs';
import { FilamentService } from 'src/app/core/services/filament.service';
import { PrinterService } from 'src/app/core/services/printer.service';

export interface FilterOption {
  id: string | number;
  label: string;
  colorHex?: string;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsFilterOptionsService {
  private readonly printerService = inject(PrinterService);
  private readonly filamentService = inject(FilamentService);

  readonly printers = toSignal(
    this.printerService.getCurrentUserPrinterSummaries(1, 200, '', true).pipe(
      map((page) =>
        (page?.items ?? []).map((printer) => ({
          id: printer.id,
          label:
            printer.name?.trim() ||
            `${printer.make ?? ''} ${printer.model ?? ''}`.trim(),
        }))
      ),
      catchError(() => of([] as FilterOption[]))
    ),
    { initialValue: [] as FilterOption[] }
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
