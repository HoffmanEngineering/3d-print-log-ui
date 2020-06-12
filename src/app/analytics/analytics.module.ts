import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { AnalyticsRoutingModule } from './analytics-routing.module';
import { AnalyticsComponent } from './analytics.component';

import { PrintsByStatusComponent } from './prints-by-status/prints-by-status.component';
import { TotalFilamentUsedComponent } from './total-filament-used/total-filament-used.component';
import { TotalPrintCountComponent } from './total-print-count/total-print-count.component';
import { TotalPrintTimeComponent } from './total-print-time/total-print-time.component';

@NgModule({
  declarations: [
    AnalyticsComponent,
    TotalPrintCountComponent,
    PrintsByStatusComponent,
    TotalPrintTimeComponent,
    TotalFilamentUsedComponent,
  ],
  imports: [SharedModule, AnalyticsRoutingModule],
})
export class AnalyticsModule {}
