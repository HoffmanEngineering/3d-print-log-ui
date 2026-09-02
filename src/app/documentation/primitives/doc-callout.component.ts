import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** The four things a callout is ever saying. */
export type DocCalloutKind = 'note' | 'tip' | 'warning' | 'danger';

/**
 * The icon and the screen-reader label for each kind.
 *
 * The label is not decoration. Colour is the only other thing separating a tip
 * from a danger, and a reader who cannot see it gets nothing from the icon
 * alone — so the kind is announced in words.
 */
const KINDS: Record<DocCalloutKind, { icon: string; label: string }> = {
  note: { icon: 'info', label: 'Note' },
  tip: { icon: 'lightbulb', label: 'Tip' },
  warning: { icon: 'warning', label: 'Warning' },
  danger: { icon: 'report', label: 'Important' },
};

/**
 * An aside that lifts one sentence out of the prose.
 *
 * ```html
 * <doc-callout kind="warning" heading="Deleting is permanent">
 *   <p>A deleted print cannot be restored.</p>
 * </doc-callout>
 * ```
 *
 * `kind` is read as a plain attribute in doc Markdown, so an unknown value
 * falls back to `note` rather than rendering a callout with no icon at all.
 */
@Component({
  selector: 'doc-callout',
  templateUrl: './doc-callout.component.html',
  styleUrls: ['./doc-callout.component.scss'],
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': '"doc-callout-" + kind()',
    role: 'note',
  },
})
export class DocCalloutComponent {
  readonly kind = input<DocCalloutKind>('note');

  /** Optional bold line above the body. */
  readonly heading = input('');

  private readonly style = computed(() => KINDS[this.kind()] ?? KINDS.note);

  readonly icon = computed(() => this.style().icon);
  readonly label = computed(() => this.style().label);
}
