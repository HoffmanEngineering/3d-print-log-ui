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

/** The part of a docs outline entry the HowTo builder reads. */
export interface DocStepHeading {
  readonly id: string;
  readonly text: string;
}

// "Step 3: Update Moonraker Configuration". One literal space after the colon
// and a single open-ended group keep the match linear.
const STEP_HEADING = /^Step (\d+): (.*)$/;

/**
 * A HowTo for a docs page whose outline is a numbered walkthrough, i.e. has
 * "Step N: ..." headings (the Klipper setup, the slicer uploader, the first
 * print tutorial). Returns null for any other page, so a page opts in by how
 * it is written rather than by a list kept here.
 *
 * Only headings numbered 1, 2, 3... in order count: a page that skips or
 * repeats a number is not a clean sequence, and publishing it as one would
 * misstate the procedure.
 */
export function buildDocHowTo(
  page: { url: string; name: string; description: string },
  outline: readonly DocStepHeading[]
): Record<string, unknown> | null {
  const steps: { id: string; number: number; text: string }[] = [];
  for (const heading of outline) {
    const match = STEP_HEADING.exec(heading.text);
    if (match) {
      steps.push({
        id: heading.id,
        number: Number(match[1]),
        text: match[2].trim(),
      });
    }
  }

  if (steps.length < 2) return null;
  if (!steps.every((step, i) => step.number === i + 1)) return null;

  return {
    '@type': 'HowTo',
    name: page.name,
    description: page.description,
    url: page.url,
    step: steps.map((step) => ({
      '@type': 'HowToStep',
      position: step.number,
      name: step.text,
      text: step.text,
      url: `${page.url}#${step.id}`,
    })),
  };
}
