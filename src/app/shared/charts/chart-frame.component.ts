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
import { MatTooltipModule } from '@angular/material/tooltip';
import { Coverage } from 'src/app/analytics/models/analytics.models';
import { formatCoverageNote } from './coverage-note';

export type ChartState = 'loading' | 'ready' | 'empty' | 'error';

/**
 * Every chart's outer shell: heading, loading/empty/error states, coverage badge, and the
 * measured size children render into. Cross-cutting behaviour lives here once so the
 * individual chart types stay small.
 */
@Component({
  selector: 'app-chart-frame',
  imports: [MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule],
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

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
