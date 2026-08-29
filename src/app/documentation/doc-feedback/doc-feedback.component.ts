import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DocsTelemetryService } from '../docs-telemetry.service';

/** What the widget is currently showing. */
type FeedbackPhase = 'asking' | 'explaining' | 'done';

/**
 * "Was this helpful?" at the foot of every docs page.
 *
 * A positive vote is reported immediately. A negative one is held back so the
 * reader can say why — but it is never lost: skipping, submitting, or simply
 * navigating away all flush the vote exactly once.
 */
@Component({
  selector: 'app-doc-feedback',
  templateUrl: './doc-feedback.component.html',
  styleUrls: ['./doc-feedback.component.scss'],
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocFeedbackComponent implements OnDestroy {
  private readonly telemetry = inject(DocsTelemetryService);

  /**
   * Identifies the page being rated. The widget lives in the docs shell, which
   * survives navigation, so it needs to know when the reader has moved on.
   */
  readonly pageKey = input<string>('');

  readonly phase = signal<FeedbackPhase>('asking');
  readonly comment = signal('');

  /** True once a negative vote is awaiting its explanation. */
  private pendingNegative = false;

  /**
   * The page the pending vote was cast on. Captured at vote time because the
   * flush can happen after the reader has already navigated away.
   */
  private pendingSlug = '';

  constructor() {
    effect(() => {
      this.pageKey();
      // A vote belongs to the page it was cast on: flush anything outstanding,
      // then start the next page fresh rather than leaving it thanked.
      this.flushNegative();
      this.comment.set('');
      this.phase.set('asking');
    });
  }

  voteHelpful(): void {
    this.telemetry.trackFeedback(true, undefined, this.pageKey());
    this.phase.set('done');
  }

  voteUnhelpful(): void {
    this.pendingNegative = true;
    this.pendingSlug = this.pageKey();
    this.phase.set('explaining');
  }

  onCommentInput(event: Event): void {
    this.comment.set((event.target as HTMLTextAreaElement).value);
  }

  submit(): void {
    this.flushNegative();
    this.phase.set('done');
  }

  skip(): void {
    this.comment.set('');
    this.flushNegative();
    this.phase.set('done');
  }

  ngOnDestroy(): void {
    // A reader who navigates away mid-explanation still gave us a verdict.
    this.flushNegative();
  }

  private flushNegative(): void {
    if (!this.pendingNegative) {
      return;
    }
    this.pendingNegative = false;
    const text = this.comment().trim();
    this.telemetry.trackFeedback(
      false,
      text.length > 0 ? text : undefined,
      this.pendingSlug
    );
  }
}
