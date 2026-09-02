import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  Injector,
  input,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { resolveScrollContainer, scrolls } from '../docs-scroll-container';
import { DOC_OUTLINE, DocHeading } from '../generated/docs-outline';
import { activeBandTopPx, activeHeadingAt } from './active-heading';

/**
 * The fewest entries worth a table of contents.
 *
 * One entry is a link to the only thing on the page. Two is a rail that takes
 * more room than the jump it saves. Three is where it starts to pay.
 */
const MINIMUM_ENTRIES = 3;

/** How often the reader's position is sampled, in ms. */
const SPY_SAMPLE_MS = 100;

/**
 * How close to the end counts as the bottom of the page, in px. Absorbs the
 * fractional pixel a zoomed or scaled layout can leave between the scroll
 * position and the scroll height, which would otherwise make the last section
 * unreachable at the moment the reader arrives at it.
 */
const BOTTOM_SLACK = 2;

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
   * real viewport; `sample` is the only production writer.
   */
  readonly activeId = signal<string | null>(null);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);
  private readonly scrollDispatcher = inject(ScrollDispatcher);

  constructor() {
    effect((onCleanup) => {
      const headings = this.headings();
      this.activeId.set(null);

      if (!isPlatformBrowser(this.platformId) || headings.length === 0) {
        return;
      }

      // The headings belong to the routed page component, a sibling of this one
      // in the shell, so they are not in the DOM yet when this effect runs on a
      // navigation. afterNextRender waits for the outlet to have swapped, and
      // this first reading places the mark before the reader scrolls at all.
      const pending = afterNextRender(() => this.sample(), {
        injector: this.injector,
      });
      onCleanup(() => pending.destroy());
    });

    if (isPlatformBrowser(this.platformId)) {
      this.scrollDispatcher
        .scrolled(SPY_SAMPLE_MS)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.sample());
    }
  }

  /**
   * Takes one reading of where the headings are and marks the current one.
   *
   * Reads a position for every heading rather than tracking what changed, so
   * the answer never depends on which sample happened to notice what — see the
   * note at the top of active-heading.ts.
   */
  private sample(): void {
    const headings = this.headings();
    if (headings.length === 0) {
      return;
    }

    const positions = headings
      .map((heading) => this.document.getElementById(heading.id))
      .filter((element): element is HTMLElement => element !== null)
      .map((element) => ({
        id: element.id,
        top: element.getBoundingClientRect().top,
      }));

    if (positions.length === 0) {
      return;
    }

    const container = resolveScrollContainer(this.document);
    const atBottom =
      scrolls(container) &&
      container.scrollTop + container.clientHeight >=
        container.scrollHeight - BOTTOM_SLACK;

    this.activeId.set(
      activeHeadingAt(positions, activeBandTopPx(this.rootFontSize()), atBottom)
    );
  }

  /** The px value of 1rem, which is what the band is measured in. */
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
