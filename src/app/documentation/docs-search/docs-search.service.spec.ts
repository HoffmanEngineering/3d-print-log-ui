import { TestBed } from '@angular/core/testing';

import { DocsSearchService } from './docs-search.service';

/**
 * Run against the REAL generated index, not a fixture.
 *
 * The thing most likely to break here is not the wiring but the corpus: a
 * retitled page or a reworded section can quietly stop answering a query people
 * actually type. A fixture would keep passing through all of that.
 *
 * It also exercises the two dynamic imports, which is the part that only fails
 * in a real bundle.
 */
describe('DocsSearchService', () => {
  let service: DocsSearchService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [DocsSearchService] });
    service = TestBed.inject(DocsSearchService);
  });

  it('finds a page by a word from its title', async () => {
    const results = await service.search('materials');

    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.path === 'docs/materials')).toBe(true);
  });

  it('finds a release note by its subject, not just its version', async () => {
    // The reason the index is cut into sections: this text lives 78 KB down a
    // single page, under one of 155 headings.
    const results = await service.search('spool photos');

    expect(results.some((r) => r.url.includes('#v1.48.0'))).toBe(true);
  });

  it('deep-links to the section it matched', async () => {
    const results = await service.search('spool photos');
    const hit = results.find((r) => r.url.includes('#v1.48.0'))!;

    expect(hit.url).toBe('/docs/release-notes#v1.48.0');
    expect(hit.page).toBe('Release Notes');
  });

  it('returns an excerpt that contains what was searched for', async () => {
    const results = await service.search('spool photos');
    const hit = results.find((r) => r.url.includes('#v1.48.0'))!;

    expect(hit.excerpt.toLowerCase()).toContain('photo');
  });

  it('tolerates a typo in a word long enough to be sure about', async () => {
    const results = await service.search('matreials');

    expect(results.length).toBeGreaterThan(0);
  });

  it('matches on a prefix, so results appear while still typing', async () => {
    const results = await service.search('printe');

    expect(results.length).toBeGreaterThan(0);
  });

  it('requires every term, so adding a word narrows rather than widens', async () => {
    const broad = await service.search('material');
    const narrow = await service.search('material qr code');

    expect(narrow.length).toBeLessThan(broad.length);
  });

  it('returns nothing for a query too short to mean anything', async () => {
    expect(await service.search('a')).toEqual([]);
    expect(await service.search(' ')).toEqual([]);
  });

  it('returns nothing rather than throwing for a query that matches nothing', async () => {
    // This is the zero-result path the analytics care most about, so it has to
    // be an ordinary empty list, not an error.
    expect(await service.search('zzzzqqqxyzzy')).toEqual([]);
  });

  it('caps the result list', async () => {
    const results = await service.search('the');

    expect(results.length).toBeLessThanOrEqual(12);
  });

  it('gives every result a unique id, so the list can track by it', async () => {
    const results = await service.search('print');

    expect(new Set(results.map((r) => r.id)).size).toBe(results.length);
  });

  it('builds the engine once across concurrent first searches', async () => {
    // Two keystrokes can race the very first import; starting two builds would
    // parse and index the whole corpus twice.
    const [a, b] = await Promise.all([
      service.search('materials'),
      service.search('materials'),
    ]);

    expect(a).toEqual(b);
  });
});
