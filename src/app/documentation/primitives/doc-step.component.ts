import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/**
 * One step inside `<doc-steps>`. Its number comes from a CSS counter, so steps
 * renumber themselves when one is inserted in the middle.
 */
@Component({
  selector: 'doc-step',
  templateUrl: './doc-step.component.html',
  styleUrls: ['./doc-step.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { role: 'listitem' },
})
export class DocStepComponent {
  /** The step's title. Rendered as bold text, not a heading: the outline is
   * built from h2-h4, and a step is not a section of the page. */
  readonly heading = input('');
}
