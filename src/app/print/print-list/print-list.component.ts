import { Component, OnInit } from '@angular/core';
import { PageEvent, Sort } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { debounce } from 'lodash';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from '../services/print.service';

@Component({
  selector: 'app-print-list',
  templateUrl: './print-list.component.html',
  styleUrls: ['./print-list.component.scss'],
})
export class PrintListComponent implements OnInit {
  public prints: PrintSummary[] = [];
  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public displayedColumns: string[] = [
    'image',
    'title',
    'printer',
    'start-date',
    'status',
  ];

  public searchText = '';

  public filterByStatus: PrintStatus | null = -1;

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = PrintSummarySortColumn;

  public debouncedUpdateFilter;

  public sortColumn = PrintSummarySortColumn.StartDate;
  public sortDirection = SortDirection.Desc;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printService: PrintService
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }

  ngOnInit() {
    this.activatedRoute.data.subscribe(data => {
      const pagedResponse: PagedList<PrintSummary> = data.printList;
      this.handlePagedList(pagedResponse);
    });
  }

  public pageChange(pageEvent: PageEvent) {
    this.currentPage = pageEvent.pageIndex + 1;
    this.pageSize = pageEvent.pageSize;

    this.updateFilter();
  }

  private handlePagedList(response: PagedList<PrintSummary>) {
    this.prints = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }

  public sortData(sort: Sort) {
    console.log(sort);
    this.sortColumn = +sort.active;

    this.sortDirection =
      sort.direction === 'asc' ? SortDirection.Asc : SortDirection.Desc;

    this.updateFilter();
  }

  public updateFilter() {
    this.printService
      .getPrintSummaries(
        this.currentPage,
        this.pageSize,
        this.searchText,
        this.filterByStatus,
        this.sortDirection,
        this.sortColumn
      )
      .subscribe(response => {
        this.handlePagedList(response);
      });
  }

  getPrinterLabel(print: PrintSummary) {
    if (print.printer.name && print.printer.name !== '') {
      return `${print.printer.name} - (${(
        print.printer.make +
        ' ' +
        print.printer.model
      ).trim()})`;
    } else {
      return `${(print.printer.make + ' ' + print.printer.model).trim()}`;
    }
  }
  getStatus(print: PrintSummary) {
    if (print.status === PrintStatus.Cancelled) {
      return 'Cancelled';
    } else if (print.status === PrintStatus.Failed) {
      return 'Failed';
    } else if (print.status === PrintStatus.Pending) {
      return 'Pending';
    } else if (print.status === PrintStatus.Printing) {
      return 'Printing';
    } else if (print.status === PrintStatus.Success) {
      return 'Success';
    } else {
      return 'Unknown';
    }
  }
}
