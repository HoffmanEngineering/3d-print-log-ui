import { HttpErrorResponse } from '@angular/common/http';
import { MAX_TAG_UIDS, normalizeTagUid, readTagUidConflict } from './tag-uid';

describe('normalizeTagUid', () => {
  it('accepts colon, dash, dot, underscore and space separators in any case', () => {
    for (const raw of [
      '04:A2:3f:11',
      '04-a2-3f-11',
      '04.a2.3F.11',
      '04_A2_3F_11',
      ' 04 a2 3f 11 ',
      '04A23F11',
    ]) {
      expect(normalizeTagUid(raw)).toEqual({ ok: true, uid: '04A23F11' });
    }
  });

  it('rejects an empty value', () => {
    expect(normalizeTagUid('  :: ').ok).toBe(false);
  });

  it('rejects non-hex characters', () => {
    const result = normalizeTagUid('04:G2:3F:11');
    expect(result.ok).toBe(false);
  });

  it('rejects a 0x prefix rather than guessing at it', () => {
    expect(normalizeTagUid('0x04A23F11').ok).toBe(false);
  });

  it('rejects an odd number of hex digits', () => {
    const result = normalizeTagUid('04A23F1');
    expect(result).toEqual({
      ok: false,
      error: 'A tag UID must be whole bytes (an even number of hex digits).',
    });
  });

  it('accepts 64 hex digits and rejects 66', () => {
    expect(normalizeTagUid('AB'.repeat(32)).ok).toBe(true);
    expect(normalizeTagUid('AB'.repeat(33)).ok).toBe(false);
  });

  it('matches the API cap of 16 tags per spool', () => {
    expect(MAX_TAG_UIDS).toBe(16);
  });
});

describe('readTagUidConflict', () => {
  const conflictBody = {
    type: 'about:blank',
    title: 'Tag already assigned',
    status: 409,
    detail: 'Tag 04A23F11 is already on "Blue PLA".',
    tagUid: '04A23F11',
    filamentId: 'other-spool',
    filamentDisplayName: 'Blue PLA',
  };

  it('reads the spool that holds the tag from a 409 problem body', () => {
    const err = new HttpErrorResponse({ status: 409, error: conflictBody });

    expect(readTagUidConflict(err)).toEqual({
      tagUid: '04A23F11',
      filamentId: 'other-spool',
      filamentDisplayName: 'Blue PLA',
    });
  });

  it('returns null for a 409 without the tag fields', () => {
    const err = new HttpErrorResponse({
      status: 409,
      error: { title: 'Conflict' },
    });

    expect(readTagUidConflict(err)).toBeNull();
  });

  it('returns null for any other status', () => {
    const err = new HttpErrorResponse({ status: 400, error: conflictBody });

    expect(readTagUidConflict(err)).toBeNull();
  });

  it('returns null for a non-HTTP error', () => {
    expect(readTagUidConflict(new Error('boom'))).toBeNull();
  });
});
