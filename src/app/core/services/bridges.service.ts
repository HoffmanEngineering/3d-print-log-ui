import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ConnectionStatus } from './connection.service';

/**
 * A paired printlog-bridge that has checked in (`BridgeDto`, 3d-print-log-api#288). Its `id` is
 * also its device grant's id, so it is revoked under Settings > Connected Agents.
 */
export interface Bridge {
  id: number;
  /** What the user named it, or null. */
  name: string | null;
  /** What the bridge calls itself ("printlog-bridge on nas"). */
  deviceName: string | null;
  /** `name`, else `deviceName`. */
  displayName: string | null;
  /** A user label such as "Workshop". */
  location: string | null;
  agentVersion: string | null;
  /** The newest printlog-bridge release, or null when unknown. */
  latestAgentVersion: string | null;
  updateAvailable: boolean;
  /** `local` or `remote`. */
  mode: string | null;
  hostName: string | null;
  /** The private networks it sees, as CIDRs. */
  networks: string[] | null;
  /** Online when it checked in within 15 minutes. */
  status: ConnectionStatus;
  lastSeenAt: string;
  createdAt: string;
  /** When "Scan now" was last asked for. */
  scanRequestedAt: string | null;
  /** When the bridge last finished a scan. */
  lastSweepAt: string | null;
  /** Printers connected to it from the app. */
  printerCount: number;
  /** Connections whose last heartbeat came from it (app or config file). */
  connectionCount: number;
  /** Printers it found, all states. */
  discoveredCount: number;
  /** Found and not connected, configured or ignored. */
  discoveredNotConnectedCount: number;
  /**
   * Its P-256 public key for sealed credentials (padded base64 of the DER SPKI), or null when it
   * has reported none: an older bridge, which can't take credentials from the app. Missing from
   * an API older than api#289.
   *
   * The API also sends `publicKeyFingerprint` and `pendingPublicKeyFingerprint`. They are left
   * out of this type on purpose: the app computes every fingerprint it shows or sends from the
   * key bytes itself (docs/bridge-credential-sealing.md in the API repo), so a key swapped by the
   * server can't hide behind the real bridge's fingerprint.
   */
  publicKey?: string | null;
  /** When `publicKey` became the key values are sealed to. */
  publicKeyChangedAt?: string | null;
  /** A different key the bridge reported since, waiting for the owner to confirm it, or null. */
  pendingPublicKey?: string | null;
  /** When the pending key was first reported. */
  pendingPublicKeyAt?: string | null;
  /**
   * The bridge reported more new keys today than the daily cap, so the API holds the pending key
   * (it stops replacing it) until the UTC day ends.
   */
  keyChangesThrottled?: boolean;
}

/** Where a printer a bridge found stands (`DiscoveredPrinterState`). */
export enum DiscoveredPrinterState {
  /** Found, nothing done with it yet: a suggestion. */
  New = 1,
  /** Connected to this bridge from the app (`printerEntryId`). */
  Connected = 2,
  /** In the bridge's config file: read-only here. Wins over Connected. */
  Configured = 3,
  /** The user asked not to be shown it. */
  Ignored = 4,
}

/** A printer a bridge recognized on its network (`DiscoveredPrinterDto`). */
export interface DiscoveredPrinter {
  id: number;
  /** `moonraker`, `prusalink`, `bambu`, `octoprint` or `sdcp`. */
  kind: string;
  address: string;
  port: number | null;
  model: string | null;
  name: string | null;
  serial: string | null;
  mainboardId: string | null;
  macs: string[] | null;
  identityKey: string | null;
  state: DiscoveredPrinterState;
  /** The app's entry for it, when one matches (Connected, or Configured with an entry too). */
  printerEntryId: number | null;
  firstSeenAt: string;
  lastSeenAt: string;
}

/** A printer the user connected to a bridge in the app (`BridgePrinterDto`). */
export interface BridgePrinter {
  /** The entry's id: the `N` in the bridge's `[app_printer N]` section. */
  id: number;
  /** The 3D Print Log printer its prints are logged to. */
  printerId: number;
  printerName: string | null;
  kind: string;
  host: string;
  /** Null for the adapter's default port. */
  port: number | null;
  serial: string | null;
  identityKey: string | null;
  macs: string[] | null;
  createdAt: string;
  /** The credentials its kind takes, such as `access_code`. Missing from an older API. */
  secretFields?: string[] | null;
  /** Its sealed credentials, without the sealed values (the owner never gets those). */
  secrets?: BridgePrinterSecret[] | null;
  /** What the bridge last reported it can't use. */
  credentialIssues?: CredentialIssue[] | null;
}

/** One sealed credential of an entry, as the owner sees it. */
export interface BridgePrinterSecret {
  field: string;
  /**
   * The fingerprint of the key the API says it was sealed to. Only ever compared with the
   * fingerprint the app computed from the bridge's key; never shown (it is the API's word).
   */
  keyFingerprint: string | null;
  updatedAt: string;
  /** Sealed to a key the bridge no longer has: it isn't sent, and must be entered again. */
  stale: boolean;
}

/**
 * A credential the bridge can't use: `missing`, `undecryptable`, `invalid_plaintext` or
 * `rejected_by_printer`.
 */
export interface CredentialIssue {
  field: string;
  code: string;
}

/** The body of `PUT …/secrets/{field}`. Never the plaintext. */
export interface SetBridgePrinterSecret {
  /** `v1.…`, sealed in the browser to the bridge's `publicKey`. */
  sealed: string;
  /** The fingerprint the app computed over the key bytes it sealed to. */
  keyFingerprint: string;
}

/**
 * The body of a connect: either `discoveredPrinterId` (with optional overrides) or `kind` and
 * `host` for a printer added by address. `printerId` is always required.
 */
export interface ConnectBridgePrinter {
  printerId: number;
  discoveredPrinterId?: number;
  kind?: string;
  host?: string;
  port?: number | null;
  serial?: string | null;
}

/** Null keeps a field; an empty string clears it. */
export interface UpdateBridge {
  name?: string | null;
  location?: string | null;
}

/** The user's bridges, what they found and the printers connected to them. Interactive users only. */
@Injectable({
  providedIn: 'root',
})
export class BridgesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.printLogApiUrl}/api/bridges`;

  /** Oldest first. A paired bridge is listed only after its first check-in. */
  list(): Observable<Bridge[]> {
    return this.http.get<Bridge[]>(this.baseUrl);
  }

  get(id: number): Observable<Bridge> {
    return this.http.get<Bridge>(this.url(id));
  }

  update(id: number, body: UpdateBridge): Observable<Bridge> {
    return this.http.patch<Bridge>(this.url(id), body);
  }

  discovered(id: number): Observable<DiscoveredPrinter[]> {
    return this.http.get<DiscoveredPrinter[]>(
      `${this.url(id)}/discovered-printers`
    );
  }

  ignore(id: number, discoveredId: number): Observable<void> {
    return this.http.post<void>(this.ignoreUrl(id, discoveredId), null);
  }

  unignore(id: number, discoveredId: number): Observable<void> {
    return this.http.delete<void>(this.ignoreUrl(id, discoveredId));
  }

  printers(id: number): Observable<BridgePrinter[]> {
    return this.http.get<BridgePrinter[]>(`${this.url(id)}/printers`);
  }

  connect(id: number, body: ConnectBridgePrinter): Observable<BridgePrinter> {
    return this.http.post<BridgePrinter>(`${this.url(id)}/printers`, body);
  }

  /** The printer's connection and prints are kept; the bridge stops watching it. */
  disconnect(id: number, entryId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.url(id)}/printers/${encodeURIComponent(entryId)}`
    );
  }

  /**
   * Stores one credential sealed to the bridge's current key and returns the entry. Check the
   * field's `stale` in the answer: a seal that raced a key confirmation is stored but stale.
   */
  setSecret(
    id: number,
    entryId: number,
    field: string,
    body: SetBridgePrinterSecret
  ): Observable<BridgePrinter> {
    return this.http.put<BridgePrinter>(
      this.secretUrl(id, entryId, field),
      body
    );
  }

  /** Clears one credential (also when there was none). */
  clearSecret(id: number, entryId: number, field: string): Observable<void> {
    return this.http.delete<void>(this.secretUrl(id, entryId, field));
  }

  /**
   * Makes the bridge's pending key current. `fingerprint` must be the one the app computed from
   * `pendingPublicKey`, which the user compared with the bridge's own.
   */
  confirmKey(id: number, fingerprint: string): Observable<Bridge> {
    return this.http.post<Bridge>(`${this.url(id)}/public-key/confirm`, {
      fingerprint,
    });
  }

  /** Asks the bridge for one active sweep. Repeats within a minute return the same time. */
  scan(id: number): Observable<{ scanRequestedAt: string }> {
    return this.http.post<{ scanRequestedAt: string }>(
      `${this.url(id)}/scan`,
      null
    );
  }

  private url(id: number): string {
    return `${this.baseUrl}/${encodeURIComponent(id)}`;
  }

  private secretUrl(id: number, entryId: number, field: string): string {
    return `${this.url(id)}/printers/${encodeURIComponent(entryId)}/secrets/${encodeURIComponent(field)}`;
  }

  private ignoreUrl(id: number, discoveredId: number): string {
    return `${this.url(id)}/discovered-printers/${encodeURIComponent(discoveredId)}/ignore`;
  }
}
