// The vectors are a byte-identical copy of 3d-print-log-api's
// docs/bridge-credential-sealing.vectors.json at commit 0db10aad16df229764a658063734ef2c380906ce
// (api#289). They are a contract with the API and printlog-bridge: never edit them here; copy the
// file again when the API changes it.
import vectorsFile from '../../../../tests-fixtures/bridge-credential-sealing.vectors.json';
import {
  BridgeKey,
  CredentialSealingError,
  InvalidCredentialError,
  SealRandomness,
  associatedData,
  groupedFingerprint,
  importBridgeKey,
  prepareCredential,
  sealCredential,
  shortFingerprint,
} from './credential-sealing';
import {
  CredentialDidNotOpen,
  fromHex,
  openCredential,
  toBase64Url,
  toHex,
} from './credential-sealing.testing';

interface Vector {
  bridgeId: number;
  entryId: number;
  field: string;
  plaintext: string;
  plaintextUtf8Hex: string;
  associatedData: string;
  ephemeralPrivateKeyHex: string;
  ephemeralPublicKeyHex: string;
  nonceHex: string;
  sealed: string;
  typed?: string;
  note?: string;
}

interface MustNotOpen {
  sealed: string;
  associatedData: string;
  why: string;
  reason: 'authentication' | 'plaintext';
}

const file = vectorsFile as unknown as {
  recipient: {
    privateKeyPkcs8Base64: string;
    publicKeyRawHex: string;
    publicKey: string;
    fingerprint: string;
  };
  vectors: Vector[];
  mustNotOpen: MustNotOpen[];
  invalidPublicKeys: {
    value: string;
    why: string;
  }[];
  invalidSealedValues: {
    value: string;
    why: string;
  }[];
};
const recipient = file.recipient;
const P256 = { name: 'ECDH', namedCurve: 'P-256' } as const;

/** The vector's fixed ephemeral key and nonce, through the same seam the app's randomness uses. */
async function fixedRandomness(v: Vector): Promise<SealRandomness> {
  const pub = fromHex(v.ephemeralPublicKeyHex);
  const jwk: JsonWebKey = {
    kty: 'EC',
    crv: 'P-256',
    x: toBase64Url(pub.slice(1, 33)),
    y: toBase64Url(pub.slice(33)),
    ext: true,
  };
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    { ...jwk, d: toBase64Url(fromHex(v.ephemeralPrivateKeyHex)) },
    P256,
    false,
    ['deriveBits']
  );
  const publicKey = await crypto.subtle.importKey('jwk', jwk, P256, true, []);
  return {
    ephemeralKeyPair: () => Promise.resolve({ privateKey, publicKey }),
    nonce: () => fromHex(v.nonceHex),
  };
}

function open(sealed: string, ad: string): Promise<string> {
  return openCredential(
    recipient.privateKeyPkcs8Base64,
    fromHex(recipient.publicKeyRawHex),
    sealed,
    ad
  );
}

async function rejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  return null;
}

describe('credential sealing (printlog-credential v1)', () => {
  let key: BridgeKey;

  beforeAll(async () => {
    key = await importBridgeKey(recipient.publicKey);
  });

  it('runs against the full vectors file', () => {
    expect(file.vectors.length).toBe(7);
    expect(file.mustNotOpen.length).toBe(11);
    expect(file.invalidPublicKeys.length).toBe(11);
    expect(file.invalidSealedValues.length).toBe(12);
    expect(file.vectors.filter((v) => 'typed' in v).length).toBe(3);
  });

  describe('the bridge key', () => {
    it('computes the fingerprint over the exact SPKI bytes', () => {
      expect(key.fingerprint).toBe(recipient.fingerprint);
      expect(toHex(key.raw)).toBe(recipient.publicKeyRawHex);
      expect(key.spki.length).toBe(91);
    });

    it('shows the first 16 hex characters in groups of four, like the bridge', () => {
      expect(shortFingerprint(key.fingerprint)).toBe('aed0 3e9a 8282 33b2');
      expect(groupedFingerprint(key.fingerprint)).toBe(
        'aed0 3e9a 8282 33b2 3fce cb8c 9276 42f3 f9dd a453 f301 6d83 14ab fce6 2e64 b38c'
      );
    });

    for (const bad of file.invalidPublicKeys) {
      it(`refuses an invalid public key: ${bad.why}`, async () => {
        const error = await rejection(importBridgeKey(bad.value));
        expect(error).toEqual(expect.any(CredentialSealingError));
        expect((error as CredentialSealingError).reason).toBe('invalid_key');
      });
    }

    it('refuses a key that is not a string', async () => {
      const error = await rejection(importBridgeKey(null as unknown as string));
      expect((error as CredentialSealingError).reason).toBe('invalid_key');
    });

    it('refuses non-canonical base64 (nonzero bits before the padding)', async () => {
      const last = recipient.publicKey.length - 3;
      const tweaked =
        recipient.publicKey.slice(0, last) +
        'R' +
        recipient.publicKey.slice(last + 1);
      expect(recipient.publicKey[last]).toBe('Q');
      const error = await rejection(importBridgeKey(tweaked));
      expect((error as CredentialSealingError).reason).toBe('invalid_key');
    });
  });

  for (const v of file.vectors) {
    describe(`vector ${v.bridgeId}:${v.entryId}:${v.field}${v.note ? ` (${v.note})` : ''}`, () => {
      it('builds the associated data', () => {
        expect(associatedData(v.bridgeId, v.entryId, v.field)).toBe(
          v.associatedData
        );
      });

      it('reseals byte for byte from the fixed ephemeral key and nonce', async () => {
        const result = await sealCredential(
          key,
          { bridgeId: v.bridgeId, entryId: v.entryId, field: v.field },
          v.plaintext,
          await fixedRandomness(v)
        );
        expect(result.sealed).toBe(v.sealed);
        expect(result.keyFingerprint).toBe(recipient.fingerprint);
      });

      it('opens to the plaintext bytes', async () => {
        const opened = await open(v.sealed, v.associatedData);
        expect(opened).toBe(v.plaintext);
        expect(toHex(new TextEncoder().encode(opened))).toBe(
          v.plaintextUtf8Hex
        );
      });

      it('round-trips a fresh seal with a new ephemeral key', async () => {
        const target = {
          bridgeId: v.bridgeId,
          entryId: v.entryId,
          field: v.field,
        };
        const a = await sealCredential(key, target, v.plaintext);
        const b = await sealCredential(key, target, v.plaintext);
        expect(a.sealed).not.toBe(v.sealed);
        expect(a.sealed.slice(0, 90)).not.toBe(b.sealed.slice(0, 90));
        expect(await open(a.sealed, v.associatedData)).toBe(v.plaintext);
        expect(await open(b.sealed, v.associatedData)).toBe(v.plaintext);
      });

      if (v.typed !== undefined) {
        it('prepares what was typed into the plaintext', () => {
          const prepared = prepareCredential(v.field, v.typed!);
          expect(prepared).toBe(v.plaintext);
          expect(toHex(new TextEncoder().encode(prepared))).toBe(
            v.plaintextUtf8Hex
          );
        });
      }
    });
  }

  for (const n of file.mustNotOpen) {
    it(`does not open: ${n.why} (${n.reason})`, async () => {
      const error = await rejection(open(n.sealed, n.associatedData));
      expect(error).toEqual(expect.any(CredentialDidNotOpen));
      expect((error as CredentialDidNotOpen).reason).toBe(n.reason);
    });
  }

  for (const bad of file.invalidSealedValues) {
    it(`refuses an invalid sealed value: ${bad.why}`, async () => {
      const error = await rejection(
        open(bad.value, 'printlog-credential:v1:42:7:access_code')
      );
      expect(error).toEqual(expect.any(CredentialDidNotOpen));
      expect((error as CredentialDidNotOpen).reason).toBe('shape');
    });
  }

  describe('prepareCredential', () => {
    const refused = (field: string, typed: string) => {
      try {
        prepareCredential(field, typed);
      } catch (error) {
        expect(error).toEqual(expect.any(InvalidCredentialError));
        return (error as InvalidCredentialError).reason;
      }
      return null;
    };

    it('trims spaces and no-break spaces from every field but password', () => {
      for (const field of [
        'access_code',
        'username',
        'api_key',
        'moonraker_api_key',
      ]) {
        expect(prepareCredential(field, ' \u00a0ab c\u00a0 ')).toBe('ab c');
      }
      expect(prepareCredential('password', ' \u00a0ab c\u00a0 ')).toBe(
        ' \u00a0ab c\u00a0 '
      );
    });

    it('trims nothing else (an em space stays)', () => {
      expect(prepareCredential('access_code', '\u2003abc\u2003')).toBe(
        '\u2003abc\u2003'
      );
    });

    it('never normalizes', () => {
      expect(prepareCredential('password', 'cafe\u0301')).toBe('cafe\u0301');
      expect(prepareCredential('password', '\ufb01')).toBe('\ufb01');
    });

    it('refuses empty values, also after trimming', () => {
      expect(refused('access_code', '')).toBe('empty');
      expect(refused('access_code', ' \u00a0 ')).toBe('empty');
      expect(refused('password', '')).toBe('empty');
    });

    it('allows 256 UTF-8 bytes and refuses 257', () => {
      expect(prepareCredential('api_key', 'k'.repeat(256)).length).toBe(256);
      expect(refused('api_key', 'k'.repeat(257))).toBe('too_long');
      // 128 two-byte characters are 256 bytes; one more ASCII byte is too many.
      expect(prepareCredential('password', '\u00e4'.repeat(128))).toBe(
        '\u00e4'.repeat(128)
      );
      expect(refused('password', '\u00e4'.repeat(128) + 'x')).toBe('too_long');
    });

    it('refuses C0, DEL and C1 control characters, tab and line feed included', () => {
      for (const c of [
        '\u0000',
        '\t',
        '\n',
        '\r',
        '\u001f',
        '\u007f',
        '\u0080',
        '\u0085',
        '\u009f',
      ]) {
        expect(refused('password', `ab${c}cd`)).toBe('control_character');
      }
      expect(refused('access_code', '1234\n')).toBe('control_character');
    });

    it('refuses a lone surrogate instead of letting TextEncoder replace it', () => {
      expect(refused('password', 'ab\ud800cd')).toBe('invalid_text');
      expect(refused('password', 'ab\udc00')).toBe('invalid_text');
      expect(prepareCredential('password', '\ud83d\udd12')).toBe(
        '\ud83d\udd12'
      );
    });
  });

  describe('sealCredential', () => {
    const target = { bridgeId: 42, entryId: 7, field: 'access_code' };

    it('checks the plaintext again: the bytes are what count', async () => {
      for (const bad of ['', 'a\nb', 'x'.repeat(257), 'a\ud800']) {
        const error = await rejection(sealCredential(key, target, bad));
        expect(error).toEqual(expect.any(InvalidCredentialError));
      }
    });

    it('does not trim: a password keeps its spaces', async () => {
      const t = { ...target, field: 'password' };
      const { sealed } = await sealCredential(key, t, '  pw  ');
      expect(await open(sealed, associatedData(42, 7, 'password'))).toBe(
        '  pw  '
      );
    });

    it('refuses ids that are not positive integers and unknown fields', async () => {
      for (const t of [
        { ...target, bridgeId: 0 },
        { ...target, bridgeId: 4.2 },
        { ...target, entryId: -7 },
        { ...target, entryId: Number.NaN },
        { ...target, field: 'access_code:x' },
        { ...target, field: 'serial' },
      ]) {
        const error = await rejection(sealCredential(key, t, '12345678'));
        expect((error as CredentialSealingError).reason).toBe('invalid_target');
      }
    });

    it('produces the v1 shape: prefix, unpadded base64url, 65 + 12 + n + 16 bytes', async () => {
      const { sealed } = await sealCredential(key, target, '12345678');
      expect(sealed).toMatch(/^v1\.[A-Za-z0-9_-]+$/);
      expect(Math.ceil(((65 + 12 + 8 + 16) * 4) / 3)).toBe(sealed.length - 3);
    });
  });
});
