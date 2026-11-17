import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, fromEvent, of } from 'rxjs';
import { catchError, concatMap, map, take } from 'rxjs/operators';

/** Fetches an image (anonymously allowed) and reads it as a data URL. Errors on failure. */
export function readImageAsDataUrl(
  http: HttpClient,
  url: string
): Observable<string> {
  const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
  return http.get(url, { headers, responseType: 'blob' }).pipe(
    concatMap((blob) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      return fromEvent(reader, 'load');
    }),
    take(1),
    // 'data:image/png;base64,' plus the base64 data
    map((e) => (e.target as FileReader).result as string)
  );
}

/**
 * The thumbnail as a data URL when there is one, else (or if it fails) the full image; ''
 * when neither loads.
 */
export function readImageWithFallback(
  http: HttpClient,
  thumbnailUrl: string | undefined,
  fullUrl: string
): Observable<string> {
  const full = readImageAsDataUrl(http, fullUrl);
  const primary = thumbnailUrl
    ? readImageAsDataUrl(http, thumbnailUrl).pipe(catchError(() => full))
    : full;
  return primary.pipe(catchError(() => of('')));
}
