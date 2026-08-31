import { ScrollDispatcher } from '@angular/cdk/scrolling';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  PLATFORM_ID,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { resolveScrollContainer } from '../docs-scroll-container';
import { shouldShowBackToTop } from './scroll-target';

/** How often scroll position is sampled, in ms. Matches the docs shell. */
const SCROLL_SAMPLE_MS = 200;

/**
 * "Back to top", for the widths that have no table of contents rail.
 *
 * Deliberately not shown on a wide screen: there the TOC is a sticky rail that
 * will take the reader to any section, top included, so a floating button would
 * be a second way to do the same thing — and it would land on top of the ad
 * slot at the foot of the article. Below the rail breakpoint the TOC is a card
 * stranded at the top of the page, which is exactly the case this covers. The
 * width gate is in the stylesheet, so a hidden button is out of the
 * accessibility tree as well as out of sight.
 */
@Component({
  selector: 'app-doc-back-to-top',
  templateUrl: './doc-back-to-top.component.html',
  styleUrls: ['./doc-back-to-top.component.scss'],
  imports: [MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocBackToTopComponent implements OnInit {
  readonly visible = signal(false);

  private readonly platformId = inject(PLATFORM_ID);
  private readonly document = inject(DOCUMENT);
  private readonly scrollDispatcher = inject(ScrollDispatcher);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.scrollDispatcher
      .scrolled(SCROLL_SAMPLE_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.sample());
  }

  scrollToTop(): void {
    const element = this.scrollElement();
    element.scrollTo({
      top: 0,
      behavior: this.prefersReducedMotion() ? 'auto' : 'smooth',
    });
    this.visible.set(false);
    this.moveFocusToTop();
  }

  private sample(): void {
    const element = this.scrollElement();
    this.visible.set(
      shouldShowBackToTop(element.scrollTop, element.clientHeight)
    );
  }

  /** Shared with the shell's scroll-depth telemetry, which needs the same answer. */
  private scrollElement(): HTMLElement {
    return resolveScrollContainer(this.document);
  }

  /**
   * Sending the page to the top without sending focus there leaves a keyboard
   * or screen reader user's focus stranded on a button that is about to be
   * hidden — the next Tab would resume from the bottom of a page they just
   * left. Focus follows the scroll to the article's heading.
   */
  private moveFocusToTop(): void {
    const heading = this.document.querySelector<HTMLElement>(
      '.docs-layout__main h1, .docs-layout__main'
    );
    if (!heading) {
      return;
    }
    if (!heading.hasAttribute('tabindex')) {
      heading.setAttribute('tabindex', '-1');
    }
    heading.focus({ preventScroll: true });
  }

  private prefersReducedMotion(): boolean {
    return (
      this.document.defaultView?.matchMedia?.(
        '(prefers-reduced-motion: reduce)'
      ).matches ?? false
    );
  }
}
