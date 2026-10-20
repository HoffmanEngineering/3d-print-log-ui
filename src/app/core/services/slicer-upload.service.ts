import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

/**
 * One G-code a slicer plugin uploaded that the signed-in user can still log.
 * `settingId` is the id `/prints/new/cura` loads through `GET /api/Cura/settings`.
 */
export interface PendingSlicerUploadDto {
  settingId: string;
  /** ISO 8601, from the server's clock. */
  createdDate: string;
  printName: string | null;
  fileName: string | null;
  estimatedPrintTimeSeconds: number | null;
  slicerVersion: string | null;
  pluginVersion: string | null;
  /** True when the caller has already opened (and so owns) this upload. */
  claimed: boolean;
}

/** An OrcaSlicer plugin's install id: 32 lowercase hex characters. */
export const SLICER_INSTALL_ID_PATTERN = /^[0-9a-f]{32}$/;

export function isValidSlicerInstallId(
  value: string | null | undefined
): value is string {
  return typeof value === 'string' && SLICER_INSTALL_ID_PATTERN.test(value);
}

@Injectable({
  providedIn: 'root',
})
export class SlicerUploadService {
  private readonly httpClient = inject(HttpClient);

  private readonly baseApi = environment.printLogApiUrl;

  /**
   * The uploads from one plugin install that nobody else has claimed: the last
   * seven days, newest first, at most 20.
   */
  getPendingUploads(installId: string): Observable<PendingSlicerUploadDto[]> {
    const url = `${this.baseApi}/api/Slicer/uploads/pending`;
    const params = new HttpParams().set('installId', installId);
    return this.httpClient.get<PendingSlicerUploadDto[]>(url, { params });
  }
}
