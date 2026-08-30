import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOC_OUTLINE, DocHeading } from '../generated/docs-outline';

/**
 * The fewest entries worth a table of contents.
 *
 * One entry is a link to the only thing on the page. Two is a rail that takes
 * more room than the jump it saves. Three is where it starts to pay.
 */
const MINIMUM_ENTRIES = 3;

/**
 * "On this page" — the per-page table of contents.
 *
 * The headings come from `DOC_OUTLINE`, generated from the same Markdown the
 * page was compiled from. Nothing here reads the DOM: the docs are prerendered,
 * so a scraped TOC would be missing from the HTML a crawler and a cold-cache
 * reader receive, and would depend on the page component having mounted.
 */
@Component({
  selector: 'app-doc-toc',
  templateUrl: './doc-toc.component.html',
  styleUrls: ['./doc-toc.component.scss'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocTocComponent {
  /** The docs path of the page on screen, e.g. `docs/printers`. */
  readonly path = input('');

  readonly headings = computed<readonly DocHeading[]>(() => {
    const outline = DOC_OUTLINE[this.path()] ?? [];
    return outline.length >= MINIMUM_ENTRIES ? outline : [];
  });

  /** The route to link to. Fragments are navigations, so they need the path. */
  readonly route = computed(() => `/${this.path()}`);
}
