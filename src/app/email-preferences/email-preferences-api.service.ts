import { HttpBackend, HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface EmailPreferences {
  all: boolean;
  onboarding: boolean;
  monthlyRecap: boolean;
  printerSilent: boolean;
}

export interface EmailPreferencesDto extends EmailPreferences {
  /** e.g. "c•••@gmail.com": enough to recognize, not enough to harvest. */
  maskedEmail: string;
}

/**
 * The token-authenticated email endpoints behind `/email-preferences`.
 *
 * Built on HttpBackend, so no interceptor runs: the token in `X-Email-Token` is the only
 * credential, and a visitor arriving from an email never loads the sign-in SDK. The token
 * travels in a header rather than the URL so it stays out of server and proxy logs.
 */
@Injectable({
  providedIn: 'root',
})
export class EmailPreferencesApiService {
  private readonly http = new HttpClient(inject(HttpBackend));
  private readonly base = `${environment.printLogApiUrl}/api/email`;

  confirmUnsubscribe(token: string): Observable<{ category: number }> {
    return this.http.post<{ category: number }>(
      `${this.base}/unsubscribe/confirm`,
      null,
      { headers: this.headers(token) }
    );
  }

  read(token: string): Observable<EmailPreferencesDto> {
    return this.http.get<EmailPreferencesDto>(`${this.base}/preferences`, {
      headers: this.headers(token),
    });
  }

  update(
    token: string,
    preferences: EmailPreferences
  ): Observable<EmailPreferencesDto> {
    return this.http.put<EmailPreferencesDto>(
      `${this.base}/preferences`,
      preferences,
      { headers: this.headers(token) }
    );
  }

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({ 'X-Email-Token': token });
  }
}
