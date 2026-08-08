const ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * Validates a user-supplied URL for use in an `href`.
 *
 * `print.url` is free text typed by a user and rendered on a page anonymous
 * visitors can reach, so an unvalidated binding is a `javascript:` XSS vector.
 * Returns an absolute http(s) URL, or null when the input must not be linked.
 */
export function safeExternalUrl(raw: string | null | undefined): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = [trimmed];
  if (trimmed.startsWith('//')) {
    candidates.push(`https:${trimmed}`);
  } else if (!trimmed.includes(':')) {
    // Bare host such as "example.com/thing".
    candidates.push(`https://${trimmed}`);
  }

  for (const candidate of candidates) {
    let parsed: URL;
    try {
      parsed = new URL(candidate);
    } catch {
      continue;
    }

    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
      // Never fall through to a normalized candidate for a rejected scheme —
      // "javascript:alert(1)" must not become "https://javascript:alert(1)".
      return null;
    }

    if (!parsed.hostname.includes('.')) {
      continue;
    }

    return candidate === trimmed ? trimmed : parsed.toString();
  }

  return null;
}

/** Human-readable label for an external URL — the host, or the raw input. */
export function externalUrlLabel(raw: string): string {
  const safe = safeExternalUrl(raw);
  if (!safe) {
    return raw;
  }
  try {
    return new URL(safe).hostname;
  } catch {
    return raw;
  }
}
