import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Presentational empty state: an icon, a heading, an optional supporting
 * message and a slot for call-to-action buttons.
 *
 * Callers project their own actions:
 *
 * ```html
 * <app-empty-state icon="inbox" heading="Nothing here yet" message="...">
 *   <button mat-raised-button>Add something</button>
 * </app-empty-state>
 * ```
 */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'app-empty-state',
    '[attr.role]': 'announce() ? "status" : null',
  },
})
export class EmptyStateComponent {
  /** Material icon ligature shown above the heading. */
  readonly icon = input('inbox');

  /** Short headline describing the state. */
  readonly heading = input.required<string>();

  /** Optional supporting copy telling the user what to do next. */
  readonly message = input('');

  /**
   * Whether the host acts as a polite live region. Set to `false` when the
   * empty state already sits inside an `aria-live` container so screen
   * readers do not announce it twice.
   */
  readonly announce = input(true);
}
