import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
} from 'src/app/core/services/print.service';

/**
 * The outcome of a sequential batch. `failedIds` stay selected so the user can retry them.
 */
export interface BulkActionResult {
  succeededIds: number[];
  failedIds: number[];
  /**
   * True when the failures were put back into the selection for a retry. False
   * when the user changed the selection while the batch was running: their
   * choice wins, and the caller must not claim the failures are still selected.
   */
  failuresRetained: boolean;
}

/**
 * The kind of batch currently running, used for the progress copy and the analytics event name.
 */
export type BulkActionKind = 'status' | 'delete';

/**
 * Owns multi-select state for the print list and runs bulk actions against the
 * single-item `PrintService` endpoints (the API has no batch endpoints).
 *
 * Selection semantics:
 * - Selection is keyed by print id and only ever contains prints the user has seen.
 * - Select-all is scoped to the prints currently on screen (the current page).
 * - The selection survives paging, searching, filtering and sorting, matching the
 *   material list. Each entry holds the whole `PrintSummary`, so a batch can act on
 *   prints that are no longer on screen; only the user clears the selection.
 * - After a batch, prints that failed stay selected so a retry is one click away.
 *
 * Provided by `PrintListComponent` (not root) so the selection dies with the list.
 */
@Injectable()
export class PrintBulkActionsService {
  private readonly printService = inject(PrintService);
  private readonly loggingService = inject(LoggingService);

  private readonly selection = signal<ReadonlyMap<number, PrintSummary>>(
    new Map()
  );

  /**
   * Bumped by every user-driven selection change. A batch captures it on entry
   * so it can tell whether the selection it started from is still the user's.
   */
  private selectionEpoch = 0;

  private readonly processed = signal(0);
  private readonly total = signal(0);
  private readonly running = signal(false);
  private readonly kind = signal<BulkActionKind | null>(null);

  /** The currently selected prints, in selection order. */
  public readonly selectedPrints = computed(() =>
    Array.from(this.selection().values())
  );

  public readonly selectedCount = computed(() => this.selection().size);

  public readonly hasSelection = computed(() => this.selection().size > 0);

  /** True while a batch is running. Actions are disabled for the duration. */
  public readonly isRunning = this.running.asReadonly();

  public readonly processedCount = this.processed.asReadonly();

  public readonly totalCount = this.total.asReadonly();

  /** Determinate progress bar value, 0-100. */
  public readonly progressPercent = computed(() => {
    const total = this.total();
    return total === 0 ? 0 : Math.round((this.processed() / total) * 100);
  });

  /** Screen-reader and on-screen progress copy, e.g. "Updating status: 2 of 6". */
  public readonly progressLabel = computed(() => {
    if (!this.running()) {
      return '';
    }
    const verb = this.kind() === 'delete' ? 'Deleting' : 'Updating status';
    return `${verb}: ${this.processed()} of ${this.total()}`;
  });

  public isSelected(printId: number): boolean {
    return this.selection().has(printId);
  }

  public toggleSelection(print: PrintSummary): void {
    this.selectionEpoch++;
    this.selection.update((current) => {
      const next = new Map(current);
      if (next.has(print.id)) {
        next.delete(print.id);
      } else {
        next.set(print.id, print);
      }
      return next;
    });
  }

  /** True when every print on the current page is selected. */
  public isAllOnPageSelected(pagePrints: readonly PrintSummary[]): boolean {
    return (
      pagePrints.length > 0 &&
      pagePrints.every((print) => this.selection().has(print.id))
    );
  }

  /** True when some, but not all, of the current page is selected. */
  public isIndeterminate(pagePrints: readonly PrintSummary[]): boolean {
    const selectedOnPage = pagePrints.filter((print) =>
      this.selection().has(print.id)
    ).length;
    return selectedOnPage > 0 && selectedOnPage < pagePrints.length;
  }

  /** Selects, or clears, every print on the current page. */
  public toggleSelectAllOnPage(pagePrints: readonly PrintSummary[]): void {
    const selectAll = !this.isAllOnPageSelected(pagePrints);
    this.selectionEpoch++;
    this.selection.update((current) => {
      const next = new Map(current);
      for (const print of pagePrints) {
        if (selectAll) {
          next.set(print.id, print);
        } else {
          next.delete(print.id);
        }
      }
      return next;
    });
  }

  /**
   * Drops one print from the selection. Used when a print leaves the list on its
   * own - a single delete, say - so the selection cannot hold prints that no
   * longer exist. A no-op when the print was not selected.
   */
  public deselect(printId: number): void {
    if (!this.selection().has(printId)) {
      return;
    }

    this.selectionEpoch++;
    this.selection.update((current) => {
      const next = new Map(current);
      next.delete(printId);
      return next;
    });
  }

  public clearSelection(): void {
    this.selectionEpoch++;
    this.selection.set(new Map());
  }

  /**
   * Applies `newStatus` to every selected print, one request at a time.
   * Individual failures never abort the batch.
   */
  public setStatusForSelected(
    newStatus: PrintStatus
  ): Promise<BulkActionResult> {
    return this.runBatch('status', (print) =>
      this.printService.updatePrintStatus(print.id, newStatus)
    );
  }

  /**
   * Deletes every selected print, one request at a time. The caller is
   * responsible for confirming first.
   */
  public deleteSelected(): Promise<BulkActionResult> {
    return this.runBatch('delete', (print) =>
      this.printService.deletePrint(print.id)
    );
  }

  private async runBatch(
    kind: BulkActionKind,
    operation: (print: PrintSummary) => Observable<unknown>
  ): Promise<BulkActionResult> {
    const prints = this.selectedPrints();
    const result: BulkActionResult = {
      succeededIds: [],
      failedIds: [],
      failuresRetained: false,
    };

    if (prints.length === 0 || this.running()) {
      return result;
    }

    // The batch works from this snapshot, so the restore below must come from it
    // too - reading the live selection back would lose the failures if the user
    // changed the result set (which clears the selection) mid-batch.
    const startEpoch = this.selectionEpoch;

    this.kind.set(kind);
    this.total.set(prints.length);
    this.processed.set(0);
    this.running.set(true);

    try {
      for (const print of prints) {
        try {
          await firstValueFrom(operation(print));
          result.succeededIds.push(print.id);
        } catch (error) {
          result.failedIds.push(print.id);
          this.loggingService.logException(error);
        } finally {
          this.processed.update((count) => count + 1);
        }
      }
    } finally {
      this.running.set(false);
    }

    // Keep only the failures selected so the user can retry them directly. If the
    // user touched the selection while the batch ran, their choice wins and we
    // leave it alone - the result then says the failures were not retained.
    if (this.selectionEpoch === startEpoch) {
      const failedIds = new Set(result.failedIds);
      const retained = new Map<number, PrintSummary>();
      for (const print of prints) {
        if (failedIds.has(print.id)) {
          retained.set(print.id, print);
        }
      }
      this.selection.set(retained);
      result.failuresRetained = retained.size > 0;
    }

    this.loggingService.logEvent(
      kind === 'delete'
        ? 'PrintBulkActionBar_DeleteCompleted'
        : 'PrintBulkActionBar_SetStatusCompleted',
      {
        attempted: prints.length,
        succeeded: result.succeededIds.length,
        failed: result.failedIds.length,
      }
    );

    return result;
  }
}
