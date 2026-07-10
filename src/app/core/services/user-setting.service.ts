import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

export enum UserSettingType {
  /**
   * The Default View Status for a print.
   */
  Prints_DefaultPrintViewStatus = 1,
  /**
   * The Id of the printer that was last selected.
   */
  Prints_LastSelectedPrinterId = 2,

  /**
   * The value of the last changed Allow Comments on prints.
   */
  Prints_LastSelectedAllowComments = 3,
  Prints_LastSelectedFilamentMeasureType = 4,
  Currency_Name = 5,
  Currency_Symbol = 6,
  Filaments_DefaultDiameterMm = 7,
  Filaments_DefaultPrice = 8,
  Prints_LastSelectedResinMeasureType = 9,
  Prints_LastSelectedPowderMeasureType = 10,
  Prints_LastSelectedWireMeasureType = 11,
  Electricity_KwhRate = 12,
  Electricity_DefaultWattageW = 13,
  Prints_PreferredFilamentDisplayUnit = 14,
}

export interface UserSetting {
  id: number;
  userId: number;
  userSettingTypeId: number;
  value: string;
  createdDate: Date;
  updatedDate: Date;
}

export interface UserSettingDto {
  id: number;
  userId: number;
  userSettingTypeId: number;
  value: string;
  createdDate: string;
  updatedDate: string;
}

export interface UpdateUserSettingDto {
  id: number;
  value: string;
}
export interface AddUserSettingDto {
  userSettingTypeId: UserSettingType;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserSettingService {
  private readonly http = inject(HttpClient);
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api/Users/me/user-settings`;
  private settingsMap = new Map<UserSettingType, UserSetting>();
  private loaded = false;
  private loadingPromise: Promise<Map<UserSettingType, UserSetting>> | null =
    null;

  public async getCurrentUsersSettingByType(
    userSettingTypeId: UserSettingType
  ): Promise<UserSetting | null> {
    if (!this.loaded) {
      if (!this.loadingPromise) {
        this.loadingPromise = lastValueFrom(this.fetchSettings()).finally(
          () => {
            this.loadingPromise = null;
          }
        );
      }
      await this.loadingPromise;
    }

    return this.settingsMap.get(userSettingTypeId) ?? null;
  }

  clearCache() {
    this.settingsMap.clear();
    this.loaded = false;
    this.loadingPromise = null;
  }

  private fetchSettings() {
    return this.http.get<UserSettingDto[]>(this.baseApiUrl).pipe(
      map((dtos) => {
        const result = new Map<UserSettingType, UserSetting>();
        for (const dto of dtos) {
          result.set(dto.userSettingTypeId, this.formatUserSettingDto(dto));
        }
        return result;
      }),
      tap((settings) => {
        // Runs only on a successful response — caches real settings (incl. []).
        this.settingsMap = settings;
        this.loaded = true;
      }),
      catchError((err) => {
        // For a logged-out visitor the auth interceptor rethrows Auth0's
        // missing-refresh-token error before dispatching the request. Treat
        // *only* that as "no settings" so a public view still renders.
        // Deliberately NOT cached (this branch bypasses the tap above, so
        // `loaded` stays false) so a later authenticated call refetches — this
        // is what makes an in-process (Cordova) login recover.
        if (err?.error === 'missing_refresh_token') {
          return of(new Map<UserSettingType, UserSetting>());
        }
        // Surface everything else: server errors (HttpErrorResponse), response-
        // mapping/programming errors, and unexpected auth failures.
        return throwError(() => err);
      })
    );
  }

  private formatUserSettingDto(setting: UserSettingDto): UserSetting {
    return {
      id: setting.id,
      userId: setting.userId,
      userSettingTypeId: setting.userSettingTypeId,
      value: setting.value,
      createdDate: new Date(setting.createdDate),
      updatedDate: new Date(setting.updatedDate),
    };
  }

  updateUserSetting(id: number, newValue: string) {
    const dto: UpdateUserSettingDto = { id, value: newValue };

    return this.http.put<UserSettingDto>(this.baseApiUrl, dto).pipe(
      map((settingDto) => this.formatUserSettingDto(settingDto)),
      tap((updatedSetting) => {
        this.settingsMap.set(updatedSetting.userSettingTypeId, updatedSetting);
      })
    );
  }

  addUserSetting(settingTypeId: UserSettingType, newValue: string) {
    const dto: AddUserSettingDto = {
      userSettingTypeId: settingTypeId,
      value: newValue,
    };

    return this.http.post<UserSettingDto>(this.baseApiUrl, dto).pipe(
      map((settingDto) => this.formatUserSettingDto(settingDto)),
      tap((newSetting) => {
        this.settingsMap.set(newSetting.userSettingTypeId, newSetting);
      })
    );
  }
}
