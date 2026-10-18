import {
  HttpClient,
  HttpHeaders,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, shareReplay } from 'rxjs';

import { environment } from '../../../environments/environment';

/** A printer model from the catalog. Mirrors the API's PrinterModelDto. */
export interface PrinterModel {
  /** Stable slug, such as `bambu-lab-p1s`. */
  id: string;
  make: string;
  model: string;
  technology: string;
  bedWidthMm?: number | null;
  bedDepthMm?: number | null;
  bedHeightMm?: number | null;
  nozzleOptionsMm?: number[] | null;
  defaultNozzleMm?: number | null;
  filamentDiameterMm?: number | null;
  hasHeatedBed?: boolean | null;
  hasHeatedChamber?: boolean | null;
  extruderCount?: number | null;
  defaultSlotCount?: number | null;
  kinematics?: string | null;
  /** True when the model left the catalog. It still resolves by id so linked printers keep working. */
  retired?: boolean | null;
}

export interface PrinterModelMatch {
  id: string;
  confidence: string;
}

/**
 * The printer catalog: search, popular models, lookup by id and name matching.
 * Every call fails soft (an empty list or null), so the catalog never blocks a form.
 */
@Injectable({ providedIn: 'root' })
export class PrinterCatalogService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.printLogApiUrl}/api/PrinterModels`;

  /** Public endpoints must say so, or the auth interceptor drops a logged-out request. */
  private readonly anonymousHeaders = new HttpHeaders().set(
    'allow-anonymous-request',
    'true'
  );

  private popular$?: Observable<PrinterModel[]>;
  private popularLimit?: number;
  private readonly byId = new Map<string, Observable<PrinterModel | null>>();

  search(q: string, limit = 20): Observable<PrinterModel[]> {
    const params = new HttpParams().set('search', q).set('limit', limit);
    return this.http
      .get<PrinterModel[]>(this.url, { headers: this.anonymousHeaders, params })
      .pipe(catchError(() => of([] as PrinterModel[])));
  }

  /** Cached for the session. */
  popular(limit = 8): Observable<PrinterModel[]> {
    if (!this.popular$ || this.popularLimit !== limit) {
      this.popularLimit = limit;
      this.popular$ = this.http
        .get<PrinterModel[]>(`${this.url}/popular`, {
          headers: this.anonymousHeaders,
          params: new HttpParams().set('limit', limit),
        })
        .pipe(
          catchError(() => of([] as PrinterModel[])),
          shareReplay({ bufferSize: 1, refCount: false })
        );
    }
    return this.popular$;
  }

  /** One model by id, cached per id. A retired model still resolves; an unknown id gives null. */
  get(id: string): Observable<PrinterModel | null> {
    let cached = this.byId.get(id);
    if (!cached) {
      cached = this.http
        .get<PrinterModel>(`${this.url}/${encodeURIComponent(id)}`, {
          headers: this.anonymousHeaders,
        })
        .pipe(
          catchError(() => of(null)),
          shareReplay({ bufferSize: 1, refCount: false })
        );
      this.byId.set(id, cached);
    }
    return cached;
  }

  /** The catalog model a free-text printer name refers to, or null (the API answers 204). */
  match(name: string): Observable<PrinterModelMatch | null> {
    return this.http
      .get<PrinterModelMatch>(`${this.url}/match`, {
        headers: this.anonymousHeaders,
        params: new HttpParams().set('name', name),
        observe: 'response',
      })
      .pipe(
        map((res: HttpResponse<PrinterModelMatch>) =>
          res.status === 204 ? null : (res.body ?? null)
        ),
        catchError(() => of(null))
      );
  }

  /**
   * One line of the specs that are present, such as
   * "256 × 256 × 256 mm · 0.4 mm nozzle · 1.75 mm · heated bed · 4 slots".
   */
  static specSummary(
    m: PrinterModel,
    nozzleMm?: number,
    slotCount?: number
  ): string {
    const parts: string[] = [];
    if (m.bedWidthMm && m.bedDepthMm && m.bedHeightMm) {
      parts.push(`${m.bedWidthMm} × ${m.bedDepthMm} × ${m.bedHeightMm} mm`);
    }
    const nozzle = nozzleMm ?? m.defaultNozzleMm;
    if (nozzle) {
      parts.push(`${nozzle} mm nozzle`);
    }
    if (m.filamentDiameterMm) {
      parts.push(`${m.filamentDiameterMm} mm`);
    }
    if (m.hasHeatedBed) {
      parts.push('heated bed');
    }
    if (m.hasHeatedChamber) {
      parts.push('heated chamber');
    }
    const slots = slotCount ?? m.defaultSlotCount;
    if (slots) {
      parts.push(`${slots} ${slots === 1 ? 'slot' : 'slots'}`);
    }
    return parts.join(' · ');
  }
}
