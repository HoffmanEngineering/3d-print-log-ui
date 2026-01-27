import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { NotificationsRoutingModule } from './notifications-routing.module';
import { NotificationsListComponent } from './notifications-list/notifications-list.component';

@NgModule({
  declarations: [NotificationsListComponent],
  imports: [SharedModule, NotificationsRoutingModule],
})
export class NotificationsModule {}
