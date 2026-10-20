import { HttpErrorResponse } from '@angular/common/http';
import { quickAddErrorText } from './quick-add-error';

const FALLBACK = 'We could not save the printer. Try again.';

describe('quickAddErrorText', () => {
  const http = (error: unknown, status = 400) =>
    new HttpErrorResponse({
      error,
      status,
      url: 'https://api.3dprintlog.com/api/Printers/',
    });

  it('shows a short plain-text API message', () => {
    expect(quickAddErrorText(http('Printer limit reached'), FALLBACK)).toBe(
      'Printer limit reached'
    );
  });

  it('shows the message, detail or title of a JSON error body', () => {
    expect(
      quickAddErrorText(http({ message: 'Printer limit reached' }), FALLBACK)
    ).toBe('Printer limit reached');
    expect(quickAddErrorText(http({ detail: 'Name is taken' }), FALLBACK)).toBe(
      'Name is taken'
    );
    expect(quickAddErrorText(http({ title: 'Bad request' }), FALLBACK)).toBe(
      'Bad request'
    );
  });

  it('shows the generic copy for an HTML 502 body', () => {
    const html =
      '<html><head><title>502 Bad Gateway</title></head><body>nginx</body></html>';
    expect(quickAddErrorText(http(html, 502), FALLBACK)).toBe(FALLBACK);
  });

  it('shows the generic copy for a long text body', () => {
    expect(quickAddErrorText(http('x'.repeat(201)), FALLBACK)).toBe(FALLBACK);
  });

  it('never shows the HttpErrorResponse message, which carries the URL', () => {
    const text = quickAddErrorText(http(null, 0), FALLBACK);
    expect(text).toBe(FALLBACK);
    expect(text).not.toContain('api.3dprintlog.com');
  });

  it('shows the message of a non-HTTP Error', () => {
    expect(
      quickAddErrorText(new Error('Choose a printer type.'), FALLBACK)
    ).toBe('Choose a printer type.');
  });

  it('shows the generic copy for anything else', () => {
    expect(quickAddErrorText({ error: 'raw' }, FALLBACK)).toBe(FALLBACK);
    expect(quickAddErrorText(undefined, FALLBACK)).toBe(FALLBACK);
  });
});
