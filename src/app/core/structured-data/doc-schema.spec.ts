import { buildDocArticle, buildDocBreadcrumb } from './doc-schema';
import { ORGANIZATION_ID } from './app-schema';

const tags = {
  url: 'https://www.3dprintlog.com/docs/prints',
  title: 'Tracking Prints | 3D Print Log Docs',
  description: 'Log every 3D print.',
  imageUrl: 'https://www.3dprintlog.com/assets/logo.svg',
};

describe('doc-schema', () => {
  it('buildDocArticle returns a TechArticle linked to the org', () => {
    const article = buildDocArticle(tags);
    expect(article['@type']).toBe('TechArticle');
    expect(article['headline']).toBe(tags.title);
    expect(article['description']).toBe(tags.description);
    expect(article['mainEntityOfPage']).toBe(tags.url);
    expect(article['image']).toBe(tags.imageUrl);
    expect(article['publisher']).toEqual({ '@id': ORGANIZATION_ID });
  });

  it('buildDocBreadcrumb returns a Home > Documentation > page trail', () => {
    const crumb = buildDocBreadcrumb(tags);
    expect(crumb['@type']).toBe('BreadcrumbList');
    const items = crumb['itemListElement'] as Array<Record<string, unknown>>;
    expect(items.length).toBe(3);
    expect(items[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://www.3dprintlog.com/',
    });
    expect(items[1]['item']).toBe('https://www.3dprintlog.com/docs');
    expect(items[2]).toEqual({
      '@type': 'ListItem',
      position: 3,
      name: tags.title,
      item: tags.url,
    });
  });
});
