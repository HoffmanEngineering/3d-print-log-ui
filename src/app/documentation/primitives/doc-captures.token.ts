import { InjectionToken } from '@angular/core';

import { DOC_CAPTURES, DocCapture } from '../generated/docs-captures';

/**
 * The generated `<doc-figure name="...">` lookup, behind a token.
 *
 * The default is the real map, so nothing in the app configures this. The seam
 * exists so a test can name a figure without depending on which captures happen
 * to have been taken — the generated file changes every time a screenshot is
 * recaptured, and a spec that asserted against it would fail on an unrelated UI
 * tweak.
 */
export const DOC_CAPTURE_MAP = new InjectionToken<Record<string, DocCapture>>(
  'DOC_CAPTURE_MAP',
  { providedIn: 'root', factory: () => DOC_CAPTURES }
);
