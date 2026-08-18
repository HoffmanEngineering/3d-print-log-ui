import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import {
  PrintFilamentSourceMeasurement,
  PrintService,
  PrintSummary,
  PrintSummarySortColumn,
} from 'src/app/core/services/print.service';
import { SortDirection } from 'src/app/core/types/sort-request';
import { withDeferredSkeleton } from 'src/app/shared/skeleton/deferred-skeleton';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { FilamentPrintRowComponent } from '../filament-print-row/filament-print-row.component';

type PanelPhase = 'idle' | 'loading' | 'ready' | 'error';

interface PanelState {
  phase: PanelPhase;
  prints: PrintSummary[];
  totalCount: number;
}

const IDLE_STATE: PanelState = { phase: 'idle', prints: [], totalCount: 0 };
const LOADING_STATE: PanelState = {
  phase: 'loading',
  prints: [],
  totalCount: 0,
};
const ERROR_STATE: PanelState = { phase: 'error', prints: [], totalCount: 0 };

const PAGE_SIZE = 10;

/** The recent prints that consumed a given spool, shown beside the material form. */
@Component({
  selector: 'app-filament-prints-panel',
  templateUrl: './filament-prints-panel.component.html',
  styleUrls: ['./filament-prints-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    SkeletonComponent,
    FilamentPrintRowComponent,
  ],
})
export class FilamentPrintsPanelComponent {
  private readonly printService = inject(PrintService);

  readonly filamentId = input.required<string>();
  readonly preferredUnit = input<PrintFilamentSourceMeasurement>(
    PrintFilamentSourceMeasurement.Weight
  );

  private readonly retryCount = signal(0);

  private readonly request = computed(() => ({
    id: this.filamentId(),
    attempt: this.retryCount(),
  }));

  /**
   * Fetched here rather than through a resolver on purpose: a rejected resolver
   * cancels navigation and bounces to '/', so a slow or failing prints query
   * would block the form the user actually came to edit. The panel owns its own
   * request and its own failure.
   */
  private readonly state = toSignal(
    toObservable(this.request).pipe(
      switchMap(({ id }) =>
        this.printService
          .getPrintSummaries(
            1,
            PAGE_SIZE,
            '',
            null,
            [],
            [id],
            SortDirection.Desc,
            PrintSummarySortColumn.StartDate
          )
          .pipe(
            map(
              (paged): PanelState => ({
                phase: 'ready',
                prints: paged.items ?? [],
                totalCount: paged.paging?.totalCount ?? 0,
              })
            ),
            catchError(() => of(ERROR_STATE)),
            // Inside the switchMap so each re-subscription gets fresh timers.
            withDeferredSkeleton(LOADING_STATE)
          )
      )
    ),
    { initialValue: IDLE_STATE }
  );

  protected readonly phase = computed(() => this.state().phase);
  protected readonly prints = computed(() => this.state().prints);
  protected readonly totalCount = computed(() => this.state().totalCount);
  protected readonly hasMore = computed(
    () => this.totalCount() > this.prints().length
  );

  /**
   * The print list reads the SINGULAR `filterByFilamentId` query parameter, not
   * the plural name the service method uses.
   */
  protected readonly viewAllParams = computed(() => ({
    filterByFilamentId: this.filamentId(),
  }));

  protected retry(): void {
    this.retryCount.update((count) => count + 1);
  }
}
