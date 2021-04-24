import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

export interface CuraSettingsDto {
  id: string;
  curaVersion: string;
  pluginVersion: string;
  [x: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class CuraSettingServiceService {
  private readonly baseApi = environment.printLogApiUrl;

  constructor(private readonly httpClient: HttpClient) {}

  getSettings(id: string) {
    const url = `${this.baseApi}/api/Cura/settings`;
    const params = new HttpParams().set('id', id);
    return this.httpClient.get<CuraSettingsDto>(url, { params });
  }
}
