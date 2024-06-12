import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import moment from 'moment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export interface UserApiKeySummary {
  /** GUID */
  id: string;

  description: string;

  isDeleted: boolean;

  createdDate: Date;
  createdById: number;
  updatedDate: Date;
  updatedById: number;
}

export interface AddNewApiKeyDto {
  description: string;
}

/**
 * Returned when a new API is first added.
 * The only time the private key is returned.
 */
export interface NewUserApiKeyDto {
  /** GUID */
  id: string;

  description: string;

  publicKey: string;

  createdDate: Date;
  createdById: number;
  updatedDate: Date;
  updatedById: number;
}

@Injectable({
  providedIn: 'root',
})
export class ApiKeyService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private readonly httpClient: HttpClient) {}

  public getApiKeySummaryForUser(): Observable<UserApiKeySummary[]> {
    const url = `${this.baseApi}/api/UserApiKeys`;
    return this.httpClient.get<UserApiKeySummary[]>(url).pipe(
      map((response) => {
        return response.map((key) => {
          return {
            ...key,
            createdDate: moment.utc(key.createdDate).toDate(),
            updatedDate: moment.utc(key.updatedDate).toDate(),
          };
        });
      })
    );
  }

  public createNewApiKey(description: string): Observable<NewUserApiKeyDto> {
    const url = `${this.baseApi}/api/UserApiKeys`;

    const body: AddNewApiKeyDto = {
      description,
    };
    return this.httpClient.post<NewUserApiKeyDto>(url, body).pipe(
      map((key) => {
        return {
          ...key,
          createdDate: new Date(key.createdDate),
          updatedDate: new Date(key.updatedDate),
        };
      })
    );
  }

  public deleteApiKey(keyId: string): Observable<void> {
    const url = `${this.baseApi}/api/UserApiKeys/${keyId}`;
    return this.httpClient.delete<void>(url);
  }
}
