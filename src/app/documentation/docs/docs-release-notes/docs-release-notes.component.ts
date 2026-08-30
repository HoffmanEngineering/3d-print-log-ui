import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import { DeferredSkeletonController } from 'src/app/shared/skeleton/deferred-skeleton';
import { DOC_RELEASES } from '../../generated/docs-manifest';
import type { ArchivedRelease } from '../../generated/release-notes-archive';

@Component({
  selector: 'app-docs-release-notes',
  // Template is compiled from src/content/docs/release-notes.md plus the ten
  // newest src/content/release-notes/*.md, appended by scripts/build-docs.mjs.
  // The class is hand-written (the `component:` escape hatch) because the older
  // releases are a lazily imported chunk, which frontmatter cannot express.
  templateUrl: '../../generated/pages/docs-release-notes.component.html',
  styleUrls: ['./docs-release-notes.component.scss'],
  standalone: false,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocsReleaseNotesComponent {
  /** Releases older than the ten in the template. Empty until asked for. */
  readonly archive = signal<readonly ArchivedRelease[]>([]);
  readonly expanded = signal(false);

  /**
   * Whether to SAY we are loading — deferred, so a chunk that arrives in 30ms
   * never flashes the label. Not a guard: it is still false for the first 200ms
   * of a real load, so `inFlight` is what stops a second import.
   */
  private readonly skeleton = new DeferredSkeletonController();
  readonly loading = this.skeleton.visible;

  private inFlight = false;

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // The fragment stream, not a one-shot snapshot read. Angular reuses this
    // component when only the fragment changes, so a hash navigation from an
    // already-open page — a pasted deep link, the back button — would otherwise
    // never be looked at, and an archived anchor would silently not resolve.
    // It replays the current fragment on subscribe, so arrival is covered too.
    this.route.fragment
      .pipe(takeUntilDestroyed())
      .subscribe((fragment) => this.honorFragment(fragment));

    inject(DestroyRef).onDestroy(() => this.skeleton.destroy());
  }

  /**
   * Pulls in the archive chunk and reveals it.
   *
   * @param scrollTo anchor to scroll to once the archive has rendered
   */
  async loadArchive(scrollTo?: string): Promise<void> {
    if (this.expanded() || this.inFlight) {
      if (scrollTo) this.scrollToAnchor(scrollTo);
      return;
    }

    this.inFlight = true;
    this.skeleton.start();
    try {
      const { RELEASE_ARCHIVE } = await import(
        '../../generated/release-notes-archive'
      );
      this.archive.set(RELEASE_ARCHIVE);
      this.expanded.set(true);
      if (scrollTo) this.scrollToAnchor(scrollTo);
    } finally {
      this.inFlight = false;
      this.skeleton.stop();
    }
  }

  /**
   * Every published anchor has to keep resolving, including the ones no longer
   * in the page template. A recent release is already on the page and the
   * browser scrolls to it unaided; an archived one needs the chunk first.
   *
   * The manifest answers this, not a DOM query. Asking the document would mean
   * waiting for a render before the decision could be made, and would answer
   * "some element somewhere has this id" rather than "this release is on the
   * page" — the fragment may not name a release at all.
   */
  private honorFragment(fragment: string | null): void {
    if (!isPlatformBrowser(this.platformId) || !fragment) {
      return;
    }

    const release = DOC_RELEASES.find((entry) => entry.anchor === fragment);
    if (release?.archived) {
      void this.loadArchive(fragment);
    }
  }

  /**
   * The browser gave up on this fragment before the archive existed, so nothing
   * scrolls on its own. afterNextRender waits for the @for to actually paint the
   * section the anchor names — a plain timeout would be racing the scheduler.
   */
  private scrollToAnchor(anchor: string): void {
    afterNextRender(() => this.anchor(anchor)?.scrollIntoView(), {
      injector: this.injector,
    });
  }

  /**
   * Scoped to this page, not the document: "is this release on my page" is the
   * question, and a stray id elsewhere must not answer it.
   */
  private anchor(id: string): HTMLElement | null {
    return this.host.nativeElement.querySelector(`#${CSS.escape(id)}`);
  }
}
