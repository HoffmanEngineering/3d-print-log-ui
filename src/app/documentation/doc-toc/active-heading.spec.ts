import { activeBandTopPx, activeHeadingAt } from './active-heading';

describe('activeHeadingAt', () => {
  const BAND = 128;

  /** Headings laid out down the page, in document order. */
  const at = (...tops: number[]) =>
    tops.map((top, i) => ({ id: `h${i}`, top }));

  it('marks the last heading the reader has scrolled under', () => {
    // h0 and h1 are above the band line, h2 is still below it.
    expect(activeHeadingAt(at(-500, 40, 600), BAND, false)).toBe('h1');
  });

  it('marks nothing above the first heading', () => {
    // The page opens with prose, or with a title the outline does not list.
    expect(activeHeadingAt(at(300, 900, 1500), BAND, false)).toBeNull();
  });

  it('marks a heading that has landed exactly on the band line', () => {
    // Where a deep link parks its target, via scroll-margin-top.
    expect(activeHeadingAt(at(-200, BAND, 700), BAND, false)).toBe('h1');
  });

  it('keeps marking a long section whose heading has scrolled far away', () => {
    expect(activeHeadingAt(at(-9000, 4000), BAND, false)).toBe('h0');
  });

  it('does not depend on which headings changed since the last reading', () => {
    // The bug this replaced: an IntersectionObserver callback names only the
    // targets whose state changed, so a reducer over one callback could pick a
    // later heading while an earlier one was still in the band. Reading every
    // position makes two headings above the line unambiguous.
    expect(activeHeadingAt(at(-300, -100, 500), BAND, false)).toBe('h1');
  });

  it('marks the last heading at the bottom of the page', () => {
    // A final section shorter than the viewport never brings its heading up to
    // the band, so geometry alone would mark the section before it — and this
    // drives aria-current, so that is a wrong answer given to a screen reader.
    expect(activeHeadingAt(at(-2000, -900, 700), BAND, true)).toBe('h2');
  });

  it('has no answer for a page with no headings', () => {
    expect(activeHeadingAt([], BAND, false)).toBeNull();
    expect(activeHeadingAt([], BAND, true)).toBeNull();
  });
});

describe('activeBandTopPx', () => {
  it('scales the band with the root font size', () => {
    expect(activeBandTopPx(16)).toBe(128);
    expect(activeBandTopPx(20)).toBe(160);
  });

  it('reaches at least as far as a deep link parks its heading', () => {
    // The band must cover scroll-margin-top (8rem in docs-typography.scss), or
    // a heading arrived at by deep link would not read as the current one.
    const scrollMarginTopRem = 8;
    expect(activeBandTopPx(16)).toBeGreaterThanOrEqual(scrollMarginTopRem * 16);
  });
});
