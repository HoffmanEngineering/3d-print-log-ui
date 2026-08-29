import { DOC_SEO, getDocSeoTags } from './doc-seo.config';
import { ogImage } from '../slicer/slicer-configs';
import { DOC_PAGES } from './generated/docs-manifest';

describe('doc-seo.config', () => {
  const paths = Object.keys(DOC_SEO);

  it('covers every routed doc page', () => {
    // No hard-coded count: DOC_SEO is derived from the docs manifest, so it
    // cannot drift from the pages that exist.
    expect(paths.length).toBe(DOC_PAGES.filter((page) => !page.dormant).length);
    expect(paths).toContain('docs/getting-started');
    expect(paths).toContain('docs/mcp');
    expect(paths).toContain('docs/privacy-policy');
  });

  it('excludes redirect-only and dormant routes', () => {
    expect(paths).not.toContain('docs/filaments');
    expect(paths).not.toContain('docs/terms-of-service');
  });

  it('has a globally unique title and description per page', () => {
    const titles = new Set(paths.map((p) => DOC_SEO[p].title));
    const descs = new Set(paths.map((p) => DOC_SEO[p].description));
    expect(titles.size).toBe(paths.length);
    expect(descs.size).toBe(paths.length);
  });

  it('has non-empty, reasonably sized descriptions', () => {
    for (const p of paths) {
      expect(DOC_SEO[p].description.length).toBeGreaterThan(50);
      expect(DOC_SEO[p].description.length).toBeLessThanOrEqual(170);
    }
  });

  it('getDocSeoTags builds absolute url + og image for a known path', () => {
    const tags = getDocSeoTags('docs/prints');
    expect(tags).toEqual({
      url: 'https://www.3dprintlog.com/docs/prints',
      title: DOC_SEO['docs/prints'].title,
      description: DOC_SEO['docs/prints'].description,
      imageUrl: ogImage,
    });
  });

  it('getDocSeoTags returns null for an unknown path', () => {
    expect(getDocSeoTags('docs/nope')).toBeNull();
  });
});
