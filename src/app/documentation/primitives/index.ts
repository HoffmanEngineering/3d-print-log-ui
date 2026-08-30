import { DocCalloutComponent } from './doc-callout.component';
import { DocFigureComponent } from './doc-figure.component';
import { DocStepComponent } from './doc-step.component';
import { DocStepsComponent } from './doc-steps.component';
import { DocVideoComponent } from './doc-video.component';

export { DocCalloutComponent } from './doc-callout.component';
export { DocFigureComponent } from './doc-figure.component';
export { DocStepComponent } from './doc-step.component';
export { DocStepsComponent } from './doc-steps.component';
export { DocVideoComponent } from './doc-video.component';

/**
 * The primitives a doc page may use, as one import for DocumentationModule.
 *
 * The selector prefix is `doc`, not the app-wide `app` — these are the only
 * elements a non-Angular author writes by hand, in src/content/docs/*.md, and
 * <doc-callout> reads as part of the document where <app-doc-callout> reads as
 * a component someone dropped into it. .eslintrc.json carries the exception,
 * scoped to this directory.
 *
 * Kept in step with the element allowlist in `scripts/docs-validate-lib.mjs`:
 * a primitive that is not in both is either unusable in a doc or usable
 * without review.
 */
export const DOC_PRIMITIVES = [
  DocCalloutComponent,
  DocFigureComponent,
  DocStepComponent,
  DocStepsComponent,
  DocVideoComponent,
] as const;
