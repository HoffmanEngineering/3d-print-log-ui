import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
} from '@angular/core';

import { DocCapture } from '../generated/docs-captures';
import { DOC_CAPTURE_MAP } from './doc-captures.token';

/**
 * A screenshot with a caption.
 *
 * Two ways to point at an image, and exactly one of them per figure.
 *
 * A GENERATED figure names a capture target and gets everything else from the
 * map that `npm run capture:docs:all` writes:
 *
 * ```html
 * <doc-figure
 *   name="print-list"
 *   alt="The print list, showing five prints with their materials"
 *   caption="The print list"
 * ></doc-figure>
 * ```
 *
 * A HAND-PLACED figure — the Android app screenshots, anything not captured
 * from this app — spells out the asset:
 *
 * ```html
 * <doc-figure
 *   src="./assets/docs/android-app/print-screen.png"
 *   alt="The list of prints shown in the Android App"
 *   width="1080"
 *   height="1920"
 * ></doc-figure>
 * ```
 *
 * The closing tag matters: a multi-line self-closing tag is not a shape the
 * Markdown renderer's raw HTML block reader accepts.
 *
 * `alt` is required, and that is the point of having a component at all rather
 * than an `<img>` and a `<figcaption>`: a bare `<img>` let a doc ship without
 * alt text. A missing one is now a template-compile error rather than something
 * a reviewer has to catch — and because a required input only requires the
 * BINDING, validate-docs additionally rejects an `alt` that is present but
 * empty.
 *
 * `width` and `height` are required WITH `src` and forbidden WITH `name`, which
 * validate-docs enforces. Without intrinsic dimensions every screenshot on the
 * page reflows the prose under it as it loads; hand-typing them beside a `name`
 * would pin numbers that the next recapture silently invalidates.
 *
 * `caption` is optional. A screenshot that only repeats the sentence above it
 * is better left uncaptioned than captioned twice.
 */
@Component({
  selector: 'doc-figure',
  templateUrl: './doc-figure.component.html',
  styleUrls: ['./doc-figure.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocFigureComponent {
  private readonly captures = inject(DOC_CAPTURE_MAP);

  /** A capture target name, resolved against the generated DOC_CAPTURES map. */
  readonly name = input('');

  /** A hand-placed asset path. Mutually exclusive with `name`. */
  readonly src = input('');

  /** What the screenshot shows, for a reader who cannot see it. */
  readonly alt = input.required<string>();

  /** Intrinsic pixel dimensions; they reserve the space before the load. */
  readonly width = input<string | number | undefined>(undefined);
  readonly height = input<string | number | undefined>(undefined);

  readonly caption = input('');

  /**
   * The light/dark pair for a generated figure, or null for a hand-placed one.
   *
   * An unresolvable name yields null rather than throwing: validate-docs fails
   * the build on it, and a doc page is not the place to discover that a gate
   * upstream was skipped.
   */
  readonly capture = computed<DocCapture | null>(() => {
    const name = this.name();
    return name ? (this.captures[name] ?? null) : null;
  });
}
