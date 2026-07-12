import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * A connected AI agent, backed by an Auth0 grant for the MCP audience.
 */
export interface ConnectedAgent {
  grantId: string;
  clientId: string;
  scopes: string[];
}

/**
 * Lists and revokes the current user's connected AI agents via the API.
 */
@Injectable({
  providedIn: 'root',
})
export class ConnectedAgentsService {
  private readonly httpClient = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  public getConnectedAgents(): Observable<ConnectedAgent[]> {
    return this.httpClient.get<ConnectedAgent[]>(
      `${this.baseApi}/api/connected-agents`
    );
  }

  public revoke(grantId: string): Observable<void> {
    return this.httpClient.delete<void>(
      `${this.baseApi}/api/connected-agents/${encodeURIComponent(grantId)}`
    );
  }
}
