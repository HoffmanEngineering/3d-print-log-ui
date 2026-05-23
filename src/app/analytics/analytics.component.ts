import { Component, OnInit } from '@angular/core';
import {
  PrintStatistic,
  PrintStatisticsService,
} from './services/print-statistics.service';

import { Title } from '@angular/platform-browser';
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
    const endOfToday = (): Date => {
      const d = new Date();
      d.setHours(23, 59, 59, 999);
      return d;
    };
    const startOfDaysAgo = (n: number): Date => {
      const d = new Date();
      d.setDate(d.getDate() - n);
      d.setHours(0, 0, 0, 0);
      return d;
    };

    switch (this.dateSelection) {
      case AnalyticTimeSelection.Today:
        return { fromDate: startOfDaysAgo(0), toDate: endOfToday() };
      case AnalyticTimeSelection.Yesterday: {
        const from = startOfDaysAgo(1);
        const to = new Date(from);
        to.setHours(23, 59, 59, 999);
        return { fromDate: from, toDate: to };
      }
      case AnalyticTimeSelection.Last7Days:
        return { fromDate: startOfDaysAgo(6), toDate: endOfToday() };
      case AnalyticTimeSelection.Last30Days:
        return { fromDate: startOfDaysAgo(29), toDate: endOfToday() };
      case AnalyticTimeSelection.Last365Days:
        return { fromDate: startOfDaysAgo(364), toDate: endOfToday() };
      case AnalyticTimeSelection.AllTime:
        return {
          fromDate: new Date('1901-01-01T00:00:00.000'),
          toDate: endOfToday(),
        };
      default:
        return { fromDate: startOfDaysAgo(29), toDate: endOfToday() };
    }
  }
}
