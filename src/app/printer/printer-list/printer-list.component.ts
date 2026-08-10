import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { lastValueFrom } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import {
  PrinterService,
  PrinterSummary,
  PrinterSummarySimple,
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
  public printers: PrinterSummarySimple[] = [];

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

  public isLoading = false;

  /** Guards against an older search response overwriting a newer one. */
  private latestRequestId = 0;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printerService: PrinterService,
    private titleService: Title,
    private readonly toastrService: ToastrService,
    public dialog: MatDialog
  ) {
    // Mark the list as loading on the keystroke itself, not when the debounce
    // finally fires, so the empty state cannot flash stale copy for 400ms.
    const debouncedFilterUpdate = debounce(() => this.updateFilter(), 400);

    this.debouncedUpdateFilter = () => {
      this.isLoading = true;
      debouncedFilterUpdate();
    };
  }

  ngOnInit() {
    this.titleService.setTitle('My Printers - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      const pagedResponse: PagedList<PrinterSummarySimple> = data.printerList;
      this.handlePagedList(pagedResponse);
    });
  }

  public pageChange(pageEvent: PageEvent) {
    const newPageNumber = pageEvent.pageIndex + 1;
    const newPageSize = pageEvent.pageSize;

    localStorage.setItem('printer_list_page_size', newPageSize.toString(10));

    this.isLoading = true;
    const requestId = ++this.latestRequestId;

    this.printerService
      .getCurrentUserPrinterSummaries(
        newPageNumber,
        newPageSize,
        this.searchText,
        this.includeInactive
      )
      .subscribe((response) => {
        if (requestId !== this.latestRequestId) {
          return;
        }

        this.handlePagedList(response);
      });
  }

  public async updateFilter() {
    localStorage.setItem('printer_list_page_size', this.pageSize.toString(10));

    this.isLoading = true;
    const requestId = ++this.latestRequestId;

    const response = await lastValueFrom(
      this.printerService.getCurrentUserPrinterSummaries(
        this.currentPage,
        this.pageSize,
        this.searchText,
        this.includeInactive
      )
    );

    // A newer search started while this one was in flight; its result wins.
    if (requestId !== this.latestRequestId) {
      return;
    }

    this.handlePagedList(response);
  }

  /** True when a search term is hiding printers the user does have. */
  public get hasActiveSearch(): boolean {
    return this.searchText.trim().length > 0;
  }

  public get emptyStateFilteredMessage(): string {
    return `Nothing matched a search for "${this.searchText.trim()}". Clear it to see all of your printers.`;
  }

  public clearSearch() {
    this.searchText = '';
    this.currentPage = 1;
    return this.updateFilter();
  }

  public unloadAllFilament(printer: PrinterSummarySimple) {
    this.printerService.unloadFilament(printer.id).subscribe(() => {
      this.updateFilter().then(() => {
        this.toastrService.success(
          'Filament unloaded successfully.',
          'Success'
        );
      });
    });
  }

  private handlePagedList(response: PagedList<PrinterSummarySimple>) {
    this.isLoading = false;
    this.printers = response.items;

    this.currentPage = response.paging.currentPage;
    this.pageSize = response.paging.pageSize;
    this.totalCount = response.paging.totalCount;
  }

  public formatLoadedInFilament(printer: PrinterSummarySimple) {
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

  public deletePrinter(printer: PrinterSummarySimple) {
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
