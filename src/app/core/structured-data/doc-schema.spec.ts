import {
  buildDocArticle,
  buildDocBreadcrumb,
  buildDocHowTo,
} from './doc-schema';
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

  describe('buildDocHowTo', () => {
    const page = {
      url: 'https://www.3dprintlog.com/docs/klipper',
      name: 'Log prints from Klipper',
      description: 'Set up Klipper.',
    };

    it('turns "Step N:" headings into positioned HowToSteps with anchors', () => {
      const howTo = buildDocHowTo(page, [
        { id: 'features', text: 'Features:' },
        { id: 'step-1', text: 'Step 1: Generate an API key' },
        { id: 'step-2', text: 'Step 2: Update Moonraker' },
        { id: 'troubleshooting', text: 'Troubleshooting' },
      ]);
      expect(howTo).toEqual({
        '@type': 'HowTo',
        name: page.name,
        description: page.description,
        url: page.url,
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: 'Generate an API key',
            text: 'Generate an API key',
            url: `${page.url}#step-1`,
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: 'Update Moonraker',
            text: 'Update Moonraker',
            url: `${page.url}#step-2`,
          },
        ],
      });
    });

    it('returns null for a page without a numbered walkthrough', () => {
      expect(
        buildDocHowTo(page, [
          { id: 'usage', text: 'Usage' },
          { id: 'step-1', text: 'Step 1: Only one step' },
        ])
      ).toBeNull();
    });

    it('returns null when the step numbers are not 1, 2, 3...', () => {
      expect(
        buildDocHowTo(page, [
          { id: 'a', text: 'Step 1: First' },
          { id: 'b', text: 'Step 3: Third' },
        ])
      ).toBeNull();
    });
  });
});
