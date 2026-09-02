import { excerptFor } from './docs-search.types';

describe('excerptFor', () => {
  const long = (filler: string, word: string) =>
    `${filler.repeat(40)} ${word} ${filler.repeat(40)}`;

  it('returns a short section unchanged', () => {
    expect(excerptFor('Log a print.', 'print')).toBe('Log a print.');
  });

  it('returns nothing for a section with no text', () => {
    // A heading immediately followed by a subheading indexes with empty text.
    expect(excerptFor('', 'print')).toBe('');
  });

  it('centres the window on the match, not on the start of the section', () => {
    // The whole point: on a 5,000-character release note the searched words can
    // be paragraphs down, and an excerpt without them reads as a bad result.
    const excerpt = excerptFor(long('filler ', 'kryptonite'), 'kryptonite');

    expect(excerpt).toContain('kryptonite');
  });

  it('marks both ends of a window taken from the middle', () => {
    const excerpt = excerptFor(long('filler ', 'kryptonite'), 'kryptonite');

    expect(excerpt.startsWith('…')).toBe(true);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('falls back to the opening when no term appears in the text', () => {
    // MiniSearch matches stems and prefixes, so a hit can have no literal
    // occurrence of what was typed.
    const excerpt = excerptFor(long('filler ', 'kryptonite'), 'zzz');

    expect(excerpt.startsWith('…')).toBe(false);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('uses the earliest of several query terms', () => {
    const text = `alpha ${'pad '.repeat(80)} omega ${'pad '.repeat(80)}`;
    const excerpt = excerptFor(text, 'omega alpha');

    expect(excerpt).toContain('alpha');
  });

  it('matches case-insensitively', () => {
    const excerpt = excerptFor(long('filler ', 'Kryptonite'), 'KRYPTONITE');

    expect(excerpt).toContain('Kryptonite');
  });

  it('does not open mid-word', () => {
    const excerpt = excerptFor(long('filler ', 'kryptonite'), 'kryptonite');
    const firstWord = excerpt.replace(/^…/, '').split(' ')[0];

    expect(['filler', 'kryptonite']).toContain(firstWord);
  });
});
