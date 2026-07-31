import { BreakpointObserver } from '@angular/cdk/layout';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  ViewContainerRef,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { map } from 'rxjs';
import { PrintStatus } from 'src/app/core/services/print.service';
import { AnalyticsFilterControlsComponent } from './analytics-filter-controls.component';
import {
  AnalyticsFilterOptionsService,
  FilterOption,
} from './analytics-filter-options.service';
import { AnalyticsFilterSheetComponent } from './analytics-filter-sheet.component';
import {
  AnalyticsFilterStore,
  DateRangePreset,
} from './analytics-filter.store';

interface ActiveChip {
  id: string;
  label: string;
  colorHex?: string;
  remove: () => void;
}

@Component({
  selector: 'app-analytics-filter-bar',
  imports: [
    AnalyticsFilterControlsComponent,
    MatBadgeModule,
    MatButtonModule,
    MatChipsModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatNativeDateModule,
    MatSelectModule,
    MatSlideToggleModule,
  ],
  templateUrl: './analytics-filter-bar.component.html',
  styleUrls: ['./analytics-filter-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnalyticsFilterBarComponent {
  readonly store = inject(AnalyticsFilterStore);
  private readonly bottomSheet = inject(MatBottomSheet);
  private readonly viewContainerRef = inject(ViewContainerRef);
  private readonly options = inject(AnalyticsFilterOptionsService);

  /**
   * A container query cannot decide WHICH component opens, only how one looks, so the
   * inline-vs-bottom-sheet switch needs a real breakpoint observation.
   */
  readonly isPhone = toSignal(
    inject(BreakpointObserver)
      .observe('(max-width: 599px)')
      .pipe(map((s) => s.matches)),
    { initialValue: false }
  );

  readonly presets: readonly { value: DateRangePreset; label: string }[] = [
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'last7', label: 'Last 7 days' },
    { value: 'last30', label: 'Last 30 days' },
    { value: 'last90', label: 'Last 90 days' },
    { value: 'last365', label: 'Last 365 days' },
    { value: 'ytd', label: 'Year to date' },
    { value: 'all', label: 'All time' },
    { value: 'custom', label: 'Custom range…' },
  ];

  private readonly statusLabels: Record<number, string> = {
    [PrintStatus.Pending]: 'Pending',
    [PrintStatus.Printing]: 'Printing',
    [PrintStatus.Success]: 'Success',
    [PrintStatus.Cancelled]: 'Cancelled',
    [PrintStatus.Failed]: 'Failed',
    [PrintStatus.PartialSuccess]: 'Partial success',
  };

  /**
   * One removable chip per selected value, so what is filtering the page is visible without
   * opening any menu — the thing that most often confuses people about a filtered dashboard.
   */
  readonly activeChips = computed<ActiveChip[]>(() => {
    const chips: ActiveChip[] = [];
    const printers = new Map<string | number, FilterOption>(
      this.options.printers().map((option) => [option.id, option] as const)
    );
    const materials = new Map<string | number, FilterOption>(
      this.options.materials().map((option) => [option.id, option] as const)
    );

    for (const id of this.store.printerIds()) {
      chips.push({
        id: `printer-${id}`,
        label: printers.get(id)?.label ?? `Printer ${id}`,
        remove: () =>
          this.store.setPrinterIds(
            this.store.printerIds().filter((x) => x !== id)
          ),
      });
    }

    for (const id of this.store.filamentIds()) {
      chips.push({
        id: `material-${id}`,
        label: materials.get(id)?.label ?? 'Material',
        colorHex: materials.get(id)?.colorHex,
        remove: () =>
          this.store.setFilamentIds(
            this.store.filamentIds().filter((x) => x !== id)
          ),
      });
    }

    for (const id of this.store.projectIds()) {
      chips.push({
        id: `project-${id}`,
        label: 'Project',
        remove: () =>
          this.store.setProjectIds(
            this.store.projectIds().filter((x) => x !== id)
          ),
      });
    }

    for (const status of this.store.statuses()) {
      chips.push({
        id: `status-${status}`,
        label: this.statusLabels[status] ?? `Status ${status}`,
        remove: () =>
          this.store.setStatuses(
            this.store.statuses().filter((x) => x !== status)
          ),
      });
    }

    return chips;
  });

  onPreset(preset: DateRangePreset): void {
    this.store.setPreset(preset);
  }

  /**
   * The two ends arrive as independent (dateChange) events, so both are staged here and only
   * a complete, ordered pair is committed.
   *
   * Staging BOTH ends matters: choosing a new start while a committed range exists must not
   * pair that new start with the OLD end. Re-picking a later start would otherwise commit an
   * inverted range (from > to), which the API rejects outright — the user would see an error
   * simply for editing the first half of their own range. Picking a start therefore clears
   * the staged end, matching what the picker does on screen.
   */
  private readonly pendingStart = signal<Date | null>(null);
  private readonly pendingEnd = signal<Date | null>(null);

  onCustomStart(value: Date | null): void {
    this.pendingStart.set(value);
    this.pendingEnd.set(null);
    this.commitCustomRange();
  }

  onCustomEnd(value: Date | null): void {
    this.pendingEnd.set(value);
    this.commitCustomRange();
  }

  private commitCustomRange(): void {
    const from = this.pendingStart();
    const to = this.pendingEnd();

    if (!from || !to || from > to) return;

    this.store.setCustomRange(from, to);
  }

  openSheet(): void {
    // The sheet is created in the CDK overlay, which sits outside this component's injector
    // tree. AnalyticsFilterStore is a component-level provider on the shell, so without an
    // explicit injector the sheet cannot resolve it, fails to construct, and simply never
    // appears — a silent no-op on the only way to filter on a phone.
    this.bottomSheet.open(AnalyticsFilterSheetComponent, {
      viewContainerRef: this.viewContainerRef,
    });
  }
}
