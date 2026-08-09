import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LoggingService } from 'src/app/core/services/logging.service';
import { EmptyStateComponent } from 'src/app/shared/empty-state/empty-state.component';

/**
 * Empty state for the print list. It tells two very different stories:
 *
 * - filters and/or a search term are active, so the user needs a way out; or
 * - the account genuinely has no prints yet, so the user needs a way in.
 */
@Component({
  selector: 'app-print-empty-state',
  imports: [EmptyStateComponent, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './print-empty-state.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintEmptyStateComponent {
  /** Number of filters (status, printer, material) currently applied. */
  readonly activeFilterCount = input(0);

  /** Current free-text search term, if any. */
  readonly searchText = input('');

  /**
   * Whether the user owns at least one printer. `null` means the lookup has
   * not resolved yet, in which case the first-run branch renders nothing
   * rather than briefly advising the wrong first step.
   */
  readonly hasPrinters = input<boolean | null>(null);

  /** Whether the host already provides a polite live region. */
  readonly announce = input(true);

  /** Requests that every filter and the search term be cleared. */
  readonly clearFilters = output<void>();

  /** Requests that the hidden G-code file picker be opened. */
  readonly importGcode = output<void>();

  private readonly loggingService = inject(LoggingService);

  readonly hasSearch = computed(() => this.searchText().trim().length > 0);

  /** True when something the user chose is hiding results. */
  readonly isFiltered = computed(
    () => this.activeFilterCount() > 0 || this.hasSearch()
  );

  readonly filteredMessage = computed(() => {
    const parts: string[] = [];
    const count = this.activeFilterCount();

    if (count > 0) {
      parts.push(`${count} active filter${count === 1 ? '' : 's'}`);
    }

    if (this.hasSearch()) {
      parts.push(`a search for "${this.searchText().trim()}"`);
    }

    return `Nothing matched ${parts.join(' and ')}. Clear them to see your whole print log.`;
  });

  onClearFilters(): void {
    this.loggingService.logEvent('PrintEmptyState_ClearFilters', {
      activeFilterCount: this.activeFilterCount(),
      hasSearch: this.hasSearch(),
    });
    this.clearFilters.emit();
  }

  onAddPrint(): void {
    this.loggingService.logEvent('PrintEmptyState_AddPrint');
  }

  onAddPrinter(): void {
    this.loggingService.logEvent('PrintEmptyState_AddPrinter');
  }

  onImportGcode(): void {
    this.loggingService.logEvent('PrintEmptyState_ImportGcode');
    this.importGcode.emit();
  }
}
