import { neighborsOf, relatedTo } from './doc-navigation';
import { DOC_PAGES } from './generated/docs-manifest';

const routed = DOC_PAGES.filter((page) => !page.dormant);

describe('doc navigation', () => {
  describe('neighborsOf', () => {
    it('follows the sidebar order, so "next" means one step down the nav', () => {
      const second = routed[1];

      const { previous, next } = neighborsOf(second.path);

      expect(previous?.path).toBe(routed[0].path);
      expect(next?.path).toBe(routed[2].path);
    });

    it('leaves the first page without a previous', () => {
      expect(neighborsOf(routed[0].path).previous).toBeNull();
      expect(neighborsOf(routed[0].path).next).not.toBeNull();
    });

    it('leaves the last page without a next, rather than wrapping around', () => {
      // A "next" that lands back on Getting Started tells the reader they are
      // in a loop, not that they have reached the end.
      const last = routed[routed.length - 1];

      expect(neighborsOf(last.path).next).toBeNull();
      expect(neighborsOf(last.path).previous).not.toBeNull();
    });

    it('gives an unknown path no neighbors at all', () => {
      expect(neighborsOf('docs/not-a-page')).toEqual({
        previous: null,
        next: null,
      });
    });

    it('never offers a dormant page as a neighbor', () => {
      // A dormant page has no route, so linking to it is a dead end.
      const dormant = DOC_PAGES.filter((page) => page.dormant).map(
        (p) => p.path
      );

      for (const page of routed) {
        const { previous, next } = neighborsOf(page.path);
        expect(dormant).not.toContain(previous?.path ?? '');
        expect(dormant).not.toContain(next?.path ?? '');
      }
    });
  });

  describe('relatedTo', () => {
    it('resolves the slugs a page declares, in the order authored', () => {
      const page = routed.find((entry) => entry.related.length > 1);
      if (!page) {
        pending('no doc page declares more than one related slug');
        return;
      }

      expect(relatedTo(page.path).map((link) => link.path)).toEqual(
        page.related.map((slug) => `docs/${slug}`)
      );
    });

    it('carries the label and description the cards render', () => {
      const page = routed.find((entry) => entry.related.length > 0)!;
      const target = routed.find((e) => e.slug === page.related[0])!;

      expect(relatedTo(page.path)[0]).toEqual({
        path: target.path,
        navLabel: target.navLabel,
        description: target.description,
      });
    });

    it('is empty for an unknown path', () => {
      expect(relatedTo('docs/not-a-page')).toEqual([]);
    });

    it('drops a slug that does not resolve to a routable page', () => {
      // validate-docs already fails on an unknown slug, so this only covers a
      // related page going dormant after it was linked to.
      for (const page of routed) {
        for (const link of relatedTo(page.path)) {
          expect(routed.some((entry) => entry.path === link.path)).toBeTrue();
        }
      }
    });
  });
});
