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
  /**
   * The step's title.
   *
   * Rendered as an `<h4>`: a reader navigating by headings has to be able to
   * reach the six setup steps, which is what they could do when these were
   * `#### Step N` in the Markdown. The level assumes a `<doc-steps>` sits
   * under an `<h3>` section, which is where every procedure in the docs lives.
   *
   * It carries no id and so never reaches the table of contents: the outline is
   * generated from the PAGE template, and this heading is in a component
   * template the generator never sees. That is the intent — a step is part of a
   * procedure, not a section of the page.
   */
  readonly heading = input('');
}
