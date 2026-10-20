import { HttpErrorResponse } from '@angular/common/http';

/** Longer than this, an API text is a page or a stack trace, not a message for a person. */
const MAX_MESSAGE_LENGTH = 200;

/**
 * The message a quick-add form shows when its save fails. An API error shows its own text
 * only when it reads like a message (short, no markup), so a proxy's HTML 502 page never
 * reaches the form; `HttpErrorResponse.message` names the URL, so it is never used. A
 * non-HTTP `Error` is one the form threw itself and shows as is.
 */
export function quickAddErrorText(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (typeof body === 'string') {
      return readable(body) ? body : fallback;
    }
    if (body && typeof body === 'object') {
      const { message, detail, title } = body as Record<string, unknown>;
      const text = [message, detail, title].find(readable);
      return typeof text === 'string' ? text : fallback;
    }
    return fallback;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}

function readable(text: unknown): text is string {
  return (
    typeof text === 'string' &&
    text.trim().length > 0 &&
    text.length <= MAX_MESSAGE_LENGTH &&
    !text.includes('<')
  );
}
