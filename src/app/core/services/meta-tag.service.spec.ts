import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';

import { MetaTagService } from './meta-tag.service';

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
