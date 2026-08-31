import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DOC_OUTLINE, DocHeading } from '../generated/docs-outline';
import {
  activeBandRootMargin,
  activeBandTopPx,
  nextActiveHeading,
} from './active-heading';

/**
 * The fewest entries worth a table of contents.
 *
 * One entry is a link to the only thing on the page. Two is a rail that takes
 * more room than the jump it saves. Three is where it starts to pay.
 */
const MINIMUM_ENTRIES = 3;

/**
 * Known limit of the band built by `activeBandRootMargin`: a final section
 * shorter than the remaining viewport can never reach it, so the rail keeps the
 * previous heading marked at the very bottom of such a page. Closing that needs
 * scroll-position plumbing on top of the observer, which costs more than the
 * case is worth.
 */

/**
 * "On this page" — the per-page table of contents.
 *
 * The headings come from `DOC_OUTLINE`, generated from the same Markdown the
 * page was compiled from. Nothing here reads the DOM to BUILD the list: the
 * docs are prerendered, so a scraped TOC would be missing from the HTML a
 * crawler and a cold-cache reader receive, and would depend on the page
 * component having mounted. The DOM is only consulted to find where those
 * known headings currently sit on screen.
 */
@Component({
  selector: 'app-doc-toc',
  templateUrl: './doc-toc.component.html',
  styleUrls: ['./doc-toc.component.scss'],
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // The shell places this component unconditionally, so a page with no
    // outline (release notes, or one under the threshold) would otherwise keep
    // a grid row and its 32px gap above the article for an element that draws
    // nothing.
    '[class.doc-toc--empty]': '!headings().length',
  },
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

  /**
   * The heading the reader is currently under, or null before they reach the
   * first one. Writable so a test can drive the rendering without scrolling a
   * real viewport; the observer below is the only production writer.
   */
  readonly activeId = signal<string | null>(null);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);

  constructor() {
    effect((onCleanup) => {
      const headings = this.headings();
      this.activeId.set(null);

      if (
        !isPlatformBrowser(this.platformId) ||
        headings.length === 0 ||
        typeof IntersectionObserver === 'undefined'
      ) {
        return;
      }

      let observer: IntersectionObserver | undefined;
      // The headings belong to the routed page component, a sibling of this one
      // in the shell, so they are not in the DOM yet when this effect runs on a
      // navigation. afterNextRender waits for the outlet to have swapped.
      const pending = afterNextRender(
        () => (observer = this.observeHeadings(headings)),
        { injector: this.injector }
      );

      onCleanup(() => {
        pending.destroy();
        observer?.disconnect();
      });
    });
  }

  private observeHeadings(
    headings: readonly DocHeading[]
  ): IntersectionObserver | undefined {
    const order = headings.map((heading) => heading.id);
    const elements = order
      .map((id) => this.document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);

    if (elements.length === 0) {
      return undefined;
    }

    const rootFontSize = this.rootFontSize();
    const bandTop = activeBandTopPx(rootFontSize);
    const [first] = elements;

    const observer = new IntersectionObserver(
      (entries) =>
        this.activeId.update((current) =>
          nextActiveHeading(
            current,
            entries.map((entry) => ({
              id: entry.target.id,
              isIntersecting: entry.isIntersecting,
            })),
            order,
            // Only read when nothing is in the band, which is the one case
            // where the answer matters and the observer cannot supply it.
            first.getBoundingClientRect().top > bandTop
          )
        ),
      { rootMargin: activeBandRootMargin(rootFontSize) }
    );

    for (const element of elements) {
      observer.observe(element);
    }
    return observer;
  }

  /** The px value of 1rem, which is what the band has to be expressed in. */
  private rootFontSize(): number {
    const view = this.document.defaultView;
    const size = view
      ? parseFloat(
          view.getComputedStyle(this.document.documentElement).fontSize
        )
      : NaN;
    return Number.isFinite(size) && size > 0 ? size : 16;
  }
}
