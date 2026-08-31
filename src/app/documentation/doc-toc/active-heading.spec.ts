import { activeBandRootMargin, nextActiveHeading } from './active-heading';

describe('nextActiveHeading', () => {
  const order = ['intro', 'setup', 'usage', 'troubleshooting'];

  it('marks the heading that just entered the band', () => {
    expect(
      nextActiveHeading(null, [{ id: 'setup', isIntersecting: true }], order)
    ).toBe('setup');
  });

  it('prefers the topmost heading when several share the band', () => {
    // A run of short subsections can put three headings in the band at once.
    // The reader is under the first of them.
    expect(
      nextActiveHeading(
        null,
        [
          { id: 'usage', isIntersecting: true },
          { id: 'setup', isIntersecting: true },
          { id: 'troubleshooting', isIntersecting: true },
        ],
        order
      )
    ).toBe('setup');
  });

  it('keeps the current heading while a long section fills the screen', () => {
    // The section is taller than the band, so its own heading has scrolled out
    // the top and nothing else has arrived yet. Blanking the rail here would
    // lose the mark for the whole length of the section.
    expect(
      nextActiveHeading(
        'setup',
        [{ id: 'setup', isIntersecting: false }],
        order
      )
    ).toBe('setup');
  });

  it('has no answer before the first heading is reached', () => {
    expect(nextActiveHeading(null, [], order)).toBeNull();
  });

  it('ignores a heading that is not in the outline', () => {
    // The page can contain anchored headings the outline does not list, e.g.
    // one nested deeper than the outline records.
    expect(
      nextActiveHeading(
        'setup',
        [{ id: 'not-in-the-outline', isIntersecting: true }],
        order
      )
    ).toBe('setup');
  });
});

describe('activeBandRootMargin', () => {
  it('converts the rem band to the pixels rootMargin requires', () => {
    expect(activeBandRootMargin(16)).toBe('-128px 0px -55% 0px');
    expect(activeBandRootMargin(20)).toBe('-160px 0px -55% 0px');
  });

  it('produces a value IntersectionObserver actually accepts', () => {
    // The reason this function exists. rootMargin takes px and % only, so a
    // rem value makes the constructor throw SyntaxError — and because the
    // observer is built inside a render callback, that throw showed up as a
    // console error and a rail that silently never highlighted anything,
    // rather than as anything resembling a layout bug.
    expect(
      () =>
        new IntersectionObserver(() => undefined, {
          rootMargin: activeBandRootMargin(16),
        })
    ).not.toThrow();

    expect(
      () =>
        new IntersectionObserver(() => undefined, {
          rootMargin: '-8rem 0px -55% 0px',
        })
    ).toThrow();
  });
});

describe('nextActiveHeading above the first heading', () => {
  const order = ['intro', 'setup', 'usage'];

  it('clears the mark when the reader is above the first heading', () => {
    // Jumping to the top of the page — the Home key, or the back-to-top
    // button — puts every observed heading below the band at once. Rule 2
    // would keep marking whatever section was left behind.
    expect(
      nextActiveHeading(
        'usage',
        [{ id: 'usage', isIntersecting: false }],
        order,
        true
      )
    ).toBeNull();
  });

  it('still prefers a heading that is genuinely in the band', () => {
    expect(
      nextActiveHeading(
        'usage',
        [{ id: 'intro', isIntersecting: true }],
        order,
        true
      )
    ).toBe('intro');
  });

  it('keeps rule 2 intact once past the first heading', () => {
    expect(
      nextActiveHeading(
        'setup',
        [{ id: 'setup', isIntersecting: false }],
        order,
        false
      )
    ).toBe('setup');
  });
});
