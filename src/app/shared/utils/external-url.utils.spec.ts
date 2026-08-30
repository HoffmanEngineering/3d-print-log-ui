import { safeExternalUrl, externalUrlLabel } from './external-url.utils';

describe('safeExternalUrl', () => {
  it('passes through http and https URLs', () => {
    expect(safeExternalUrl('https://printables.com/model/1')).toBe(
      'https://printables.com/model/1'
    );
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com');
  });

  it('rejects dangerous schemes', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(safeExternalUrl('JaVaScRiPt:alert(1)')).toBeNull();
    expect(safeExternalUrl('data:text/html;base64,PHNjcmlwdD4=')).toBeNull();
    expect(safeExternalUrl('vbscript:msgbox(1)')).toBeNull();
    expect(safeExternalUrl('file:///etc/passwd')).toBeNull();
  });

  it('normalizes scheme-relative and bare-host inputs to https', () => {
    expect(safeExternalUrl('//example.com/thing')).toBe(
      'https://example.com/thing'
    );
    expect(safeExternalUrl('example.com/thing')).toBe(
      'https://example.com/thing'
    );
  });

  it('returns null for empty and unusable input', () => {
    expect(safeExternalUrl(null)).toBeNull();
    expect(safeExternalUrl(undefined)).toBeNull();
    expect(safeExternalUrl('')).toBeNull();
    expect(safeExternalUrl('   ')).toBeNull();
    expect(safeExternalUrl('not a url at all')).toBeNull();
  });

  it('trims surrounding whitespace before validating', () => {
    // Returns the trimmed input verbatim — the implementation only runs the
    // input through URL.toString() (which would append a trailing slash) when
    // it had to normalize a scheme-relative or bare-host value.
    expect(safeExternalUrl('  https://example.com  ')).toBe(
      'https://example.com'
    );
  });
});

describe('externalUrlLabel', () => {
  it('returns the host for a valid URL', () => {
    expect(externalUrlLabel('https://www.printables.com/model/1')).toBe(
      'www.printables.com'
    );
  });

  it('falls back to the raw string when the host cannot be parsed', () => {
    expect(externalUrlLabel('nonsense')).toBe('nonsense');
  });
});
