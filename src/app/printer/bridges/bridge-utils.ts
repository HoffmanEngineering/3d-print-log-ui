import { HttpErrorResponse } from '@angular/common/http';
import { Bridge } from 'src/app/core/services/bridges.service';
import {
  BRIDGE_SETUPS,
  BridgeSetupKind,
} from '../printer-connections/bridge-setup';

/**
 * The printer types a bridge can watch (the bridge has adapters for these; OctoPrint and SDCP
 * come with their adapters), with the labels the printer page's setup uses.
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
        ? `That printer is already watched by “${other}”. A printer can have one bridge at a time: disconnect it there first.`
        : 'That printer is already watched by another of your bridges. A printer can have one bridge at a time: disconnect it there first.';
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
  }
  if (error instanceof HttpErrorResponse && error.status === 404) {
    return 'That bridge is gone: it was revoked or removed. Refresh the page.';
  }
  return 'Something went wrong. Please try again.';
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
 * keyed by the app entry's id, until the app can send it encrypted (printlog-bridge story 14).
 * Null for a kind that needs none by default (a Moonraker without `[authorization]`).
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
    default:
      return null;
  }
}

/** What the credential in the snippet is called, for the sentence around it. */
export function credentialName(kind: string): string {
  return kind === 'bambu' ? 'access code' : 'password';
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
