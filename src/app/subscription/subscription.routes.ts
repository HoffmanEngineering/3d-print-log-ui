import { Routes } from '@angular/router';
import { provideSectionProviders } from '../shared/section-providers';
import { PricingComponent } from './pricing/pricing.component';
import { SubscriptionSuccessComponent } from './success/subscription-success.component';
import { SubscriptionCanceledComponent } from './canceled/subscription-canceled.component';

const routes: Routes = [
  { path: '', component: PricingComponent },
  { path: 'success', component: SubscriptionSuccessComponent },
  { path: 'canceled', component: SubscriptionCanceledComponent },
];

export const SUBSCRIPTION_ROUTES: Routes = [
  {
    path: '',
    providers: provideSectionProviders(),
    children: routes,
  },
];
