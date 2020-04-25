import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { AnalyticsRoutingModule } from './analytics-routing.module';
import { AnalyticsComponent } from './analytics.component';
import { StatPanelComponent } from './panels/stat-panel/stat-panel.component';
import { TotalPrintCountComponent } from './total-print-count/total-print-count.component';
import { PrintsByStatusComponent } from './prints-by-status/prints-by-status.component';
import { GraphPanelComponent } from './panels/graph-panel/graph-panel.component';

@NgModule({
  declarations: [AnalyticsComponent, StatPanelComponent, TotalPrintCountComponent, PrintsByStatusComponent, GraphPanelComponent],
  imports: [SharedModule, AnalyticsRoutingModule],
})
export class AnalyticsModule {}
