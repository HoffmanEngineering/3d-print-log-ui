import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { FeedListComponent } from './feed-list/feed-list.component';
import { FeedRoutingModule } from './feed-routing.module';
import { FeedComponent } from './feed.component';

@NgModule({
  imports: [
    CommonModule,
    FeedRoutingModule,
    SharedModule,
    FeedComponent,
    FeedListComponent,
  ],
})
export class FeedModule {}
