import { resolveScrollContainer, scrolls } from './docs-scroll-container';
import { scrollPercentOf } from './docs-telemetry.service';

describe('resolveScrollContainer', () => {
  /**
   * A stand-in for the shell's `mat-sidenav-content`. Only the three geometry
   * properties the resolver reads are needed, and a real element cannot be made
   * to report an arbitrary scrollHeight without laying out the whole shell.
   */
  const fakeDoc = (content: Partial<HTMLElement> | null): Document => {
    const documentElement = { tagName: 'HTML' } as HTMLElement;
    return {
      documentElement,
      querySelector: () => content,
    } as unknown as Document;
  };

  it('uses the sidenav content when it is the element that scrolls', () => {
    const content = { scrollHeight: 5000, clientHeight: 800 } as HTMLElement;

    expect(resolveScrollContainer(fakeDoc(content))).toBe(content);
  });

  it('falls back to the document when the sidenav content does not scroll', () => {
    // The desktop docs shell: the container is as tall as the article, so it
    // has no scroll range of its own and the document is what moves.
    const content = { scrollHeight: 8997, clientHeight: 8997 } as HTMLElement;
    const doc = fakeDoc(content);

    expect(resolveScrollContainer(doc)).toBe(doc.documentElement);
  });

  it('falls back to the document when there is no sidenav at all', () => {
    const doc = fakeDoc(null);

    expect(resolveScrollContainer(doc)).toBe(doc.documentElement);
  });

  it('does not treat a sub-pixel difference as a scroll range', () => {
    const content = { scrollHeight: 800.5, clientHeight: 800 } as HTMLElement;

    expect(scrolls(content)).toBeFalse();
  });

  it('keeps scroll depth from reading 100% on a container that cannot scroll', () => {
    // Why the fallback matters rather than being tidier. scrollPercentOf reads
    // "no scroll range" as fully read, which is right for a short page and
    // wrong for the wrong element — picking a container that merely exists
    // reported every desktop docs visit as 100% read.
    const stuck = { scrollHeight: 8997, clientHeight: 8997, scrollTop: 0 };
    expect(scrollPercentOf(stuck)).toBe(100);

    const real = { scrollHeight: 9000, clientHeight: 900, scrollTop: 0 };
    expect(scrollPercentOf(real)).toBe(0);
  });
});
