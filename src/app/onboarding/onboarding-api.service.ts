import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface OnboardingStatus {
  onboardingEligible: boolean;
  createdDate: string | null;
  emailVerified: boolean;
}

/** What onboarding assumes when the status can't be read: no onboarding, nothing to verify. */
export const INELIGIBLE_STATUS: OnboardingStatus = {
  onboardingEligible: false,
  createdDate: null,
  emailVerified: true,
};

export type ResendResult =
  | 'sent'
  | 'already-verified'
  | 'rate-limited'
  | 'failed';

/** Achievement family keys the getting-started checklist tracks. */
export const GETTING_STARTED_KEYS = {
  printer: 'first-printer',
  material: 'first-material',
  print: 'first-print',
} as const;

@Injectable({
  providedIn: 'root',
})
export class OnboardingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api/Users/me`;

  /** Any error (an older API, offline) maps to an ineligible status so the app never blocks. */
  getStatus(): Observable<OnboardingStatus> {
    return this.http
      .get<OnboardingStatus>(`${this.baseApiUrl}/onboarding`)
      .pipe(catchError(() => of(INELIGIBLE_STATUS)));
  }

  resendVerificationEmail(): Observable<ResendResult> {
    return this.http
      .post(`${this.baseApiUrl}/verification-email`, null, {
        observe: 'response',
      })
      .pipe(
        map((): ResendResult => 'sent'),
        catchError((err: unknown) => {
          const status = err instanceof HttpErrorResponse ? err.status : 0;
          if (status === 409) {
            return of<ResendResult>('already-verified');
          }
          if (status === 429) {
            return of<ResendResult>('rate-limited');
          }
          return of<ResendResult>('failed');
        })
      );
  }
}
