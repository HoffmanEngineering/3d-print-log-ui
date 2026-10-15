import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/**
 * `active`; `disabled` (paused because Free includes one connected printer, and resumed by
 * upgrading); or `revoked` (final: the printer needs a new connection).
 */
export type SpoolmanConnectionState = 'active' | 'disabled' | 'revoked';

/** A printer's Spoolman connection: Moonraker's `[spoolman]` pointed at 3D Print Log. */
export interface SpoolmanConnection {
  /** GUID */
  id: string;
  /** Null once the printer was deleted. */
  printerId: number | null;
  /** The printer's current name; null once the printer was deleted. */
  printerName: string | null;
  /** The printer's name when the connection was made. */
  name: string | null;
  createdDate: Date;
  /** When the printer last connected with it; null if it never has. */
  lastSeenAt: Date | null;
  state: SpoolmanConnectionState;
  /** `tier` when Free's one connection is used by another printer. */
  disabledReason: string | null;
  disabledAt: Date | null;
  revokedAt: Date | null;
}

/** The only response that carries the secret. It can't be fetched again. */
export interface SpoolmanConnectionCreated extends SpoolmanConnection {
  secret: string;
  /** The `server` value for `moonraker.conf`, secret included. */
  serverUrl: string;
  /** The whole `[spoolman]` section, ready to paste. */
  configBlock: string;
}

/** The Free plan's connection limit, read from the API's 403 problem. */
export interface SpoolmanConnectionLimit {
  limit: number;
  detail: string | null;
}

type DateFields = 'createdDate' | 'lastSeenAt' | 'disabledAt' | 'revokedAt';

type SpoolmanConnectionDto = Omit<SpoolmanConnection, DateFields> & {
  createdDate: string;
  lastSeenAt: string | null;
  disabledAt: string | null;
  revokedAt: string | null;
};

type SpoolmanConnectionCreatedDto = SpoolmanConnectionDto &
  Pick<SpoolmanConnectionCreated, 'secret' | 'serverUrl' | 'configBlock'>;

@Injectable({
  providedIn: 'root',
})
export class SpoolmanConnectionService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.printLogApiUrl;

  /** Every connection the user has made, newest first, revoked ones included. Never a secret. */
  getConnections(): Observable<SpoolmanConnection[]> {
    return this.http
      .get<SpoolmanConnectionDto[]>(`${this.api}/api/SpoolmanConnections`)
      .pipe(map((list) => list.map(toConnection)));
  }

  /**
   * Connects the printer, or reconnects it with a new secret, which revokes the old one.
   * Fails with a 403 that {@link spoolmanConnectionLimit} reads when Free's limit is reached.
   */
  connect(printerId: number): Observable<SpoolmanConnectionCreated> {
    return this.http
      .post<SpoolmanConnectionCreatedDto>(
        `${this.api}/api/Printers/${printerId}/spoolman-connection`,
        null
      )
      .pipe(
        map((dto) => ({
          ...toConnection(dto),
          secret: dto.secret,
          serverUrl: dto.serverUrl,
          configBlock: dto.configBlock,
        }))
      );
  }

  /** Revokes the connection. Its secret stops working at once, for good. */
  revoke(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.api}/api/SpoolmanConnections/${encodeURIComponent(id)}`
    );
  }
}

/** The limit from a `spoolman_connection_limit` 403, or null for any other error. */
export function spoolmanConnectionLimit(
  error: unknown
): SpoolmanConnectionLimit | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 403) {
    return null;
  }
  const body: unknown = error.error;
  if (
    typeof body !== 'object' ||
    body === null ||
    (body as { code?: unknown }).code !== 'spoolman_connection_limit'
  ) {
    return null;
  }
  const { limit, detail } = body as { limit?: unknown; detail?: unknown };
  return {
    limit: typeof limit === 'number' ? limit : 1,
    detail: typeof detail === 'string' ? detail : null,
  };
}

function toConnection(dto: SpoolmanConnectionDto): SpoolmanConnection {
  return {
    id: dto.id,
    printerId: dto.printerId,
    printerName: dto.printerName,
    name: dto.name,
    state: dto.state,
    disabledReason: dto.disabledReason,
    createdDate: utc(dto.createdDate),
    lastSeenAt: utcOrNull(dto.lastSeenAt),
    disabledAt: utcOrNull(dto.disabledAt),
    revokedAt: utcOrNull(dto.revokedAt),
  };
}

/**
 * The API stores these as UTC but serializes a value read back from the database without a
 * zone, which `new Date()` would read as local time. A value that names its zone is kept.
 */
function utc(value: string): Date {
  return new Date(/(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`);
}

function utcOrNull(value: string | null): Date | null {
  return value ? utc(value) : null;
}
