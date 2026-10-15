import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
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
  imports: [RouterLink],
})
export class PrintTagChipComponent {
  readonly tag = input.required<PrintTag>();

  /**
   * Link to the print list filtered by this tag. The chip often sits inside a clickable row or
   * card, so the click stops there rather than also opening the print.
   */
  readonly linked = input(false);
}
