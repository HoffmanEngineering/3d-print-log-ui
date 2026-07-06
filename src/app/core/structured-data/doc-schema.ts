import { siteUrl } from '../../slicer/slicer-configs';
import { ORGANIZATION_ID } from './app-schema';

export interface DocSeoTags {
  url: string;
  title: string;
  description: string;
  imageUrl: string;
}

export function buildDocArticle(tags: DocSeoTags): Record<string, unknown> {
  return {
    '@type': 'TechArticle',
    headline: tags.title,
    description: tags.description,
    url: tags.url,
    mainEntityOfPage: tags.url,
    image: tags.imageUrl,
    author: { '@id': ORGANIZATION_ID },
    publisher: { '@id': ORGANIZATION_ID },
  };
}

export function buildDocBreadcrumb(tags: DocSeoTags): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl('') },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Documentation',
        item: siteUrl('docs'),
      },
      { '@type': 'ListItem', position: 3, name: tags.title, item: tags.url },
    ],
  };
}
