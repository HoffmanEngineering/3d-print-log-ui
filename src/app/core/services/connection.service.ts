import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

/** Whether a connection's agent is still sending heartbeats. */
export enum ConnectionStatus {
  /** A heartbeat arrived within the last 15 minutes. */
  Online = 1,
  /** No heartbeat for 15 minutes or more. */
  Stale = 2,
}

/** A connector (the bridge, for now) attached to one of the user's printers. */
export interface Connection {
  /** GUID */
  id: string;
  /** Lower-case connector type: `moonraker`, `octoprint`. */
  kind: string;
  /** The agent's own stable id for this printer; the API addresses connections by it. */
  instanceId: string;
  displayName: string;
  agentVersion: string | null;
  printerId: number | null;
  createdDate: Date;
  lastSeenAt: Date;
  /** Computed by the API: stale after 15 minutes without a heartbeat. */
  status: ConnectionStatus;
  /** Moonraker notifier events dropped because this connection logs the same printer. */
  droppedNotifierEventCount: number;
  lastDroppedNotifierEventAt: Date | null;
  notifierNoticeDismissedAt: Date | null;
  /** Events were dropped and the user has not dismissed the notice about it. */
  showNotifierNotice: boolean;
}

type ConnectionDto = Omit<
  Connection,
  | 'createdDate'
  | 'lastSeenAt'
  | 'lastDroppedNotifierEventAt'
  | 'notifierNoticeDismissedAt'
> & {
  createdDate: string;
  lastSeenAt: string;
  lastDroppedNotifierEventAt: string | null;
  notifierNoticeDismissedAt: string | null;
};

@Injectable({
  providedIn: 'root',
})
export class ConnectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.printLogApiUrl}/api/Connections`;

  /** The user's connections, or only one printer's when `printerId` is given. */
  getConnections(printerId?: number): Observable<Connection[]> {
    let params = new HttpParams();
    if (printerId != null) {
      params = params.set('printerId', printerId);
    }
    return this.http
      .get<ConnectionDto[]>(this.baseUrl, { params })
      .pipe(map((connections) => connections.map(toConnection)));
  }

  /** Removes the connection. The prints it logged are kept and unlinked. */
  deleteConnection(instanceId: string): Observable<void> {
    return this.http.delete<void>(this.url(instanceId));
  }

  /** Hides the "remove your notifier" notice for good, on every device. */
  dismissNotifierNotice(instanceId: string): Observable<void> {
    return this.http.post<void>(
      `${this.url(instanceId)}/notifier-notice/dismiss`,
      null
    );
  }

  private url(instanceId: string): string {
    return `${this.baseUrl}/${encodeURIComponent(instanceId)}`;
  }
}

function toConnection(dto: ConnectionDto): Connection {
  return {
    ...dto,
    createdDate: new Date(dto.createdDate),
    lastSeenAt: new Date(dto.lastSeenAt),
    lastDroppedNotifierEventAt: toDate(dto.lastDroppedNotifierEventAt),
    notifierNoticeDismissedAt: toDate(dto.notifierNoticeDismissedAt),
  };
}

function toDate(value: string | null): Date | null {
  return value ? new Date(value) : null;
}
