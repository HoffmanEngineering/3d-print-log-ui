import { NgModule } from '@angular/core';

import { SharedModule } from '../shared/shared.module';
import { AnalyticsRoutingModule } from './analytics-routing.module';
import { AnalyticsComponent } from './analytics.component';
import { DonutChartComponent } from './panels/donut-chart/donut-chart.component';
import { GraphPanelComponent } from './panels/graph-panel/graph-panel.component';
import { StatPanelComponent } from './panels/stat-panel/stat-panel.component';
import { PrintsByStatusComponent } from './prints-by-status/prints-by-status.component';
import { TotalFilamentUsedComponent } from './total-filament-used/total-filament-used.component';
import { TotalPrintCountComponent } from './total-print-count/total-print-count.component';
import { TotalPrintTimeComponent } from './total-print-time/total-print-time.component';

@NgModule({
  declarations: [
    AnalyticsComponent,
    StatPanelComponent,
    TotalPrintCountComponent,
    PrintsByStatusComponent,
    GraphPanelComponent,
    DonutChartComponent,
    TotalPrintTimeComponent,
    TotalFilamentUsedComponent,
  ],
  imports: [SharedModule, AnalyticsRoutingModule],
})
export class AnalyticsModule {}
