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
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultFlexDirective,
  DefaultLayoutGapDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatCard, MatCardContent } from '@angular/material/card';
import { PrintSummaryCardComponent } from '../../shared/print-summary-card/print-summary-card.component';
import { MatProgressBar } from '@angular/material/progress-bar';

@Component({
  selector: 'app-feed-list',
  templateUrl: './feed-list.component.html',
  styleUrls: ['./feed-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:scroll)': 'onScroll()',
  },
  imports: [
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    MatCard,
    DefaultFlexDirective,
    DefaultLayoutGapDirective,
    MatCardContent,
    PrintSummaryCardComponent,
    MatProgressBar,
  ],
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
