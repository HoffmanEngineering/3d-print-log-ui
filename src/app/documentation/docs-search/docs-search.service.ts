import { Injectable } from '@angular/core';

import type { DocSearchSection } from './docs-search.types';
import { excerptFor } from './docs-search.types';

/** What the UI renders for one hit. */
export interface DocSearchResult {
  readonly id: string;
  readonly title: string;
  readonly page: string;
  readonly url: string;
  readonly path: string;
  /** A window of the section's text around the match, for display only. */
  readonly excerpt: string;
}

/** Nothing below this scores as a real match; MiniSearch will rank noise. */
const MAX_RESULTS = 12;

/**
 * Client-side search over the generated section index.
 *
 * Both the engine and the index are pulled in by `import()` on the first
 * search, never at construction. Together they are ~55 KB gzipped, and the
 * overwhelming majority of docs visitors never search — putting either in the
 * eager bundle would undo the bundle-splitting work this app already did.
 *
 * Not provided in root: it belongs to DocumentationModule, so the class itself
 * is in the lazy docs chunk rather than the main one.
 */
@Injectable()
export class DocsSearchService {
  /**
   * The load, kept as the promise rather than the result. Two searches racing
   * on the first keystrokes must await one import, not start two.
   */
  private engine: Promise<SearchEngine> | null = null;

  /**
   * @returns ranked results, best first; empty when the query is too short to
   *   mean anything or nothing matched
   */
  async search(query: string): Promise<DocSearchResult[]> {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    const engine = await this.load();
    return engine.search(trimmed);
  }

  /**
   * Warms the engine without searching. Called when the palette opens so the
   * chunk is usually in flight before the first keystroke lands.
   */
  preload(): void {
    void this.load().catch(() => undefined);
  }

  private load(): Promise<SearchEngine> {
    // A failed import must not be cached as a permanently broken engine, so the
    // slot is cleared on rejection and the next search retries.
    this.engine ??= buildEngine().catch((error) => {
      this.engine = null;
      throw error;
    });
    return this.engine;
  }
}

interface SearchEngine {
  search(query: string): DocSearchResult[];
}

async function buildEngine(): Promise<SearchEngine> {
  const [{ default: MiniSearch }, { default: sections }] = await Promise.all([
    import('minisearch'),
    import('../generated/docs-search-index.json'),
  ]);

  const corpus = sections as DocSearchSection[];

  const index = new MiniSearch<DocSearchSection>({
    fields: ['title', 'page', 'text'],
    storeFields: ['title', 'page', 'url', 'path', 'text'],
    searchOptions: {
      // A heading is a far stronger signal than a mention buried in prose, and
      // the page name lets "materials qr" find a section of the materials page.
      boost: { title: 4, page: 2 },
      prefix: true,
      // Typo tolerance that scales with the word: too aggressive on short words
      // turns "qr" into a match for everything.
      fuzzy: (term) => (term.length > 4 ? 0.2 : 0),
      combineWith: 'AND',
    },
  });

  index.addAll(corpus);

  return {
    search(query: string): DocSearchResult[] {
      const hits = index.search(query).slice(0, MAX_RESULTS);

      return hits.map((hit) => ({
        id: String(hit.id),
        title: hit['title'] as string,
        page: hit['page'] as string,
        url: hit['url'] as string,
        path: hit['path'] as string,
        excerpt: excerptFor(hit['text'] as string, query),
      }));
    },
  };
}
