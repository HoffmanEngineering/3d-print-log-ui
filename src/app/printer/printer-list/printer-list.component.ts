import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { ActivatedRoute } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import {
  PrinterService,
  PrinterSummary,
  PrinterSummaryWithFilament,
} from '../../core/services/printer.service';

import { Title } from '@angular/platform-browser';
import { debounce } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrls: ['./printer-list.component.scss'],
})
export class PrinterListComponent implements OnInit {
  public printers: PrinterSummaryWithFilament[] = [];

  public pageSize: number;
  public currentPage: number;
  public totalCount: number;

  public includeInactive = false;
  public searchText = '';

  public displayedColumns: string[] = [
    'name',
    'make',
    'model',
    'filament',
    'isActive',
    'more',
  ];

  public debouncedUpdateFilter;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printerService: PrinterService,
    private titleService: Title,
    private readonly toastrService: ToastrService
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }

  ngOnInit() {
    this.titleService.setTitle('My Printers - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      const pagedResponse: PagedList<PrinterSummaryWithFilament> =
        data.printerList;
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
      .subscribe((response) => {
        this.handlePagedList(response);
      });
  }

  public async updateFilter() {
    const response = await this.printerService
      .getCurrentUserPrinterSummaries(
        this.currentPage,
        this.pageSize,
        this.searchText,
        this.includeInactive
      )
      .toPromise();

    this.handlePagedList(response);
  }

  public unloadAllFilament(printer: PrinterSummaryWithFilament) {
    this.printerService.unloadFilament(printer.id).subscribe(() => {
      this.updateFilter().then(() => {
        this.toastrService.success(
          'Filament unloaded successfully.',
          'Success'
        );
      });
    });
  }

  private handlePagedList(response: PagedList<PrinterSummaryWithFilament>) {
    this.printers = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }

  public formatLoadedInFilament(printer: PrinterSummaryWithFilament) {
    let result = '';
    if (printer?.loadedFilaments?.length > 0) {
      result = printer.loadedFilaments
        .map((f) => {
          return `${f.filament.displayName} (${f.filament.materialType})`;
        })
        .join(', ');
    }

    return result;
  }
}
