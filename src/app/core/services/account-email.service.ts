import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

/** The address 3D Print Log emails, copied from the sign-in account. */
export interface AccountEmail {
  email: string | null;
  verified: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AccountEmailService {
  private readonly http = inject(HttpClient);

  get(): Observable<AccountEmail> {
    return this.http.get<AccountEmail>(
      `${environment.printLogApiUrl}/api/Users/me/email`
    );
  }
}
