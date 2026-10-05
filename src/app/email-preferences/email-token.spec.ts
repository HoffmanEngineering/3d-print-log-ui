import {
  decodeUnsubscribeCategory,
  readEmailTokenFragment,
} from './email-token';

/** Encodes bytes the way the API does: base64url without padding. */
function b64url(bytes: number[]): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** version 1, purpose, user 300 (LEB128 AC 02), category, issued-at minutes. */
function token(purpose: number, category: number): string {
  return `${b64url([1, purpose, 0xac, 0x02, category, 0, 0x1b, 0x2c, 0x3d])}.c2lnbmF0dXJl`;
}

describe('decodeUnsubscribeCategory', () => {
  it('reads the category from an unsubscribe token', () => {
    expect(decodeUnsubscribeCategory(token(1, 24))).toBe(24);
  });

  it('skips a multi-byte user id', () => {
    const bytes = [1, 1, 0xff, 0xff, 0xff, 0x7f, 22, 0, 0, 0, 0];
    expect(decodeUnsubscribeCategory(`${b64url(bytes)}.sig`)).toBe(22);
  });

  it('returns null for a manage token', () => {
    expect(decodeUnsubscribeCategory(token(2, 24))).toBeNull();
  });

  it('returns null for an unknown version', () => {
    const bytes = [2, 1, 0x01, 24, 0, 0, 0, 0];
    expect(decodeUnsubscribeCategory(`${b64url(bytes)}.sig`)).toBeNull();
  });

  it('returns null for garbage', () => {
    expect(decodeUnsubscribeCategory('')).toBeNull();
    expect(decodeUnsubscribeCategory('not a token')).toBeNull();
    expect(decodeUnsubscribeCategory('!!!.sig')).toBeNull();
    expect(decodeUnsubscribeCategory(`${b64url([1, 1, 0x80])}.sig`)).toBeNull();
  });
});

describe('readEmailTokenFragment', () => {
  it('reads unsubscribe and manage tokens', () => {
    expect(readEmailTokenFragment('#u=abc.def')).toEqual({
      kind: 'unsubscribe',
      token: 'abc.def',
    });
    expect(readEmailTokenFragment('#m=abc.def')).toEqual({
      kind: 'manage',
      token: 'abc.def',
    });
  });

  it('returns null for anything else', () => {
    expect(readEmailTokenFragment('')).toBeNull();
    expect(readEmailTokenFragment('#')).toBeNull();
    expect(readEmailTokenFragment('#u=')).toBeNull();
    expect(readEmailTokenFragment('#x=abc')).toBeNull();
  });
});
