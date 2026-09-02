import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { DOC_MOVED_ANCHORS } from './generated/docs-manifest';

/**
 * Redirects a published deep link whose section moved to another page.
 *
 * `/docs/materials#add-weights` -> `/docs/materials-reference#add-weights`.
 *
 * The map is generated from `movedAnchors` frontmatter and validated in
 * docs-validate-lib, so a hit here is always a real, previously published id.
 *
 * Two router settings are required for this to run at all, and both live in the
 * generated route config rather than here: `runGuardsAndResolvers: 'always'`
 * (the default skips a fragment-only navigation) and function alias redirects
 * (a string one drops the fragment before the guard ever sees it).
 *
 * A direct deep link is served the old page's prerendered HTML and corrected on
 * hydration, so the reader sees the wrong page briefly. That is accepted: the
 * alternative is a stub id on the page whose whole purpose is to stop carrying
 * that material.
 */
export const movedAnchorGuard: CanActivateFn = (route) => {
  const fragment = route.fragment;
  const slug = route.routeConfig?.path;
  if (!fragment || !slug) return true;

  const destination = DOC_MOVED_ANCHORS[`${slug}#${fragment}`];
  if (!destination) return true;

  return inject(Router).createUrlTree(['/docs', destination], { fragment });
};
