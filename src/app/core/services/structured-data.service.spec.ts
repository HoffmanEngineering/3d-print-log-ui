import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/common';
import { StructuredDataService } from './structured-data.service';

describe('StructuredDataService', () => {
  let service: StructuredDataService;
  let doc: Document;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StructuredDataService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    doc.getElementById('ld-json')?.remove();
  });

  function scripts(): HTMLScriptElement[] {
    return Array.from(
      doc.querySelectorAll<HTMLScriptElement>(
        'script[type="application/ld+json"]'
      )
    );
  }

  it('injects one ld+json script with an @graph of the nodes', () => {
    service.setJsonLd([{ '@type': 'Organization', name: 'X' }]);
    expect(scripts().length).toBe(1);
    const parsed = JSON.parse(scripts()[0].textContent as string);
    expect(parsed['@context']).toBe('https://schema.org');
    expect(parsed['@graph'][0]['@type']).toBe('Organization');
  });

  it('replaces content on a second call instead of duplicating', () => {
    service.setJsonLd([{ '@type': 'Organization', name: 'X' }]);
    service.setJsonLd([{ '@type': 'WebApplication', name: 'Y' }]);
    expect(scripts().length).toBe(1);
    const parsed = JSON.parse(scripts()[0].textContent as string);
    expect(parsed['@graph'][0]['@type']).toBe('WebApplication');
  });

  it('removes the script when given an empty array', () => {
    service.setJsonLd([{ '@type': 'Organization', name: 'X' }]);
    service.setJsonLd([]);
    expect(scripts().length).toBe(0);
  });
});
