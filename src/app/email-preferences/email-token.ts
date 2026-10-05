/** What the `/email-preferences` fragment carries: a one-click unsubscribe or a manage link. */
export interface EmailTokenFragment {
  kind: 'unsubscribe' | 'manage';
  token: string;
}

const TOKEN_VERSION = 1;
const PURPOSE_UNSUBSCRIBE = 1;
const MAX_VARINT_BYTES = 10;

/** Parses `#u=<token>` or `#m=<token>`; null for anything else. */
export function readEmailTokenFragment(
  hash: string
): EmailTokenFragment | null {
  const match = /^#([um])=([A-Za-z0-9_\-.]+)$/.exec(hash);
  if (!match) {
    return null;
  }
  return {
    kind: match[1] === 'u' ? 'unsubscribe' : 'manage',
    token: match[2],
  };
}

/**
 * The email category an unsubscribe token names, for the "Unsubscribe from …?" copy only.
 *
 * Tokens are signed, not encrypted, so reading the payload here is fine; the server verifies
 * the signature and decides what actually changes. Layout: version byte, purpose byte, the
 * user id as LEB128, the category byte, then the issue time. Null when anything is off.
 */
export function decodeUnsubscribeCategory(token: string): number | null {
  const bytes = decodeBase64Url(token.split('.')[0] ?? '');
  if (
    !bytes ||
    bytes.length < 4 ||
    bytes[0] !== TOKEN_VERSION ||
    bytes[1] !== PURPOSE_UNSUBSCRIBE
  ) {
    return null;
  }

  let i = 2;
  for (; i < bytes.length && i < 2 + MAX_VARINT_BYTES; i++) {
    if ((bytes[i] & 0x80) === 0) {
      break;
    }
  }
  const categoryIndex = i + 1;
  if (
    i >= bytes.length ||
    (bytes[i] & 0x80) !== 0 ||
    categoryIndex >= bytes.length
  ) {
    return null;
  }
  return bytes[categoryIndex];
}

function decodeBase64Url(text: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(text)) {
    return null;
  }
  try {
    const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}
