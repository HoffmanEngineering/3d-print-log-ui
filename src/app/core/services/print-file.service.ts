import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

export interface PrintFileAttachment {
  id: number;
  originalFileName: string;
  sizeBytes: number;
  contentType: string;
  displayOrder: number;
}

export interface UploadUrlResponse {
  sasUrl: string;
  blobPath: string;
}

export interface DownloadUrlResponse {
  url: string;
  expiresAt: string;
}

export interface ConfirmUploadRequest {
  blobPath: string;
  fileName: string;
  sizeBytes: number;
  contentType: string;
}

export interface UploadProgress {
  percent: number;
  loaded: number;
  total: number;
}

@Injectable({
  providedIn: 'root',
})
export class PrintFileService {
  private readonly http = inject(HttpClient);
  private readonly baseApi = environment.printLogApiUrl;

  private static readonly ALLOWED_EXTENSIONS = [
    '.gcode',
    '.stl',
    '.3mf',
    '.obj',
  ];
  private static readonly MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024; // 200MB

  getUploadUrl(
    printId: number,
    fileName: string,
    contentType: string,
    sizeBytes: number
  ): Observable<UploadUrlResponse> {
    return this.http.post<UploadUrlResponse>(
      `${this.baseApi}/api/Prints/${printId}/files/upload-url`,
      { fileName, contentType, sizeBytes }
    );
  }

  confirmUpload(
    printId: number,
    request: ConfirmUploadRequest
  ): Observable<PrintFileAttachment> {
    return this.http.post<PrintFileAttachment>(
      `${this.baseApi}/api/Prints/${printId}/files/confirm`,
      request
    );
  }

  getFiles(printId: number): Observable<PrintFileAttachment[]> {
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
    return this.http.get<PrintFileAttachment[]>(
      `${this.baseApi}/api/Prints/${printId}/files`,
      {
        headers,
      }
    );
  }

  getDownloadUrl(
    printId: number,
    fileId: number
  ): Observable<DownloadUrlResponse> {
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
    return this.http.get<DownloadUrlResponse>(
      `${this.baseApi}/api/Prints/${printId}/files/${fileId}/download-url`,
      { headers }
    );
  }

  deleteFile(printId: number, fileId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseApi}/api/Prints/${printId}/files/${fileId}`
    );
  }

  /**
   * Upload a file directly to Azure Blob Storage via SAS URL.
   * Uses XMLHttpRequest for upload progress tracking.
   */
  uploadToSasUrl(sasUrl: string, file: File): Observable<UploadProgress> {
    return new Observable<UploadProgress>((observer) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          observer.next({
            percent: Math.round((event.loaded / event.total) * 100),
            loaded: event.loaded,
            total: event.total,
          });
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          observer.next({ percent: 100, loaded: file.size, total: file.size });
          observer.complete();
        } else {
          observer.error(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        observer.error(new Error('Upload failed'));
      });

      xhr.open('PUT', sasUrl);
      xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
      xhr.setRequestHeader(
        'Content-Type',
        file.type || 'application/octet-stream'
      );
      xhr.send(file);

      return () => xhr.abort();
    });
  }

  /**
   * Validates a file is an allowed type and within size limit.
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!PrintFileService.ALLOWED_EXTENSIONS.includes(ext)) {
      return {
        valid: false,
        error: `File type ${ext} is not supported. Allowed: ${PrintFileService.ALLOWED_EXTENSIONS.join(', ')}`,
      };
    }
    if (file.size > PrintFileService.MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File exceeds 200MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`,
      };
    }
    return { valid: true };
  }

  static getAllowedExtensions(): string[] {
    return [...PrintFileService.ALLOWED_EXTENSIONS];
  }

  static getMaxFileSizeBytes(): number {
    return PrintFileService.MAX_FILE_SIZE_BYTES;
  }
}
