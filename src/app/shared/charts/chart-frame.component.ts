import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Coverage } from 'src/app/analytics/models/analytics.models';
import {
  CsvExport,
  downloadCsv,
  downloadPng,
  svgToPngBlob,
  toCsv,
} from './chart-export';
import { formatCoverageNote } from './coverage-note';

export type ChartState = 'loading' | 'ready' | 'empty' | 'error';

/**
 * Every chart's outer shell: heading, loading/empty/error states, coverage badge, and the
 * measured size children render into. Cross-cutting behavior lives here once so the
 * individual chart types stay small.
 */
@Component({
  selector: 'app-chart-frame',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTooltipModule,
  ],
  templateUrl: './chart-frame.component.html',
  styleUrls: ['./chart-frame.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartFrameComponent implements OnDestroy {
  readonly title = input.required<string>();
  readonly state = input<ChartState>('loading');
  readonly emptyMessage = input('No data for this selection yet.');
  readonly errorMessage = input('Could not load this chart.');
  readonly coverage = input<Coverage | null>(null);
  readonly ariaSummary = input('');

  /**
   * The rows behind this chart, for CSV download. Null hides the CSV item — a menu entry that
   * downloads an empty file is worse than no entry. Generated client-side: the data is already
   * here, typed, and bounded by the same row caps the endpoints enforce.
   */
  readonly csv = input<CsvExport | null>(null);

  /**
   * How the body gets its height.
   *
   * 'aspect' (default) sizes the plot from an aspect ratio, which is right for charts that
   * should scale with their container. 'natural' lets the projected content define the
   * height, which is what an intrinsically-sized widget needs — a calendar heatmap is about
   * 110px tall no matter how wide the panel is, and forcing 16/9 onto a full-width panel
   * produced a 790px box with the content stranded in one corner.
   */
  readonly fit = input<'aspect' | 'natural'>('aspect');

  readonly retry = output<void>();

  private readonly body = viewChild<ElementRef<HTMLElement>>('chartBody');

  /**
   * Measured from the container, not the window: the side nav collapsing changes width
   * without a viewport change, and a tab only has a size once it activates.
   */
  readonly width = signal(0);
  readonly height = signal(0);

  private observer?: ResizeObserver;

  constructor() {
    effect(() => {
      const el = this.body()?.nativeElement;
      if (!el || typeof ResizeObserver === 'undefined') return;

      this.observer?.disconnect();
      this.observer = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (!rect) return;
        this.width.set(Math.floor(rect.width));
        this.height.set(Math.floor(rect.height));
      });
      this.observer.observe(el);
    });
  }

  /**
   * Reasons worth surfacing. Rendered as plain language because a raw enum name in the UI
   * tells the user nothing.
   */
  readonly coverageNote = computed(() => formatCoverageNote(this.coverage()));

  exportCsv(): void {
    const csv = this.csv();
    if (!csv) return;
    downloadCsv(csv.filename, toCsv(csv.columns, csv.rows));
  }

  /**
   * The chart only — the hidden accessible data table sits outside #chartBody, so it is not
   * part of the image by construction rather than by filtering.
   */
  async exportPng(): Promise<void> {
    const svg = this.body()?.nativeElement.querySelector('svg');
    if (!svg) return;
    downloadPng(
      `${this.title()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}.png`,
      await svgToPngBlob(svg)
    );
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
