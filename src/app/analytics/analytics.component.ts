import { Component, OnInit } from '@angular/core';
import {
  PrintStatistic,
  PrintStatisticsService,
} from './services/print-statistics.service';

import { Title } from '@angular/platform-browser';
import moment from 'moment';
import {
  PrinterService,
  PrinterSummary,
} from '../core/services/printer.service';

export enum AnalyticTimeSelection {
  Today,
  Yesterday,
  Last7Days,
  Last30Days,
  Last365Days,
  AllTime,
}

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.scss'],
  standalone: false,
})
export class AnalyticsComponent implements OnInit {
  public timeSelectionOptions = AnalyticTimeSelection;

  public dateSelection: AnalyticTimeSelection =
    AnalyticTimeSelection.Last30Days;

  public allPrintStatistics: PrintStatistic[] = [];

  public filteredPrintStatistics: PrintStatistic[] = [];

  public printers: PrinterSummary[] = [];

  public filterByPrinterIds: number[] = [];

  constructor(
    private printStatService: PrintStatisticsService,
    private readonly printerService: PrinterService,
    private title: Title
  ) {}

  ngOnInit() {
    this.title.setTitle('Analytics - 3D Print Log');
    this.refreshStatistics();
    this.printerService
      .getCurrentUserPrinterSummaries(1, 100, '', false)
      .subscribe((printers) => {
        this.printers = printers.items;
        this.filterByPrinterIds = [];
      });
  }

  refreshStatistics() {
    const { fromDate, toDate } = this.getDateSelection();

    if (fromDate && toDate) {
      this.printStatService
        .getPrintStatistics(fromDate, toDate)
        .subscribe((stats) => {
          this.allPrintStatistics = stats;
          this.filterByPrinters();
        });
    }
  }

  filterByPrinters() {
    const printersId = this.filterByPrinterIds;

    if (printersId.length > 0) {
      this.filteredPrintStatistics = this.allPrintStatistics.filter((print) => {
        return printersId.includes(print.printerID);
      });
    } else {
      this.filteredPrintStatistics = this.allPrintStatistics;
    }
  }

  public getPrinterLabel(printer: PrinterSummary) {
    if (printer.name && printer.name !== '') {
      return `${printer.name} - (${(
        printer.make +
        ' ' +
        printer.model
      ).trim()})`;
    } else {
      return `${(printer.make + ' ' + printer.model).trim()}`;
    }
  }

  getDateSelection(): { fromDate: Date; toDate: Date } {
    let fromDate: Date | null = null;
    let toDate: Date | null = null;

    switch (this.dateSelection) {
      case AnalyticTimeSelection.Today:
        toDate = moment().endOf('day').toDate();
        fromDate = moment().startOf('day').toDate();
        break;
      case AnalyticTimeSelection.Yesterday:
        toDate = moment().subtract(1, 'days').endOf('day').toDate();
        fromDate = moment().subtract(1, 'days').startOf('day').toDate();
        break;
      case AnalyticTimeSelection.Last7Days:
        toDate = moment().endOf('day').toDate();
        fromDate = moment().subtract(6, 'days').startOf('day').toDate();
        break;
      case AnalyticTimeSelection.Last30Days:
        toDate = moment().endOf('day').toDate();
        fromDate = moment().subtract(29, 'days').startOf('day').toDate();
        break;
      case AnalyticTimeSelection.Last365Days:
        toDate = moment().endOf('day').toDate();
        fromDate = moment().subtract(364, 'days').startOf('day').toDate();
        break;
      case AnalyticTimeSelection.AllTime:
        toDate = moment().endOf('day').toDate();
        fromDate = moment('1901-01-01T00:00:00.000').toDate();
        break;
    }

    return { fromDate, toDate };
  }
}
