import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
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
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onScroll()',
  },
})
export class FeedListComponent implements OnInit {
  readonly feed = signal<PrintFeedSummary[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(true);

  private readonly feedService = inject(FeedService);

  ngOnInit(): void {
    this.loading.set(true);
    this.feedService.GetFeed(new Date()).subscribe({
      next: (items) => {
        this.feed.set(items);
        if (items.length === 0) {
          this.hasMore.set(false);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  onScroll(): void {
    if (this.loadingMore() || this.loading() || !this.hasMore()) {
      return;
    }

    const scrollPosition = window.innerHeight + window.scrollY;
    const documentHeight = document.documentElement.scrollHeight;

    if (documentHeight - scrollPosition < 200) {
      this.loadMore();
    }
  }

  loadMore(): void {
    const items = this.feed();
    const lastItem = items[items.length - 1];
    const fromDate = lastItem?.createdDate ?? new Date();

    this.loadingMore.set(true);
    this.feedService.GetFeed(fromDate).subscribe({
      next: (newItems) => {
        if (newItems.length === 0) {
          this.hasMore.set(false);
        } else {
          this.feed.update((current) => [...current, ...newItems]);
        }
        this.loadingMore.set(false);
      },
      error: () => {
        this.loadingMore.set(false);
      },
    });
  }
}
