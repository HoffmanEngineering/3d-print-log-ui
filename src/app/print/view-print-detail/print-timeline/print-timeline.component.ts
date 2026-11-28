import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { catchError, of, switchMap } from 'rxjs';
import {
  PrintService,
  PrintTimelineEvent,
} from 'src/app/core/services/print.service';
import { LocaleDatePipe } from 'src/app/shared/pipes/locale-date.pipe';

interface TimelineRow {
  id: number;
  occurredAt: string;
  icon: string;
  label: string;
  /** A failure's code, shown beside its reason. */
  detail: string | null;
}

/** Finished statuses as the API names them, in this app's words. */
const FINISHED_LABELS: Record<string, string> = {
  Success: 'Success',
  PartialSuccess: 'Partial success',
  Cancelled: 'Canceled',
  Failed: 'Failed',
};

/**
 * A print's history (3d-print-log-api#343): when it started and finished, who claimed it, its
 * pauses and why it failed. The parent renders it for the print's creator only, since the API
 * answers anyone else 403. Renders nothing when there is nothing to show, or the API has no
 * timeline.
 */
@Component({
  selector: 'app-print-timeline',
  templateUrl: './print-timeline.component.html',
  styleUrls: ['./print-timeline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule, LocaleDatePipe],
  // The parent gives the host its band; with nothing to show, the band goes too.
  host: { '[style.display]': "rows().length ? 'block' : 'none'" },
})
export class PrintTimelineComponent {
  private readonly printService = inject(PrintService);

  readonly printId = input.required<number>();

  private readonly events = toSignal(
    toObservable(this.printId).pipe(
      switchMap((id) =>
        this.printService
          .getPrintTimeline(id)
          .pipe(catchError(() => of([] as PrintTimelineEvent[])))
      )
    ),
    { initialValue: [] as PrintTimelineEvent[] }
  );

  protected readonly rows = computed(() =>
    this.events()
      .map(toRow)
      .filter((row): row is TimelineRow => row !== null)
  );
}

function toRow(e: PrintTimelineEvent): TimelineRow | null {
  const row = (icon: string, label: string, detail: string | null = null) => ({
    id: e.id,
    occurredAt: e.occurredAt,
    icon,
    label,
    detail,
  });
  switch (e.type) {
    case 'started':
      return row('play_circle_outline', 'Started');
    case 'finished':
      return row(
        'flag',
        e.code ? `Finished: ${FINISHED_LABELS[e.code] ?? e.code}` : 'Finished'
      );
    case 'claimed':
      return row('link', e.code ? `Claimed by ${e.code}` : 'Claimed');
    case 'paused':
      return row(
        'pause_circle_outline',
        e.endedAt
          ? `Paused for ${pauseLength(e.occurredAt, e.endedAt)}`
          : 'Paused (still paused)'
      );
    case 'failure': {
      const reason = e.message || e.code;
      return row(
        'error_outline',
        reason ? `Failed: ${reason}` : 'Failed',
        e.message && e.code ? e.code : null
      );
    }
    default:
      return null; // a type newer than this app: left out rather than shown raw
  }
}

/** "45 s", "6 min", "1 h 20 min". */
export function pauseLength(from: string, to: string): string {
  const seconds = Math.max(
    0,
    Math.round((new Date(to).getTime() - new Date(from).getTime()) / 1000)
  );
  if (seconds < 60) {
    return `${seconds} s`;
  }
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
