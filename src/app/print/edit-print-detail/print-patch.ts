import {
  PatchPrintDTO,
  PrintClearableField,
  PrintDetail,
  PrintFilamentSummaryDto,
  toPutPrintFilamentSummary,
} from 'src/app/core/services/print.service';

type EditablePrint = Omit<PrintDetail, 'comments'>;

/**
 * The PATCH body that turns `loaded` into `edited`: only the fields the user changed (#263).
 *
 * Both sides should come from the same place (the edit form's `getPrintFromForm`), so that a
 * value the form merely reformats -- a duration it rounds, a date it shows to the second --
 * compares equal and is not sent. Anything not sent keeps whatever the server holds now, which
 * is what stops a stale form from reverting a connector's completion.
 *
 * - A field emptied by the user goes in `clear`, since PATCH reads null as "keep".
 * - `filamentUsage` is all or nothing: sending it replaces every row, so it is sent only when
 *   a row was added, removed, reordered or edited. Each row carries `actualIsEstimate` back, or
 *   the API resets it (api#282), except a row whose actual figure the user changed: that one is
 *   now a measurement.
 * - Legacy (`filamentType`, `filamentUsageMg`, `estimatedFilamentUsageMg`) and read-only fields
 *   (external source, `curaSettingId`) are never sent.
 * - `newProjectName` is not handled here: PATCH cannot create a project, so the caller creates
 *   it first and passes its id as `projectId`.
 */
export function buildPrintPatch(
  loaded: EditablePrint,
  edited: EditablePrint
): PatchPrintDTO {
  const patch: PatchPrintDTO = {};
  const clear: PrintClearableField[] = [];

  // Required fields: never cleared, and a null edit (an unset control) is not something PATCH
  // can express, so it is left alone.
  if (edited.title != null && edited.title !== loaded.title) {
    patch.title = edited.title;
  }
  if (edited.status != null && edited.status !== loaded.status) {
    patch.status = edited.status;
  }
  if (edited.printerId != null && edited.printerId !== loaded.printerId) {
    patch.printerId = edited.printerId;
  }
  if (edited.viewStatus != null && edited.viewStatus !== loaded.viewStatus) {
    patch.viewStatus = edited.viewStatus;
  }
  if (
    edited.allowComments != null &&
    edited.allowComments !== loaded.allowComments
  ) {
    patch.allowComments = edited.allowComments;
  }
  if (
    edited.allowFileDownloads != null &&
    edited.allowFileDownloads !== (loaded.allowFileDownloads ?? false)
  ) {
    patch.allowFileDownloads = edited.allowFileDownloads;
  }

  // Start date: the form keeps whole seconds, so compare at that precision.
  const loadedStart = toWholeSeconds(loaded.startDate);
  const editedStart = toWholeSeconds(edited.startDate);
  if (editedStart === null) {
    if (loadedStart !== null) {
      clear.push('startDate');
    }
  } else if (editedStart !== loadedStart) {
    patch.startDate = new Date(edited.startDate as Date | string);
  }

  diffNumber(
    'estimatedPrintTimeInSeconds',
    loaded.estimatedPrintTimeInSeconds,
    edited.estimatedPrintTimeInSeconds
  );
  diffNumber(
    'printTimeInSeconds',
    loaded.printTimeInSeconds,
    edited.printTimeInSeconds
  );

  diffText('notes', loaded.notes, edited.notes);
  diffText('url', loaded.url, edited.url);
  diffText('fileName', loaded.fileName, edited.fileName);
  diffText('projectId', loaded.projectId, edited.projectId);

  const loadedUsage = (loaded.filamentUsage ?? []).map(
    toPutPrintFilamentSummary
  );
  const loadedRows = new Map(
    (loaded.filamentUsage ?? [])
      .filter((row) => row.id != null)
      .map((row) => [row.id, row])
  );
  const editedUsage = (edited.filamentUsage ?? []).map((row) => {
    const put = toPutPrintFilamentSummary(row);
    // What the user typed over an estimate is a measurement.
    const before = row.id != null ? loadedRows.get(row.id) : undefined;
    if (put.actualIsEstimate && (!before || actualFigureChanged(before, row))) {
      put.actualIsEstimate = false;
    }
    return put;
  });
  if (JSON.stringify(loadedUsage) !== JSON.stringify(editedUsage)) {
    patch.filamentUsage = editedUsage;
  }

  if (clear.length > 0) {
    patch.clear = clear;
  }

  return patch;

  function diffNumber(
    field: 'estimatedPrintTimeInSeconds' | 'printTimeInSeconds',
    before: number | null | undefined,
    after: number | null | undefined
  ): void {
    if (after == null) {
      if (before != null) {
        clear.push(field);
      }
    } else if (after !== before) {
      patch[field] = after;
    }
  }

  function diffText(
    field: 'notes' | 'url' | 'fileName' | 'projectId',
    before: string | null | undefined,
    after: string | null | undefined
  ): void {
    // An empty input and a missing value are the same to the user.
    const was = before || null;
    const now = after || null;
    if (now === was) {
      return;
    }
    if (now === null) {
      clear.push(field);
    } else {
      patch[field] = now;
    }
  }
}

function actualFigureChanged(
  before: PrintFilamentSummaryDto,
  after: PrintFilamentSummaryDto
): boolean {
  return (
    before.source !== after.source ||
    (before.amountMg ?? null) !== (after.amountMg ?? null) ||
    (before.lengthInM ?? null) !== (after.lengthInM ?? null) ||
    (before.volumeMl ?? null) !== (after.volumeMl ?? null)
  );
}

function toWholeSeconds(
  value: Date | string | null | undefined
): number | null {
  if (value == null || value === '') {
    return null;
  }
  const ms = new Date(value).getTime();
  return isNaN(ms) ? null : Math.floor(ms / 1000);
}
