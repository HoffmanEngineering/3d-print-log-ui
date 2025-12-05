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
import { SimpleDialogComponent } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrls: ['./printer-list.component.scss'],
  standalone: false,
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
    'type',
    'filament',
    'isActive',
    'more',
  ];

  public debouncedUpdateFilter;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printerService: PrinterService,
    private titleService: Title,
    private readonly toastrService: ToastrService,
    public dialog: MatDialog
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

    localStorage.setItem('printer_list_page_size', newPageSize.toString(10));

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
    localStorage.setItem('printer_list_page_size', this.pageSize.toString(10));

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

  public deletePrinter(printer: PrinterSummaryWithFilament) {
    const dialogRef = this.dialog.open(SimpleDialogComponent, {
      maxWidth: '350px',
    });
    (dialogRef.componentInstance as any).title = 'Delete?';
    // eslint-disable-next-line max-len
    (dialogRef.componentInstance as any).body =
      `Are you sure you want to delete printer "${printer.name}"? <br /> <br />  This action cannot be undone.`;
    (dialogRef.componentInstance as any).yesText = 'Delete';
    (dialogRef.componentInstance as any).yesColor = 'warn';
    (dialogRef.componentInstance as any).noText = 'Cancel';

    dialogRef.afterClosed().subscribe((shouldDelete) => {
      if (shouldDelete) {
        this.printerService.deletePrinter(printer.id).subscribe({
          complete: () => {
            this.updateFilter().then(() => {
              this.toastrService.success(
                'Printer removed successfully.',
                'Success'
              );
            });
          },
          error: (error: HttpErrorResponse) => {
            this.toastrService.error(error.error, 'Error');
          },
        });
      }
    });
  }
}
