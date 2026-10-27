import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Pipe({ name: 'authImage' })
export class AuthImagePipe implements PipeTransform {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  transform(url: string | undefined): Observable<SafeUrl | null> {
    if (!url) return of(null);
    // Public prints are viewed logged out. Without this header the auth interceptor rejects
    // the request before it is sent (no token to attach); with it, a signed-in viewer still
    // sends their token, and the interceptor strips the header for any other origin.
    const headers = new HttpHeaders().set('allow-anonymous-request', 'true');
    return this.http
      .get(url, { responseType: 'blob', headers })
      .pipe(
        map((blob) =>
          this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob))
        )
      );
  }
}
