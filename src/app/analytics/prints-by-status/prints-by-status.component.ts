import {
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DonutChartComponent } from '../panels/donut-chart/donut-chart.component';
import { PrintStatistic } from '../services/print-statistics.service';

import { MatSlideToggleChange } from '@angular/material';
import { groupBy } from 'lodash';
import { PrintStatus } from 'src/app/print/services/print.service';

export interface PrintStatusState {
  status: string;
  stateDisplayValue: string;
  count: number;
}

@Component({
  selector: 'app-prints-by-status',
  templateUrl: './prints-by-status.component.html',
  styleUrls: ['./prints-by-status.component.scss'],
})
export class PrintsByStatusComponent implements OnChanges {
  @Input() prints: PrintStatistic[] = [];

  @ViewChild('ordersByStatusChart', { static: true })
  chart: DonutChartComponent;

  orderStates: PrintStatusState[] = [...this.getEmptyState()];

  chartData: number[] = [0, 0, 0, 0, 0];

  displayedColumns = ['legend', 'orderStatus', 'total'];

  colors = ['#1f77b4', '#ff7f0e', '#2ca02c', '#8c8c8c8a', '#d62728'];

  showData = false;

  constructor() {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.prints) {
      this.updatePrintStatuses();
    }
  }

  updatePrintStatuses() {
    this.orderStates = [...this.getEmptyState()];
    const groups = groupBy(this.prints, 'status');

    for (const group in groups) {
      // check also if property is not inherited from prototype
      if (groups.hasOwnProperty(group)) {
        this.orderStates.find(
          state => state.status === PrintStatus[group]
        ).count = groups[group].length;
      }
    }

    this.chartData = [];
    this.orderStates.forEach(state => {
      this.chartData.push(state.count);
    });
  }

  getEmptyState() {
    const emptyState: PrintStatusState[] = [
      {
        status: PrintStatus[PrintStatus.Pending],
        stateDisplayValue: PrintStatus[PrintStatus.Pending],
        count: 0,
      },
      {
        status: PrintStatus[PrintStatus.Printing],
        stateDisplayValue: PrintStatus[PrintStatus.Printing],
        count: 0,
      },
      {
        status: PrintStatus[PrintStatus.Success],
        stateDisplayValue: PrintStatus[PrintStatus.Success],
        count: 0,
      },
      {
        status: PrintStatus[PrintStatus.Cancelled],
        stateDisplayValue: PrintStatus[PrintStatus.Cancelled],
        count: 0,
      },
      {
        status: PrintStatus[PrintStatus.Failed],
        stateDisplayValue: PrintStatus[PrintStatus.Failed],
        count: 0,
      },
    ];
    return emptyState;
  }

  toggleData(event: MatSlideToggleChange) {
    this.showData = event.checked;
  }
}
