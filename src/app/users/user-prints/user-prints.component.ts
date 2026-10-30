import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  effect,
  input,
  viewChildren,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce } from 'lodash-es';
import { Subscription } from 'rxjs';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from 'src/app/core/services/print.service';
import { toSortHeaderIds } from '../../core/utils/sort-header-ids';
import {
  DefaultLayoutDirective,
  DefaultFlexDirective,
  DefaultLayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatSelect, MatOption } from '@angular/material/select';
import { PrintSummaryCardComponent } from '../../shared/print-summary-card/print-summary-card.component';
import { MatButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';

@Component({
  selector: 'app-user-prints',
  templateUrl: './user-prints.component.html',
  styleUrls: ['./user-prints.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DefaultLayoutDirective,
    DefaultFlexDirective,
    DefaultLayoutGapDirective,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatSelect,
    MatOption,
    PrintSummaryCardComponent,
    MatButton,
    MatCard,
  ],
})
export class UserPrintsComponent implements OnInit {
  private readonly printService = inject(PrintService);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly loggingService = inject(LoggingService);
  private readonly destroyRef = inject(DestroyRef);

  readonly userId = input<number>();
  readonly userProfilePictureUrl = input<string>();
  readonly userName = input<string>();

  readonly summaryCards = viewChildren<ElementRef>('PrintSummaryCard');

  readonly prints = signal<PrintSummary[]>([]);

  public pageNumber = 1;
  public PAGE_SIZE = 10;

  readonly searchText = signal('');

  readonly filterByStatus = signal<PrintStatus | null>(null);

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = toSortHeaderIds(PrintSummarySortColumn);

  public debouncedUpdateFilter;

  readonly showLoadMore = signal(true);
  printListSubscription: Subscription;

  constructor() {
    this.debouncedUpdateFilter = debounce(() => {
      this.router.navigate(['.'], {
        queryParams: {
          searchText: this.searchText() !== '' ? this.searchText() : null,
        },
        relativeTo: this.activatedRoute,
      });
    }, 400);

    // A new user resets the filters. The first run keeps them: searchText may
    // already hold the ?searchText from ngOnInit, which this effect can run
    // either side of.
    let firstUser = true;
    effect(() => {
      this.userId();
      untracked(() => {
        if (!firstUser) {
          this.searchText.set('');
          this.filterByStatus.set(null);
        }
        firstUser = false;
        this.clearPrints();
        this.updateFilter();
      });
    });
  }

  ngOnInit() {
    this.activatedRoute.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        if (params.has('searchText')) {
          this.searchText.set(params.get('searchText'));
          this.clearPrints();
          this.pageNumber = 1;
          this.updateFilter();
        }
      });
  }

  public clearPrints() {
    this.prints.set([]);
  }
  public async updateFilter(): Promise<void> {
    return new Promise((resolve) => {
      if (this.printListSubscription) {
        this.printListSubscription.unsubscribe();
      }
      this.printListSubscription = this.printService
        .getPrintSummaries(
          this.pageNumber,
          this.PAGE_SIZE,
          this.searchText(),
          this.filterByStatus(),
          [],
          [],
          undefined,
          undefined,
          this.userId()
        )
        .subscribe((response) => {
          this.pageNumber = response.paging.currentPage;
          this.prints.update((prints) => [...prints, ...response.items]);

          this.showLoadMore.set(this.pageNumber < response.paging.totalPages);
          resolve();
        });
    });
  }

  /**
   * Loads the next page of prints, and scrolls to the previous last print (so that the scroll does not move for the user)
   */
  async loadNextPage() {
    this.loggingService.logEvent('UserPrintLoadMorePrintClicked');
    this.pageNumber++;

    const previousLastPrint = this.summaryCards().at(-1)!;

    await this.updateFilter();
    setTimeout(() => {
      (previousLastPrint?.nativeElement as HTMLElement)?.scrollIntoView(false);
    });
  }
}
