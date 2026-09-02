import { inject } from '@angular/core';
import { CanActivateFn, RedirectFunction, Router } from '@angular/router';

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
 *
 * Query parameters are carried across. A saved link is as likely to carry a
 * `?utm_source=` or a `?devUserId=` as a fragment, and dropping them would make
 * the redirect lossy in a way nothing downstream could recover.
 */
export const movedAnchorGuard: CanActivateFn = (route) => {
  const fragment = route.fragment;
  const slug = route.routeConfig?.path;
  if (!fragment || !slug) return true;

  const destination = DOC_MOVED_ANCHORS[`${slug}#${fragment}`];
  if (!destination) return true;

  return inject(Router).createUrlTree(['/docs', destination], {
    fragment,
    queryParams: route.queryParams,
  });
};

/**
 * The redirect for a doc page's `aliases:` entry.
 *
 * A plain `redirectTo: 'materials'` string cannot be used here. Angular's
 * `applyRedirectCreateUrlTree` builds the redirected tree from the fragment and
 * query of the redirect TARGET, not of the incoming URL, so
 * `/docs/filaments#qr-labels` would arrive at `/docs/materials` bare — and the
 * moved-anchor guard would then have no fragment to act on. That was already
 * happening before this function existed.
 *
 * Hand-written rather than emitted inline so the behavior has somewhere to be
 * tested: an emitter assertion can only prove a function was emitted, not that
 * it carries anything.
 */
export function docsAliasRedirect(slug: string): RedirectFunction {
  return ({ fragment, queryParams }) =>
    inject(Router).createUrlTree(['/docs', slug], { fragment, queryParams });
}
