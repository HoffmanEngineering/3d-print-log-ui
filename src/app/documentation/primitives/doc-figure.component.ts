import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * A screenshot with a caption.
 *
 * ```html
 * <doc-figure
 *   src="./assets/docs/android-app/print-screen.png"
 *   alt="The list of prints shown in the Android App"
 *   caption="Prints, as the mobile app shows them"
 *   width="1080"
 *   height="1920"
 * ></doc-figure>
 * ```
 *
 * The closing tag matters: a multi-line self-closing tag is not a shape the
 * Markdown renderer's raw HTML block reader accepts.
 *
 * `alt`, `width` and `height` are required, and that is the point of having a
 * component at all rather than an `<img>` and a `<figcaption>`: a bare `<img>`
 * let a doc ship without alt text, and without intrinsic dimensions every
 * screenshot on the page reflowed the prose under it as it loaded. A missing
 * one is now a template-compile error rather than something a reviewer has to
 * catch — and because a required input only requires the BINDING, validate-docs
 * additionally rejects an `alt` that is present but empty.
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
  readonly src = input.required<string>();

  /** What the screenshot shows, for a reader who cannot see it. */
  readonly alt = input.required<string>();

  /** Intrinsic pixel dimensions; they reserve the space before the load. */
  readonly width = input.required<string | number>();
  readonly height = input.required<string | number>();

  readonly caption = input('');
}
