/**
 * Sealing a printer's LAN credential to a printlog-bridge's public key, in the browser:
 * `printlog-credential` v1 (3d-print-log-api `docs/bridge-credential-sealing.md`, which is
 * normative). ECDH P-256 with a fresh ephemeral key per value, HKDF-SHA256, AES-256-GCM, with the
 * bridge, entry and field bound in the associated data. WebCrypto only: no crypto library.
 *
 * Three implementations (this one, the bridge's and the API's checks) must agree byte for byte;
 * `credential-sealing.spec.ts` runs the shared vectors. Change nothing here without the contract.
 *
 * Every function touches `crypto.subtle` only when called, and the app calls them only from user
 * actions, so prerendering never runs them.
 */

/** The fields a bridge's adapters take (`secretFields`): the AD and the API name them so. */
export const CREDENTIAL_FIELDS = [
  'access_code',
  'password',
  'username',
  'api_key',
  'moonraker_api_key',
] as const;

export type CredentialField = (typeof CREDENTIAL_FIELDS)[number];

/** Trimmed of U+0020 and U+00A0 at both ends before sealing. A password never is. */
const TRIMMED_FIELDS: ReadonlySet<string> = new Set([
  'access_code',
  'username',
  'api_key',
  'moonraker_api_key',
]);

const MAX_BYTES = 256;
/** C0 (tab and line feed included), DEL and C1. */
// eslint-disable-next-line no-control-regex
const CONTROL = /[\u0000-\u001f\u007f-\u009f]/;
/** A high surrogate not followed by a low one, or a low one not preceded by a high one. */
const LONE_SURROGATE =
  /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;
const TRIM = /^[ \u00a0]+|[ \u00a0]+$/g;

/**
 * 91 bytes: 124 characters of padded standard base64, starting with the 36 characters every
 * P-256 SPKI with an uncompressed point starts with.
 */
const SPKI_BASE64 = /^MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE[A-Za-z0-9+/]{86}==$/;
const SPKI_BYTES = 91;

const P256 = { name: 'ECDH', namedCurve: 'P-256' } as const;
const encoder = new TextEncoder();
const HKDF_INFO = encoder.encode('printlog-credential:v1:aes-256-gcm');

/** What is wrong with what the user typed, for a message next to the field. */
export type CredentialProblem =
  | 'empty'
  | 'too_long'
  | 'control_character'
  | 'invalid_text';

/** The plaintext breaks the rules: nothing was sealed. */
export class InvalidCredentialError extends Error {
  constructor(readonly reason: CredentialProblem) {
    super(`Not a valid credential: ${reason}`);
    this.name = 'InvalidCredentialError';
  }
}

/**
 * Sealing can't go ahead: `unavailable` (no WebCrypto: an insecure context or a very old
 * browser), `invalid_key` (the bridge's key isn't a P-256 SPKI of the exact contract shape) or
 * `invalid_target` (an id or field that can't be in the associated data).
 */
export class CredentialSealingError extends Error {
  constructor(
    readonly reason: 'unavailable' | 'invalid_key' | 'invalid_target'
  ) {
    super(`Can't seal: ${reason}`);
    this.name = 'CredentialSealingError';
  }
}

/** A bridge's public key as imported, with the fingerprint of exactly these bytes. */
export interface BridgeKey {
  /** The 91 SPKI bytes that were imported and are sealed to. */
  readonly spki: Uint8Array;
  /** The uncompressed point, 65 bytes (`0x04 ‖ X ‖ Y`), for the HKDF salt. */
  readonly raw: Uint8Array;
  readonly key: CryptoKey;
  /** Lower-case hex SHA-256 of `spki`, 64 characters: what the app shows and sends. */
  readonly fingerprint: string;
}

/** Where a sealed value belongs: the bridge, its desired-printer entry and the field. */
export interface SealTarget {
  bridgeId: number;
  entryId: number;
  field: string;
}

export interface SealedCredential {
  /** `v1.` + base64url of `ephRaw ‖ nonce ‖ ct ‖ tag`. */
  sealed: string;
  /** The fingerprint of the key it was sealed to, computed here (never the API's copy). */
  keyFingerprint: string;
}

/** Where a seal's randomness comes from. Only the vectors replace it. */
export interface SealRandomness {
  /** A fresh ephemeral P-256 ECDH keypair for every value; the private key needs `deriveBits`. */
  ephemeralKeyPair(): Promise<CryptoKeyPair>;
  /** 12 random bytes. */
  nonce(): Uint8Array;
}

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) {
    throw new CredentialSealingError('unavailable');
  }
  return s;
}

/** True when this browser can seal (WebCrypto in a secure context). */
export function canSealCredentials(): boolean {
  return !!globalThis.crypto?.subtle;
}

export const webCryptoRandomness: SealRandomness = {
  ephemeralKeyPair: () =>
    // Non-extractable private key; WebCrypto always makes the public half extractable.
    subtle().generateKey(P256, false, ['deriveBits']) as Promise<CryptoKeyPair>,
  nonce: () => globalThis.crypto.getRandomValues(new Uint8Array(12)),
};

/**
 * What to seal for what the user typed in `field`: trimmed of spaces and no-break spaces at both
 * ends unless it is a password, never normalized. Throws {@link InvalidCredentialError} for an
 * empty value, more than 256 UTF-8 bytes, a control character or a lone surrogate.
 */
export function prepareCredential(field: string, typed: string): string {
  const text = TRIMMED_FIELDS.has(field) ? typed.replace(TRIM, '') : typed;
  checkCredentialText(text);
  return text;
}

/** The plaintext rules on a string, returning its UTF-8 bytes. */
function checkCredentialText(text: string): Uint8Array {
  if (typeof text !== 'string' || text.length === 0) {
    throw new InvalidCredentialError('empty');
  }
  // TextEncoder would turn a lone surrogate into U+FFFD: seal what was typed, or nothing.
  if (LONE_SURROGATE.test(text)) {
    throw new InvalidCredentialError('invalid_text');
  }
  if (CONTROL.test(text)) {
    throw new InvalidCredentialError('control_character');
  }
  const bytes = encoder.encode(text);
  if (bytes.length > MAX_BYTES) {
    throw new InvalidCredentialError('too_long');
  }
  return bytes;
}

/** `printlog-credential:v1:{bridgeId}:{entryId}:{field}`, numbers in plain decimal. */
export function associatedData(
  bridgeId: number,
  entryId: number,
  field: string
): string {
  if (
    !isId(bridgeId) ||
    !isId(entryId) ||
    !(CREDENTIAL_FIELDS as readonly string[]).includes(field)
  ) {
    throw new CredentialSealingError('invalid_target');
  }
  return `printlog-credential:v1:${bridgeId}:${entryId}:${field}`;
}

function isId(n: number): boolean {
  return Number.isSafeInteger(n) && n > 0;
}

/**
 * Imports the bridge's `publicKey` (standard padded base64 of the 91-byte DER SPKI of an
 * uncompressed P-256 point) and computes its fingerprint over exactly those bytes. Throws
 * {@link CredentialSealingError} `invalid_key` for anything else, PEM, base64url, a compressed
 * point, another curve, trailing bytes or a point off the curve included.
 */
export async function importBridgeKey(spkiBase64: string): Promise<BridgeKey> {
  const s = subtle();
  if (typeof spkiBase64 !== 'string' || !SPKI_BASE64.test(spkiBase64)) {
    throw new CredentialSealingError('invalid_key');
  }
  const spki = fromBase64(spkiBase64);
  // Canonical only: the unused bits before the padding must be zero.
  if (spki.length !== SPKI_BYTES || toBase64(spki) !== spkiBase64) {
    throw new CredentialSealingError('invalid_key');
  }
  let key: CryptoKey;
  let raw: Uint8Array;
  try {
    key = await s.importKey('spki', spki, P256, true, []);
    raw = new Uint8Array(await s.exportKey('raw', key));
  } catch {
    throw new CredentialSealingError('invalid_key');
  }
  if (raw.length !== 65 || raw[0] !== 0x04 || !onCurve(raw)) {
    throw new CredentialSealingError('invalid_key');
  }
  // The point must be the one in the SPKI bytes we fingerprint.
  if (!equalBytes(raw, spki.subarray(SPKI_BYTES - 65))) {
    throw new CredentialSealingError('invalid_key');
  }
  const fingerprint = toHex(new Uint8Array(await s.digest('SHA-256', spki)));
  return { spki, raw, key, fingerprint };
}

/**
 * Seals `plaintext` (already {@link prepareCredential prepared}: it is not trimmed here, only
 * checked again) to the bridge key for one entry's field.
 */
export async function sealCredential(
  bridgeKey: BridgeKey,
  target: SealTarget,
  plaintext: string,
  randomness: SealRandomness = webCryptoRandomness
): Promise<SealedCredential> {
  const s = subtle();
  const ad = encoder.encode(
    associatedData(target.bridgeId, target.entryId, target.field)
  );
  const pt = checkCredentialText(plaintext);

  const eph = await randomness.ephemeralKeyPair();
  const ephRaw = new Uint8Array(await s.exportKey('raw', eph.publicKey));
  const shared = await s.deriveBits(
    { name: 'ECDH', public: bridgeKey.key },
    eph.privateKey,
    256
  );
  const ikm = await s.importKey('raw', shared, 'HKDF', false, ['deriveKey']);
  const salt = concat(ephRaw, bridgeKey.raw);
  const aes = await s.deriveKey(
    { name: 'HKDF', hash: 'SHA-256', salt, info: HKDF_INFO },
    ikm,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  const nonce = randomness.nonce();
  if (nonce.length !== 12 || ephRaw.length !== 65) {
    throw new CredentialSealingError('unavailable');
  }
  const ct = new Uint8Array(
    await s.encrypt(
      {
        name: 'AES-GCM',
        iv: copy(nonce),
        additionalData: ad,
        tagLength: 128,
      },
      aes,
      copy(pt)
    )
  );
  return {
    sealed: 'v1.' + toBase64Url(concat(ephRaw, nonce, ct)),
    keyFingerprint: bridgeKey.fingerprint,
  };
}

/** The first 16 hex characters in groups of four, as the bridge shows them: `aed0 3e9a 8282 33b2`. */
export function shortFingerprint(fingerprint: string): string {
  return groupedFingerprint(fingerprint.slice(0, 16));
}

/** The whole fingerprint in groups of four. */
export function groupedFingerprint(fingerprint: string): string {
  return (fingerprint.match(/.{1,4}/g) ?? []).join(' ');
}

// --- P-256 point check -------------------------------------------------------------------------
// WebCrypto implementations validate imported points, but the contract requires refusing a point
// off the curve, so check it here too rather than trust every engine.

const P = BigInt(
  '0xffffffff00000001000000000000000000000000ffffffffffffffffffffffff'
);
const B = BigInt(
  '0x5ac635d8aa3a93e7b3ebbd55769886bc651d06b0cc53b0f63bce3c3e27d2604b'
);

function onCurve(raw: Uint8Array): boolean {
  const x = BigInt('0x' + toHex(raw.subarray(1, 33)));
  const y = BigInt('0x' + toHex(raw.subarray(33, 65)));
  if (x >= P || y >= P) {
    return false;
  }
  const mod = (n: bigint) => ((n % P) + P) % P;
  return mod(y * y) === mod(x * x * x - BigInt(3) * x + B);
}

// --- bytes ---------------------------------------------------------------------------------------

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

function copy(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  return new Uint8Array(bytes);
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function fromBase64(s: string): Uint8Array<ArrayBuffer> {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return toBase64(bytes)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
