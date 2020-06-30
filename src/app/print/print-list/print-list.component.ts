import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { debounce } from 'lodash-es';
import { ActiveToast, ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import {
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from '../../core/services/print.service';
import { PrintShareDialogComponent } from '../print-share-dialog/print-share-dialog.component';
import { PrinterRedirectPromptService } from '../services/printer-redirect-prompt.service';

@Component({
  selector: 'app-print-list',
  templateUrl: './print-list.component.html',
  styleUrls: ['./print-list.component.scss'],
})
export class PrintListComponent implements OnInit, OnDestroy {
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
    'more',
  ];

  public searchText = '';

  public filterByStatus: PrintStatus | null = -1;

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = PrintSummarySortColumn;

  public debouncedUpdateFilter;

  public sortColumn = PrintSummarySortColumn.StartDate;
  public sortDirection = SortDirection.Desc;

  public printerRedirectToast: ActiveToast<any> | null = null;
  public printerRedirectSubscription: Subscription;

  constructor(
    private activatedRoute: ActivatedRoute,
    private printService: PrintService,
    private printerRedirectPromptService: PrinterRedirectPromptService,
    private toastrService: ToastrService,
    private titleService: Title,
    private router: Router,
    public dialog: MatDialog
  ) {
    this.debouncedUpdateFilter = debounce(() => this.updateFilter(), 400);
  }
  ngOnDestroy(): void {
    if (this.printerRedirectToast) {
      this.toastrService.remove(this.printerRedirectToast.toastId);
    }

    if (this.printerRedirectSubscription) {
      this.printerRedirectSubscription.unsubscribe();
    }
  }

  ngOnInit() {
    this.titleService.setTitle('My Prints - 3D Print Log');

    this.activatedRoute.data.subscribe((data) => {
      const pagedResponse: PagedList<PrintSummary> = data.printList;
      this.handlePagedList(pagedResponse);
    });

    /**
     * Show the Add Printer prompt if needed.
     */
    this.printerRedirectPromptService
      .shouldShowAddPrinterPrompt()
      .subscribe((shouldShowPrompt) => {
        if (shouldShowPrompt) {
          this.printerRedirectToast = this.toastrService.info(
            'Click here to add a new 3D Printer before logging prints.',
            'No Active Printers',
            {
              disableTimeOut: true,
            }
          );

          this.printerRedirectSubscription = this.printerRedirectToast.onTap.subscribe(
            () => {
              this.router.navigate(['printers', 'new']);
              this.printerRedirectSubscription.unsubscribe();
            }
          );
        }
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
      .subscribe((response) => {
        this.handlePagedList(response);
      });
  }

  public share(print: PrintSummary) {
    const dialogRef = this.dialog.open(PrintShareDialogComponent, {
      width: '300px',
      minWidth: '300px',
      data: { printId: print.id },
    });

    dialogRef.afterClosed().subscribe((result) => {});
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
