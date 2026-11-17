/**
 * TEST ONLY: the bridge's side of `printlog-credential` v1, in WebCrypto, so specs can round-trip
 * what the app seals and check the vectors' `mustNotOpen` and `invalidSealedValues`. The app never
 * opens a credential (it has no private key); only specs import this file.
 */

const P256 = { name: 'ECDH', namedCurve: 'P-256' } as const;
const SEALED = /^v1\.[A-Za-z0-9_-]+$/;
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;

/**
 * Why a value did not open: `shape` (prefix, encoding, length or the ephemeral point),
 * `authentication` (the tag fails: the bridge reports `undecryptable`) or `plaintext` (it opened
 * to something that isn't a credential: `invalid_plaintext`).
 */
export class CredentialDidNotOpen extends Error {
  constructor(readonly reason: 'shape' | 'authentication' | 'plaintext') {
    super(`Did not open: ${reason}`);
    this.name = 'CredentialDidNotOpen';
  }
}

export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function fromHex(hex: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(hex.match(/../g) ?? [], (h) => parseInt(h, 16));
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

/** Canonical unpadded base64url only, or null. */
function fromBase64Url(s: string): Uint8Array<ArrayBuffer> | null {
  if (s.length % 4 === 1) {
    return null;
  }
  let bytes: Uint8Array<ArrayBuffer>;
  try {
    bytes = fromBase64(
      s.replace(/-/g, '+').replace(/_/g, '/') +
        '='.repeat((4 - (s.length % 4)) % 4)
    );
  } catch {
    return null;
  }
  return toBase64Url(bytes) === s ? bytes : null;
}

/**
 * Opens a sealed value as the bridge does: shape check, curve check, AD from its own ids,
 * AES-GCM, then strict UTF-8 and the control-character and length rules. Throws
 * {@link CredentialDidNotOpen}.
 */
export async function openCredential(
  privateKeyPkcs8Base64: string,
  recipientRaw: Uint8Array,
  sealed: string,
  ad: string
): Promise<string> {
  const subtle = crypto.subtle;
  if (!SEALED.test(sealed)) {
    throw new CredentialDidNotOpen('shape');
  }
  const blob = fromBase64Url(sealed.slice(3));
  if (!blob || blob.length < 94 || blob.length > 349 || blob[0] !== 0x04) {
    throw new CredentialDidNotOpen('shape');
  }
  const ephRaw = blob.slice(0, 65);
  const nonce = blob.slice(65, 77);
  let eph: CryptoKey;
  try {
    eph = await subtle.importKey('raw', ephRaw, P256, false, []);
  } catch {
    throw new CredentialDidNotOpen('shape');
  }
  const priv = await subtle.importKey(
    'pkcs8',
    fromBase64(privateKeyPkcs8Base64),
    P256,
    false,
    ['deriveBits']
  );
  const shared = await subtle.deriveBits(
    { name: 'ECDH', public: eph },
    priv,
    256
  );
  const ikm = await subtle.importKey('raw', shared, 'HKDF', false, [
    'deriveKey',
  ]);
  const salt = new Uint8Array([...ephRaw, ...recipientRaw]);
  const key = await subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt,
      info: new TextEncoder().encode('printlog-credential:v1:aes-256-gcm'),
    },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  let pt: Uint8Array;
  try {
    pt = new Uint8Array(
      await subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: nonce,
          additionalData: new TextEncoder().encode(ad),
        },
        key,
        blob.slice(77)
      )
    );
  } catch {
    throw new CredentialDidNotOpen('authentication');
  }
  if (pt.length < 1 || pt.length > 256) {
    throw new CredentialDidNotOpen('plaintext');
  }
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(
      pt
    );
  } catch {
    throw new CredentialDidNotOpen('plaintext');
  }
  if (CONTROL.test(text)) {
    throw new CredentialDidNotOpen('plaintext');
  }
  return text;
}
