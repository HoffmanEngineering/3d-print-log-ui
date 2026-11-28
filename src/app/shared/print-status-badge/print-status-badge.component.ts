import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { PrintStatus } from 'src/app/core/services/print.service';

@Component({
  selector: 'app-print-status-badge',
  templateUrl: './print-status-badge.component.html',
  styleUrls: ['./print-status-badge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatIconModule],
})
export class PrintStatusBadgeComponent {
  readonly status = input.required<PrintStatus>();
  /** The print is paused on the printer. Shown only while it is still printing. */
  readonly paused = input(false);

  private readonly showPaused = computed(
    () => this.paused() && this.status() === PrintStatus.Printing
  );

  protected readonly label = computed(() => {
    if (this.showPaused()) {
      return 'Paused';
    }
    switch (this.status()) {
      case PrintStatus.Pending:
        return 'Pending';
      case PrintStatus.Printing:
        return 'Printing';
      case PrintStatus.Success:
        return 'Success';
      case PrintStatus.Cancelled:
        return 'Cancelled';
      case PrintStatus.Failed:
        return 'Failed';
      case PrintStatus.PartialSuccess:
        return 'Partial Success';
      default:
        return 'Unknown';
    }
  });

  protected readonly icon = computed(() => {
    if (this.showPaused()) {
      return 'pause_circle_outline';
    }
    switch (this.status()) {
      case PrintStatus.Pending:
        return 'pending_actions';
      case PrintStatus.Printing:
        return 'play_circle_outline';
      case PrintStatus.Success:
        return 'check_circle_outline';
      case PrintStatus.Cancelled:
        return 'remove_circle_outline';
      case PrintStatus.Failed:
        return 'error_outline';
      case PrintStatus.PartialSuccess:
        return 'rule';
      default:
        return 'help_outline';
    }
  });

  protected readonly statusClass = computed(() =>
    this.showPaused() ? 'status-paused' : `status-${this.status()}`
  );
}
