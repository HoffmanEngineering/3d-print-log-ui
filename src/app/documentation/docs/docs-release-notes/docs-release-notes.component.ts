import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

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
  readonly loading = signal(false);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    // afterNextRender rather than ngOnInit, for two reasons that both matter:
    // it does not run during Node prerendering, where there is no fragment to
    // honour and no reason to pull in a chunk nobody will paint; and it runs
    // after the template exists, which the check below has to see.
    afterNextRender(() => this.honourFragment());
  }

  /**
   * Pulls in the archive chunk and reveals it.
   *
   * @param scrollTo anchor to scroll to once the archive has rendered
   */
  async loadArchive(scrollTo?: string): Promise<void> {
    if (this.expanded() || this.loading()) {
      if (scrollTo) this.scrollToAnchor(scrollTo);
      return;
    }

    this.loading.set(true);
    try {
      const { RELEASE_ARCHIVE } = await import(
        '../../generated/release-notes-archive'
      );
      this.archive.set(RELEASE_ARCHIVE);
      this.expanded.set(true);
      if (scrollTo) this.scrollToAnchor(scrollTo);
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Every published anchor has to keep resolving, including the ones no longer
   * in the page template. If this page already carries the element, the browser
   * has scrolled there itself and there is nothing to do; if it does not, the
   * anchor is archived, so pull the chunk in and go to it.
   */
  private honourFragment(): void {
    const fragment = this.route.snapshot.fragment;
    if (!fragment || this.anchor(fragment)) {
      return;
    }

    void this.loadArchive(fragment);
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
