import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * A numbered sequence of setup steps.
 *
 * ```html
 * <doc-steps>
 *   <doc-step heading="Install the plugin">…</doc-step>
 *   <doc-step heading="Paste your API key">…</doc-step>
 * </doc-steps>
 * ```
 *
 * The numbering is a CSS counter, not an index passed down from here. A content
 * query would make the count depend on when the children register, which under
 * prerendering means the numbers are rendered into the static HTML only if the
 * timing happens to work out. A counter is correct in the very first paint.
 *
 * It is an `<ol>` in spirit but not in markup: each step holds block prose,
 * often several paragraphs and a code sample, which is not what a list item's
 * default styling is for. The list semantics are restored with ARIA roles.
 */
@Component({
  selector: 'doc-steps',
  template: '<ng-content />',
  styleUrls: ['./doc-steps.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'list' },
})
export class DocStepsComponent {}
