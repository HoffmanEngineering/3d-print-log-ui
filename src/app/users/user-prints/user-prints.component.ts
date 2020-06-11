import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
} from '@angular/core';
import { debounce } from 'lodash';
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
export class UserPrintsComponent implements OnChanges {
  @Input() userId: number;
  @Input() userProfilePictureUrl: string;
  @Input() userName: string;

  public prints: PrintSummary[] = [];

  public pageNumber = 1;
  public PAGE_SIZE = 10;

  public searchText = '';

  public filterByStatus: PrintStatus | null = -1;

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = PrintSummarySortColumn;

  public debouncedUpdateFilter;

  public showLoadMore = true;

  constructor(private readonly printService: PrintService) {
    this.debouncedUpdateFilter = debounce(() => {
      // Clear the loaded prints, since we don't need them visible anymore
      this.clearPrints();
      this.updateFilter();
    }, 400);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.userId || changes.userProfilePictureUrl || changes.userName) {
      this.searchText = '';
      this.filterByStatus = -1;
      this.clearPrints();
      this.updateFilter();
    }
  }

  clearPrints() {
    this.prints = [];
  }
  updateFilter(): any {
    this.printService
      .getPrintSummaries(
        this.pageNumber,
        this.PAGE_SIZE,
        this.searchText,
        this.filterByStatus,
        undefined,
        undefined,
        this.userId
      )
      .subscribe((response) => {
        this.pageNumber = response.paging.currentPage;
        this.prints = [...this.prints, ...response.items];

        this.showLoadMore = this.pageNumber < response.paging.totalPages;
      });
  }

  loadNextPage() {
    this.pageNumber++;

    this.updateFilter();
  }
}
