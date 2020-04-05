import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { PrinterService, PrinterSummary } from '../services/printer.service';

import { debounce } from 'lodash';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrls: ['./printer-list.component.scss'],
})
export class PrinterListComponent implements OnInit {
  public printers: PrinterSummary[] = [];

  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public includeInactive = false;
  public searchText = '';

  public displayedColumns: string[] = [
    'id',
    'name',
    'make',
    'model',
    'isActive',
  ];

  public debouncedUpdateFilter;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printerService: PrinterService
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }

  ngOnInit() {
    this.activatedRoute.data.subscribe(data => {
      const pagedResponse: PagedList<PrinterSummary> = data.printerList;
      this.handlePagedList(pagedResponse);
    });
  }

  public pageChange(pageEvent: PageEvent) {
    const newPageNumber = pageEvent.pageIndex + 1;
    const newPageSize = pageEvent.pageSize;

    this.printerService
      .getCurrentUserPrinterSummaries(
        newPageNumber,
        newPageSize,
        this.searchText,
        this.includeInactive
      )
      .subscribe(response => {
        this.handlePagedList(response);
      });
  }

  public updateFilter() {
    this.printerService
      .getCurrentUserPrinterSummaries(
        this.currentPage,
        this.pageSize,
        this.searchText,
        this.includeInactive
      )
      .subscribe(response => {
        this.handlePagedList(response);
      });
  }

  private handlePagedList(response: PagedList<PrinterSummary>) {
    this.printers = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }
}
