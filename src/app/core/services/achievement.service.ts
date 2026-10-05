import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  AchievementCatalog,
  EMPTY_PUBLIC_ACHIEVEMENTS,
  MyAchievements,
  PublicAchievements,
} from '../types/achievement';

/**
 * Achievements: the catalog, the signed-in user's collection, another maker's public badges,
 * and dismissing the hint card.
 */
@Injectable({ providedIn: 'root' })
export class AchievementService {
  private readonly http = inject(HttpClient);
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api`;

  /** Public endpoints must say so, or the auth interceptor drops a logged-out request. */
  private readonly anonymousHeaders = new HttpHeaders().set(
    'allow-anonymous-request',
    'true'
  );

  // The catalog only changes with a deploy, so one fetch serves the whole session.
  private readonly catalog$ = this.http
    .get<AchievementCatalog>(`${this.baseApiUrl}/achievements/catalog`, {
      headers: this.anonymousHeaders,
    })
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  catalog(): Observable<AchievementCatalog> {
    return this.catalog$;
  }

  /** The signed-in user's achievements. The API grants anything missed before answering. */
  me(): Observable<MyAchievements> {
    return this.http.get<MyAchievements>(`${this.baseApiUrl}/achievements/me`);
  }

  /**
   * Another maker's earned badges. Never errors: this backs a public route, and a failed request
   * there must render an empty state rather than bounce a logged-out visitor.
   */
  forUser(id: number): Observable<PublicAchievements> {
    return this.http
      .get<PublicAchievements>(`${this.baseApiUrl}/users/${id}/achievements`, {
        headers: this.anonymousHeaders,
      })
      .pipe(catchError(() => of(EMPTY_PUBLIC_ACHIEVEMENTS)));
  }

  dismissHint(key: string, tier: number): Observable<void> {
    return this.http.post<void>(
      `${this.baseApiUrl}/achievements/hint/dismiss`,
      {
        key,
        tier,
      }
    );
  }
}
