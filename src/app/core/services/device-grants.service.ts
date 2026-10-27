import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * A paired device, such as printlog-bridge, holding a scoped device token
 * (`DeviceGrantDto`, 3d-print-log-api#286). The token itself is never listed.
 */
export interface DeviceGrant {
  /** Grant id; revoke with `DELETE /api/device-grants/{id}`. */
  id: number;
  /** The device's own id: re-pairing the same device keeps the grant. */
  deviceId: string;
  /** What the device calls itself ("printlog-bridge on voron"). */
  name: string;
  /** The Auth0 application it paired through. */
  clientId: string | null;
  /** What it may do (`prints:write`, `printers:slots`, …). */
  scopes: string[];
  /** First paired. */
  createdAt: string;
  /** Its current token was issued (first pairing or latest re-pair). */
  pairedAt: string;
  /** Last request, to within five minutes; null until first used. */
  lastUsedAt: string | null;
}

/** Lists and revokes the current user's paired devices. Interactive users only. */
@Injectable({
  providedIn: 'root',
})
export class DeviceGrantsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  public list(): Observable<DeviceGrant[]> {
    return this.httpClient.get<DeviceGrant[]>(
      `${this.baseApi}/api/device-grants`
    );
  }

  public revoke(id: number): Observable<void> {
    return this.httpClient.delete<void>(
      `${this.baseApi}/api/device-grants/${encodeURIComponent(id)}`
    );
  }
}
