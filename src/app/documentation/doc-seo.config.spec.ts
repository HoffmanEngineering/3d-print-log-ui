import { DOC_SEO, getDocSeoTags } from './doc-seo.config';
import { ogImage } from '../slicer/slicer-configs';

describe('doc-seo.config', () => {
  const paths = Object.keys(DOC_SEO);

  it('covers all 15 doc routes', () => {
    expect(paths.length).toBe(15);
    expect(paths).toContain('docs/getting-started');
    expect(paths).toContain('docs/privacy-policy');
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
