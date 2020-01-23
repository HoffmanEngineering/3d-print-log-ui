import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material';
import { ActivatedRoute } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import { PrinterService, PrinterSummary } from '../services/printer.service';

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

  public displayedColumns: string[] = ['id', 'make', 'model'];

  constructor(
    private activatedRoute: ActivatedRoute,
    private printerService: PrinterService
  ) {}

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
      .getCurrentUserPrinterSummaries(newPageNumber, newPageSize)
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
