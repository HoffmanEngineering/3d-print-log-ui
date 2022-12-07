import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map, tap } from 'rxjs/operators';
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
  private readonly baseApiUrl = `${environment.printLogApiUrl}/api/Users/me/user-settings`;
  private userSettings: UserSetting[] = [];

  constructor(private readonly http: HttpClient) {}

  public async getCurrentUsersSettingByType(
    userSettingTypeId: UserSettingType
  ): Promise<UserSetting | null> {
    if (this.userSettings.length === 0) {
      await this.getCurrentUsersSettings().toPromise();
    }

    const existingSetting = this.userSettings.find(
      (setting) => setting.userSettingTypeId === userSettingTypeId
    );
    return existingSetting ?? null;
  }

  getCurrentUsersSettings() {
    return this.http.get<UserSettingDto[]>(this.baseApiUrl).pipe(
      map((settingDto) => {
        const newSettings: UserSetting[] = [];

        for (const setting of settingDto) {
          const newSetting: UserSetting = this.formatUserSettingDto(setting);

          newSettings.push(newSetting);
        }
        return newSettings;
      }),
      tap((settings) => {
        this.userSettings = settings;
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
    const dto: UpdateUserSettingDto = {
      id,
      value: newValue,
    };

    return this.http.put<UserSettingDto>(this.baseApiUrl, dto).pipe(
      map((settingDto) => this.formatUserSettingDto(settingDto)),
      tap((updatedSetting) => {
        const existingSetting = this.userSettings.findIndex(
          (u) => u.id === updatedSetting.id
        );

        if (existingSetting !== -1) {
          this.userSettings[existingSetting] = updatedSetting;
        } else {
          this.userSettings.push(updatedSetting);
        }
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
      tap((updatedSetting) => {
        const existingSetting = this.userSettings.findIndex(
          (u) => (u.id = updatedSetting.id)
        );

        if (existingSetting !== -1) {
          this.userSettings[existingSetting] = updatedSetting;
        } else {
          this.userSettings.push(updatedSetting);
        }
      })
    );
  }
}
