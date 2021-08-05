import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { FeedListComponent } from './feed-list/feed-list.component';
import { FeedRoutingModule } from './feed-routing.module';
import { FeedComponent } from './feed.component';

@NgModule({
  declarations: [FeedComponent, FeedListComponent],
  imports: [CommonModule, FeedRoutingModule, SharedModule],
})
export class FeedModule {}
