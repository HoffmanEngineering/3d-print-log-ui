import { MediaMatcher } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent, MatPaginator } from '@angular/material/paginator';
import { Sort, MatSort, MatSortHeader } from '@angular/material/sort';
import { Title } from '@angular/platform-browser';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
} from '@angular/router';
import { debounce } from 'lodash-es';
import { ActiveToast, ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { filter, finalize, map, take } from 'rxjs/operators';
import { setIfChanged } from 'src/app/core/utils/set-if-changed';
import { FilamentSummary } from 'src/app/core/services/filament.service';
import { GcodeFileParserService } from 'src/app/core/services/gcode-file-parser.service';
import { LoggingService } from 'src/app/core/services/logging.service';
import {
  PrinterService,
  PrinterSummary,
} from 'src/app/core/services/printer.service';
import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import {
  UserSetting,
  UserSettingService,
  UserSettingType,
} from 'src/app/core/services/user-setting.service';
import { NewPrintStoreService } from 'src/app/core/stores/new-print-store.service';
import { PagedList } from 'src/app/core/types/paging';
import { SortDirection } from 'src/app/core/types/sort-request';
import { openSimpleDialog } from 'src/app/shared/simple-dialog/simple-dialog.component';
import {
  FilamentPrice,
  FilamentPriceInvalid,
  FilamentPriceValid,
  PrintFilamentSourceMeasurement,
  PrintFilamentSummaryDto,
  PrintService,
  PrintStatus,
  PrintSummary,
  PrintSummarySortColumn,
} from '../../core/services/print.service';
import { PrintShareDialogComponent } from '../print-share-dialog/print-share-dialog.component';
import { PrintTableLayoutComponent } from './print-table-layout/print-table-layout.component';
import { FilamentSearchModalComponent } from 'src/app/shared/filament-search-modal/filament-search-modal.component';
import { PrintBulkActionsService } from '../services/print-bulk-actions.service';
import { toSortHeaderIds } from '../../core/utils/sort-header-ids';
import { BLOCK_SCROLL_WHILE_MENU_OPEN } from 'src/app/shared/menu/menu-scroll.provider';
import {
  DefaultLayoutDirective,
  DefaultLayoutAlignDirective,
  DefaultFlexDirective,
} from '@ngbracket/ngx-layout/flex';
import { MatButton } from '@angular/material/button';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatBadge } from '@angular/material/badge';
import { MatSelect, MatOption } from '@angular/material/select';
import { PrinterAvatarComponent } from '../../shared/printer-avatar/printer-avatar.component';
import { MatChipSet, MatChip, MatChipRemove } from '@angular/material/chips';
import { MatTooltip } from '@angular/material/tooltip';
import { PrintListHintSlotComponent } from './print-list-hint-slot/print-list-hint-slot.component';
import {
  MatButtonToggleGroup,
  MatButtonToggle,
} from '@angular/material/button-toggle';
import { PrintBulkActionBarComponent } from './print-bulk-action-bar/print-bulk-action-bar.component';
import { PrintGroupedViewComponent } from './print-grouped-view/print-grouped-view.component';
import { PrintEmptyStateComponent } from './print-empty-state/print-empty-state.component';
import { MatProgressBar } from '@angular/material/progress-bar';
import { PrintListSkeletonComponent } from './print-list-skeleton/print-list-skeleton.component';
import { PrintCardComponent } from '../print-card/print-card.component';
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
import { MatCheckbox } from '@angular/material/checkbox';
import { PrintImageComponent } from '../../shared/print-image/print-image.component';
import { ProjectChipComponent } from '../../shared/project-chip/project-chip.component';
import { FilamentUsageSummaryComponent } from '../../shared/filament-usage-summary/filament-usage-summary.component';
import { AdComponent } from '../../shared/ad/ad.component';
import { DecimalPipe } from '@angular/common';
import { DurationPipe } from '../../shared/pipes/duration.pipe';
import { LocaleDatePipe } from '../../shared/pipes/locale-date.pipe';
import { FilamentColorSwatchStylePipe } from '../../shared/pipes/filament-color-swatch-style.pipe';

export interface ColumnDefinition {
  key: string;
  displayName: string;
  description: string;
}

/**
 * The no-printer toast shows at most once per page load, however many times the list is
 * visited. Module state rather than a field, so it outlives this component.
 */
let addPrinterToastShown = false;

/** Lets each spec start a fresh session. */
export function resetAddPrinterToastShown(): void {
  addPrinterToastShown = false;
}

@Component({
  selector: 'app-print-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './print-list.component.html',
  styleUrls: ['./print-list.component.scss'],
  providers: [PrintBulkActionsService, BLOCK_SCROLL_WHILE_MENU_OPEN],
  imports: [
    DefaultLayoutDirective,
    DefaultLayoutAlignDirective,
    MatButton,
    RouterLink,
    MatMenuTrigger,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatBadge,
    MatSelect,
    MatOption,
    PrinterAvatarComponent,
    MatChipSet,
    MatChip,
    MatTooltip,
    MatChipRemove,
    PrintListHintSlotComponent,
    MatButtonToggleGroup,
    MatButtonToggle,
    PrintBulkActionBarComponent,
    PrintGroupedViewComponent,
    PrintEmptyStateComponent,
    MatProgressBar,
    PrintListSkeletonComponent,
    PrintCardComponent,
    MatTable,
    DefaultFlexDirective,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCheckbox,
    MatCellDef,
    MatCell,
    PrintImageComponent,
    MatSortHeader,
    ProjectChipComponent,
    FilamentUsageSummaryComponent,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatPaginator,
    AdComponent,
    DecimalPipe,
    DurationPipe,
    LocaleDatePipe,
    FilamentColorSwatchStylePipe,
  ],
})
export class PrintListComponent implements OnInit, OnDestroy {
  private activatedRoute = inject(ActivatedRoute);
  private printerService = inject(PrinterService);
  private toastrService = inject(ToastrService);
  private titleService = inject(Title);
  private router = inject(Router);
  dialog = inject(MatDialog);
  private media = inject(MediaMatcher);
  private printService = inject(PrintService);
  private readonly loggingService = inject(LoggingService);
  private readonly gcodeParserService = inject(GcodeFileParserService);
  private readonly newPrintStoreService = inject(NewPrintStoreService);

  readonly prints = signal<PrintSummary[]>([]);
  readonly printers = signal<PrinterSummary[]>([]);
  public filaments: FilamentSummary[] = [];
  readonly pageSize = signal<number | undefined>(undefined);
  readonly currentPage = signal<number | undefined>(undefined);
  readonly totalCount = signal<number | undefined>(undefined);

  public allPossibleColumns: ColumnDefinition[] = [
    {
      key: 'image',
      displayName: 'Image (Small)',
      description: 'The default image as a small thumbnail.',
    },
    {
      key: 'image-medium',
      displayName: 'Image (Medium)',
      description: 'The default image as a medium thumbnail.',
    },
    {
      key: 'image-large',
      displayName: 'Image (Large)',
      description: 'The default image as a large thumbnail.',
    },
    {
      key: 'title',
      displayName: 'Title',
      description: "The print's title.",
    },
    {
      key: 'printer',
      displayName: 'Printer',
      description: 'Make and model of the printer.',
    },
    {
      key: 'start-date',
      displayName: 'Start Date',
      description: 'Start date of the print',
    },
    {
      key: 'start-time',
      displayName: 'Start Time',
      description: 'Start time of the print',
    },
    {
      key: 'start-date-time',
      displayName: 'Start Date/Time',
      description: 'Start date/time of the print',
    },
    {
      key: 'end-date',
      displayName: 'End Date',
      description: 'End date of the print if there is a print time recorded.',
    },
    {
      key: 'end-time',
      displayName: 'End Time',
      description: 'End time of the print if there is a print time recorded.',
    },
    {
      key: 'end-date-time',
      displayName: 'End Date/Time',
      description:
        'End date/time of the print if there is a print time recorded.',
    },
    {
      key: 'status',
      displayName: 'Status',
      description: 'The print status.',
    },
    {
      key: 'printTime',
      displayName: 'Print Time',
      description: 'Displays the actual print time, or estimated print time.',
    },
    {
      key: 'filamentSummary',
      displayName: 'Material',
      description: 'Displays a summary of the material used.',
    },
    {
      key: 'totalFilamentUsage',
      displayName: 'Total Material (g)',
      description: 'Displays the total material usage in grams',
    },
    {
      key: 'totalCost',
      displayName: 'Total Cost',
      description: 'Displays the total print cost.',
    },
    {
      key: 'electricityCost',
      displayName: 'Electricity Cost',
      description:
        'Displays the electricity cost based on print time and printer wattage.',
    },
    {
      key: 'commentCount',
      displayName: 'Comment Count',
      description: 'Displays the number of comments',
    },
  ];

  readonly displayedColumns = signal<string[]>([
    'image',
    'title',
    'printer',
    'start-date',
    'status',
    'printTime',
    'filamentSummary',
    'commentCount',
    'more',
  ]);

  public searchText = '';

  /**
   * Multi-select state and the sequential batch runner live in their own service so
   * this already-large component does not grow another responsibility.
   */
  public readonly bulkActions = inject(PrintBulkActionsService);

  /**
   * The columns the desktop table actually renders. `select` is always first and is
   * never persisted, so it cannot be removed by the table layout dialog. The whole
   * table only renders above the handset breakpoint, so the checkbox column is
   * desktop-only for free.
   */
  public get tableColumns(): string[] {
    return ['select', ...this.displayedColumns()];
  }

  private readonly VIEW_MODE_KEY = 'print_list_view_mode';

  private _viewMode: 'list' | 'grouped' =
    (localStorage.getItem('print_list_view_mode') as 'list' | 'grouped') ??
    'list';

  get viewMode(): 'list' | 'grouped' {
    return this._viewMode;
  }

  set viewMode(value: 'list' | 'grouped') {
    const previous = this._viewMode;
    this._viewMode = value;
    localStorage.setItem(this.VIEW_MODE_KEY, value);

    // updateFilter() skips the flat fetch while grouped is selected, so the
    // rows still on hand are whatever the last list-view load produced — stale
    // the moment a filter changed in grouped mode. Coming back has to refetch.
    // Only on an actual change, and only in that direction: the grouped view
    // loads its own feed.
    if (previous !== value && value === 'list') {
      this.updateFilter();
    }
  }

  public readonly filterByStatus = signal<PrintStatus | null>(null);

  public readonly filterByPrinterIds = signal<number[]>([]);

  public readonly filterByFilamentIds = signal<string[]>([]);
  public readonly filterByFilaments = signal<FilamentSummary[]>([]);

  public printStatusTypes = PrintStatus;

  public printSummarySortColumns = toSortHeaderIds(PrintSummarySortColumn);

  /**
   * Start Date, Start Time and Start Date/Time are three renderings of one sort
   * column, and the user can display any combination of them.
   *
   * MatSort keys its registry by header id and throws
   * "Cannot have two MatSortables with the same id" the moment a second header
   * claims one. That throw lands while the header row is initializing and takes
   * the rest of the render pass with it, so the table paints a page of rows
   * whose data cells are all empty until a later pass fills them in - seconds
   * later on a large page. So each header gets an id of its own, and
   * `sortData` maps it back onto the sort column the API understands.
   */
  public readonly startDateSortHeaderIds: Record<string, string> = {
    'start-date': `${this.printSummarySortColumns.StartDate}:start-date`,
    'start-time': `${this.printSummarySortColumns.StartDate}:start-time`,
    'start-date-time': `${this.printSummarySortColumns.StartDate}:start-date-time`,
  };

  public debouncedUpdateFilter;

  public sortColumn = PrintSummarySortColumn.StartDate;
  public sortDirection = SortDirection.Desc;

  public printerRedirectToast: ActiveToast<any> | null = null;
  public printerRedirectSubscription: Subscription | null = null;

  /**
   * Whether the user owns at least one printer. `null` until the lookup that
   * already drives the "No Active Printers" prompt resolves.
   */
  public readonly hasPrinters = signal<boolean | null>(null);
  /** True while the getting-started checklist shows; it replaces the no-printer toast. */
  readonly onboardingActive = signal(false);

  /**
   * The toast decision depends on the print count, so it must wait for the
   * first list load rather than assume the printer lookup resolves second.
   */
  private printListLoaded = false;

  mobileQuery: MediaQueryList;

  /**
   * The desktop table and the mobile card list are two renderings of the same
   * rows, and only one of them is ever wanted.
   *
   * This is a template `@if` rather than `fxHide`, because ngx-layout writes
   * `display: none` from `ngAfterViewInit` — after the browser has already
   * painted. On a cold load nothing is on screen yet so that is invisible, but
   * switching back from Grouped by Project rebuilds this whole subtree, and the
   * cards were flashing up at desktop width before the hide caught up.
   * Rendering one branch also halves the work: the hidden half was being built
   * and laid out for nothing, which is most of a ~700ms blocking task at 100
   * rows.
   *
   * 959.98px is the width `fxHide.gt-sm` / `fxHide.lt-md` switched at, kept
   * exactly so the layout still changes where it always did.
   */
  private static readonly HANDSET_QUERY = '(max-width: 959.98px)';

  private handsetQuery: MediaQueryList;

  public readonly isHandset = signal(false);

  private readonly onHandsetChange = (event: MediaQueryListEvent) =>
    this.isHandset.set(event.matches);

  /**
   * Raw "a request is in flight". Drives cancellation and the empty-state
   * suppression; it deliberately does NOT drive what the user sees, because it
   * flips true for requests too short to be worth reporting.
   */
  readonly isLoading = signal(false);

  /**
   * Whether this list has ever painted rows.
   *
   * Splits the busy affordance in two. A first load has nothing on screen to
   * preserve, so a skeleton is the honest answer. A refetch — a filter, a sort,
   * a page change — already has rows, and replacing them with grey boxes throws
   * away the user's visual anchor and scroll position to say something a
   * progress bar says without destroying anything. Skeletons are a first-paint
   * affordance, not a loading affordance.
   *
   * On this route a resolver supplies the first page, so in practice almost
   * every load here is a refetch.
   */
  private readonly hasLoadedOnce = signal(false);

  /**
   * Deferred so a fast filter change does not flash. Note this gates the
   * progress bar as well as the skeleton: a progress bar that appears and
   * vanishes in 20ms is exactly as much of a glitch as a skeleton that does.
   */
  private readonly loadingIndicator = new DeferredSkeletonController();

  /**
   * True while ANY busy affordance is on screen — skeleton or progress bar.
   *
   * Deliberately outlives `isLoading`: the minimum dwell keeps an indicator up
   * for up to 400ms after the response lands. Anything that must not contradict
   * a visible indicator — the empty state above all, since "No prints found"
   * beside a running progress bar is a lie — has to gate on this, not on
   * `isLoading` alone.
   */
  readonly isBusy = this.loadingIndicator.visible;

  /** First load with nothing to preserve: draw placeholder rows. */
  readonly showSkeleton = computed(
    () => this.loadingIndicator.visible() && !this.hasLoadedOnce()
  );

  /** Refetch over existing rows: keep them, dim them, run a progress bar. */
  readonly showRefreshing = computed(
    () => this.loadingIndicator.visible() && this.hasLoadedOnce()
  );

  public isFilterPanelOpen =
    typeof window !== 'undefined' && window.innerWidth >= 600;

  readonly activeFilterCount = computed(() => {
    let count = 0;
    if (
      this.filterByStatus() !== null &&
      (this.filterByStatus() as number) !== -1
    )
      count++;
    if (this.filterByPrinterIds().length > 0) count++;
    if (this.filterByFilamentIds().length > 0) count++;
    return count;
  });

  /**
   * How many placeholder rows/cards to draw while a refetch is in flight.
   * Matching the current page size keeps the list roughly the height it will be,
   * capped so a 100-per-page view does not paint a screen and a half of grey.
   */
  public skeletonRowCount(): number {
    return Math.min(this.pageSize() || 10, 10);
  }

  public toggleFilterPanel(): void {
    this.isFilterPanelOpen = !this.isFilterPanelOpen;
  }

  public printSearchSubscription: Subscription | null = null;

  private subscriptions: Subscription = new Subscription();

  private readonly PRINT_TABLE_DISPLAYED_COLUMNS =
    'print_table_displayed_columns';

  public readonly preferredFilamentUnit =
    signal<PrintFilamentSourceMeasurement>(
      PrintFilamentSourceMeasurement.AsRecorded
    );
  private readonly userSettingService = inject(UserSettingService);

  public defaultFilamentPriceSetting: UserSetting | null = null;

  public preferredCurrencySymbolSetting: UserSetting | null = null;

  public defaultElectricityKwhRateSetting: UserSetting | null = null;

  public defaultElectricityWattageSetting: UserSetting | null = null;

  constructor() {
    const router = this.router;

    // Read synchronously, in the constructor: the first render has to pick the
    // right branch on its own, since correcting it afterwards is the flash this
    // replaces.
    this.handsetQuery = this.media.matchMedia(PrintListComponent.HANDSET_QUERY);
    this.isHandset.set(this.handsetQuery.matches);

    // addEventListener is missing from the no-op MediaQueryList the CDK returns
    // off the browser (prerender), so fall back rather than crash the build.
    if (this.handsetQuery.addEventListener) {
      this.handsetQuery.addEventListener('change', this.onHandsetChange);
    } else {
      this.handsetQuery.addListener?.(this.onHandsetChange);
    }

    // Mark the list as loading on the keystroke itself, not when the debounce
    // finally fires, so the empty state cannot flash stale copy for 400ms.
    //
    // The DEFERRED indicator deliberately does not start here. It starts with
    // the request itself in updateFilter(), so the 400ms debounce window does
    // not count against its 200ms delay — otherwise the progress bar would
    // appear while the user was still typing, before a request even exists.
    const debouncedFilterUpdate = debounce(() => {
      this.currentPage.set(1);
      this.updateFilter();
    }, 400);

    this.debouncedUpdateFilter = () => {
      this.isLoading.set(true);
      debouncedFilterUpdate();
    };

    this.subscriptions.add(
      router.events
        .pipe(
          filter((e) => e instanceof NavigationEnd),
          take(1)
        )
        .subscribe(() => {
          const mainHeader = document.querySelector(
            '#add-new-print'
          ) as HTMLElement;
          if (mainHeader) {
            mainHeader?.focus?.();
          }
        })
    );
  }

  ngOnDestroy(): void {
    if (this.handsetQuery?.removeEventListener) {
      this.handsetQuery.removeEventListener('change', this.onHandsetChange);
    } else {
      this.handsetQuery?.removeListener?.(this.onHandsetChange);
    }

    if (this.printerRedirectToast) {
      this.toastrService.remove(this.printerRedirectToast.toastId);
    }

    this.printerRedirectSubscription?.unsubscribe?.();

    this.subscriptions?.unsubscribe?.();

    this.loadingIndicator.destroy();
  }

  ngOnInit() {
    this.titleService.setTitle('My Prints - 3D Print Log');

    this.activatedRoute.queryParamMap.subscribe((params) => {
      if (params.has('searchText')) {
        this.searchText = params.get('searchText');
      }
      if (params.has('filterByStatus')) {
        this.filterByStatus.set(+params.get('filterByStatus'));
      }
      if (params.has('sortDirection')) {
        this.sortDirection = +params.get('sortDirection');
      }
      if (params.has('sortColumn')) {
        this.sortColumn = +params.get('sortColumn');
      }

      // setIfChanged, not set: these are signals compared with Object.is, so a
      // fresh array is always a "change" even when it holds the same ids (and
      // `[]` vs `[]` is the common case). Every updateFilter() writes the
      // filters back into the URL, so a plain set() made each navigation emit
      // on both signals, and the grouped view re-fetched its feed twice per
      // keystroke — cancelling the request already in flight each time.
      setIfChanged(
        this.filterByPrinterIds,
        params.getAll('filterByPrinterId').map((id) => +id)
      );
      setIfChanged(
        this.filterByFilamentIds,
        params.getAll('filterByFilamentId')
      );
    });

    this.activatedRoute.data.subscribe((data) => {
      this.defaultFilamentPriceSetting = data.defaultFilamentPriceSetting;
      this.preferredCurrencySymbolSetting = data.preferredCurrencySymbolSetting;
      this.defaultElectricityKwhRateSetting =
        data.defaultElectricityKwhRateSetting;
      this.defaultElectricityWattageSetting =
        data.defaultElectricityWattageSetting;

      const pagedResponse: PagedList<PrintSummary> = data.printList;
      this.handlePagedList(pagedResponse);

      this.printers.set(data.printers);
      this.filaments = data.filaments;

      this.filterByFilaments.set(
        this.filterByFilamentIds()
          .map((id) => this.filaments.find((f) => f.id === id))
          .filter((f) => f != null)
      );

      if (this.activeFilterCount() > 0) {
        this.isFilterPanelOpen = true;
      }
    });

    /**
     * Show the Add Printer prompt if needed.
     */
    this.subscriptions.add(
      this.printerService
        .getCurrentUserPrinterSummaries(1, 1, '', false)
        .pipe(map((page) => page.paging.totalCount === 0))
        .subscribe({
          next: (shouldShowPrompt) => {
            this.hasPrinters.set(!shouldShowPrompt);
            this.syncAddPrinterPrompt();
          },
          error: (error) => {
            // A failed lookup must not leave the first-run user staring at a
            // blank page, so assume they have printers and offer Add print.
            this.loggingService.logException(error);
            this.hasPrinters.set(true);
            this.syncAddPrinterPrompt();
          },
        })
    );

    this.mobileQuery = this.media.matchMedia('(max-width: 800px)');

    // Load display'd columns.
    const columns = JSON.parse(
      localStorage.getItem(this.PRINT_TABLE_DISPLAYED_COLUMNS)
    );

    // Error correction
    if (
      Array.isArray(columns) &&
      columns.every((entry) => typeof entry === 'string')
    ) {
      this.displayedColumns.set(columns);
    } else {
      // Initialize with defaults for size;
      if (this.mobileQuery.matches) {
        this.displayedColumns.set([
          'image',
          'title',
          'printer',
          'start-date',
          'status',
          'more',
        ]);
      } else {
        this.displayedColumns.set([
          'image',
          'title',
          'printer',
          'start-date',
          'status',
          'printTime',
          'filamentSummary',
          'commentCount',
          'more',
        ]);
      }

      localStorage.setItem(
        this.PRINT_TABLE_DISPLAYED_COLUMNS,
        JSON.stringify(this.displayedColumns())
      );
    }

    this.userSettingService
      .getCurrentUsersSettingByType(
        UserSettingType.Prints_PreferredFilamentDisplayUnit
      )
      .then((setting) => {
        if (setting) {
          this.preferredFilamentUnit.set(
            +setting.value as PrintFilamentSourceMeasurement
          );
        }
      });
  }

  public pageChange(pageEvent: PageEvent) {
    this.currentPage.set(pageEvent.pageIndex + 1);
    this.pageSize.set(pageEvent.pageSize);

    this.updateFilter();
  }

  private handlePagedList(response: PagedList<PrintSummary>) {
    this.prints.set(response.items);
    // Reached from the resolver on first activation and from every refetch, so
    // this is the one place that knows rows have actually been painted.
    this.hasLoadedOnce.set(true);

    this.currentPage.set(response.paging.currentPage);
    this.pageSize.set(response.paging.pageSize);
    this.totalCount.set(response.paging.totalCount);

    this.printListLoaded = true;
    this.syncAddPrinterPrompt();
  }

  /**
   * True when the empty state itself is telling the user to add a printer.
   * Only in that case is the toast redundant.
   */
  private emptyStateShowsPrinterGuidance(): boolean {
    return (
      this.hasPrinters() === false &&
      this.totalCount() === 0 &&
      this.activeFilterCount() === 0 &&
      // Trimmed to agree with PrintEmptyStateComponent.hasSearch(), otherwise
      // whitespace-only search text shows the empty state and the toast.
      !this.searchText?.trim()
    );
  }

  /**
   * Shows the "No Active Printers" toast unless the empty state is already
   * giving the same instruction. A user who has prints but no active printer
   * renders no empty state at all, so the toast must stay.
   */
  private syncAddPrinterPrompt(): void {
    // Wait until both the print count and the printer count are known, so the
    // toast cannot open and immediately flash away on the slower answer.
    if (!this.printListLoaded) {
      return;
    }

    if (this.onboardingActive()) {
      this.dismissAddPrinterToast();
      return;
    }

    if (this.hasPrinters() !== false) {
      this.dismissAddPrinterToast();
      return;
    }

    if (this.emptyStateShowsPrinterGuidance()) {
      this.dismissAddPrinterToast();
      return;
    }

    this.showAddPrinterToast();
  }

  /** Set from the hint slot's `checklistActive`; the toast waits while the checklist shows. */
  setOnboardingActive(active: boolean): void {
    this.onboardingActive.set(active);
    this.syncAddPrinterPrompt();
  }

  private showAddPrinterToast(): void {
    if (this.printerRedirectToast || addPrinterToastShown) {
      return;
    }
    addPrinterToastShown = true;

    this.printerRedirectToast = this.toastrService.info(
      'Click here to add a new 3D Printer before logging prints.',
      'No Active Printers',
      {
        disableTimeOut: true,
      }
    );

    this.printerRedirectSubscription =
      this.printerRedirectToast.onTap.subscribe(() => {
        this.loggingService.logEvent('NoActivePrinterPromptClicked');
        this.router.navigate(['printers', 'new'], {
          queryParams: { returnUrl: '/prints' },
        });
        this.printerRedirectSubscription?.unsubscribe?.();
        this.printerRedirectSubscription = null;
      });
  }

  private dismissAddPrinterToast(): void {
    if (!this.printerRedirectToast) {
      return;
    }

    this.toastrService.remove(this.printerRedirectToast.toastId);
    this.printerRedirectToast = null;

    this.printerRedirectSubscription?.unsubscribe?.();
    this.printerRedirectSubscription = null;
  }

  public sortData(sort: Sort) {
    // Header ids are the sort column, except where several columns share one and
    // carry a ":suffix" to stay unique - see startDateSortHeaderIds.
    this.sortColumn = +sort.active.split(':')[0];

    this.sortDirection =
      sort.direction === 'asc' ? SortDirection.Asc : SortDirection.Desc;

    this.currentPage.set(1);

    this.updateFilter();
  }

  public resetFilters() {
    this.currentPage.set(1);
    this.searchText = '';
    this.filterByStatus.set(null);
    this.filterByPrinterIds.set([]);
    this.filterByFilamentIds.set([]);
    this.filterByFilaments.set([]);

    this.sortDirection = SortDirection.Desc;
    this.sortColumn = PrintSummarySortColumn.StartDate;

    this.updateFilter();
  }

  /**
   * Reloads the current page of prints.
   *
   * The selection deliberately survives every result-set change (page, search,
   * filter, sort), matching the material list: the service holds the full
   * `PrintSummary` for each selected print, so a batch can act on prints that
   * have since scrolled off the current page.
   */
  public updateFilter() {
    this.isLoading.set(true);
    this.loadingIndicator.start();

    localStorage.setItem('print_list_page_size', this.pageSize().toString(10));

    return this.router
      .navigate(['.'], {
        queryParams: {
          pageNumber: this.currentPage(),
          pageSize: this.pageSize(),
          searchText: this.searchText || '',
          filterByStatus: this.filterByStatus(),
          filterByPrinterId: this.filterByPrinterIds(),
          filterByFilamentId: this.filterByFilamentIds(),
          sortDirection: this.sortDirection,
          sortColumn: this.sortColumn,
          t: new Date().getTime(),
        },
        relativeTo: this.activatedRoute,
      })
      .then(() => {
        // The grouped view renders /Prints/grouped and never reads this flat
        // page, so fetching it here put a second request on every keystroke
        // whose response was parsed and then thrown away.
        //
        // The resolver cannot cover this refetch: runGuardsAndResolvers
        // defaults to 'paramsChange', which compares path params and URL
        // segments only, so a query-param navigation never re-runs it. It
        // populates first activation; every refetch after that is this call.
        if (this.viewMode !== 'list') {
          this.isLoading.set(false);
          this.loadingIndicator.stop();
          return;
        }

        this.printSearchSubscription?.unsubscribe?.();

        this.printSearchSubscription = this.printService
          .getPrintSummaries(
            this.currentPage(),
            this.pageSize(),
            this.searchText || '',
            this.filterByStatus(),
            this.filterByPrinterIds(),
            this.filterByFilamentIds(),
            this.sortDirection,
            this.sortColumn,
            undefined
          )
          // Only stop() moves into finalize. It is the refcounted one, and the
          // unsubscribe above CANCELS whatever was in flight — a cancelled
          // source reaches neither next nor error, so a stop() in the subscriber
          // leaked one `pending` per superseded request and stranded the
          // progress bar for the life of the page. `isLoading` is a plain flag
          // and stays where it was, cleared when a response actually lands.
          .pipe(finalize(() => this.loadingIndicator.stop()))
          .subscribe(
            (prints) => {
              this.handlePagedList(prints);
              this.isLoading.set(false);
            },
            () => {
              // A failed first load leaves the list empty, so the NEXT attempt
              // is still a first paint — hasLoadedOnce is only set on success,
              // in handlePagedList.
              this.isLoading.set(false);
            }
          );
      });
  }

  public share(print: PrintSummary) {
    this.loggingService.logEvent('PrintListShareClicked', {
      printId: print.id,
    });
    const dialogRef = this.dialog.open(PrintShareDialogComponent, {
      width: '300px',
      minWidth: '300px',
      data: { printId: print.id },
    });

    dialogRef.afterClosed().subscribe((result) => {});
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

  public getFilamentLabel(filament: FilamentSummary) {
    return [
      filament.displayName,
      filament.brand,
      filament.materialType,
      filament.colorName,
    ]
      .filter(Boolean)
      .join(' - ');
  }

  public deletePrint(print: PrintSummary) {
    const dialogRef = openSimpleDialog(
      this.dialog,
      {
        title: 'Delete?',
        body: `Are you sure you want to delete print "${print.title}"? <br /> <br />  This action cannot be undone.`,
        yesText: 'Delete',
        yesColor: 'warn',
        noText: 'Cancel',
      },
      { maxWidth: '350px' }
    );

    dialogRef.afterClosed().subscribe((shouldDelete) => {
      if (shouldDelete) {
        this.printService.deletePrint(print.id).subscribe((_) => {
          // The selection outlives the reload now, so a deleted print has to be
          // taken out of it explicitly or a later batch would act on a dead id.
          this.bulkActions.deselect(print.id);
          this.updateFilter().then(() => {
            this.toastrService.success(
              'Print removed successfully.',
              'Success'
            );
          });
        });
      }
    });
  }

  public openPrintTableLayout() {
    const onSelectionChange = new Subject<string[]>();

    const subscription = onSelectionChange.subscribe((selectedColumns) => {
      // Always add the 'more' column at the end
      this.displayedColumns.set([
        ...selectedColumns.filter((col) => col !== 'more'),
        'more',
      ]);

      localStorage.setItem(
        this.PRINT_TABLE_DISPLAYED_COLUMNS,
        JSON.stringify(this.displayedColumns())
      );
    });

    const dialogRef = this.dialog.open(PrintTableLayoutComponent, {
      width: '450px',
      minWidth: '450px',
      disableClose: true,
      data: {
        title: 'All Prints Table Layout',
        allPossibleColumns: this.allPossibleColumns.filter(
          (column) => column.key !== 'more'
        ),
        currentColumns: this.displayedColumns(),
        defaultColumns: [
          'image',
          'title',
          'printer',
          'start-date',
          'status',
          'printTime',
          'filamentSummary',
          'commentCount',
          'more',
        ],
        changeEvent: onSelectionChange,
      },
    });

    dialogRef.afterClosed().subscribe(() => {
      subscription.unsubscribe();

      this.loggingService.logEvent('PrintListLayoutChanged', {
        columns: JSON.stringify(this.displayedColumns()),
      });
    });
  }

  /**
   * Changes the status of the selected print.
   * @param id The Print Id
   * @param newStatus The new status
   */
  public changeStatus(id: number, newStatus: PrintStatus) {
    this.printService.updatePrintStatus(id, newStatus).subscribe(() => {
      this.toastrService.success('Status Updated.', 'Success');
      this.prints.update((prints) =>
        prints.map((p) => (p.id === id ? { ...p, status: newStatus } : p))
      );
    });
  }

  public getStatus(print: PrintSummary) {
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
    } else if (print.status === PrintStatus.PartialSuccess) {
      return 'Partial Success';
    } else {
      return 'Unknown';
    }
  }

  public getStatusIcon(print: PrintSummary): string {
    if (print.status === PrintStatus.Cancelled) {
      return 'remove_circle_outline';
    } else if (print.status === PrintStatus.Failed) {
      return 'error_outline';
    } else if (print.status === PrintStatus.Pending) {
      return 'pending_actions';
    } else if (print.status === PrintStatus.Printing) {
      return 'play_circle_outline';
    } else if (print.status === PrintStatus.Success) {
      return 'check_circle_outline';
    } else if (print.status === PrintStatus.PartialSuccess) {
      return 'rule';
    } else {
      return 'help_outline';
    }
  }

  public navigateToPrint(printId: number): void {
    this.router.navigate([printId], { relativeTo: this.activatedRoute });
  }

  public getPrintEndDate(print: PrintSummary) {
    if (
      print.startDate &&
      (print.estimatedPrintTimeInSeconds > 0 || print.printTimeInSeconds > 0)
    ) {
      const printTime =
        print.printTimeInSeconds > 0
          ? print.printTimeInSeconds
          : print.estimatedPrintTimeInSeconds > 0
            ? print.estimatedPrintTimeInSeconds
            : 0;

      return new Date(new Date(print.startDate).getTime() + printTime * 1000);
    }

    return null;
  }

  public getEstimatedPrice(filamentUsage: PrintFilamentSummaryDto) {
    const filament = filamentUsage.filament;

    const source = filamentUsage.estimatedSource;

    const weightG =
      filamentUsage.estimatedAmountMg > 0
        ? filamentUsage.estimatedAmountMg / 1000
        : undefined;

    const lengthM = filamentUsage.estimatedLengthInM;

    const volumeMl = filamentUsage.estimatedVolumeMl;

    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;

    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';

    return this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament,
        source,
        weightG,
        lengthM,
        volumeMl,
        currencySymbol: symbol,
        defaultFilamentPrice: defaultPrice,
      })
    );
  }

  public getActualPrice(filamentUsage: PrintFilamentSummaryDto) {
    const filament = filamentUsage.filament;

    const source = filamentUsage.source;
    const weightG =
      filamentUsage.amountMg > 0 ? filamentUsage.amountMg / 1000 : undefined;

    const lengthM = filamentUsage.lengthInM;

    const volumeMl = filamentUsage.volumeMl;

    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;

    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';

    return this.formatFilamentPrice(
      this.printService.calculatePrintCost({
        filament,
        source,
        weightG,
        lengthM,
        volumeMl,
        currencySymbol: symbol,
        defaultFilamentPrice: defaultPrice,
      })
    );
  }

  public formatFilamentPrice(price: FilamentPrice) {
    if (price.valid) {
      let result = price.formattedPrice;
      if (price.usesDefaultPrice) {
        result += '*';
      }
      return result;
    } else {
      return (price as FilamentPriceInvalid).message;
    }
  }

  public getTotalFilamentCost(filamentUsage: PrintFilamentSummaryDto[]) {
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;

    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';

    const total = this.printService.calculateTotalPrintCost(
      filamentUsage,
      symbol,
      defaultPrice
    );

    if (total.total.valid) {
      return `${total.total.formattedPrice}`;
    }
    return '';
  }

  public getElectricityCost(print: PrintSummary): string {
    const result = this.printService.calculateElectricityCost({
      printTimeSeconds:
        print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
      kwhRate: this.defaultElectricityKwhRateSetting?.value,
      printerWattageW: print.printer?.wattageW,
      defaultWattageW: this.defaultElectricityWattageSetting?.value,
      currencySymbol: this.preferredCurrencySymbolSetting?.value ?? '$',
    });
    if (result.valid) {
      return result.formattedCost;
    }
    return '';
  }

  public getTotalCombinedCostTooltip(print: PrintSummary): string {
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';
    const materialTotal = this.printService.calculateTotalPrintCost(
      print.filamentUsage,
      symbol,
      defaultPrice
    );
    const electricityResult = this.printService.calculateElectricityCost({
      printTimeSeconds:
        print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
      kwhRate: this.defaultElectricityKwhRateSetting?.value,
      printerWattageW: print.printer?.wattageW,
      defaultWattageW: this.defaultElectricityWattageSetting?.value,
      currencySymbol: symbol,
    });
    const parts: string[] = [];
    if (materialTotal.total.valid) {
      parts.push(`Material: ${materialTotal.total.formattedPrice}`);
    }
    if (electricityResult.valid) {
      parts.push(`Electricity: ${electricityResult.formattedCost}`);
    }
    return parts.join('\n');
  }

  public getTotalCombinedCost(print: PrintSummary): string {
    const defaultPrice = this.defaultFilamentPriceSetting?.value ?? null;
    const symbol = this.preferredCurrencySymbolSetting?.value ?? '$';
    const materialTotal = this.printService.calculateTotalPrintCost(
      print.filamentUsage,
      symbol,
      defaultPrice
    );
    const electricityResult = this.printService.calculateElectricityCost({
      printTimeSeconds:
        print.printTimeInSeconds ?? print.estimatedPrintTimeInSeconds,
      kwhRate: this.defaultElectricityKwhRateSetting?.value,
      printerWattageW: print.printer?.wattageW,
      defaultWattageW: this.defaultElectricityWattageSetting?.value,
      currencySymbol: symbol,
    });
    if (materialTotal.total.valid && electricityResult.valid) {
      return (materialTotal.total as FilamentPriceValid).price
        .add(electricityResult.cost)
        .format({
          symbol,
          decimal: Intl.NumberFormat()
            .formatToParts(100000.1)
            .find((p) => p.type === 'decimal').value,
          separator: Intl.NumberFormat()
            .formatToParts(100000.1)
            .find((p) => p.type === 'group').value,
        });
    }
    if (materialTotal.total.valid) {
      return materialTotal.total.formattedPrice;
    }
    if (electricityResult.valid) {
      return electricityResult.formattedCost;
    }
    return '';
  }

  public parseGcode(event) {
    const files = event.target.files;
    if (files) {
      for (const file of files) {
        this.loggingService.logTrace(`Parsing gcode of filetype: ${file.type}`);
        // if (!file.type.match(/[gcode|g|txt|gco|gx]/)) {
        //   // this.toastr.error(
        //   //   'Please select an image.',
        //   //   'Selected file is not an Image'
        //   // );
        //   continue;
        // }

        const fileName = file.name;

        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.gcodeParserService
            .parse(e.target.result, fileName)
            .then((newPrint) => {
              if (newPrint) {
                this.newPrintStoreService.setNewPrint(newPrint);
                this.router
                  .navigate(['new', 'edit'], {
                    relativeTo: this.activatedRoute,
                  })
                  .catch((err) => this.loggingService.logException(err));
              }
            });
        };
        reader.readAsText(file);
      }
    }
  }

  public searchFilament() {
    const dialogRef = this.dialog.open(FilamentSearchModalComponent, {
      data: {
        otherFilamentOption: null,
        multiSelect: true,
      },
      height: '90svh',
      width: '95vw',
      maxWidth: '100vw',
      position: {
        top: '5vh',
      },
    });

    dialogRef.afterClosed().subscribe((filaments: FilamentSummary[] | null) => {
      if (filaments?.length) {
        for (const filament of filaments) {
          if (!this.filterByFilamentIds().includes(filament.id)) {
            this.filterByFilamentIds.update((ids) => [...ids, filament.id]);
            this.filterByFilaments.update((fs) => [...fs, filament]);
          }
        }
        this.currentPage.set(1);
        this.updateFilter();
      }
    });
  }

  public removeFilamentFilter(filament: FilamentSummary) {
    this.filterByFilamentIds.update((ids) =>
      ids.filter((id) => id !== filament.id)
    );
    this.filterByFilaments.update((fs) =>
      fs.filter((f) => f.id !== filament.id)
    );
    this.currentPage.set(1);
    this.updateFilter();
  }

  /**
   * Reloads the page in place after a bulk action so the table reflects the new
   * statuses (or the removed rows) without navigating away. The service has
   * already narrowed the selection to the prints that failed.
   */
  public onBulkActionCompleted(): void {
    this.updateFilter();
  }

  public navigateToNewProject(): void {
    this.router.navigate(['/projects', 'new']);
  }
}
