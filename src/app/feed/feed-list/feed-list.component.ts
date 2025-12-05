import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
} from '@angular/core';
import {
  FeedService,
  PrintFeedSummary,
} from 'src/app/core/services/feed.service';

@Component({
  selector: 'app-feed-list',
  templateUrl: './feed-list.component.html',
  styleUrls: ['./feed-list.component.scss'],
  standalone: false,
})
export class FeedListComponent implements OnInit {
  public feed: PrintFeedSummary[] = [];

  @ViewChildren('PrintSummaryCard') summaryCards: QueryList<ElementRef>;

  constructor(private readonly feedService: FeedService) {}

  ngOnInit(): void {
    const now = new Date();
    this.feedService.GetFeed(now).subscribe((feed) => {
      this.feed = feed;
    });
  }

  public async updateFilter(fromDate: Date): Promise<void> {
    return new Promise((resolve) => {
      this.feedService.GetFeed(fromDate).subscribe((newFeedItems) => {
        this.feed = [...this.feed, ...newFeedItems];

        resolve();
      });
    });
  }

  async loadNextPage() {
    // this.loggingService.logEvent('UserPrintLoadMorePrintClicked');

    const previousLastPrint = this.summaryCards.last;
    const previousLastFromDate =
      this.feed[this.feed.length - 1]?.createdDate ?? new Date();

    await this.updateFilter(previousLastFromDate);
    setTimeout(() => {
      (previousLastPrint?.nativeElement as HTMLElement)?.scrollIntoView(false);
    });
  }
}
