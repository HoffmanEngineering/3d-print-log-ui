import { importProvidersFrom } from '@angular/core';
import { Routes } from '@angular/router';
import { SharedModule } from '../shared/shared.module';
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
    // The providers SharedModule's imports carry, notably the native
    // DateAdapter and a MatDialog scoped to this section.
    providers: [importProvidersFrom(SharedModule)],
    children: routes,
  },
];
