import { HttpErrorResponse } from '@angular/common/http';

/** The API's cap on tags per spool. */
export const MAX_TAG_UIDS = 16;

/** The API's cap on a normalized UID: 32 bytes. */
const MAX_TAG_UID_HEX_DIGITS = 64;

/** The spool that already holds a tag, from the API's 409 problem body. */
export interface TagUidConflict {
  tagUid: string;
  filamentId: string;
  filamentDisplayName: string;
}

export type TagUidResult =
  | { ok: true; uid: string }
  | { ok: false; error: string };

/**
 * Mirrors the API's `TagUid.Normalize`, so a bad UID is caught here rather
 * than by a 400 on save: strips `:` `-` `.` `_` and whitespace, uppercases,
 * then requires hex, whole bytes, and at most 64 hex digits. A `0x` prefix
 * fails the hex check on purpose; the API rejects it rather than guessing.
 */
export function normalizeTagUid(raw: string): TagUidResult {
  const uid = (raw ?? '').replace(/[:\-._\s]/g, '').toUpperCase();

  if (uid === '') {
    return { ok: false, error: 'Enter a tag UID.' };
  }
  if (!/^[0-9A-F]+$/.test(uid)) {
    return {
      ok: false,
      error:
        'A tag UID is hex digits (0-9, A-F), optionally separated by colons or dashes.',
    };
  }
  if (uid.length % 2 !== 0) {
    return {
      ok: false,
      error: 'A tag UID must be whole bytes (an even number of hex digits).',
    };
  }
  if (uid.length > MAX_TAG_UID_HEX_DIGITS) {
    return {
      ok: false,
      error: `A tag UID can be at most ${MAX_TAG_UID_HEX_DIGITS} hex digits.`,
    };
  }
  return { ok: true, uid };
}

/**
 * The spool named by a 409 from POST/PUT /api/Filaments, or null when the
 * error is anything else.
 */
export function readTagUidConflict(err: unknown): TagUidConflict | null {
  if (!(err instanceof HttpErrorResponse) || err.status !== 409) {
    return null;
  }

  const body = err.error as Partial<TagUidConflict> | null;
  if (
    typeof body?.tagUid !== 'string' ||
    typeof body?.filamentId !== 'string'
  ) {
    return null;
  }

  return {
    tagUid: body.tagUid,
    filamentId: body.filamentId,
    filamentDisplayName:
      typeof body.filamentDisplayName === 'string' &&
      body.filamentDisplayName !== ''
        ? body.filamentDisplayName
        : 'another material',
  };
}

/** What to tell the user when a tag can't be added because another spool already has it. */
export function tagUidConflictMessage(
  uid: string,
  conflict: TagUidConflict
): string {
  return `Tag ${uid} is already on ${conflict.filamentDisplayName}, so it wasn't added here.`;
}
