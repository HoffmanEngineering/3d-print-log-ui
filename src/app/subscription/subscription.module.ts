import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { SubscriptionRoutingModule } from './subscription-routing.module';
import { PricingComponent } from './pricing/pricing.component';
import { SubscriptionSuccessComponent } from './success/subscription-success.component';
import { SubscriptionCanceledComponent } from './canceled/subscription-canceled.component';

@NgModule({
  imports: [
    SharedModule,
    SubscriptionRoutingModule,
    PricingComponent,
    SubscriptionSuccessComponent,
    SubscriptionCanceledComponent,
  ],
})
export class SubscriptionModule {}
