import {
  ChangeDetectionStrategy,
  Component,
  input,
  numberAttribute,
} from '@angular/core';

/**
 * One numbered callout on a `<doc-figure>`.
 *
 * ```html
 * <doc-figure name="first-print-form" alt="The add-print form as it opens">
 *   <doc-marker x="7" y="9.7" label="Title"></doc-marker>
 *   <doc-marker x="7" y="15.5" label="Printer"></doc-marker>
 * </doc-figure>
 * ```
 *
 * `x` and `y` are PERCENTAGES of the image box, never pixels. That is the whole
 * reason annotations live here rather than being drawn into the screenshot: a
 * UI tweak means re-running `npm run capture:docs:all` and nothing else, where
 * burned-in arrows would have to be redrawn by hand every time — the manual
 * step this pipeline exists to remove. It also means one overlay serves both
 * the light and dark captures, which are the same image at the same size.
 *
 * The number is a CSS counter, so inserting a marker in the middle renumbers
 * the rest — the same reasoning as `<doc-step>`, and for the same reason a
 * content query is not used: under prerendering the numbers would land in the
 * static HTML only if the registration timing happened to work out.
 *
 * `label` names the region the marker points at and is required. It is the
 * marker's only text in the DOM: the disc shows a bare number, so without a
 * label a reader who cannot see the figure gets an ordinal pointing at nothing.
 * It renders visually hidden rather than painted on the screenshot, which at
 * this size would cover the very control it names.
 */
@Component({
  selector: 'doc-marker',
  templateUrl: './doc-marker.component.html',
  styleUrls: ['./doc-marker.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'listitem',
    '[style.left.%]': 'x()',
    '[style.top.%]': 'y()',
  },
})
export class DocMarkerComponent {
  /**
   * Horizontal position, as a percentage of the image's width.
   *
   * Coerced rather than passed through as the authored string. A doc page
   * writes `x="7"`, and binding that string straight into `[style.left.%]`
   * makes the declaration only as valid as the text: `x="7px"` yields
   * `left: 7px%`, which the browser drops, leaving the marker stacked in the
   * corner with nothing to say it went wrong. validate-docs rejects those
   * spellings, and this is the second lock on the same door.
   */
  readonly x = input.required<number, unknown>({ transform: numberAttribute });

  /** Vertical position, as a percentage of the image's height. */
  readonly y = input.required<number, unknown>({ transform: numberAttribute });

  /** The region this marker points at, for a reader who cannot see it. */
  readonly label = input.required<string>();
}
