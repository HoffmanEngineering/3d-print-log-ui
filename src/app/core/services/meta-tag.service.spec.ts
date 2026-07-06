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
});
