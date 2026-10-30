import { HttpErrorResponse } from '@angular/common/http';
import { Bridge, BridgePrinter } from 'src/app/core/services/bridges.service';
import {
  BRIDGE_SETUPS,
  BridgeSetupKind,
} from '../printer-connections/bridge-setup';

/**
 * The printer types a bridge can watch (the bridge has adapters for these), with the labels the
 * printer page's setup uses.
 */
export const BRIDGE_KINDS = BRIDGE_SETUPS.map(({ kind, label }) => ({
  kind,
  label,
}));

/** True for a kind the bridge can watch, so the app may offer Connect for it. */
export function isConnectableKind(kind: string): kind is BridgeSetupKind {
  return BRIDGE_KINDS.some((k) => k.kind === kind);
}

/** The `code` of an API problem, or null. */
export function bridgeErrorCode(error: unknown): string | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const body = error.error as { code?: unknown } | null;
  return typeof body?.code === 'string' ? body.code : null;
}

function otherBridgeId(error: unknown): number | null {
  if (!(error instanceof HttpErrorResponse)) {
    return null;
  }
  const id = (error.error as { bridgeId?: unknown } | null)?.bridgeId;
  return typeof id === 'number' ? id : null;
}

/**
 * A sentence for a failed Bridges request. `nameOf` turns the problem's `bridgeId` into that
 * bridge's name, so a conflict says which bridge has the printer.
 */
export function bridgeErrorMessage(
  error: unknown,
  nameOf: (bridgeId: number) => string | null
): string {
  const otherId = otherBridgeId(error);
  const other = otherId === null ? null : nameOf(otherId);
  switch (bridgeErrorCode(error)) {
    case 'printer_connected_elsewhere':
      return other
        ? `That printer is already watched by “${other}”. A printer can have one bridge at a time: Move it to this bridge instead.`
        : 'That printer is already watched by another of your bridges. A printer can have one bridge at a time: Move it to this bridge from its row there.';
    case 'printer_moved':
      return other
        ? `That printer was just moved to “${other}”. Refresh the page to see where it is now.`
        : 'That printer was just moved to another bridge. Refresh the page to see where it is now.';
    case 'invalid_target_bridge':
      return 'Pick another of your bridges to move it to.';
    case 'secrets_required': {
      const fields = problemFields(error);
      const nouns = fields.length
        ? fields.map(credentialNoun).join(' and the ')
        : 'credentials';
      return `Enter the ${nouns}: the new bridge needs it to watch the printer.`;
    }
    case 'printer_configured_on_bridge':
      return other
        ? `“${other}” already watches this printer from its config file. Remove it from that file first, or leave it there.`
        : 'One of your bridges already watches this printer from its config file. Remove it from that file first, or leave it there.';
    case 'printer_already_connected':
      return 'That 3D Print Log printer is already connected to this bridge.';
    case 'discovered_printer_already_connected':
      return 'This bridge already watches a printer at that address. Disconnect that one first.';
    case 'bridge_printer_limit':
      return 'This bridge already watches 50 printers, the most one bridge can. Disconnect one, or connect this printer to another bridge.';
    case 'ignore_limit':
      return 'This bridge already has 200 ignored printers. Unignore some first.';
    case 'printer_not_found':
      return 'That 3D Print Log printer no longer exists. Pick another one.';
    case 'discovered_printer_not_found':
      return 'The bridge no longer sees that printer. Refresh, or add it by address.';
    case 'invalid_kind':
      return 'Pick the kind of printer.';
    case 'invalid_host':
      return 'Enter a private IP address (such as 192.168.1.60) or a local name (such as mk4.local).';
    case 'invalid_port':
      return 'The port must be a number from 1 to 65535.';
    case 'invalid_serial':
      return 'The serial can only have letters, digits and . _ : -';
    case 'serial_required':
      return 'A Bambu Lab printer needs its serial number.';
    case 'invalid_request':
      return 'Names can be up to 100 characters, with no line breaks.';
    // Sealed credentials (docs/bridge-credential-sealing.md in the API repo). A problem may carry
    // the API's idea of the key's fingerprint; it is never shown or reused.
    case 'invalid_secret_field':
      return "This printer doesn't take that credential. Refresh the page.";
    case 'invalid_sealed_value':
    case 'invalid_key_fingerprint':
      return "3D Print Log couldn't store the encrypted value. Refresh the page and enter it again.";
    case 'bridge_key_missing':
      return "This bridge hasn't reported an encryption key, so it can't take credentials from the app yet. Update printlog-bridge, or add the credential to its config file.";
    case 'bridge_key_unconfirmed':
      return 'This bridge reported a new encryption key. Compare its fingerprint and confirm it on its card, then enter the credential again.';
    case 'bridge_key_changed':
      return "This bridge's encryption key changed. Check the fingerprint on its card, then enter the credential again.";
    case 'no_pending_key':
      return 'There is no new key to confirm any more. The bridge has been reloaded.';
    case 'pending_key_changed':
      return 'The bridge reported another key since you loaded this page. Compare the new fingerprint with the bridge before you confirm it.';
  }
  if (error instanceof HttpErrorResponse && error.status === 404) {
    return 'That bridge is gone: it was revoked or removed. Refresh the page.';
  }
  return 'Something went wrong. Please try again.';
}

/**
 * A sealing problem that means the bridge's key isn't what the app sealed to: reload the bridge
 * and ask again, never retry with anything from the response.
 */
export function isKeyErrorCode(code: string | null): boolean {
  return (
    code === 'bridge_key_changed' ||
    code === 'bridge_key_unconfirmed' ||
    code === 'bridge_key_missing'
  );
}

/** The `fields` of an API problem (`secrets_required`), or none. */
export function problemFields(error: unknown): string[] {
  if (!(error instanceof HttpErrorResponse)) {
    return [];
  }
  const fields = (error.error as { fields?: unknown } | null)?.fields;
  return Array.isArray(fields)
    ? fields.filter((f): f is string => typeof f === 'string')
    : [];
}

/**
 * The credentials a move must carry when one of them was set, as groups of which one value is
 * enough (the API's `SealedCredentials.CarriedGroups`): what the printer can't connect without,
 * and a Moonraker API key (set only for a Moonraker with `[authorization]`).
 */
const CARRIED_GROUPS: Readonly<Record<string, readonly string[][]>> = {
  bambu: [['access_code']],
  prusalink: [['password', 'api_key']],
  octoprint: [['api_key']],
  moonraker: [['moonraker_api_key']],
};

/** One credential to type again for a move. */
export interface MoveField {
  field: string;
  label: string;
  hint: string | null;
  /** The only value of a group the printer needs. */
  required: boolean;
}

/** What a move asks for: the fields that were set, and the groups that need one value each. */
export interface MoveCredentialPlan {
  fields: MoveField[];
  groups: string[][];
}

/**
 * The credentials to ask for when moving an entry: each field that was set on the old bridge
 * (the browser can't read those values, and the new bridge can't open them), plus any field the
 * API said it needs. A field outside the required groups (a PrusaLink user name) is optional;
 * left empty, it is dropped.
 */
export function moveCredentialPlan(
  kind: string,
  secretFields: readonly string[] | null | undefined,
  setFields: readonly string[],
  askedFor: readonly string[] = []
): MoveCredentialPlan {
  const set = new Set([...setFields, ...askedFor]);
  const order = [...(secretFields ?? [])];
  for (const field of set) {
    if (!order.includes(field)) {
      order.push(field);
    }
  }
  const groups = (CARRIED_GROUPS[kind] ?? [])
    .map((group) => group.filter((f) => set.has(f)))
    .filter((group) => group.length > 0);
  const fields = order
    .filter((field) => set.has(field))
    .map((field) => ({
      field,
      label: credentialFieldLabel(field),
      hint: credentialFieldHint(kind, field),
      required: groups.some((g) => g.length === 1 && g[0] === field),
    }));
  return { fields, groups };
}

/** Why the values typed for a move aren't enough, or null. */
export function missingMoveCredential(
  plan: MoveCredentialPlan,
  filled: ReadonlySet<string>
): string | null {
  const missing = plan.groups.find((g) => !g.some((f) => filled.has(f)));
  if (!missing) {
    return null;
  }
  return `Enter the ${missing.map(credentialNoun).join(' or the ')}: the new bridge needs it to watch the printer.`;
}

/** A credential field's label, as a heading or form label. */
export function credentialFieldLabel(field: string): string {
  switch (field) {
    case 'access_code':
      return 'Access code';
    case 'password':
      return 'Password';
    case 'username':
      return 'Username';
    case 'api_key':
    case 'moonraker_api_key':
      return 'API key';
    default:
      return field;
  }
}

/** The field inside a sentence: "the access code", "the API key". */
export function credentialNoun(field: string): string {
  const label = credentialFieldLabel(field);
  return label.startsWith('API') ? label : label.toLowerCase();
}

/** Where the user finds the value, under its input. */
export function credentialFieldHint(
  kind: string,
  field: string
): string | null {
  switch (`${kind}:${field}`) {
    case 'bambu:access_code':
      return "On the printer's screen, with LAN Only Mode (8 characters).";
    case 'prusalink:password':
      return 'On the printer under Settings > Network > PrusaLink.';
    case 'prusalink:username':
      return "Only when it isn't maker.";
    case 'prusalink:api_key':
      return 'Only for a printer set up with an API key instead of a password.';
    case 'moonraker:moonraker_api_key':
      return 'Only when Moonraker uses [authorization].';
    case 'octoprint:api_key':
      return 'In OctoPrint under Settings > Application Keys.';
    default:
      return null;
  }
}

/** What the bridge reported about one field (`credentialIssues`), in plain words. */
export function credentialIssueMessage(
  kind: string,
  field: string,
  code: string
): string {
  const noun = credentialNoun(field);
  switch (code) {
    case 'missing':
      return kind === 'prusalink' && field === 'password'
        ? 'The bridge needs the password (or an API key) and has none it can use.'
        : `The bridge needs the ${noun} and has none it can use.`;
    case 'undecryptable':
      return `The bridge couldn't decrypt the ${noun}. Enter it again.`;
    case 'invalid_plaintext':
      return `The bridge decrypted the ${noun}, but it isn't valid. Enter it again.`;
    case 'rejected_by_printer':
      if (kind === 'bambu' && field === 'access_code') {
        return "The printer refused this access code. Check it on the printer's screen: it changes when LAN Only Mode is turned off and on.";
      }
      return `The printer refused this ${noun}. Check it and enter it again.`;
    default:
      return `The bridge reported a problem with the ${noun}.`;
  }
}

/**
 * One line about an entry's credentials for its row on the card, or null for a kind that takes
 * none (or an API that doesn't list them). `attention` when the user needs to act.
 */
export function credentialSummary(
  entry: Pick<
    BridgePrinter,
    'kind' | 'secretFields' | 'secrets' | 'credentialIssues'
  >
): { text: string; attention: boolean } | null {
  const fields = entry.secretFields ?? [];
  if (fields.length === 0) {
    return null;
  }
  const issue = entry.credentialIssues?.find((i) => fields.includes(i.field));
  if (issue) {
    return {
      text: credentialIssueMessage(entry.kind, issue.field, issue.code),
      attention: true,
    };
  }
  const secrets = (entry.secrets ?? []).filter((s) => fields.includes(s.field));
  const stale = secrets.find((s) => s.stale);
  if (stale) {
    return {
      text: `Enter the ${credentialNoun(stale.field)} again: the bridge's encryption key changed.`,
      attention: true,
    };
  }
  if (secrets.length === 0) {
    return {
      text:
        fields.length === 1
          ? `No ${credentialNoun(fields[0])} entered in the app.`
          : 'No credentials entered in the app.',
      attention: false,
    };
  }
  const labels = fields
    .filter((f) => secrets.some((s) => s.field === f))
    .map((f, i) => (i === 0 ? credentialFieldLabel(f) : credentialNoun(f)));
  return {
    text: `${labels.join(' and ')} set, encrypted to the bridge.`,
    attention: false,
  };
}

/** Why what the user typed can't be sealed. Never repeats the value. */
export function credentialProblemMessage(
  reason: 'empty' | 'too_long' | 'control_character' | 'invalid_text',
  field: string
): string {
  const noun = credentialNoun(field);
  switch (reason) {
    case 'empty':
      return `Enter the ${noun}.`;
    case 'too_long':
      return `That's too long: the ${noun} can be up to 256 bytes.`;
    case 'control_character':
      return 'That contains a line break, tab or other control character. Type it again without one.';
    case 'invalid_text':
      return "That contains a character that can't be sent. Type it again.";
  }
}

/**
 * The bridge is sweeping: "Scan now" was asked for after its last finished sweep. The bridge
 * picks the request up within a minute and checks in right after the sweep.
 */
export function isScanning(
  bridge: Pick<Bridge, 'scanRequestedAt' | 'lastSweepAt'>
): boolean {
  if (!bridge.scanRequestedAt) {
    return false;
  }
  if (!bridge.lastSweepAt) {
    return true;
  }
  return Date.parse(bridge.scanRequestedAt) > Date.parse(bridge.lastSweepAt);
}

/**
 * The section the user adds to the bridge's config for a printer that needs a LAN credential,
 * keyed by the app entry's id: the fallback for a bridge the app can't seal to (one with no
 * confirmed key, an older release). A value there wins over one sealed in the app.
 * Null for a kind that needs none by default (a Moonraker without `[authorization]`, or SDCP,
 * which has no authentication).
 */
export function appPrinterSnippet(
  kind: string,
  entryId: number
): string | null {
  switch (kind) {
    case 'bambu':
      return [`[app_printer ${entryId}]`, 'access_code = 12345678'].join('\n');
    case 'prusalink':
      return [
        `[app_printer ${entryId}]`,
        'password = the-password-the-printer-shows',
      ].join('\n');
    case 'octoprint':
      return [
        `[app_printer ${entryId}]`,
        'api_key = a-key-from-octoprint',
      ].join('\n');
    default:
      return null;
  }
}

/** What the credential in the snippet is called, for the sentence around it. */
export function credentialName(kind: string): string {
  switch (kind) {
    case 'bambu':
      return 'access code';
    case 'octoprint':
      return 'API key';
    default:
      return 'password';
  }
}

/** Where the user finds the credential in the snippet, to follow its name in a sentence. */
export function credentialSource(kind: string): string {
  switch (kind) {
    case 'bambu':
      return "from the printer's LAN Only Mode page";
    case 'octoprint':
      return "from OctoPrint's Settings > Application Keys";
    default:
      return "from the printer's Settings > Network > PrusaLink screen";
  }
}

/** `host:port`, with brackets around an IPv6 address; the host alone without a port. */
export function formatAddress(host: string, port: number | null): string {
  if (port == null) {
    return host;
  }
  return host.includes(':') ? `[${host}]:${port}` : `${host}:${port}`;
}

/** What a bridge is called on screen. */
export function bridgeLabel(bridge: Bridge): string {
  return (
    bridge.displayName?.trim() ||
    bridge.deviceName?.trim() ||
    bridge.hostName?.trim() ||
    'printlog-bridge'
  );
}
