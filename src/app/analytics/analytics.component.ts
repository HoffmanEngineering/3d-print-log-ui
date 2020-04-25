import { Component, OnInit } from '@angular/core';
import {
  PrintStatistic,
  PrintStatisticsService,
} from './services/print-statistics.service';

import * as moment from 'moment';

export enum AnalyticTimeSelection {
  Today,
  Yesterday,
  Last7Days,
  Last30Days,
  Last365Days,
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
})
export class AnalyticsComponent implements OnInit {
  public timeSelectionOptions = AnalyticTimeSelection;

  public dateSelection: AnalyticTimeSelection =
    AnalyticTimeSelection.Last30Days;

  public printStatistics: PrintStatistic[] = [];

  constructor(private printStatService: PrintStatisticsService) {}

  ngOnInit() {
    this.refreshStatistics();
  }

  refreshStatistics() {
    const { fromDate, toDate } = this.getDateSelection();

    if (fromDate && toDate) {
      this.printStatService
        .getPrintStatistics(fromDate, toDate)
        .subscribe(stats => {
          this.printStatistics = stats;
        });
    }
  }
  getDateSelection(): { fromDate: Date; toDate: Date } {
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    switch (this.dateSelection) {
      case AnalyticTimeSelection.Today:
        toDate = moment()
          .endOf('day')
          .toDate();
        fromDate = moment()
          .startOf('day')
          .toDate();
        break;
      case AnalyticTimeSelection.Yesterday:
        toDate = moment()
          .subtract(1, 'days')
          .endOf('day')
          .toDate();
        fromDate = moment()
          .subtract(1, 'days')
          .startOf('day')
          .toDate();
        break;
      case AnalyticTimeSelection.Last7Days:
        toDate = moment()
          .endOf('day')
          .toDate();
        fromDate = moment()
          .subtract(6, 'days')
          .startOf('day')
          .toDate();
        break;
      case AnalyticTimeSelection.Last30Days:
        toDate = moment()
          .endOf('day')
          .toDate();
        fromDate = moment()
          .subtract(29, 'days')
          .startOf('day')
          .toDate();
        break;
      case AnalyticTimeSelection.Last365Days:
        toDate = moment()
          .endOf('day')
          .toDate();
        fromDate = moment()
          .subtract(364, 'days')
          .startOf('day')
          .toDate();
        break;
    }

    return { fromDate, toDate };
  }
}
