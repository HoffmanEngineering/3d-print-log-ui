import { ogImage, siteUrl } from '../slicer/slicer-configs';
import { DOC_PAGES } from './generated/docs-manifest';

export interface DocSeo {
  title: string;
  description: string;
}

/**
 * Per-page SEO metadata for the prerendered /docs pages, keyed by full route path.
 *
 * Derived from the `title:` and `description:` frontmatter of each page in
 * src/content/docs — there is nothing to keep in sync by hand. Length and
 * within-docs uniqueness are enforced by scripts/validate-docs.mjs; global
 * uniqueness (pooled with marketing routes) stays in scripts/verify-prerender.mjs,
 * which reads it out of the prerendered HTML where both pools actually meet.
 */
export const DOC_SEO: Record<string, DocSeo> = Object.fromEntries(
  DOC_PAGES.filter((page) => !page.dormant).map((page) => [
    page.path,
    { title: page.title, description: page.description },
  ])
);

export function getDocSeoTags(path: string): {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
} | null {
  const seo = DOC_SEO[path];
  if (!seo) return null;
  return {
    url: siteUrl(path),
    title: seo.title,
    description: seo.description,
    imageUrl: ogImage,
  };
}
