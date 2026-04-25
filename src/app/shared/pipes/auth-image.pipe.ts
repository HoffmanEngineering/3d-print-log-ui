import { Pipe, PipeTransform, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';

@Pipe({ name: 'authImage' })
export class AuthImagePipe implements PipeTransform {
  private readonly http = inject(HttpClient);
  private readonly sanitizer = inject(DomSanitizer);

  transform(url: string | undefined): Observable<SafeUrl | null> {
    if (!url) return of(null);
    return this.http
      .get(url, { responseType: 'blob' })
      .pipe(
        map((blob) =>
          this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(blob))
        )
      );
  }
}
