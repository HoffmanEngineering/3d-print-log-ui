import { redactEmailTokens } from './redact-email-tokens';

describe('redactEmailTokens', () => {
  function redact(baseData: Record<string, unknown>): Record<string, unknown> {
    const item = { baseData: { ...baseData } };
    redactEmailTokens(item);
    return item.baseData;
  }

  it('drops the token fragment from a preferences page view', () => {
    const data = redact({
      uri: 'https://www.3dprintlog.com/email-preferences#m=SECRET',
      refUri: 'https://www.3dprintlog.com/email-preferences#u=SECRET',
      name: 'Email preferences',
    });

    expect(JSON.stringify(data)).not.toContain('SECRET');
    expect(data['uri']).toBe('https://www.3dprintlog.com/email-preferences');
    expect(data['refUri']).toBe('https://www.3dprintlog.com/email-preferences');
  });

  it('redacts token query parameters on API dependencies and keeps the rest', () => {
    const data = redact({
      target: 'https://api.3dprintlog.com/api/email/unsubscribe?t=SECRET&a=1',
      name: 'POST /api/email/unsubscribe?t=SECRET&a=1',
    });

    expect(JSON.stringify(data)).not.toContain('SECRET');
    expect(data['target']).toContain('a=1');
    expect(data['target']).toContain('t=REDACTED');
  });

  it('redacts u and m query parameters too', () => {
    const data = redact({
      url: 'https://www.3dprintlog.com/email-preferences?u=SECRET&m=SECRET2',
    });

    expect(JSON.stringify(data)).not.toContain('SECRET');
  });

  it('leaves unrelated URLs alone', () => {
    const data = redact({
      uri: 'https://www.3dprintlog.com/prints?t=table#section',
      target: 'https://api.3dprintlog.com/api/prints?page=2',
    });

    expect(data['uri']).toBe(
      'https://www.3dprintlog.com/prints?t=table#section'
    );
    expect(data['target']).toBe('https://api.3dprintlog.com/api/prints?page=2');
  });

  it('ignores items without base data and non-string fields', () => {
    expect(() => redactEmailTokens({})).not.toThrow();
    const data = redact({ uri: 42 });
    expect(data['uri']).toBe(42);
  });
});
