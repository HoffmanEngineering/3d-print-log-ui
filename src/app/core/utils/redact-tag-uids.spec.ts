import { redactTagUids } from './redact-tag-uids';

describe('redactTagUids', () => {
  function redact(baseData: Record<string, unknown>): Record<string, unknown> {
    const item = { baseData: { ...baseData } };
    redactTagUids(item);
    return item.baseData;
  }

  it('redacts the UID in a by-tag lookup dependency', () => {
    const data = redact({
      target: 'https://api.3dprintlog.com/api/Filaments/by-tag/04A23F11223380',
      name: 'GET /api/Filaments/by-tag/04A23F11223380',
    });

    expect(JSON.stringify(data)).not.toContain('04A23F11223380');
    expect(data['name']).toBe('GET /api/Filaments/by-tag/REDACTED');
  });

  it('redacts the tag query parameter on a new-material page view and keeps the rest', () => {
    const data = redact({
      uri: 'https://www.3dprintlog.com/materials/new?tag=04A23F11&x=1',
      refUri: 'https://www.3dprintlog.com/materials/new?x=1&tag=04A23F11',
    });

    expect(JSON.stringify(data)).not.toContain('04A23F11');
    expect(data['uri']).toBe(
      'https://www.3dprintlog.com/materials/new?tag=REDACTED&x=1'
    );
    expect(data['refUri']).toBe(
      'https://www.3dprintlog.com/materials/new?x=1&tag=REDACTED'
    );
  });

  it('leaves unrelated URLs alone', () => {
    const data = redact({
      uri: 'https://www.3dprintlog.com/materials?tags=pla',
      target: 'https://api.3dprintlog.com/api/Filaments/abc',
    });

    expect(data['uri']).toBe('https://www.3dprintlog.com/materials?tags=pla');
    expect(data['target']).toBe('https://api.3dprintlog.com/api/Filaments/abc');
  });

  it('ignores items without base data and non-string fields', () => {
    expect(() => redactTagUids({})).not.toThrow();
    expect(redact({ uri: 42 })['uri']).toBe(42);
  });
});
