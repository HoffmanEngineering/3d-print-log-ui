import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { lastValueFrom } from 'rxjs';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PagedList } from 'src/app/core/types/paging';
import {
  PrinterService,
  PrinterSummary,
  PrinterSummarySimple,
} from '../../core/services/printer.service';

import { Title } from '@angular/platform-browser';
import { debounce } from 'lodash-es';
import { ToastrService } from 'ngx-toastr';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { HttpErrorResponse } from '@angular/common/http';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatCheckbox } from '@angular/material/checkbox';
import {
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import { SignedImageComponent } from '../../shared/signed-image/signed-image.component';
import { MatTooltip } from '@angular/material/tooltip';
import { MatChipListbox, MatChipOption } from '@angular/material/chips';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { EmptyStateComponent } from '../../shared/empty-state/empty-state.component';
import { AdComponent } from '../../shared/ad/ad.component';
import { FilamentColorSwatchStylePipe } from '../../shared/pipes/filament-color-swatch-style.pipe';

@Component({
  selector: 'app-printer-list',
  templateUrl: './printer-list.component.html',
  styleUrls: ['./printer-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatButton,
    RouterLink,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatCheckbox,
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    SignedImageComponent,
    MatTooltip,
    MatChipListbox,
    MatChipOption,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    EmptyStateComponent,
    MatPaginator,
    AdComponent,
    FilamentColorSwatchStylePipe,
  ],
})
export class PrinterListComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private printerService = inject(PrinterService);
  private titleService = inject(Title);
  private readonly toastrService = inject(ToastrService);
  dialog = inject(MatDialog);

  readonly printers = signal<PrinterSummarySimple[]>([]);

  readonly pageSize = signal<number | undefined>(undefined);
  private currentPage: number | undefined;
  readonly totalCount = signal<number | undefined>(undefined);

  public includeInactive = false;
  public searchText = '';

  public displayedColumns: string[] = [
    'image',
    'name',
    'make',
    'model',
    'type',
    'filament',
    'isActive',
    'more',
  ];

  public debouncedUpdateFilter;

  readonly isLoading = signal(false);

  /** Guards against an older search response overwriting a newer one. */
  private latestRequestId = 0;

  constructor() {
    // Mark the list as loading on the keystroke itself, not when the debounce
    // finally fires, so the empty state cannot flash stale copy for 400ms.
    const debouncedFilterUpdate = debounce(() => this.updateFilter(), 400);

    this.debouncedUpdateFilter = () => {
      this.isLoading.set(true);
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

    this.isLoading.set(true);
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
    const pageSize = this.pageSize();
    localStorage.setItem('printer_list_page_size', pageSize.toString(10));

    this.isLoading.set(true);
    const requestId = ++this.latestRequestId;

    const response = await lastValueFrom(
      this.printerService.getCurrentUserPrinterSummaries(
        this.currentPage,
        pageSize,
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
    this.isLoading.set(false);
    this.printers.set(response.items);

    this.currentPage = response.paging.currentPage;
    this.pageSize.set(response.paging.pageSize);
    this.totalCount.set(response.paging.totalCount);
  }

  public deletePrinter(printer: PrinterSummarySimple) {
    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        title: 'Delete?',
        body: `Are you sure you want to delete printer "${printer.name}"? <br /> <br />  This action cannot be undone.`,
        yesText: 'Delete',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '350px' }
    );

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
