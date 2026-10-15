import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { PrintTag } from 'src/app/core/services/print-tag.service';

/**
 * One print tag (#7) as a small pill: a dot in the tag's colour and its name. The colour only
 * ever fills the dot, never the pill or the text, so a user's pick cannot make the name
 * unreadable in either theme.
 */
@Component({
  selector: 'app-print-tag-chip',
  templateUrl: './print-tag-chip.component.html',
  styleUrl: './print-tag-chip.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PrintTagChipComponent {
  readonly tag = input.required<PrintTag>();

  /**
   * Render as a button that reports `clicked`, for the print list to filter by the tag. An
   * event rather than a router link: the list is already on /prints, where a query-param link
   * reuses the component without re-running its resolver, and would drop the other filters.
   */
  readonly clickable = input(false);

  readonly clicked = output<PrintTag>();

  protected onClick(event: MouseEvent): void {
    // The chip sits inside a row or card that opens the print on click.
    event.stopPropagation();
    this.clicked.emit(this.tag());
  }
}
