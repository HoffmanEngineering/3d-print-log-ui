import {
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnInit,
  QueryList,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
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

@Component({
  selector: 'app-user-prints',
  templateUrl: './user-prints.component.html',
  styleUrls: ['./user-prints.component.scss'],
})
export class UserPrintsComponent implements OnChanges, OnInit {
  @Input() userId: number;
  @Input() userProfilePictureUrl: string;
  @Input() userName: string;

  @ViewChildren('PrintSummaryCard') summaryCards: QueryList<ElementRef>;

  public prints: PrintSummary[] = [];

  public pageNumber = 1;
  public PAGE_SIZE = 10;

  public searchText = '';

  public filterByStatus: PrintStatus | null = -1;

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = PrintSummarySortColumn;

  public debouncedUpdateFilter;

  public showLoadMore = true;
  printListSubscription: Subscription;

  constructor(
    private readonly printService: PrintService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly loggingService: LoggingService
  ) {
    this.debouncedUpdateFilter = debounce(() => {
      this.router.navigate(['.'], {
        queryParams: {
          searchText: this.searchText !== '' ? this.searchText : null,
        },
        relativeTo: this.activatedRoute,
      });
    }, 400);
  }

  ngOnInit() {
    this.activatedRoute.queryParamMap.subscribe((params) => {
      if (params.has('searchText')) {
        this.searchText = params.get('searchText');
        this.clearPrints();
        this.pageNumber = 1;
        this.updateFilter();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.userId) {
      this.searchText = '';
      this.filterByStatus = -1;
      this.clearPrints();
      this.updateFilter();
    }
  }

  public clearPrints() {
    this.prints = [];
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
          this.searchText,
          this.filterByStatus,
          [],
          undefined,
          undefined,
          this.userId
        )
        .subscribe((response) => {
          this.pageNumber = response.paging.currentPage;
          this.prints = [...this.prints, ...response.items];

          this.showLoadMore = this.pageNumber < response.paging.totalPages;
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

    const previousLastPrint = this.summaryCards.last;

    await this.updateFilter();
    setTimeout(() => {
      (previousLastPrint?.nativeElement as HTMLElement)?.scrollIntoView(false);
    });
  }
}
