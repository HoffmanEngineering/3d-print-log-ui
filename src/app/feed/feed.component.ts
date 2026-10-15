import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FeedListComponent } from './feed-list/feed-list.component';

@Component({
  selector: 'app-feed',
  templateUrl: './feed.component.html',
  styleUrls: ['./feed.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FeedListComponent],
})
export class FeedComponent {}
