import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { debounce } from 'lodash';
import { PagedList } from 'src/app/core/types/paging';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
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

  public debouncedUpdateFilter;

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
    const newPageNumber = pageEvent.pageIndex + 1;
    const newPageSize = pageEvent.pageSize;

    this.printService
      .getPrintSummaries(
        newPageNumber,
        newPageSize,
        this.searchText,
        this.filterByStatus
      )
      .subscribe(response => {
        this.handlePagedList(response);
      });
  }

  private handlePagedList(response: PagedList<PrintSummary>) {
    this.prints = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }

  public updateFilter() {
    this.printService
      .getPrintSummaries(
        this.currentPage,
        this.pageSize,
        this.searchText,
        this.filterByStatus
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
