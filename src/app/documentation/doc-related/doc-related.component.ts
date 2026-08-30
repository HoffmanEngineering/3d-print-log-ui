import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { relatedTo } from '../doc-navigation';

/**
 * "Related pages" — the cross-links a page declares in its `related`
 * frontmatter, resolved to their nav labels and descriptions.
 *
 * Prev/next covers reading order; this covers the jumps that skip it, which on
 * a reference page is most of them.
 */
@Component({
  selector: 'app-doc-related',
  templateUrl: './doc-related.component.html',
  styleUrls: ['./doc-related.component.scss'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocRelatedComponent {
  /** The docs path of the page on screen, e.g. `docs/printers`. */
  readonly path = input('');

  readonly links = computed(() => relatedTo(this.path()));
}
