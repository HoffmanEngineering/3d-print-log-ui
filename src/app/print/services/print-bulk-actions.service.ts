import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  BulkPrintResult,
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintViewStatus,
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
  /**
   * Set when the request itself was rejected (a 400), so the caller can show the API's
   * reason rather than a generic count. Null when the batch ran normally.
   */
  errorMessage: string | null;
}

/**
 * The kind of batch currently running, used for the progress copy and the analytics event name.
 */
export type BulkActionKind =
  | 'status'
  | 'delete'
  | 'project'
  // Removal is its own kind, not a 'project' with an empty value: it needs its own
  // progress copy and its own analytics event.
  | 'removeProject'
  | 'visibility'
  | 'printer'
  | 'permissions';

const PROGRESS_VERBS: Record<BulkActionKind, string> = {
  status: 'Updating status',
  delete: 'Deleting',
  project: 'Assigning to project',
  removeProject: 'Removing from project',
  visibility: 'Updating visibility',
  printer: 'Reassigning printer',
  permissions: 'Updating permissions',
};

const COMPLETED_EVENTS: Record<BulkActionKind, string> = {
  status: 'SetStatusCompleted',
  delete: 'DeleteCompleted',
  project: 'SetProjectCompleted',
  removeProject: 'RemoveProjectCompleted',
  visibility: 'SetVisibilityCompleted',
  printer: 'SetPrinterCompleted',
  permissions: 'SetPermissionsCompleted',
};

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
    const kind = this.kind();
    const verb = kind ? PROGRESS_VERBS[kind] : 'Working';
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
   * Ids per request. Well under the API's 200 cap, and small enough that the determinate
   * progress bar still moves several times on a large selection.
   */
  private static readonly CHUNK_SIZE = 25;

  /** Applies `newStatus` to every selected print. */
  public setStatusForSelected(
    newStatus: PrintStatus
  ): Promise<BulkActionResult> {
    return this.runBulk('status', (printIds) =>
      this.printService.bulkUpdatePrints({ printIds, status: newStatus })
    );
  }

  /** Assigns every selected print to an existing project, moving any that were in another. */
  public setProjectForSelected(projectId: string): Promise<BulkActionResult> {
    return this.runBulk('project', (printIds) =>
      this.printService.bulkUpdatePrints({ printIds, projectId })
    );
  }

  /** Takes every selected print out of whatever project it was in. */
  public removeProjectFromSelected(): Promise<BulkActionResult> {
    return this.runBulk('removeProject', (printIds) =>
      this.printService.bulkUpdatePrints({ printIds, clear: ['projectId'] })
    );
  }

  /** Sets who can see every selected print. */
  public setViewStatusForSelected(
    viewStatus: PrintViewStatus
  ): Promise<BulkActionResult> {
    return this.runBulk('visibility', (printIds) =>
      this.printService.bulkUpdatePrints({ printIds, viewStatus })
    );
  }

  /** Moves every selected print onto another of the user's printers. */
  public setPrinterForSelected(printerId: number): Promise<BulkActionResult> {
    return this.runBulk('printer', (printIds) =>
      this.printService.bulkUpdatePrints({ printIds, printerId })
    );
  }

  /** Sets only the permissions named in `patch`; the others are left alone. */
  public setPermissionsForSelected(patch: {
    allowComments?: boolean;
    allowFileDownloads?: boolean;
  }): Promise<BulkActionResult> {
    return this.runBulk('permissions', (printIds) =>
      this.printService.bulkUpdatePrints({ printIds, ...patch })
    );
  }

  /**
   * Deletes every selected print. The caller is responsible for confirming first.
   */
  public deleteSelected(): Promise<BulkActionResult> {
    return this.runBulk('delete', (printIds) =>
      this.printService.bulkDeletePrints(printIds)
    );
  }

  /**
   * Runs one bulk action over the selection, 25 ids per request.
   *
   * Chunking is what keeps the progress bar determinate: `processed` advances by a whole
   * chunk as each response lands. A chunk that errors marks its whole chunk failed and the
   * run continues - the API writes a request all-or-nothing, so that report is accurate
   * rather than merely pessimistic. A 400 means the request shape itself was rejected, so
   * every remaining chunk would fail the same way and the run stops sending.
   *
   * The loop is deliberately NOT cancelled when the list component is destroyed.
   * The service is scoped to that component, so navigating away mid-batch would
   * abandon the run - leaving, say, 25 of 60 prints updated with nobody told
   * which. Finishing the work the user asked for is the safer half of that
   * trade; the signal writes that outlive the component are inert.
   */
  private async runBulk(
    kind: BulkActionKind,
    operation: (printIds: number[]) => Observable<BulkPrintResult>
  ): Promise<BulkActionResult> {
    const prints = this.selectedPrints();
    const result: BulkActionResult = {
      succeededIds: [],
      failedIds: [],
      failuresRetained: false,
      errorMessage: null,
    };

    if (prints.length === 0 || this.running()) {
      return result;
    }

    // The batch works from this snapshot, so the restore below must come from it too -
    // reading the live selection back would lose the failures if the user changed the
    // result set (which clears the selection) mid-batch.
    const startEpoch = this.selectionEpoch;
    const allIds = prints.map((print) => print.id);

    const chunks: number[][] = [];
    for (
      let i = 0;
      i < allIds.length;
      i += PrintBulkActionsService.CHUNK_SIZE
    ) {
      chunks.push(allIds.slice(i, i + PrintBulkActionsService.CHUNK_SIZE));
    }

    this.kind.set(kind);
    this.total.set(allIds.length);
    this.processed.set(0);
    this.running.set(true);

    try {
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        try {
          const response = await firstValueFrom(operation(chunk));
          result.succeededIds.push(...response.succeeded);
          result.failedIds.push(
            ...response.failed.map((failure) => failure.id)
          );

          // The API reports every id it was sent. If one comes back in neither
          // list - a version skew, a truncated body - treat it as failed rather
          // than dropping it: an unreported id would otherwise be deselected as
          // though it had succeeded, and the user would never learn it did not.
          const reported = new Set([
            ...response.succeeded,
            ...response.failed.map((failure) => failure.id),
          ]);
          result.failedIds.push(...chunk.filter((id) => !reported.has(id)));
        } catch (error) {
          result.failedIds.push(...chunk);
          this.loggingService.logException(error);

          if (error instanceof HttpErrorResponse && error.status === 400) {
            // The request shape was rejected; the remaining chunks are identical apart
            // from their ids, so sending them would only repeat the same rejection.
            result.errorMessage =
              error.error?.detail ??
              error.error?.title ??
              'The request was rejected.';
            const unsent = chunks.slice(i + 1).flat();
            result.failedIds.push(...unsent);
            this.processed.set(allIds.length);
            break;
          }
        } finally {
          // The 400 branch above already jumped the counter to the end, so this must not
          // push it past the total.
          this.processed.update((count) =>
            Math.min(count + chunk.length, allIds.length)
          );
        }
      }
    } finally {
      this.running.set(false);
    }

    // Keep only the failures selected so the user can retry them directly. If the user
    // touched the selection while the batch ran, their choice wins and we leave it alone -
    // the result then says the failures were not retained.
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
      `PrintBulkActionBar_${COMPLETED_EVENTS[kind]}`,
      {
        attempted: allIds.length,
        succeeded: result.succeededIds.length,
        failed: result.failedIds.length,
      }
    );

    return result;
  }
}
