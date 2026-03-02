import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PricingComponent } from './pricing/pricing.component';
import { SubscriptionSuccessComponent } from './success/subscription-success.component';
import { SubscriptionCanceledComponent } from './canceled/subscription-canceled.component';

const routes: Routes = [
  { path: '', component: PricingComponent },
  { path: 'success', component: SubscriptionSuccessComponent },
  { path: 'canceled', component: SubscriptionCanceledComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SubscriptionRoutingModule {}
