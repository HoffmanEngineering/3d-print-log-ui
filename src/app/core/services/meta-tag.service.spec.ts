import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

import { MetaTagService } from './meta-tag.service';
import { SeoMetadata } from './seo.service';

/** Tags this suite writes into the shared Karma document; removed after each test. */
const TOUCHED_SELECTORS = [
  'meta[name="description"]',
  'meta[property^="og:"]',
  'meta[name^="twitter:"]',
  'meta[name="robots"]',
  'meta[name="googlebot"]',
  'link[rel="canonical"]',
  'link[rel="alternate"][type="text/markdown"]',
];

function cleanHead(doc: Document): void {
  for (const selector of TOUCHED_SELECTORS) {
    doc.querySelectorAll(selector).forEach((el) => el.remove());
  }
}

function content(doc: Document, selector: string): string | null {
  return doc.querySelector(selector)?.getAttribute('content') ?? null;
}

function count(doc: Document, selector: string): number {
  return doc.querySelectorAll(selector).length;
}

function addMeta(doc: Document, name: string, value: string): void {
  const meta = doc.createElement('meta');
  meta.setAttribute('name', name);
  meta.setAttribute('content', value);
  doc.head.appendChild(meta);
}

const PRINT_SEO: SeoMetadata = {
  type: 'print',
  title: 'Benchy | 3D Print Log',
  description: 'A tiny boat printed on a Prusa MK4.',
  canonicalUrl: 'https://www.3dprintlog.com/prints/42',
  image: {
    url: 'https://api.3dprintlog.com/api/Prints/42/social-image?v=7',
    width: 1200,
    height: 900,
    alt: 'Benchy on the bed',
  },
  author: { name: 'Chris', url: 'https://www.3dprintlog.com/users/1' },
  publishedAt: '2026-10-01T12:00:00Z',
  updatedAt: '2026-10-02T12:00:00Z',
  facts: [{ label: 'Printer', value: 'Prusa MK4' }],
};

describe('MetaTagService', () => {
  let service: MetaTagService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MetaTagService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

describe('MetaTagService.setSeoTags', () => {
  let service: MetaTagService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MetaTagService, Meta, Title],
    });
    service = TestBed.inject(MetaTagService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => cleanHead(doc));

  it('sets title, description, og:type=website, og:url, twitter:card and a self-canonical', () => {
    service.setSeoTags({
      url: 'https://www.3dprintlog.com/orcaslicer',
      title: 'Track Prints from OrcaSlicer | 3D Print Log',
      description: 'desc',
      imageUrl: 'https://www.3dprintlog.com/assets/og.png',
    });
    expect(TestBed.inject(Title).getTitle()).toContain('OrcaSlicer');
    expect(
      doc.querySelector('meta[name="description"]')?.getAttribute('content')
    ).toBe('desc');
    expect(
      doc.querySelector('meta[property="og:type"]')?.getAttribute('content')
    ).toBe('website');
    expect(
      doc.querySelector('meta[property="og:url"]')?.getAttribute('content')
    ).toContain('/orcaslicer');
    expect(
      doc.querySelector('meta[name="twitter:card"]')?.getAttribute('content')
    ).toBe('summary_large_image');
    expect(
      doc.querySelector('link[rel="canonical"]')?.getAttribute('href')
    ).toBe('https://www.3dprintlog.com/orcaslicer');
  });

  describe('the Markdown alternate link', () => {
    const selector = 'link[rel="alternate"][type="text/markdown"]';
    const base = {
      url: 'https://www.3dprintlog.com/docs/prints',
      title: 'Prints',
      description: 'desc',
      imageUrl: 'https://www.3dprintlog.com/assets/og.png',
    };

    afterEach(() => doc.querySelector(selector)?.remove());

    it('is added when the page has a twin', () => {
      service.setSeoTags({
        ...base,
        markdownUrl: 'https://www.3dprintlog.com/docs/prints.md',
      });
      const links = doc.querySelectorAll(selector);
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe(
        'https://www.3dprintlog.com/docs/prints.md'
      );
    });

    it('is updated in place, not duplicated, on the next page', () => {
      service.setSeoTags({
        ...base,
        markdownUrl: 'https://www.3dprintlog.com/docs/prints.md',
      });
      service.setSeoTags({
        ...base,
        markdownUrl: 'https://www.3dprintlog.com/docs/printers.md',
      });
      const links = doc.querySelectorAll(selector);
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe(
        'https://www.3dprintlog.com/docs/printers.md'
      );
    });

    it('is removed for a page without a twin, so it never points at the wrong page', () => {
      service.setSeoTags({
        ...base,
        markdownUrl: 'https://www.3dprintlog.com/docs/prints.md',
      });
      service.setSeoTags(base);
      expect(doc.querySelector(selector)).toBeNull();
    });
  });
});

// The Cloudflare Worker (cloudflare/seo-worker/src/html.ts, headTags) writes the public pages'
// tags into the shell. These names must match it exactly: a client-side update after bootstrap
// has to REPLACE the Worker's tag, not add a second one with a slightly different name.
describe('MetaTagService social tags (aligned with the SEO Worker)', () => {
  let service: MetaTagService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [MetaTagService, Meta, Title],
    });
    doc = TestBed.inject(DOCUMENT);
    cleanHead(doc);
    service = TestBed.inject(MetaTagService);
  });

  afterEach(() => cleanHead(doc));

  it('writes twitter:title and twitter:description, not the non-standard twitter:text:title', () => {
    service.setSocialMediaTags(
      'https://www.3dprintlog.com/prints/1',
      'Benchy | 3D Print Log',
      'A boat',
      'https://img.example/1.jpg'
    );
    expect(content(doc, 'meta[name="twitter:title"]')).toBe(
      'Benchy | 3D Print Log'
    );
    expect(content(doc, 'meta[name="twitter:description"]')).toBe('A boat');
    expect(count(doc, 'meta[name="twitter:text:title"]')).toBe(0);
    expect(count(doc, 'meta[property="og:image:secure_url"]')).toBe(0);
  });

  it('writes og:site_name and the requested og:type', () => {
    service.setSocialMediaTags(
      'https://www.3dprintlog.com/users/1',
      'Chris Profile - 3D Print Log',
      'desc',
      '',
      { type: 'profile' }
    );
    expect(content(doc, 'meta[property="og:site_name"]')).toBe('3D Print Log');
    expect(content(doc, 'meta[property="og:type"]')).toBe('profile');
  });

  it('defaults og:type to website', () => {
    service.setSocialMediaTags('https://x/', 't', 'd', 'https://img/1.jpg');
    expect(content(doc, 'meta[property="og:type"]')).toBe('website');
  });

  it('writes image width, height and alt when they are known', () => {
    service.setSocialMediaTags('https://x/', 't', 'd', 'https://img/1.jpg', {
      image: { width: 1200, height: 630, alt: 'A boat' },
    });
    expect(content(doc, 'meta[property="og:image:width"]')).toBe('1200');
    expect(content(doc, 'meta[property="og:image:height"]')).toBe('630');
    expect(content(doc, 'meta[property="og:image:alt"]')).toBe('A boat');
    expect(content(doc, 'meta[name="twitter:image:alt"]')).toBe('A boat');
    expect(content(doc, 'meta[name="twitter:card"]')).toBe(
      'summary_large_image'
    );
  });

  // The client-side fallback for a public page (an API without /seo) must not keep the home
  // page's canonical or Markdown twin from the document it booted from.
  it('points the canonical link at the page and drops a Markdown twin link', () => {
    doc.head.insertAdjacentHTML(
      'beforeend',
      '<link rel="canonical" href="https://www.3dprintlog.com/">' +
        '<link rel="alternate" type="text/markdown" href="https://www.3dprintlog.com/index.md">'
    );
    service.setSocialMediaTags(
      'https://www.3dprintlog.com/prints/1',
      't',
      'd',
      ''
    );
    const canonicals = doc.querySelectorAll('link[rel="canonical"]');
    expect(canonicals.length).toBe(1);
    expect(canonicals[0].getAttribute('href')).toBe(
      'https://www.3dprintlog.com/prints/1'
    );
    expect(
      doc.querySelector('link[rel="alternate"][type="text/markdown"]')
    ).toBeNull();
  });

  it('drops a previous page image size and alt rather than leaving them on the next one', () => {
    service.setSocialMediaTags('https://x/', 't', 'd', 'https://img/1.jpg', {
      image: { width: 1200, height: 630, alt: 'A boat' },
    });
    service.setSocialMediaTags('https://y/', 't2', 'd2', 'https://img/2.jpg');
    expect(count(doc, 'meta[property="og:image:width"]')).toBe(0);
    expect(count(doc, 'meta[property="og:image:height"]')).toBe(0);
    expect(count(doc, 'meta[property="og:image:alt"]')).toBe(0);
    expect(count(doc, 'meta[name="twitter:image:alt"]')).toBe(0);
  });

  it('removes the image tags and uses the summary card for a page without an image', () => {
    service.setSocialMediaTags('https://x/', 't', 'd', 'https://img/1.jpg');
    service.setSocialMediaTags('https://y/', 't', 'd', '');
    expect(count(doc, 'meta[property="og:image"]')).toBe(0);
    expect(count(doc, 'meta[name="twitter:image"]')).toBe(0);
    expect(content(doc, 'meta[name="twitter:card"]')).toBe('summary');
  });

  it('replaces the tags the Worker wrote instead of adding a second copy', () => {
    // What the Worker writes into the shell for a print (headTags in html.ts).
    doc.head.insertAdjacentHTML(
      'beforeend',
      '<meta name="description" content="worker">' +
        '<meta property="og:site_name" content="3D Print Log">' +
        '<meta property="og:type" content="article">' +
        '<meta property="og:title" content="worker">' +
        '<meta property="og:description" content="worker">' +
        '<meta property="og:url" content="worker">' +
        '<meta property="og:image" content="worker">' +
        '<meta property="og:image:width" content="1">' +
        '<meta property="og:image:height" content="1">' +
        '<meta property="og:image:alt" content="worker">' +
        '<meta name="twitter:card" content="summary_large_image">' +
        '<meta name="twitter:title" content="worker">' +
        '<meta name="twitter:description" content="worker">' +
        '<meta name="twitter:image" content="worker">' +
        '<meta name="twitter:image:alt" content="worker">'
    );

    service.applySeoMetadata(PRINT_SEO);

    for (const selector of [
      'meta[name="description"]',
      'meta[property="og:site_name"]',
      'meta[property="og:type"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[property="og:url"]',
      'meta[property="og:image"]',
      'meta[property="og:image:width"]',
      'meta[property="og:image:height"]',
      'meta[property="og:image:alt"]',
      'meta[name="twitter:card"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[name="twitter:image"]',
      'meta[name="twitter:image:alt"]',
    ]) {
      expect(count(doc, selector)).withContext(selector).toBe(1);
      expect(content(doc, selector)).withContext(selector).not.toBe('worker');
    }
  });

  describe('applySeoMetadata', () => {
    it('writes every field the Worker writes', () => {
      service.applySeoMetadata(PRINT_SEO);

      expect(TestBed.inject(Title).getTitle()).toBe('Benchy | 3D Print Log');
      expect(content(doc, 'meta[name="description"]')).toBe(
        PRINT_SEO.description
      );
      expect(
        doc.querySelector('link[rel="canonical"]')?.getAttribute('href')
      ).toBe('https://www.3dprintlog.com/prints/42');
      expect(content(doc, 'meta[property="og:type"]')).toBe('article');
      expect(content(doc, 'meta[property="og:title"]')).toBe(PRINT_SEO.title);
      expect(content(doc, 'meta[property="og:description"]')).toBe(
        PRINT_SEO.description
      );
      expect(content(doc, 'meta[property="og:url"]')).toBe(
        PRINT_SEO.canonicalUrl
      );
      expect(content(doc, 'meta[property="og:image"]')).toBe(
        PRINT_SEO.image!.url
      );
      expect(content(doc, 'meta[property="og:image:width"]')).toBe('1200');
      expect(content(doc, 'meta[property="og:image:height"]')).toBe('900');
      expect(content(doc, 'meta[property="og:image:alt"]')).toBe(
        'Benchy on the bed'
      );
      expect(content(doc, 'meta[name="twitter:card"]')).toBe(
        'summary_large_image'
      );
      expect(content(doc, 'meta[name="twitter:title"]')).toBe(PRINT_SEO.title);
      expect(content(doc, 'meta[name="twitter:description"]')).toBe(
        PRINT_SEO.description
      );
      expect(content(doc, 'meta[name="twitter:image"]')).toBe(
        PRINT_SEO.image!.url
      );
      expect(content(doc, 'meta[name="twitter:image:alt"]')).toBe(
        'Benchy on the bed'
      );
    });

    it('uses og:type profile for a profile and article for a project', () => {
      service.applySeoMetadata({ ...PRINT_SEO, type: 'profile' });
      expect(content(doc, 'meta[property="og:type"]')).toBe('profile');
      service.applySeoMetadata({ ...PRINT_SEO, type: 'project' });
      expect(content(doc, 'meta[property="og:type"]')).toBe('article');
    });

    it('omits width and height unless both are known, like the Worker', () => {
      service.applySeoMetadata({
        ...PRINT_SEO,
        image: { ...PRINT_SEO.image!, height: null },
      });
      expect(count(doc, 'meta[property="og:image:width"]')).toBe(0);
      expect(count(doc, 'meta[property="og:image:height"]')).toBe(0);
    });

    it('uses the summary card and no image tags for a page without an image', () => {
      service.applySeoMetadata({ ...PRINT_SEO, image: null });
      expect(content(doc, 'meta[name="twitter:card"]')).toBe('summary');
      expect(count(doc, 'meta[property="og:image"]')).toBe(0);
      expect(count(doc, 'meta[name="twitter:image"]')).toBe(0);
    });

    it('removes a Markdown twin link left by the previous page', () => {
      service.setSeoTags({
        url: 'https://www.3dprintlog.com/docs/prints',
        title: 'Prints',
        description: 'd',
        imageUrl: 'https://img/1.jpg',
        markdownUrl: 'https://www.3dprintlog.com/docs/prints.md',
      });
      service.applySeoMetadata(PRINT_SEO);
      expect(
        doc.querySelector('link[rel="alternate"][type="text/markdown"]')
      ).toBeNull();
    });

    it('lets the page be indexed', () => {
      addMeta(doc, 'robots', 'noindex');
      addMeta(doc, 'googlebot', 'noindex');
      service.applySeoMetadata(PRINT_SEO);
      expect(count(doc, 'meta[name="robots"]')).toBe(0);
      expect(count(doc, 'meta[name="googlebot"]')).toBe(0);
    });
  });
});

describe('MetaTagService robots', () => {
  let doc: Document;

  const create = (): MetaTagService => {
    TestBed.configureTestingModule({
      providers: [MetaTagService, Meta, Title],
    });
    return TestBed.inject(MetaTagService);
  };

  beforeEach(() => {
    // The global document, not TestBed.inject(DOCUMENT): injecting before create()
    // would freeze the testing module. The service reads the shell's robots tags when
    // it is constructed, so each test arranges the head first.
    doc = document;
    cleanHead(doc);
  });

  afterEach(() => cleanHead(doc));

  it('preventIndexing writes noindex for robots and googlebot, once each', () => {
    const service = create();
    service.preventIndexing();
    service.preventIndexing();
    expect(count(doc, 'meta[name="robots"]')).toBe(1);
    expect(count(doc, 'meta[name="googlebot"]')).toBe(1);
    expect(content(doc, 'meta[name="robots"]')).toBe('noindex');
    expect(content(doc, 'meta[name="googlebot"]')).toBe('noindex');
  });

  it('restoreShellRobots puts back the noindex the shell was served with', () => {
    // The SPA shells carry both tags (scripts/shell-lib.mjs).
    addMeta(doc, 'robots', 'noindex');
    addMeta(doc, 'googlebot', 'noindex');
    const service = create();

    service.allowIndexing();
    expect(count(doc, 'meta[name="robots"]')).toBe(0);

    service.restoreShellRobots();
    expect(content(doc, 'meta[name="robots"]')).toBe('noindex');
    expect(content(doc, 'meta[name="googlebot"]')).toBe('noindex');
  });

  it('restoreShellRobots removes robots tags when the document was served without them', () => {
    // A prerendered page, or a public page the Worker already rewrote.
    const service = create();
    service.preventIndexing();
    service.restoreShellRobots();
    expect(count(doc, 'meta[name="robots"]')).toBe(0);
    expect(count(doc, 'meta[name="googlebot"]')).toBe(0);
  });
});
