import { describe, expect, it } from 'vitest';
import { parseSeoMetadata } from '../src/seo';
import { clone, PRINT_SEO, PROFILE_SEO, PROJECT_SEO } from './samples';

describe('parseSeoMetadata', () => {
  it('accepts each documented example', () => {
    expect(parseSeoMetadata(PRINT_SEO)?.type).toBe('print');
    expect(parseSeoMetadata(PROJECT_SEO)?.type).toBe('project');
    expect(parseSeoMetadata(PROFILE_SEO)?.type).toBe('profile');
  });

  it('keeps the fields it uses', () => {
    const seo = parseSeoMetadata(PRINT_SEO)!;
    expect(seo).toEqual({
      type: 'print',
      title: 'Benchy | 3D Print Log',
      description: 'Printed in two colors with a 0.4 nozzle.',
      canonicalUrl: 'https://www.3dprintlog.com/prints/123',
      image: {
        url: 'https://api.3dprintlog.com/api/Prints/123/social-image?v=3f2a9c1b7d4e',
        width: 1200,
        height: 750,
        alt: 'Benchy',
      },
      author: { name: 'Ada Maker', url: 'https://www.3dprintlog.com/users/7' },
      publishedAt: '2026-10-03T14:05:00+00:00',
      updatedAt: '2026-10-20T09:12:00+00:00',
      facts: PRINT_SEO.facts,
    });
  });

  it('keeps unknown sizes as null', () => {
    const seo = parseSeoMetadata(PROFILE_SEO)!;
    expect(seo.image).toEqual({
      url: 'https://lh3.googleusercontent.com/a/abc123',
      width: null,
      height: null,
      alt: "Ada Maker's profile picture",
    });
  });

  it.each([
    ['null', null],
    ['a string', 'nope'],
    ['an array', []],
    ['an unknown type', { ...clone(PRINT_SEO), type: 'material' }],
    ['a missing title', { ...clone(PRINT_SEO), title: undefined }],
    ['an empty title', { ...clone(PRINT_SEO), title: '   ' }],
    ['a numeric title', { ...clone(PRINT_SEO), title: 42 }],
    [
      'a missing canonical URL',
      { ...clone(PRINT_SEO), canonicalUrl: undefined },
    ],
    [
      'a non-http canonical URL',
      { ...clone(PRINT_SEO), canonicalUrl: 'javascript:alert(1)' },
    ],
    [
      'a relative canonical URL',
      { ...clone(PRINT_SEO), canonicalUrl: '/prints/123' },
    ],
    ['an image that is not an object', { ...clone(PRINT_SEO), image: 'x' }],
    ['facts that are not an array', { ...clone(PRINT_SEO), facts: 'x' }],
  ])('rejects %s', (_name, value) => {
    expect(parseSeoMetadata(value)).toBeNull();
  });

  it('treats a missing description as empty', () => {
    const seo = parseSeoMetadata({ ...clone(PRINT_SEO), description: null })!;
    expect(seo.description).toBe('');
  });

  it('drops an image whose URL is not http(s)', () => {
    for (const url of [
      'javascript:alert(1)',
      'data:image/png;base64,AAAA',
      '//evil.example/x.png',
      'ftp://x/y.png',
      '',
    ]) {
      const value = clone(PRINT_SEO);
      value.image.url = url;
      expect(parseSeoMetadata(value)!.image).toBeNull();
    }
  });

  it('drops an author URL that is not http(s), keeping the name', () => {
    const value = clone(PRINT_SEO);
    value.author.url = 'javascript:alert(1)';
    expect(parseSeoMetadata(value)!.author).toEqual({
      name: 'Ada Maker',
      url: null,
    });
  });

  it('drops an author without a name', () => {
    const value = { ...clone(PRINT_SEO), author: { name: '', url: null } };
    expect(parseSeoMetadata(value)!.author).toBeNull();
  });

  it('ignores image sizes that are not positive integers', () => {
    const value = clone(PRINT_SEO) as unknown as {
      image: Record<string, unknown>;
    };
    value.image.width = '1200';
    value.image.height = -5;
    const seo = parseSeoMetadata(value)!;
    expect(seo.image?.width).toBeNull();
    expect(seo.image?.height).toBeNull();
  });

  it('skips malformed facts and keeps the rest in order', () => {
    const value = {
      ...clone(PRINT_SEO),
      facts: [
        { label: 'Printer', value: 'MK4' },
        null,
        { label: 3, value: 'x' },
        { label: 'Status', value: 'Success' },
      ],
    };
    expect(parseSeoMetadata(value)!.facts).toEqual([
      { label: 'Printer', value: 'MK4' },
      { label: 'Status', value: 'Success' },
    ]);
  });

  it('treats missing facts as none', () => {
    expect(
      parseSeoMetadata({ ...clone(PRINT_SEO), facts: null })!.facts
    ).toEqual([]);
  });

  it('keeps dates only when they parse', () => {
    const seo = parseSeoMetadata({
      ...clone(PRINT_SEO),
      publishedAt: 'yesterday',
      updatedAt: 5,
    })!;
    expect(seo.publishedAt).toBeNull();
    expect(seo.updatedAt).toBeNull();
  });
});
